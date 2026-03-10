import React, { type RefObject } from "react";
import { Plus, MessageSquare, FileText, Link, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/cn";
import type { Document } from "./useWiedzaData";

export interface WiedzaSidebarContentProps {
  activeTab: "chat" | "notes" | "resources";
  setActiveTab: (tab: "chat" | "notes" | "resources") => void;
  documents: Document[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteDoc: (id: string) => void;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  chatTab: string;
  notesTab: string;
  tabResources: string;
  knowledge: string;
  noDocs: string;
}

export function WiedzaSidebarContent({
  activeTab,
  setActiveTab,
  documents,
  onUpload,
  onDeleteDoc,
  isUploading,
  fileInputRef,
  chatTab,
  notesTab,
  tabResources,
  knowledge,
  noDocs,
}: WiedzaSidebarContentProps) {
  const tabClass = (tab: "chat" | "notes" | "resources") =>
    cn(
      "w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left text-sm font-semibold",
      activeTab === tab
        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
        : "bg-[var(--surface)] border-transparent hover:bg-[var(--bg2)] hover:border-[var(--bg3)] text-[var(--text)]"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => setActiveTab("chat")} className={tabClass("chat")}>
          <MessageSquare className="w-5 h-5 flex-shrink-0" />
          <span>{chatTab}</span>
        </button>
        <button type="button" onClick={() => setActiveTab("notes")} className={tabClass("notes")}>
          <FileText className="w-5 h-5 flex-shrink-0" />
          <span>{notesTab}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={tabClass("resources")}
        >
          <Link className="w-5 h-5 flex-shrink-0" />
          <span>{tabResources}</span>
        </button>
      </div>
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-widest">
          {knowledge}
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-1.5 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text)]"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onUpload}
          className="hidden"
          accept=".txt,.md,.json"
        />
      </div>
      <div className="space-y-1">
        {documents.length === 0 ? (
          <div className="px-4 py-8 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
            <FileText className="w-8 h-8 text-[var(--text3)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text3)]">{noDocs}</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center justify-between p-3 hover:bg-[var(--bg2)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--bg3)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-[var(--bg3)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[var(--text)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-[10px] text-[var(--text3)] uppercase font-bold">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDoc(doc.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
