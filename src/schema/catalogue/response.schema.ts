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

export const getCatalogueResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: catalogueDataSchema,
});


