import type { FastifyReply, FastifyRequest } from "fastify";
import { Op } from "sequelize";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";
import { HOUSE_TO_CODE, type House } from "@/types/enum";

type GetSittingQuery = {
  house: House;
  date: string; // YYYY-MM-DD
};

type UpsertSittingBody = {
  filename: string;
  house: House;
  date: string; // YYYY-MM-DD
  speech_data: string; // JSON string of list[dict]
};

function addToNestedResult(levels: (string | null)[], data: any, result: any[]) {
  if (!levels.filter(Boolean).length) {
    result.push(data);
    return;
  }

  let currentLevel = result as any[];
  for (const level of levels) {
    if (!level) continue;
    let found: any = null;
    for (const item of currentLevel) {
      if (level in item) {
        found = item;
        break;
      }
    }
    if (!found) {
      const newEntry: Record<string, any[]> = { [level]: [] };
      currentLevel.push(newEntry);
      currentLevel = newEntry[level]!;
    } else {
      currentLevel = found[level]!;
    }
  }

  currentLevel.push(data);
}

function speechesToNestedJson(speechData: Array<Record<string, any>>): any[] {
  const result: any[] = [];
  for (const row of speechData) {
    const speechDict = {
      speech: row["proc_speech"],
      author: row["author"] ?? null,
      author_id: row["speaker"] != null ? Number(row["speaker"]) : null,
      timestamp: row["timestamp"],
      is_annotation: Boolean(row["is_annotation"]),
      index: Number(row["index"]),
    } as const;

    const levels = [row["level_1"], row["level_2"], row["level_3"]] as (string | null)[];
    addToNestedResult(levels, speechDict, result);
  }
  return result;
}

export async function getSitting(
  request: FastifyRequest<{ Querystring: GetSittingQuery }>,
  reply: FastifyReply,
) {
  try {
    const { Sitting, ParliamentaryCycle } = request.server.models as any;
    const houseType = request.query.house as House | undefined;
    const house = houseType != null ? HOUSE_TO_CODE[houseType] : null;
    if (houseType == null || house == null) {
      return reply.code(400).type("text/plain").send("House type not valid.");
    }

    const dateStr = request.query.date;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return reply.code(400).type("text/plain").send("Invalid date format. Date should be in YYYY-MM-DD format.");
    }

    const sitting = await Sitting.findOne({
      include: [{ model: ParliamentaryCycle, as: "cycle", required: true, where: { house } }],
      where: { date: dateStr },
      raw: true,
      nest: true,
    });

    if (!sitting) {
      return reply.code(404).type("text/plain").send("Sitting ID does not exist.");
    }

    const data = {
      meta: {
        sitting_id: sitting.sitting_id,
        cycle_id: sitting.cycle_id,
        date: sitting.date,
        filename: sitting.filename,
        has_dataset: sitting.has_dataset,
        is_final: sitting.is_final,
      },
      speeches: JSON.parse(sitting.speech_data ?? "[]"),
    };
    return reply.send(data);
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? "Bad Request" });
  }
}

export async function upsertSitting(
  request: FastifyRequest<{ Body: UpsertSittingBody }>,
  reply: FastifyReply,
) {
  try {
    const { ParliamentaryCycle, Sitting, Speech, AuthorHistory } = request.server.models as any;

    // Check existing by filename
    const { filename, house: houseType, date: dateStr } = request.body;
    const house = HOUSE_TO_CODE[houseType];
    if (house == null) {
      return reply.code(400).send({ error: "House type not valid." });
    }
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return reply.code(400).send({ error: "Invalid date format. Date should be in YYYY-MM-DD format." });
    }

    let existing = await Sitting.findOne({ where: { filename } });

    // Resolve cycle_id for date range and house
    const cycle = await ParliamentaryCycle.findOne({
      where: {
        house,
        start_date: { [Op.lte]: dateStr },
        end_date: { [Op.gte]: dateStr },
      },
      raw: true,
    });
    if (!cycle) {
      return reply.code(400).send({ error: "Parliamentary cycle not found for date/house." });
    }

    // Prepare speech_data JSON for catalogue (nested levels)
    let rawSpeechList: any[] = [];
    try {
      rawSpeechList = JSON.parse(request.body.speech_data ?? "[]");
    } catch {
      // If invalid JSON, still follow Django behavior: create/update sitting and return 201 with error
    }
    let nestedSpeechJson: any[] = [];
    if (Array.isArray(rawSpeechList) && rawSpeechList.length) {
      nestedSpeechJson = speechesToNestedJson(rawSpeechList);
    }

    let sitting: any;
    if (existing) {
      await Speech.destroy({ where: { sitting_id: existing.sitting_id } });
      await existing.update({
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      });
      sitting = existing;
    } else {
      sitting = await Sitting.create({
        filename,
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      });
    }

    // Try to bulk create Speech rows if we have valid raw speech list
    try {
      if (Array.isArray(rawSpeechList) && rawSpeechList.length) {
        // Identify active AuthorHistory records for the sitting date
        const authorIds = Array.from(
          new Set(
            rawSpeechList
              .map((r: any) => r?.speaker)
              .filter((v: any) => v !== null && v !== undefined)
              .map((v: any) => Number(v)),
          ),
        );

        const activeHistoryRecords = await AuthorHistory.findAll({
          where: {
            author_id: { [Op.in]: authorIds },
            start_date: { [Op.lte]: dateStr },
            [Op.or]: [{ end_date: { [Op.gte]: dateStr } }, { end_date: { [Op.is]: null } }],
          },
          raw: true,
        });

        const authorHistoryLookup = new Map<number, number>();
        // Prefer records with end_date (more specific) first
        for (const rec of activeHistoryRecords.filter((r: any) => r.end_date != null)) {
          authorHistoryLookup.set(rec.author_id, rec.record_id);
        }
        for (const rec of activeHistoryRecords.filter((r: any) => r.end_date == null)) {
          if (!authorHistoryLookup.has(rec.author_id)) authorHistoryLookup.set(rec.author_id, rec.record_id);
        }

        const speechRows = rawSpeechList
          .filter((row: any) => !Boolean(row?.is_annotation))
          .map((row: any) => {
            const authorId = row?.speaker != null ? Number(row.speaker) : null;
            const authorHistoryId = authorId != null ? authorHistoryLookup.get(authorId) ?? null : null;
            return {
              sitting_id: sitting.sitting_id,
              index: Number(row.index),
              speaker_id: authorHistoryId,
              timestamp: row.timestamp,
              speech: row.speech,
              speech_tokens: Array.isArray(row.speech_tokens) ? row.speech_tokens : [],
              length: Number(row.length ?? 0),
              level_1: row.level_1 ?? null,
              level_2: row.level_2 ?? null,
              level_3: row.level_3 ?? null,
              is_annotation: Boolean(row.is_annotation),
            };
          });

        const created = await Speech.bulkCreate(speechRows, { returning: true, validate: true });
        if (created.length !== speechRows.length) {
          return reply
            .code(201)
            .send({ sitting: sitting?.toJSON?.() ?? sitting, warning: `Data integrity issue: ${created.length} speeches created but ${speechRows.length} expected` });
        }
        return reply.code(201).send(sitting?.toJSON?.() ?? sitting);
      }
      // No raw speech list (invalid JSON or empty)
      return reply
        .code(201)
        .send({ sitting: sitting?.toJSON?.() ?? sitting, speech_errors: "Invalid JSON in speech_data" });
    } catch (e: any) {
      // Speech creation failed; still return 201 with error details
      return reply
        .code(201)
        .send({ sitting: sitting?.toJSON?.() ?? sitting, speech_errors: e?.message ?? String(e) });
    }
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? "Bad Request" });
  }
}


