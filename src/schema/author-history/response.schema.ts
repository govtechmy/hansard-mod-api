import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const authorHistoryItemSchema = z.object({
  record_id: z.number(),
  author_id: z.number(),
  party: z.string().nullable(),
  area_id: z.number().nullable(),
  exec_posts: z.string().nullable(),
  service_posts: z.string().nullable(),
  start_date: z.string(),
  end_date: z.string().nullable(),
});

export const getAuthorHistoryResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.array(authorHistoryItemSchema),
});


