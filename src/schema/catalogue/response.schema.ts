import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

const sittingItemSchema = z.object({
  sitting_id: z.number(),
  date: z.string(),
  filename: z.string(),
  is_final: z.boolean(),
});

const meetingNodeSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  sitting_list: z.array(sittingItemSchema).optional(),
});

const sessionNodeSchema = z
  .object({
    start_date: z.string(),
    end_date: z.string(),
  })
  .catchall(meetingNodeSchema);

const termNodeSchema = z
  .object({
    start_date: z.string(),
    end_date: z.string(),
  })
  .catchall(sessionNodeSchema);

export const catalogueDataSchema = z.object({
  catalogue_list: z.record(z.string(), termNodeSchema),
  total_count: z.number(),
});

// Raw payload for GET /catalogue
export const getCatalogueResponseSchema = catalogueDataSchema;


