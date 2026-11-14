import { z } from "zod";
import type { JournalState, ParsedCodex } from "./models";

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

const ownerEnum = owner;
const ruleLevel = z.enum(["MUST", "SHOULD"]);

export const CodexDtoSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    path: z.string(),
    mtimeMs: z.number(),
    title: z.string(),
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        blocks: z.array(
          z.discriminatedUnion("kind", [
            z.object({ kind: z.literal("rule"), ruleId: z.string() }),
            z.object({ kind: z.literal("text"), text: z.string() }),
          ])
        ),
      })
    ),
    rules: z.array(
      z.object({ id: z.string(), level: ruleLevel, text: z.string(), line: z.number() })
    ),
    checklists: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        items: z.array(
          z.object({ id: z.string(), text: z.string(), ruleRefs: z.array(z.string()) })
        ),
      })
    ),
    warnings: z.array(
      z.object({
        kind: z.enum(["duplicate-id", "unknown-ref"]),
        message: z.string(),
        line: z.number(),
      })
    ),
    wikilinks: z.array(z.string()),
    counts: z.object({ must: count, should: count }),
  }),
  z.object({ status: z.literal("missing"), path: z.string() }),
  z.object({ status: z.literal("config-error"), message: z.string() }),
]);
export type CodexDto = z.infer<typeof CodexDtoSchema>;

const RunDtoSchema = z.object({
  run: z.string(),
  owner: ownerEnum,
  checklist: z.string(),
  task: z.string(),
  startedAt: z.string(),
  ended: z.boolean(),
  items: z.record(z.string(), z.object({ checked: z.boolean(), note: z.string() })),
});
export type RunDto = z.infer<typeof RunDtoSchema>;

const JournalDtoSchema = z.object({
  runs: z.array(RunDtoSchema),
  eventCount: count,
  skippedLines: count,
  unterminatedTail: z.boolean(),
});

export const ChecklistStateDtoSchema = z.object({
  month: z.string(),
  personal: JournalDtoSchema,
  work: z.union([JournalDtoSchema, z.object({ blocked: z.string() })]),
});
export type ChecklistStateDto = z.infer<typeof ChecklistStateDtoSchema>;

export function toCodexDto(
  result:
    | { status: "ok"; path: string; mtimeMs: number; parsed: ParsedCodex }
    | { status: "missing"; path: string }
    | { status: "config-error"; message: string }
): CodexDto {
  if (result.status !== "ok") return result;
  const { parsed } = result;
  return {
    status: "ok",
    path: result.path,
    mtimeMs: result.mtimeMs,
    title: parsed.title,
    sections: parsed.sections,
    rules: parsed.rules,
    checklists: parsed.checklists,
    warnings: parsed.warnings,
    wikilinks: parsed.wikilinks,
    counts: {
      must: parsed.rules.filter((r) => r.level === "MUST").length,
      should: parsed.rules.filter((r) => r.level === "SHOULD").length,
    },
  };
}

export function toChecklistStateDto(state: {
  month: string;
  personal: JournalState;
  work: JournalState | { blocked: string };
}): ChecklistStateDto {
  return { month: state.month, personal: state.personal, work: state.work };
}
