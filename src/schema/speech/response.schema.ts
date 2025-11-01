import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";
import { speechItemSchema } from "./request.schema";

// Raw payload for POST /speech
export const speechBulkResponseSchema = z.array(speechItemSchema.partial({ sitting_id: true }));


