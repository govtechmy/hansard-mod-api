import { z } from "zod";
import { HOUSE } from "@/types/enum";

export const createCycleBodySchema = z.object({
    start_date: z.string().min(1),
    end_date: z.string().min(1),
    house: z.number().int().min(0).max(2),
    term: z.number().int(),
    session: z.number().int(),
    meeting: z.number().int(),
});

export const catalogueQuerySchema = z.object({
    house: z.enum(HOUSE).optional(),
    term: z.coerce.number().optional(),
    dropdown: z.string().optional(),
});