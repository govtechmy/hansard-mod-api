import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";
import { speechItemSchema } from "./request.schema";

export const speechBulkResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(201),
  data: z.array(speechItemSchema.partial({ sitting_id: true })),
});


