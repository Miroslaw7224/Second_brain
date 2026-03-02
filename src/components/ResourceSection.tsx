import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import { ExternalLink, Copy, Trash2, Loader2, Plus, ChevronDown, Star, Pencil, X } from "lucide-react";

type TranslationDict = Record<string, string | string[]>;

export interface NoteResource {
  id: string;
  noteId?: string;
  userId: string;
  description: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  tags: string[];
  isFavorite?: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

interface ResourceSectionContextValue {
  resources: NoteResource[];
  setResources: React.Dispatch<React.SetStateAction<NoteResource[]>>;
  loading: boolean;
  allTags: string[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearTagFilter: () => void;
  filteredResources: NoteResource[];
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  t: TranslationDict;
}

const ResourceSectionContext = createContext<ResourceSectionContextValue | null>(null);

function useResourceSection() {
  const ctx = useContext(ResourceSectionContext);
  if (!ctx) throw new Error("ResourceSection must be used within ResourceSectionProvider");
  return ctx;
}

interface ResourceSectionProps {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  t: TranslationDict;
}

/** Panel filtrów po tagach – do renderowania obok lewego paska (w App). */
export function ResourceFilterSidebar() {
  const ctx = useResourceSection();
  const { allTags, selectedTags, toggleTag, clearTagFilter, loading, resources } = ctx;
  const filterByTagsLabel = (ctx.t.resourceFilterByTags as string) ?? "Filter by tags";
  const clearFiltersLabel = (ctx.t.resourceClearFilters as string) ?? "Clear filters";

  if (loading || resources.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[var(--text)]">{filterByTagsLabel}</p>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
              selectedTags.includes(tag)
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg3)] text-[var(--text)] hover:bg-[var(--border)]"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={clearTagFilter}
          className="text-sm text-[var(--text2)] hover:text-[var(--text)] font-medium"
        >
          {clearFiltersLabel}
        </button>
      )}
    </div>
  );
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=48`;
  } catch {
    return "";
  }
}

/** Parsuje blok w formacie: Opis: ... URL: ... Tagi: ... (lub Description: / Tags:) */
function parseBlockFormat(
  text: string
): { description: string; url: string; tags: string[] } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  let description = "";
  let url = "";
  const tags: string[] = [];
  const keyRe = /^(Opis|Description|URL|Tagi|Tags):\s*(.*)$/i;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(keyRe);
    if (m) {
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (key === "opis" || key === "description") {
        const parts = [value];
        i++;
        while (i < lines.length && !lines[i].match(keyRe)) {
          parts.push(lines[i].trim());
          i++;
        }
        description = parts.join(" ").trim();
        continue;
      }
      if (key === "url") {
        url = value;
        i++;
        continue;
      }
      if (key === "tagi" || key === "tags") {
        let tagLine = value;
        i++;
        while (i < lines.length && !lines[i].match(keyRe)) {
          tagLine += " " + lines[i].trim();
          i++;
        }
        tags.push(
          ...tagLine
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
        );
        continue;
      }
    }
    i++;
  }
  if (!url) return null;
  if (!description) description = url;
  return { description, url, tags };
}

/** Dzieli tekst na wiele bloków (każdy zaczyna się od Opis: / Description:) i parsuje je. */
function parseMultipleBlocks(
  text: string
): { description: string; url: string; tags: string[] }[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const blocks: string[] = [];
  const re = /(\n\s*)(?=(?:Opis|Description):\s*)/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    blocks.push(trimmed.slice(lastIndex, m.index).trim());
    lastIndex = m.index + m[1].length;
  }
  blocks.push(trimmed.slice(lastIndex).trim());
  const results: { description: string; url: string; tags: string[] }[] = [];
  for (const block of blocks) {
    const parsed = parseBlockFormat(block);
    if (parsed) results.push(parsed);
  }
  return results;
}

export function ResourceSection({ apiFetch, t }: ResourceSectionProps) {
  const [resources, setResources] = useState<NoteResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDescription, setAddDescription] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addTags, setAddTags] = useState("");
  const [adding, setAdding] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [blockFormatText, setBlockFormatText] = useState("");
  const [blockFormatError, setBlockFormatError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formExpanded, setFormExpanded] = useState(true);
  const [blockFormatExpanded, setBlockFormatExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingResource, setEditingResource] = useState<NoteResource | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    url: "",
    tags: "",
    isFavorite: false,
  });

  const allTags = useMemo(
    () => [...new Set(resources.flatMap((r) => r.tags || []))].sort(),
    [resources]
  );

  const filteredResources = useMemo(() => {
    let list = resources;
    if (selectedTags.length > 0) {
      list = list.filter((r) =>
        (r.tags || []).some((t) => selectedTags.includes(t))
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.title ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          (r.url ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aFav = a.isFavorite === true ? 1 : 0;
      const bFav = b.isFavorite === true ? 1 : 0;
      return bFav - aFav;
    });
  }, [resources, selectedTags, searchQuery]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTagFilter = () => setSelectedTags([]);

  const resourceDescriptionPlaceholder = (t.resourceDescriptionPlaceholder as string) ?? "Description (e.g. Color picker for project)";
  const resourceUrlPlaceholder = (t.resourceUrlPlaceholder as string) ?? "URL";
  const resourceTagsPlaceholder = (t.resourceTagsPlaceholder as string) ?? "Tags (comma-separated, optional)";
  const addResourceLabel = (t.addResource as string) ?? "Add resource";
  const copiedLabel = (t.resourceCopied as string) ?? "Copied!";
  const titleUnavailableLabel = (t.resourceTitleUnavailable as string) ?? "(title unavailable)";
  const deleteConfirmLabel = (t.resourceDeleteConfirm as string) ?? "Delete this resource?";
  const noResourcesLabel = (t.resourceNoResources as string) ?? "No resources yet. Add your first link.";
  const blockFormatLabel = (t.resourceBlockFormatLabel as string) ?? "Or paste in block format:";
  const blockFormatPlaceholder =
    (t.resourceBlockFormatPlaceholder as string) ??
    "Opis: Short description of the resource.\nURL: https://example.com\nTagi: tag1, tag2, tag3";
  const blockFormatHint = (t.resourceBlockFormatHint as string) ?? "Multiple resources: start each new block on a new line with \"Opis:\" or \"Description:\".";
  const addFromBlockLabel = (t.resourceAddFromBlock as string) ?? "Add from pasted block";
  const blockFormatErrorLabel = (t.resourceBlockFormatError as string) ?? "Could not parse. Required: URL: and Opis: (or Description:).";
  const filterByTagsLabel = (t.resourceFilterByTags as string) ?? "Filter by tags";
  const clearFiltersLabel = (t.resourceClearFilters as string) ?? "Clear filters";
  const noMatchingTagsLabel = (t.resourceNoMatchingTags as string) ?? "No resources match the selected tags.";
  const editTagsLabel = (t.resourceEditTags as string) ?? "Edit tags";
  const resourceFavoriteLabel = (t.resourceFavorite as string) ?? "Favorite";
  const resourceEditLabel = (t.resourceEdit as string) ?? "Edit";
  const resourceSaveEditLabel = (t.resourceSaveEdit as string) ?? "Save";
  const resourceEditModalTitleLabel = (t.resourceEditModalTitle as string) ?? "Edit resource";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch("/api/resources")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setResources(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setResources([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const handleAdd = async () => {
    const description = addDescription.trim();
    const url = addUrl.trim();
    if (!description || !url) return;
    setAdding(true);
    try {
      const tags = addTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, url, tags }),
      });
      if (res.ok) {
        const resource = await res.json();
        setResources((prev) => [resource, ...prev]);
        setAddDescription("");
        setAddUrl("");
        setAddTags("");
      }
    } catch (err) {
      console.error("Add resource failed", err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddFromBlock = async () => {
    setBlockFormatError(null);
    const parsedList = parseMultipleBlocks(blockFormatText);
    if (parsedList.length === 0) {
      setBlockFormatError(blockFormatErrorLabel);
      return;
    }
    setAdding(true);
    const added: NoteResource[] = [];
    let hadError = false;
    try {
      for (const parsed of parsedList) {
        try {
          const res = await apiFetch("/api/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              description: parsed.description,
              url: parsed.url,
              tags: parsed.tags.length ? parsed.tags : undefined,
            }),
          });
          if (res.ok) {
            const resource = await res.json();
            added.push(resource);
          } else {
            hadError = true;
          }
        } catch {
          hadError = true;
        }
      }
      if (added.length > 0) {
        setResources((prev) => [...added, ...prev]);
        setBlockFormatText("");
        const count = added.length;
        const msg = count === 1
          ? ((t.resourceAddedOne as string) ?? "Added 1 resource")
          : ((t.resourceAddedCount as string) ?? `Added ${count} resources`).replace("{n}", String(count));
        setCopyMessage(msg);
        setTimeout(() => setCopyMessage(null), 3000);
      }
      if (hadError && added.length === 0) {
        setBlockFormatError(blockFormatErrorLabel);
      }
    } catch (err) {
      console.error("Add resources from block failed", err);
      setBlockFormatError(blockFormatErrorLabel);
    } finally {
      setAdding(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage(copiedLabel);
      setTimeout(() => setCopyMessage(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!window.confirm(deleteConfirmLabel)) return;
    try {
      await apiFetch(`/api/resources/${resourceId}`, {
        method: "DELETE",
      });
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error("Delete resource failed", err);
    }
  };

  const openEditModal = (r: NoteResource) => {
    setEditingResource(r);
    setEditForm({
      title: r.title ?? "",
      description: r.description ?? "",
      url: r.url ?? "",
      tags: (r.tags || []).join(", "),
      isFavorite: r.isFavorite === true,
    });
  };

  const closeEditModal = () => {
    setEditingResource(null);
  };

  const handleSaveEdit = async () => {
    if (!editingResource) return;
    const tags = editForm.tags
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: { title?: string; description?: string; url?: string; tags?: string[]; isFavorite?: boolean } = {};
    if (editForm.title.trim()) payload.title = editForm.title.trim();
    if (editForm.description.trim()) payload.description = editForm.description.trim();
    if (editForm.url.trim()) payload.url = editForm.url.trim();
    payload.tags = tags;
    payload.isFavorite = editForm.isFavorite;
    try {
      const res = await apiFetch(`/api/resources/${editingResource.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setResources((prev) =>
          prev.map((r) => (r.id === editingResource.id ? { ...r, ...updated, id: r.id } : r))
        );
        closeEditModal();
      }
    } catch (err) {
      console.error("Update resource failed", err);
    }
  };

  const handleToggleFavorite = async (r: NoteResource) => {
    const next = !r.isFavorite;
    try {
      const res = await apiFetch(`/api/resources/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: next }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((item) => (item.id === r.id ? { ...item, isFavorite: next } : item))
        );
      }
    } catch (err) {
      console.error("Toggle favorite failed", err);
    }
  };

  const tabResourcesLabel = (t.tabResources as string) ?? "Zasoby";
  const resourceSearchPlaceholder = (t.resourceSearchPlaceholder as string) ?? "Search by title, description or URL";
  const resourceFavoritesSectionTitle = (t.resourceFavoritesSectionTitle as string) ?? "Favorite links";

  return (
    <div style={{ display: "contents" }}>
      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">{tabResourcesLabel}</h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={resourceSearchPlaceholder}
          className="flex-1 max-w-xs px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
          aria-label={resourceSearchPlaceholder}
        />
      </div>
      <div className="flex-1 overflow-auto p-6 flex gap-6 min-h-0">
        {/* Lewa kolumna: Filtruj po tagach, Opis, Lub wklej – w tej kolejności */}
        <div className="flex-[1_1_0%] min-w-0 space-y-6 overflow-auto pr-2">
          {/* 1. Filtruj po tagach */}
          {!loading && resources.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--text)]">{filterByTagsLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg3)] text-[var(--text)] hover:bg-[var(--border)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={clearTagFilter}
                  className="text-sm text-[var(--text2)] hover:text-[var(--text)] font-medium"
                >
                  {clearFiltersLabel}
                </button>
              )}
            </div>
          )}

          {/* 2. Opis (np. Strona z kolorami do projektu) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-0">
            <button
              type="button"
              onClick={() => setFormExpanded((e) => !e)}
              className="w-full flex items-center justify-between gap-2 py-2 text-left text-base font-semibold text-[var(--text)] hover:text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
            >
              <span>{resourceDescriptionPlaceholder}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${formExpanded ? "rotate-180" : ""}`} />
            </button>
            {formExpanded && (
              <div className="space-y-3 pt-1">
                <input
                  type="text"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder={resourceDescriptionPlaceholder}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border-none rounded-xl text-base focus:ring-2 focus:ring-[var(--accent)]"
                />
                <input
                  type="url"
                  value={addUrl}
                  onChange={(e) => setAddUrl(e.target.value)}
                  placeholder={resourceUrlPlaceholder}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border-none rounded-xl text-base focus:ring-2 focus:ring-[var(--accent)]"
                />
                <input
                  type="text"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder={resourceTagsPlaceholder}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border-none rounded-xl text-base focus:ring-2 focus:ring-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={adding || !addDescription.trim() || !addUrl.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addResourceLabel}
                </button>
              </div>
            )}
          </div>

          {/* 3. Lub wklej w formacie blokowym */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
            <button
              type="button"
              onClick={() => setBlockFormatExpanded((e) => !e)}
              className="w-full flex items-center justify-between gap-2 py-2 text-left text-base font-semibold text-[var(--text)] hover:text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
            >
              <span>{blockFormatLabel}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${blockFormatExpanded ? "rotate-180" : ""}`} />
            </button>
            {blockFormatExpanded && (
              <div className="pt-2 space-y-2">
                <textarea
                  value={blockFormatText}
                  onChange={(e) => {
                    setBlockFormatText(e.target.value);
                    setBlockFormatError(null);
                  }}
                  placeholder={blockFormatPlaceholder}
                  rows={4}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border-none rounded-xl text-base focus:ring-2 focus:ring-[var(--accent)] resize-y font-mono text-sm"
                />
                <p className="text-xs text-[#6B7280]">{blockFormatHint}</p>
                <button
                  type="button"
                  onClick={handleAddFromBlock}
                  disabled={adding || !blockFormatText.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--text2)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--text)] transition-all disabled:opacity-50 disabled:hover:bg-[var(--text2)]"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {addFromBlockLabel}
                </button>
                {blockFormatError && (
                  <p className="text-sm text-red-600 font-medium">{blockFormatError}</p>
                )}
              </div>
            )}
          </div>

          {copyMessage && (
            <p className="text-sm text-green-600 font-medium">{copyMessage}</p>
          )}
        </div>

        {/* Prawa kolumna: lista zasobów */}
        <div className={!loading && resources.length > 0 ? "flex-[2_2_0%] min-w-0 space-y-3 overflow-auto" : "flex-1 min-w-0 space-y-3 overflow-auto"}>
          {/* Sekcja ulubionych – same ikonki nad listą */}
          {!loading && (() => {
            const favorites = resources.filter((r) => r.isFavorite === true);
            if (favorites.length === 0) return null;
            return (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--text)]">{resourceFavoritesSectionTitle}</p>
                <div className="flex flex-wrap gap-4">
                  {favorites.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => window.open(r.url, "_blank")}
                      className="w-16 h-16 flex items-center justify-center rounded-lg hover:bg-[var(--bg3)] transition-colors"
                    >
                      {getFaviconUrl(r.url) && (
                        <img
                          src={getFaviconUrl(r.url)}
                          className="w-12 h-12 object-contain"
                          style={{ borderRadius: "6px" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                          alt=""
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="border-t border-[var(--border)] pt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--text3)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : resources.length === 0 ? (
          <p className="text-[var(--text3)] font-medium">{noResourcesLabel}</p>
        ) : filteredResources.length === 0 ? (
          <p className="text-[var(--text3)] font-medium">{noMatchingTagsLabel}</p>
        ) : (
          <ul className="space-y-1.5">
                {filteredResources.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-3 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl"
                  >
                    <div
                      className="min-w-0 flex-1 flex items-stretch gap-3 cursor-pointer"
                      onClick={() => openEditModal(r)}
                      onKeyDown={(e) => e.key === "Enter" && openEditModal(r)}
                      role="button"
                      tabIndex={0}
                    >
                      {getFaviconUrl(r.url) && (
                        <div className="flex items-center flex-shrink-0 self-stretch min-h-[2rem]">
                          <img
                            src={getFaviconUrl(r.url)}
                            className="h-full w-auto object-contain"
                            style={{ borderRadius: "4px", maxWidth: 28 }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            alt=""
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-[var(--text)] truncate">
                          {r.title === r.url ? (
                            <span>
                              {r.url}
                              <span className="text-[var(--text3)] ml-1 font-normal text-sm">{titleUnavailableLabel}</span>
                            </span>
                          ) : (
                            r.title
                          )}
                        </p>
                        <p className="text-sm text-[#6B7280] truncate mt-0.5">{r.description}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {(r.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--border)] text-[var(--text)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
        <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(r); }}
                        className={`p-2 rounded-lg transition-colors ${
                          r.isFavorite ? "text-amber-500 hover:bg-amber-50" : "text-[var(--text2)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
                        }`}
                        title={resourceFavoriteLabel}
                      >
                        <Star className={`w-4 h-4 ${r.isFavorite ? "fill-current" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditModal(r); }}
                        className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)]"
                        title={resourceEditLabel}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCopy(r.url); }}
                    className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)]"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#6B7280] hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal edycji zasobu */}
      {editingResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeEditModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-resource-title"
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 id="edit-resource-title" className="text-lg font-bold text-[var(--text)]">
                {resourceEditModalTitleLabel}
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder={resourceDescriptionPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder={resourceDescriptionPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">URL</label>
                <input
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder={resourceUrlPlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Tags</label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
                  placeholder={resourceTagsPlaceholder}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isFavorite}
                  onChange={(e) => setEditForm((f) => ({ ...f, isFavorite: e.target.checked }))}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text)]">{resourceFavoriteLabel}</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)] font-medium"
              >
                {t.noteCancelEdit as string}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold hover:opacity-90"
              >
                {resourceSaveEditLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
