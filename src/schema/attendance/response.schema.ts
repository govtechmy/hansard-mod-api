import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

const chartPointSchema = z.object({ x: z.string(), y: z.number() });

export const attendanceResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.object({
    charts: z.object({
      sex: z.array(chartPointSchema),
      age: z.array(chartPointSchema),
      ethnicity: z.array(chartPointSchema),
    }),
    tab_individual: z.array(
      z.object({
        name: z.string(),
        ethnicity: z.string(),
        sex: z.string(),
        age: z.number().nullable(),
        party: z.string().nullable(),
        area: z.any().nullable(),
        total_attended: z.number(),
        attendance_pct: z.number(),
        total: z.number(),
        rank: z.number(),
        age_group: z.string(),
      }),
    ),
    tab_party: z.array(
      z.object({
        party: z.string(),
        attendance_pct: z.number(),
        total_attended: z.number(),
        total: z.number(),
        total_seats: z.number(),
      }),
    ),
  }),
});


