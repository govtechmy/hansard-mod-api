import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const autocompleteResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.object({
    suggestions: z.array(z.string()),
    query: z.string(),
  }),
});


