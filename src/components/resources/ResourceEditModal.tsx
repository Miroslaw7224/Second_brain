import React from "react";
import { X } from "lucide-react";

export interface ResourceEditModalProps {
  isOpen: boolean;
  titleLabel: string;
  resourceDescriptionPlaceholder: string;
  resourceUrlPlaceholder: string;
  resourceTagsPlaceholder: string;
  resourceFavoriteLabel: string;
  cancelLabel: string;
  saveLabel: string;
  editForm: {
    title: string;
    description: string;
    url: string;
    tags: string;
    isFavorite: boolean;
  };
  setEditForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      url: string;
      tags: string;
      isFavorite: boolean;
    }>
  >;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function ResourceEditModal({
  isOpen,
  titleLabel,
  resourceDescriptionPlaceholder,
  resourceUrlPlaceholder,
  resourceTagsPlaceholder,
  resourceFavoriteLabel,
  cancelLabel,
  saveLabel,
  editForm,
  setEditForm,
  onClose,
  onSave,
}: ResourceEditModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-resource-title"
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3
            id="edit-resource-title"
            className="text-lg font-bold text-[var(--text)]"
          >
            {titleLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text2)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Title
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
              placeholder={resourceDescriptionPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Description
            </label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
              placeholder={resourceDescriptionPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              URL
            </label>
            <input
              type="url"
              value={editForm.url}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, url: e.target.value }))
              }
              className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
              placeholder={resourceUrlPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">
              Tags
            </label>
            <input
              type="text"
              value={editForm.tags}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, tags: e.target.value }))
              }
              className="w-full px-4 py-2 bg-[var(--bg3)] border border-[var(--border)] rounded-xl text-[var(--text)] focus:ring-2 focus:ring-[var(--accent)]"
              placeholder={resourceTagsPlaceholder}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editForm.isFavorite}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, isFavorite: e.target.checked }))
              }
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="text-sm font-medium text-[var(--text)]">
              {resourceFavoriteLabel}
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)] font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white font-semibold hover:opacity-90"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
