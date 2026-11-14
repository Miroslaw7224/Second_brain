import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CatalogDtoSchema,
  DeployInstructionsDtoSchema,
  type ArsenalEntryDto,
  type CatalogDto,
  type DeployInstructionsDto,
  type DeployModeDto,
} from "@/contexts/bc_arsenal/schemas";
import { EMPTY_FILTERS, filterEntries, type ArsenalFilters } from "./arsenalFilters";

export type ApiFetch = (url: string, options?: RequestInit) => Promise<Response>;

async function errorText(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : `Błąd ${res.status}`;
}

export function useArsenal(apiFetch: ApiFetch) {
  const [catalog, setCatalog] = useState<CatalogDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ArsenalFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/arsenal");
      if (!res.ok) throw new Error(await errorText(res));
      setCatalog(CatalogDtoSchema.parse(await res.json()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać Arsenału");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const allEntries = useMemo<ArsenalEntryDto[]>(() => catalog?.entries ?? [], [catalog]);
  const entries = useMemo(() => filterEntries(allEntries, filters), [allEntries, filters]);
  const selected = useMemo(
    () => allEntries.find((e) => e.id === selectedId) ?? null,
    [allEntries, selectedId]
  );

  const fetchInstructions = useCallback(
    async (slug: string, project: string, mode: DeployModeDto): Promise<DeployInstructionsDto> => {
      const url = `/api/arsenal/skills/${encodeURIComponent(slug)}/deploy?project=${encodeURIComponent(project)}&mode=${mode}`;
      const res = await apiFetch(url);
      if (!res.ok) throw new Error(await errorText(res));
      return DeployInstructionsDtoSchema.parse(await res.json());
    },
    [apiFetch]
  );

  const markDeployed = useCallback(
    async (slug: string, project: string, mode: DeployModeDto): Promise<void> => {
      const res = await apiFetch(`/api/arsenal/skills/${encodeURIComponent(slug)}/deployed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, mode }),
      });
      if (!res.ok) throw new Error(await errorText(res));
      await load();
    },
    [apiFetch, load]
  );

  return {
    loading,
    error,
    total: allEntries.length,
    skipped: catalog?.skipped ?? 0,
    targets: catalog?.targets ?? [],
    allEntries,
    entries,
    filters,
    setFilters,
    selected,
    selectedId,
    setSelectedId,
    fetchInstructions,
    markDeployed,
  };
}
