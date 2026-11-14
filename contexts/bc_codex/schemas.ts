import { z } from "zod";

const owner = z.enum(["personal", "work"]);
const projectId = z.string().min(1).max(100).optional();
const runId = z.string().min(1).max(60);
const itemId = z.string().min(1).max(120);
const oneLine = z
  .string()
  .max(300)
  .refine((value) => !/[\r\n]/.test(value), "Tekst musi być jedną linią");
const count = z.number().int().nonnegative();

/**
 * Wejście `POST /api/nexus/checklists`. `owner` jest wymagane (routing strefy zapisu wynika wyłącznie
 * z niego); `ts` nadaje serwer, `run` dla `start` też.
 */
export const ChecklistEventInputSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("start"),
    owner,
    projectId,
    checklist: z.string().min(1).max(100),
    task: oneLine,
  }),
  z.strictObject({
    type: z.literal("toggle"),
    owner,
    projectId,
    run: runId,
    item: itemId,
    checked: z.boolean(),
  }),
  z.strictObject({
    type: z.literal("note"),
    owner,
    projectId,
    run: runId,
    item: itemId,
    text: oneLine,
  }),
  z.strictObject({
    type: z.literal("end"),
    owner,
    projectId,
    run: runId,
    done: count,
    total: count,
  }),
]);

export type ChecklistEventInputDto = z.infer<typeof ChecklistEventInputSchema>;
