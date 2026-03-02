import React from "react";
import type { NoteResource } from "./resourceTypes";
import { getFaviconUrl } from "./resourceParsing";

export interface ResourceFavoritesBarProps {
  favorites: NoteResource[];
  sectionTitle: string;
}

export function ResourceFavoritesBar({ favorites, sectionTitle }: ResourceFavoritesBarProps) {
  if (favorites.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-[var(--text)]">{sectionTitle}</p>
      <div className="flex flex-wrap gap-4">
        {favorites.map((r) => {
          const favicon = getFaviconUrl(r.url);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => window.open(r.url, "_blank")}
              className="w-16 h-16 flex items-center justify-center rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              {favicon && (
                <img
                  src={favicon}
                  className="w-12 h-12 object-contain"
                  style={{ borderRadius: "6px" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  alt=""
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
