import type { FastifyReply, FastifyRequest } from "fastify";
import { Sequelize, QueryTypes } from "sequelize";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";
import { HOUSE_TO_CODE, type House } from "@/types/enum";

type AttendanceQuery = { house?: House; term?: string; session?: string; meeting?: string };

const ageGroups: Record<number, string> = {
  30: "18-29",
  40: "30-39",
  50: "40-49",
  60: "50-59",
  70: "60-69",
  999: "70+",
};

function ageToGroup(age: number | null): string {
  if (age == null || Number.isNaN(age)) return "70+";
  const keys = Object.keys(ageGroups)
    .map((k) => Number(k))
    .sort((a, b) => a - b);
  for (const k of keys) {
    if (age < k) return ageGroups[k]!;
  }
  return ageGroups[Math.max(...keys)]!;
}

function generateBarmeterData(rows: Array<{ key: string; attendance_pct: number }>, keyName: string) {
  const map = new Map<string, { sum: number; n: number }>();
  for (const r of rows) {
    const k = r.key ?? "";
    const e = map.get(k) ?? { sum: 0, n: 0 };
    e.sum += r.attendance_pct;
    e.n += 1;
    map.set(k, e);
  }
  return Array.from(map.entries()).map(([k, v]) => ({ x: k, y: v.n ? v.sum / v.n : 0 }));
}

export async function getAttendance(
  request: FastifyRequest<{ Querystring: AttendanceQuery }>,
  reply: FastifyReply,
) {
  try {
    const { sequelize } = request.server as any;
    const house = HOUSE_TO_CODE[(request.query.house ?? "dewan-rakyat") as House];
    if (house == null) return reply.code(400).send(createErrorResponse("House type not valid.", "ERR_400", 400));

    const term = request.query.term ? Number(request.query.term) : undefined;
    const session = request.query.session ? Number(request.query.session) : undefined;
    const meeting = request.query.meeting ? Number(request.query.meeting) : undefined;

    const whereParts: string[] = ["pc.house = :house"];
    const repl: Record<string, any> = { house };
    if (term != null) {
      whereParts.push("pc.term = :term");
      repl.term = term;
    }
    if (session != null) {
      whereParts.push("pc.session = :session");
      repl.session = session;
    } else if (term === 14) {
      // Special handling: only include session >= 4 for 14th parliament
      whereParts.push("pc.session >= 4");
    }
    if (meeting != null) {
      whereParts.push("pc.meeting = :meeting");
      repl.meeting = meeting;
    }

    const baseJoin = `
      FROM api_author_history ah
      JOIN api_attendance att ON att.author_id = ah.record_id
      JOIN api_sitting si ON si.sitting_id = att.sitting_id
      JOIN api_parliamentary_cycle pc ON pc.cycle_id = si.cycle_id
      JOIN api_author a ON a.new_author_id = ah.author_id
    `;
    const whereSql = `WHERE ${whereParts.join(" AND ")}`;

    const totalSql = `SELECT count(*)::int as total FROM api_sitting si JOIN api_parliamentary_cycle pc ON pc.cycle_id = si.cycle_id ${whereSql}`;
    const [{ total }] = await sequelize.query(totalSql, { replacements: repl, type: QueryTypes.SELECT });
    const total_sittings = Number(total ?? 0);

    const mainSql = `
      SELECT
        a.name as name,
        a.ethnicity as ethnicity,
        a.sex as sex,
        (extract(year from now())::int - a.birth_year) as age,
        ah.party as party,
        sum(CASE WHEN att.attended THEN 1 ELSE 0 END)::int as total_attended,
        (sum(CASE WHEN att.attended THEN 1 ELSE 0 END) * 100.0 / NULLIF(:total_sittings, 0))::float as attendance_pct
      ${baseJoin}
      ${whereSql}
      GROUP BY a.name, a.ethnicity, a.sex, a.birth_year, ah.party
      ORDER BY attendance_pct DESC
    `;
    const rows: any[] = await sequelize.query(mainSql, {
      replacements: { ...repl, total_sittings },
      type: QueryTypes.SELECT,
    });

    if (!rows.length || total_sittings === 0) {
      return reply.code(404).send(createErrorResponse("No attendance data found with the given query.", "ERR_404", 404));
    }

    const enriched = rows.map((r) => ({
      name: r.name,
      ethnicity: r.ethnicity,
      sex: r.sex,
      age: r.age != null ? Number(r.age) : null,
      party: r.party,
      area: null as any, // area name not present in current join
      total_attended: Number(r.total_attended),
      attendance_pct: Number(r.attendance_pct),
      total: total_sittings,
      rank: 0,
      age_group: "",
    }));

    // Compute rank and age groups
    enriched.sort((a, b) => b.attendance_pct - a.attendance_pct);
    enriched.forEach((r, idx) => {
      r.rank = idx + 1;
      r.age_group = ageToGroup(r.age);
    });

    // Party aggregates
    const partyMap = new Map<string, { attendance_pct_sum: number; total_attended: number; total: number; total_seats: number }>();
    for (const r of enriched) {
      const key = r.party ?? "";
      const e = partyMap.get(key) ?? { attendance_pct_sum: 0, total_attended: 0, total: 0, total_seats: 0 };
      e.attendance_pct_sum += r.attendance_pct;
      e.total_attended += r.total_attended;
      e.total += r.total;
      e.total_seats += 1;
      partyMap.set(key, e);
    }
    const tab_party = Array.from(partyMap.entries()).map(([party, v]) => ({
      party,
      attendance_pct: v.total_seats ? v.attendance_pct_sum / v.total_seats : 0,
      total_attended: v.total_attended,
      total: v.total,
      total_seats: v.total_seats,
    }));

    // Charts
    const chart_sex = generateBarmeterData(enriched.map((r) => ({ key: r.sex, attendance_pct: r.attendance_pct })), "sex");
    const chart_age = generateBarmeterData(enriched.map((r) => ({ key: r.age_group, attendance_pct: r.attendance_pct })), "age_group");
    const chart_ethnicity = generateBarmeterData(enriched.map((r) => ({ key: r.ethnicity, attendance_pct: r.attendance_pct })), "ethnicity");

    return reply.send(
      createSuccessResponse(
        {
          charts: { sex: chart_sex, age: chart_age, ethnicity: chart_ethnicity },
          tab_individual: enriched,
          tab_party,
        },
        200,
      ),
    );
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


