import type { FastifyInstance } from "fastify";
import type { AuthorHistory } from "@/types/entities";

export async function listAuthorHistory(app: FastifyInstance): Promise<AuthorHistory[]> {
  const sql = `
    SELECT record_id, author_id, party, area_id, exec_posts, service_posts, start_date, end_date
    FROM api_author_history
    ORDER BY record_id ASC
  `;
  const { rows } = await app.pg.query(sql);
  return rows as AuthorHistory[];
}


