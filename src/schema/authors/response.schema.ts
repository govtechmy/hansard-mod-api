import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const authorItemSchema = z.object({
  new_author_id: z.number(),
  name: z.string(),
  birth_year: z.number().nullable(),
  ethnicity: z.string(),
  sex: z.enum(["m", "f"]),
});

export const getAuthorsResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.array(authorItemSchema),
});


