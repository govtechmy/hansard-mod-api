import type { FastifyInstance } from "fastify";
import type { Author } from "@/types/entities";

export async function listAuthors(app: FastifyInstance): Promise<Author[]> {
  const sql = `
    SELECT new_author_id, name, birth_year, ethnicity, sex
    FROM api_author
    ORDER BY new_author_id ASC
  `;
  const { rows } = await app.pg.query(sql);
  return rows as Author[];
}


