import type { FastifyInstance } from "fastify";
import { createSchool, getSchoolById, listSchools } from "../controllers/schools.controller";
import { createSchoolBodySchema, type CreateSchoolBody } from "@/types/schema";

export async function registerSchoolRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/schools",
    { schema: { tags: ["Schools"], summary: "List schools" } },
    listSchools
  );

  app.post<{ Body: CreateSchoolBody }>(
    "/schools",
    { schema: { body: createSchoolBodySchema, tags: ["Schools"], summary: "Create a school" } },
    createSchool
  );

  app.get<{ Params: { id: string } }>(
    "/schools/:id",
    { schema: { tags: ["Schools"], summary: "Get school by ID" } },
    getSchoolById
  );
}


