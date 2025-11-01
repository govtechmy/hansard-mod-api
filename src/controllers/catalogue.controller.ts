import type { FastifyReply, FastifyRequest } from "fastify";
import { Op, fn, col } from "sequelize";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";
import { HOUSE_TO_CODE, HOUSE_CODE, type House } from "@/types/enum";

type CatalogueQuery = {
  house?: string;
  term?: string | number;
  dropdown?: string | null;
};

export async function getCatalogue(
  request: FastifyRequest<{ Querystring: CatalogueQuery }>,
  reply: FastifyReply,
) {
  try {
    const { ParliamentaryCycle, Sitting } = request.server.models as any;

    const houseType = (request.query.house ?? "dewan-rakyat") as House;
    const house = HOUSE_TO_CODE[houseType] ?? HOUSE_CODE.DEWAN_RAKYAT;
    const isDropdown = request.query.dropdown ?? null;
    const termFilter = request.query.term ? Number(request.query.term) : 15;

    const baseWhere = { house } as any;
    if (termFilter) baseWhere.term = termFilter;

    // Terms with start/end date
    const termRows = await ParliamentaryCycle.findAll({
      where: baseWhere,
      attributes: [
        "term",
        [fn("min", col("start_date")), "start_date"],
        [fn("max", col("end_date")), "end_date"],
      ],
      group: ["term"],
      raw: true,
    });

    const cycleMap: Record<string, any> = {};
    for (const term of termRows) {
      const termId = term.term;
      cycleMap[termId] = { start_date: term.start_date, end_date: term.end_date } as any;

      // Sessions per term
      const sessionRows = await ParliamentaryCycle.findAll({
        where: { ...baseWhere, term: termId },
        attributes: [
          "session",
          [fn("min", col("start_date")), "start_date"],
          [fn("max", col("end_date")), "end_date"],
        ],
        group: ["session"],
        raw: true,
      });

      for (const session of sessionRows) {
        const sessionId = session.session;
        cycleMap[termId][sessionId] = { start_date: session.start_date, end_date: session.end_date } as any;

        // Meetings per session
        const meetingRows = await ParliamentaryCycle.findAll({
          where: { ...baseWhere, term: termId, session: sessionId },
          attributes: [
            "meeting",
            [fn("min", col("start_date")), "start_date"],
            [fn("max", col("end_date")), "end_date"],
          ],
          group: ["meeting"],
          raw: true,
        });

        for (const meeting of meetingRows) {
          const meetingId = meeting.meeting;
          cycleMap[termId][sessionId][meetingId] = {
            start_date: meeting.start_date,
            end_date: meeting.end_date,
          } as any;
          if (!isDropdown) {
            cycleMap[termId][sessionId][meetingId]["sitting_list"] = [];
          }
        }
      }
    }

    // Sittings for this house (and term if provided)
    const sittingWhere: any = { "$cycle.house$": house };
    if (termFilter) sittingWhere["$cycle.term$"] = termFilter;

    const sittings = await Sitting.findAll({
      include: [{ model: ParliamentaryCycle, as: "cycle", attributes: ["term", "session", "meeting"], required: true }],
      where: sittingWhere,
      order: [["date", "ASC"]],
      raw: true,
      nest: true,
    });

    const total_count = await Sitting.count({ include: [{ model: ParliamentaryCycle, as: "cycle", required: true }], where: sittingWhere });

    if (!isDropdown) {
      for (const s of sittings) {
        const term = s.cycle.term;
        const session = s.cycle.session;
        const meeting = s.cycle.meeting;
        const sittingData = {
          sitting_id: s.sitting_id,
          date: s.date,
          filename: s.filename,
          is_final: s.is_final,
        };
        cycleMap[term][session][meeting]["sitting_list"].push(sittingData);
      }
    }

    const data = { catalogue_list: cycleMap, total_count };
    return reply.send(createSuccessResponse(data, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


