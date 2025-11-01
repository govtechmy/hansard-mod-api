import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

// Raw payload for GET /autocomplete
export const autocompleteResponseSchema = z.object({
  suggestions: z.array(z.string()),
  query: z.string(),
});


