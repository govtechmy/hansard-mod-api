import type { FastifyInstance } from "fastify";
import { getAttendance } from "@/controllers/attendance.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { attendanceQuerySchema, attendanceResponseSchema } from "@/schema";

export async function registerAttendanceRoutes(app: FastifyInstance) {
  app.get(
    "/attendance",
    {
      schema: {
        tags: ["Attendance"],
        summary: "Attendance statistics by term/session/meeting",
        querystring: attendanceQuerySchema,
        response: withStandardErrors({ 200: attendanceResponseSchema }),
      },
    },
    getAttendance,
  );
}


