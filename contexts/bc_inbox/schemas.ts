import { z } from "zod";
import { looseObject } from "@/lib/schema/looseObject";
import type { InboxItem, MoveInput, MoveResult } from "./models";

/** Limit 500 = `MAX_INBOX_TEXT` z models (schemas nie importuje wartości z models; zgodność pilnuje test). */
export const CreateInboxItemSchema = looseObject({
  text: z.string().trim().min(1, "text required").max(500, "Maksymalnie 500 znaków"),
});

export type InboxItemDto = InboxItem;
export type InboxDto = { items: InboxItemDto[]; open: number; closed: number };

export function toInboxItemDto(i: InboxItem): InboxItemDto {
  return { id: i.id, text: i.text, type: i.type, at: i.at };
}

export function toInboxDto(items: InboxItem[], closed: number): InboxDto {
  return { items: items.map(toInboxItemDto), open: items.length, closed };
}

/** Jedna linia: białe znaki (w tym nowe linie) → spacja, przycięcie; potem limity. */
const oneLine = (max: number) =>
  z
    .string()
    .overwrite((v) => v.replace(/\s+/g, " ").trim())
    .min(1, "text required")
    .max(max, `Maksymalnie ${max} znaków`);

/** Kopia reguł `taskText` z `bc_projects/schemas` (schemas nie importuje innego kontekstu; `applyTaskOp` z serwisu niczego nie waliduje). */
const TRAILING_DONE_DATE_RE = /\s—\s\d{4}-\d{2}-\d{2}$/;
const PROJECT_TASK_MAX = 300;

/** Limity 500 = `MAX_INBOX_TEXT` z models (zgodność pilnuje test). */
export const MoveInboxItemSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("project"),
    projectId: z.string().trim().min(1, "projectId required"),
    column: z.enum(["next", "icebox"]),
    text: oneLine(PROJECT_TASK_MAX)
      .refine((v) => !v.includes("[now::]"), "Tekst nie może zawierać [now::]")
      .refine((v) => !TRAILING_DONE_DATE_RE.test(v), "Tekst nie może kończyć się datą ukończenia"),
  }),
  z.object({ target: z.literal("task"), text: oneLine(500) }),
  z.object({ target: z.literal("note"), title: oneLine(120), text: oneLine(500) }),
]);

/** Ciało `POST /api/inbox/[id]/move` (tekst jednoliniowy; schemat go normalizuje). */
export type MoveInboxBody = MoveInput;

export type MoveResultDto = { ok: true } & MoveResult;

export function toMoveResultDto(r: MoveResult): MoveResultDto {
  const dto: MoveResultDto = { ok: true, target: r.target, ref: r.ref };
  if (r.warning !== undefined) dto.warning = r.warning;
  return dto;
}
