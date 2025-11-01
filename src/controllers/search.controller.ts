import type { FastifyReply, FastifyRequest } from "fastify";
import { Op, Sequelize, QueryTypes } from "sequelize";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";
import { HOUSE_TO_CODE, type House } from "@/types/enum";

type SearchQuery = {
  house?: House;
  start_date?: string;
  end_date?: string;
  window_size?: string | number;
  party?: string;
  age_group?: string; // e.g. "18-29", "70"
  sex?: string; // 'm' | 'f'
  ethnicity?: string;
  q?: string;
  uid?: string | number; // author id
  page?: string | number;
  page_size?: string | number;
};

const DEFAULT_PAGE_SIZE = 9;

async function getDefaultStartDateForDR(server: any): Promise<string> {
  const { ParliamentaryCycle } = server.models as any;
  // max term for dewan-rakyat (0)
  const maxTermRow = await ParliamentaryCycle.findOne({
    attributes: [[Sequelize.fn("max", Sequelize.col("term")), "term"]],
    where: { house: 0 },
    raw: true,
  });
  const maxTerm = maxTermRow?.term;
  if (!maxTerm && maxTerm !== 0) {
    // fallback to earliest start_date
    const minStart = await ParliamentaryCycle.findOne({ attributes: [[Sequelize.fn("min", Sequelize.col("start_date")), "start_date"]], raw: true });
    return minStart?.start_date ?? new Date().toISOString().slice(0, 10);
  }
  const termStart = await ParliamentaryCycle.findOne({
    attributes: [[Sequelize.fn("min", Sequelize.col("start_date")), "start_date"]],
    where: { house: 0, term: maxTerm },
    raw: true,
  });
  return termStart?.start_date ?? new Date().toISOString().slice(0, 10);
}

function buildFilterClauses(server: any, query: SearchQuery) {
  const house = HOUSE_TO_CODE[(query.house ?? "dewan-rakyat") as House] ?? 0;
  const startDatePromise = query.start_date
    ? Promise.resolve(query.start_date)
    : getDefaultStartDateForDR(server);
  return { house, startDatePromise };
}

export async function getSearchResults(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply,
) {
  try {
    const { sequelize } = request.server as any;
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query);
    const startDate = await startDatePromise;
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10);
    const windowSize = Number(request.query.window_size ?? 120);
    const q = (request.query.q ?? "").toString().trim().toLowerCase();
    const uid = request.query.uid ? Number(request.query.uid) : undefined;
    const pageSize = Number(request.query.page_size ?? DEFAULT_PAGE_SIZE);
    const page = Math.max(1, Number(request.query.page ?? 1));
    const offset = (page - 1) * pageSize;

    const whereParts: string[] = [
      "pc.house = :house",
      "si.date >= :startDate",
      "si.date <= :endDate",
    ];
    const repl: Record<string, any> = { house, startDate, endDate };

    if (request.query.party) {
      whereParts.push("ah.party = :party");
      repl.party = request.query.party;
    }
    if (request.query.sex) {
      whereParts.push("a.sex = :sex");
      repl.sex = request.query.sex;
    }
    if (request.query.ethnicity) {
      whereParts.push("a.ethnicity = :ethnicity");
      repl.ethnicity = request.query.ethnicity;
    }
    if (request.query.age_group) {
      const grp = request.query.age_group;
      const currentYear = new Date().getFullYear();
      if (grp === "unknown") {
        whereParts.push("a.birth_year IS NULL");
      } else if (grp === "70") {
        whereParts.push("a.birth_year <= :ageEnd");
        repl.ageEnd = currentYear - 70;
      } else if (grp.includes("-")) {
        const [loStr, hiStr] = grp.split("-");
        const lo = Number(loStr!);
        const hi = Number(hiStr!);
        whereParts.push("a.birth_year BETWEEN :ageStart AND :ageEnd");
        repl.ageStart = currentYear - hi;
        repl.ageEnd = currentYear - lo;
      }
    }
    if (uid) {
      whereParts.push("a.new_author_id = :uid");
      repl.uid = uid;
    }

    let selectHeadline = "";
    let selectRank = "0 as rank";
    let orderBy = "si.date DESC";
    if (q) {
      selectHeadline = `, ts_headline('english', s.speech, plainto_tsquery('english', :q), 'StartSel==, StopSel==, MinWords=${Math.max(
        10,
        windowSize - 10,
      )}, MaxWords=${windowSize}') as headline`;
      selectRank = ", ts_rank(s.speech_vector, plainto_tsquery('english', :q)) as rank";
      orderBy = "rank DESC, si.date DESC";
      repl.q = q;
      whereParts.push("s.speech_vector @@ plainto_tsquery('english', :q)");
    }

    const baseFrom = `
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
    `;

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const countSql = `SELECT count(*) as count ${baseFrom} ${whereSql}`;
    const [{ count }] = await sequelize.query(countSql, { replacements: repl, type: QueryTypes.SELECT });

    const selectSql = `
      SELECT s.index, a.name as speaker_name, a.new_author_id as author_id, s.speech, s.timestamp,
             si.date as sitting_date, pc.term, pc.session, pc.meeting
             ${selectHeadline} ${selectRank}
      ${baseFrom}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT :limit OFFSET :offset
    `;
    const rows: any[] = await sequelize.query(selectSql, {
      replacements: { ...repl, limit: pageSize, offset },
      type: QueryTypes.SELECT,
    });

    const results = rows
      .filter((r) => r.speech != null)
      .map((r) => ({
        index: Number(r.index),
        speaker: r.speaker_name,
        author_id: r.author_id,
        trimmed_speech: q ? r.headline : `${r.speech?.slice(0, windowSize) ?? ""}...`,
        relevance_score: q ? r.rank : null,
        sitting: { date: r.sitting_date, term: r.term, session: r.session, meeting: r.meeting },
      }));

    const total = Number(count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const next = page < totalPages ? page + 1 : null;
    const previous = page > 1 ? page - 1 : null;

    return reply.send(
      createSuccessResponse({ results, count: total, next, previous }, 200),
    );
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}

export async function getSearchPlot(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply,
) {
  try {
    const { sequelize } = request.server as any;
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query);
    const startDate = await startDatePromise;
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10);
    const q = (request.query.q ?? "").toString().trim().toLowerCase();

    const whereParts: string[] = [
      "pc.house = :house",
      "si.date >= :startDate",
      "si.date <= :endDate",
    ];
    const repl: Record<string, any> = { house, startDate, endDate };

    if (request.query.party) {
      whereParts.push("ah.party = :party");
      repl.party = request.query.party;
    }
    if (request.query.sex) {
      whereParts.push("a.sex = :sex");
      repl.sex = request.query.sex;
    }
    if (request.query.ethnicity) {
      whereParts.push("a.ethnicity = :ethnicity");
      repl.ethnicity = request.query.ethnicity;
    }
    if (request.query.age_group) {
      const grp = request.query.age_group;
      const currentYear = new Date().getFullYear();
      if (grp === "unknown") {
        whereParts.push("a.birth_year IS NULL");
      } else if (grp === "70") {
        whereParts.push("a.birth_year <= :ageEnd");
        repl.ageEnd = currentYear - 70;
      } else if (grp.includes("-")) {
        const [loStr, hiStr] = grp.split("-");
        const lo = Number(loStr!);
        const hi = Number(hiStr!);
        whereParts.push("a.birth_year BETWEEN :ageStart AND :ageEnd");
        repl.ageStart = currentYear - hi;
        repl.ageEnd = currentYear - lo;
      }
    }
    if (request.query.uid) {
      whereParts.push("a.new_author_id = :uid");
      repl.uid = Number(request.query.uid);
    }

    if (q) {
      whereParts.push("s.speech_vector @@ plainto_tsquery('english', :q)");
      repl.q = q;
    }

    const baseFrom = `
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
    `;
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    const seriesSql = q
      ? `SELECT si.date::date as date, count(s.speech_id) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`
      : `SELECT si.date::date as date, sum(s.length) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`;
    const series: any[] = await sequelize.query(seriesSql, { replacements: repl, type: QueryTypes.SELECT });

    // Top N speakers
    const topSql = `
      SELECT a.new_author_id as author_id, count(*) as count
      ${baseFrom}
      ${whereSql}
      GROUP BY a.new_author_id
      ORDER BY count DESC
      LIMIT 5
    `;
    const topRows: any[] = await sequelize.query(topSql, { replacements: repl, type: QueryTypes.SELECT });
    const top_speakers = topRows.map((r) => ({ [r.author_id]: Number(r.count) }));

    // Word frequency
    const freqSql = `
      SELECT t.word, count(*) as c
      FROM (
        SELECT unnest(s.speech_tokens) as word
        ${baseFrom}
        ${whereSql}
      ) as t
      GROUP BY t.word
      ORDER BY c DESC
      LIMIT 20
    `;
    const freqRows: any[] = await sequelize.query(freqSql, { replacements: repl, type: QueryTypes.SELECT });
    const top_word_freq: Record<string, number> = {};
    for (const r of freqRows) top_word_freq[r.word] = Number(r.c);

    if (!series.length) {
      return reply.code(404).send(createErrorResponse("No speeches found with the given filters.", "ERR_404", 404));
    }

    const periodDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const resamplingMonthly = periodDays >= 1095;
    const chart_data = { date: [] as string[], freq: [] as number[] };
    if (resamplingMonthly) {
      const monthMap = new Map<string, number>();
      for (const row of series) {
        const key = new Date(row.date).toISOString().slice(0, 7); // YYYY-MM
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(row.count));
      }
      const keys = Array.from(monthMap.keys()).sort();
      for (const k of keys) {
        chart_data.date.push(k);
        chart_data.freq.push(monthMap.get(k) ?? 0);
      }
    } else {
      for (const row of series) {
        chart_data.date.push(new Date(row.date).toISOString().slice(0, 10));
        chart_data.freq.push(Number(row.count));
      }
    }

    const total_results = chart_data.freq.reduce((a, b) => a + b, 0);
    return reply.send(createSuccessResponse({ chart_data, total_results, top_word_freq, top_speakers }, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


