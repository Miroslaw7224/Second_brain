import { listProjects } from "@/contexts/bc_projects/services";
import {
  SUMMARY_MAX,
  type ArsenalCatalog,
  type DeployMode,
  type DeployTarget,
  type Deployment,
  type PromptEntry,
  type RawFile,
  type SkillEntry,
} from "./models";
import { readPromptFiles, readSkillFiles, readTemplates } from "./repositories";

const cmp = (a: string, b: string): number => a.localeCompare(b, "pl");

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === "string" && v.trim() !== "")
        .map((v) => v.trim())
    : [];

/** Jedna linia do `max` znaków; dłuższe kończy się „…”. */
export function truncate(text: string, max: number = SUMMARY_MAX): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const match = /^(.+?[.!?])(?:\s|$)/.exec(flat);
  return match ? match[1] : flat;
}

/** Pierwsza niepusta linia treści bez znaczników nagłówka, cytatu i listy; separatory `---` są pomijane. */
export function firstBodyLine(body: string): string {
  for (const line of body.split("\n")) {
    const text = line.replace(/^[#>\-*\s]+/, "").trim();
    if (text !== "" && !text.startsWith("```")) return text;
  }
  return "";
}

function dateText(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return undefined;
}

/** Wpisy `deployed` o poprawnym kształcie oraz liczba odrzuconych. */
export function parseDeployments(raw: unknown): { valid: Deployment[]; dropped: number } {
  if (raw === undefined || raw === null) return { valid: [], dropped: 0 };
  if (!Array.isArray(raw)) return { valid: [], dropped: 1 };
  const valid: Deployment[] = [];
  let dropped = 0;
  for (const item of raw) {
    const o = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const project = str(o.project);
    const date = dateText(o.date);
    if (
      project !== undefined &&
      date !== undefined &&
      (o.mode === "full" || o.mode === "adapted")
    ) {
      valid.push({ project, mode: o.mode as DeployMode, date });
    } else {
      dropped += 1;
    }
  }
  return { valid, dropped };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseSkill(
  file: RawFile,
  known: ReadonlySet<string>
): { entry: SkillEntry | null; skipped: number } {
  const { parsed, key } = file;
  if (parsed === null) return { entry: null, skipped: 1 };
  const { meta, body } = parsed;
  const name = str(meta.name);
  if (
    meta.type !== "skill-doc" ||
    name === undefined ||
    str(meta.slug) !== key ||
    !SLUG_RE.test(key)
  ) {
    return { entry: null, skipped: 1 };
  }
  const { valid, dropped } = parseDeployments(meta.deployed);
  const deployed = valid.filter((d) => known.has(d.project));
  const origin = str(meta.origin);
  const summary = str(meta.summary) ?? firstSentence(str(meta.description) ?? "");
  return {
    entry: {
      kind: "skill",
      id: `skill:${key}`,
      path: file.path,
      name,
      slug: key,
      summary: truncate(summary),
      ...(origin !== undefined && { origin }),
      body,
      deployed,
      templates: readTemplates(key),
    },
    skipped: dropped + (valid.length - deployed.length),
  };
}

function parsePrompt(file: RawFile): PromptEntry | null {
  const { parsed, key } = file;
  if (parsed === null || parsed.meta.type !== "prompt") return null;
  const { meta, body } = parsed;
  const model = str(meta.model);
  return {
    kind: "prompt",
    id: `prompt:${key}`,
    path: file.path,
    name: str(meta.name) ?? key,
    summary: truncate(str(meta.summary) ?? firstBodyLine(body)),
    body,
    ...(model !== undefined && { model }),
    projects: stringList(meta.projects),
  };
}

/** Katalog skilli i promptów oraz projekty docelowe (wszystkie z rejestru, także `owner: work`). */
export function listArsenal(): ArsenalCatalog {
  const { projects } = listProjects();
  const targets: DeployTarget[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    localPath: p.localPath,
    owner: p.owner,
  }));
  const known = new Set(targets.map((t) => t.id));

  let skipped = 0;
  const skills: SkillEntry[] = [];
  for (const file of readSkillFiles()) {
    const result = parseSkill(file, known);
    skipped += result.skipped;
    if (result.entry !== null) skills.push(result.entry);
  }
  const prompts = readPromptFiles()
    .map(parsePrompt)
    .filter((p): p is PromptEntry => p !== null);

  skills.sort((a, b) => cmp(a.name, b.name));
  prompts.sort((a, b) => cmp(a.name, b.name));
  return { entries: [...skills, ...prompts], targets, skipped };
}
