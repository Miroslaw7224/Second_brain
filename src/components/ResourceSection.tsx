import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import { ExternalLink, Copy, Trash2, Loader2, Plus, Pencil, ChevronDown } from "lucide-react";

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
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [blockFormatText, setBlockFormatText] = useState("");
  const [blockFormatError, setBlockFormatError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTagsResourceId, setEditingTagsResourceId] = useState<string | null>(null);
  const [editingTagsValue, setEditingTagsValue] = useState("");
  const [formExpanded, setFormExpanded] = useState(true);
  const [blockFormatExpanded, setBlockFormatExpanded] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editTagsRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(
    () => [...new Set(resources.flatMap((r) => r.tags || []))].sort(),
    [resources]
  );

  const filteredResources = useMemo(() => {
    if (selectedTags.length === 0) return resources;
    return resources.filter((r) =>
      (r.tags || []).some((t) => selectedTags.includes(t))
    );
  }, [resources, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTagFilter = () => setSelectedTags([]);

  useEffect(() => {
    if (editingResourceId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingResourceId]);

  useEffect(() => {
    if (editingTagsResourceId && editTagsRef.current) {
      editTagsRef.current.focus();
      editTagsRef.current.select();
    }
  }, [editingTagsResourceId]);

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

  const startEditTitle = (r: NoteResource) => {
    setEditingResourceId(r.id);
    setEditingTitle(r.title);
  };

  const saveTitle = async () => {
    if (!editingResourceId || editingTitle.trim() === "") {
      setEditingResourceId(null);
      return;
    }
    const newTitle = editingTitle.trim();
    try {
      const res = await apiFetch(`/api/resources/${editingResourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((item) =>
            item.id === editingResourceId ? { ...item, title: newTitle } : item
          )
        );
      }
    } catch (err) {
      console.error("Update title failed", err);
    }
    setEditingResourceId(null);
    setEditingTitle("");
  };

  const cancelEditTitle = () => {
    setEditingResourceId(null);
    setEditingTitle("");
  };

  const startEditTags = (r: NoteResource) => {
    setEditingTagsResourceId(r.id);
    setEditingTagsValue((r.tags || []).join(", "));
  };

  const saveTags = async () => {
    if (!editingTagsResourceId) {
      setEditingTagsResourceId(null);
      setEditingTagsValue("");
      return;
    }
    const tags = editingTagsValue
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiFetch(`/api/resources/${editingTagsResourceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (res.ok) {
        setResources((prev) =>
          prev.map((item) =>
            item.id === editingTagsResourceId ? { ...item, tags } : item
          )
        );
      }
    } catch (err) {
      console.error("Update tags failed", err);
    }
    setEditingTagsResourceId(null);
    setEditingTagsValue("");
  };

  const cancelEditTags = () => {
    setEditingTagsResourceId(null);
    setEditingTagsValue("");
  };

  const tabResourcesLabel = (t.tabResources as string) ?? "Zasoby";

  return (
    <React.Fragment>
      <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
        <h2 className="text-lg font-bold">{tabResourcesLabel}</h2>
      </div>
      <div className="flex-1 overflow-auto p-6 flex gap-6 min-h-0">
        {/* Lewa kolumna: filtr po tagach */}
        {!loading && resources.length > 0 && (
          <div className="flex-[1_1_0%] min-w-0 space-y-3 overflow-auto pr-2">
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

        {/* Prawa kolumna: formularz i lista zasobów */}
        <div className={!loading && resources.length > 0 ? "flex-[2_2_0%] min-w-0 space-y-3 overflow-auto" : "flex-1 min-w-0 space-y-3 overflow-auto"}>
          {/* Sekcja 1: formularz (Opis, URL, Tagi) */}
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

          {/* Sekcja 2: wklej w formacie blokowym */}
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
                <div className="min-w-0 flex-1 flex items-stretch gap-3">
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
                    {editingResourceId === r.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle();
                          if (e.key === "Escape") cancelEditTitle();
                        }}
                        className="w-full text-base font-semibold text-[var(--text)] bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-2 py-1 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p
                        role="button"
                        tabIndex={0}
                        onClick={() => startEditTitle(r)}
                        onKeyDown={(e) => e.key === "Enter" && startEditTitle(r)}
                        className="text-base font-semibold text-[var(--text)] truncate cursor-pointer hover:bg-[#F9FAFB] rounded px-1 -mx-1"
                      >
                        {r.title === r.url ? (
                          <span>
                            {r.url}
                            <span className="text-[var(--text3)] ml-1 font-normal text-sm">{titleUnavailableLabel}</span>
                          </span>
                        ) : (
                          r.title
                        )}
                      </p>
                    )}
                    <p className="text-sm text-[#6B7280] truncate mt-0.5">{r.description}</p>
                    {editingTagsResourceId === r.id ? (
                      <input
                        ref={editTagsRef}
                        type="text"
                        value={editingTagsValue}
                        onChange={(e) => setEditingTagsValue(e.target.value)}
                        onBlur={saveTags}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTags();
                          if (e.key === "Escape") cancelEditTags();
                        }}
                        placeholder={resourceTagsPlaceholder}
                        className="mt-1 w-full text-sm text-[var(--text)] bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-2 py-1 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {(r.tags || []).length > 0 && (
                          <>
                            {(r.tags || []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--border)] text-[var(--text)]"
                              >
                                {tag}
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); startEditTags(r); }}
                              className="inline-flex items-center gap-1 text-xs text-[var(--text2)] hover:text-[var(--text)] font-medium"
                              title={editTagsLabel}
                            >
                              <Pencil className="w-3 h-3" />
                              {editTagsLabel}
                            </button>
                          </>
                        )}
                        {(r.tags || []).length === 0 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditTags(r); }}
                            className="inline-flex items-center gap-1 text-xs text-[var(--text2)] hover:text-[var(--text)] font-medium"
                            title={editTagsLabel}
                          >
                            <Pencil className="w-3 h-3" />
                            {editTagsLabel}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => window.open(r.url, "_blank")}
                    className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)]"
                    title="Open link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(r.url)}
                    className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)] hover:text-[var(--text)]"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
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
    </React.Fragment>
  );
}
