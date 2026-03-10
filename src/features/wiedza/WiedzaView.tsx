/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  AppSidebar,
  type AppSidebarUser,
  type AppSidebarTranslations,
} from "@/src/components/layout/AppSidebar";
import { AppHeader } from "@/src/components/layout/AppHeader";
import { ResourceSection } from "@/src/components/ResourceSection";
import type { translations } from "@/src/translations";
import { useWiedzaData, type Document, type Note } from "./useWiedzaData";
import { WiedzaSidebarContent } from "./WiedzaSidebarContent";
import { ChatPanel, type Message } from "./ChatPanel";
import { NotesPanel } from "./NotesPanel";

type TranslationsEn = (typeof translations)["en"];

export type { Document, Note };
export type { Message } from "./ChatPanel";

export interface WiedzaViewProps {
  user: AppSidebarUser | null;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  lang: "en" | "pl";
  t: TranslationsEn;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  appMode: "wiedza" | "planowanie";
  setAppMode: (mode: "wiedza" | "planowanie") => void;
  onLogout: () => void;
  setLang: (lang: "en" | "pl") => void;
}

export default function WiedzaView({
  user,
  apiFetch,
  lang,
  t,
  isSidebarOpen,
  setIsSidebarOpen,
  appMode,
  setAppMode,
  onLogout,
  setLang,
}: WiedzaViewProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "notes" | "resources">("chat");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteEditMode, setNoteEditMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, notes, fetchDocuments, fetchNotes } = useWiedzaData(apiFetch);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchNotes();
    }
  }, [user, fetchDocuments, fetchNotes]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      const method = selectedNote.id ? "PUT" : "POST";
      const url = selectedNote.id ? `/api/notes/${selectedNote.id}` : "/api/notes";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedNote),
      });
      if (res.ok) {
        await fetchNotes();
        if (method === "POST") {
          const data = await res.json();
          setSelectedNote({
            ...data,
            created_at: data.created_at ?? new Date().toISOString(),
          });
        }
        setNoteEditMode(false);
      }
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await apiFetch(`/api/notes/${id}`, { method: "DELETE" });
      await fetchNotes();
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) await fetchDocuments();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const handleUploadWithLoading = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    try {
      await handleUpload(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      await fetchDocuments();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, lang }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text, sources: data.sources },
      ]);
    } catch (err) {
      console.error("Chat failed", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error processing your request.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sidebarT: AppSidebarTranslations = {
    title: t.title,
    subtitle: t.subtitle,
    logout: t.logout,
    proPlan: t.proPlan,
    docsLimit: t.docsLimit,
  };

  return (
    <>
      <AppSidebar
        isSidebarOpen={isSidebarOpen}
        lang={lang}
        setLang={setLang}
        user={user}
        onLogout={onLogout}
        documentsCount={documents.length}
        t={sidebarT}
      >
        <WiedzaSidebarContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          documents={documents}
          onUpload={handleUploadWithLoading}
          onDeleteDoc={handleDeleteDoc}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          chatTab={t.chatTab}
          notesTab={t.notesTab}
          tabResources={(t.tabResources as string) ?? "Zasoby"}
          knowledge={t.knowledge}
          noDocs={t.noDocs}
        />
      </AppSidebar>

      <main className="flex-1 min-w-0 flex flex-col relative">
        <AppHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          appMode={appMode}
          setAppMode={setAppMode}
          t={{
            modeWiedza: t.modeWiedza,
            modePlanowanie: t.modePlanowanie,
            brainActive: t.brainActive,
            searchPlaceholder: t.searchPlaceholder,
            feedback: t.feedback,
          }}
        />

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          {activeTab === "chat" ? (
            <ChatPanel
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              chatEndRef={chatEndRef}
              prompts={t.prompts}
              welcomeTitle={t.welcomeTitle}
              welcomeSubtitle={t.welcomeSubtitle}
              inputPlaceholder={t.inputPlaceholder}
              disclaimer={t.disclaimer}
            />
          ) : activeTab === "resources" ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
              <ResourceSection apiFetch={apiFetch} t={t} />
            </div>
          ) : (
            <NotesPanel
              notes={notes}
              selectedNote={selectedNote}
              setSelectedNote={setSelectedNote}
              noteEditMode={noteEditMode}
              setNoteEditMode={setNoteEditMode}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              newNote={t.newNote}
              noteTitlePlaceholder={t.noteTitlePlaceholder}
              noteContentPlaceholder={t.noteContentPlaceholder}
              noteCancelEdit={t.noteCancelEdit}
              saveNote={t.saveNote}
              noteEdit={t.noteEdit}
              deleteNote={t.deleteNote}
            />
          )}
        </div>
      </main>
    </>
  );
}
