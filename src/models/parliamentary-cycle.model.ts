import type { FastifyInstance } from "fastify";
import type { ParliamentaryCycle } from "@/types/entities";

export interface CreateParliamentaryCycleInput {
  start_date: string;
  end_date: string;
  house: number;
  term: number;
  session: number;
  meeting: number;
}

export async function insertParliamentaryCycle(app: FastifyInstance, input: CreateParliamentaryCycleInput): Promise<ParliamentaryCycle> {
  const sql = `
    INSERT INTO api_parliamentary_cycle (start_date, end_date, house, term, session, meeting)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING cycle_id, start_date, end_date, house, term, session, meeting
  `;
  const params = [
    input.start_date,
    input.end_date,
    input.house,
    input.term,
    input.session,
    input.meeting,
  ];
  const { rows } = await app.pg.query(sql, params);
  return rows[0] as ParliamentaryCycle;
}


