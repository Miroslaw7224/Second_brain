import React, { useState } from "react";
import { MessageSquare, List, Network } from "lucide-react";
import { ApiFetch } from "./useKnowledgeNodes";
import { KnowledgeChatPanel } from "./KnowledgeChatPanel";
import { KnowledgeListView } from "./KnowledgeListView";
import { KnowledgeGraphView } from "@/src/features/wiedza/KnowledgeGraphView";

type InnerTab = "chat" | "list" | "graph";

interface Props {
  apiFetch: ApiFetch;
  lang: "pl" | "en";
}

const TABS: { id: InnerTab; labelPl: string; labelEn: string; Icon: React.ElementType }[] = [
  { id: "chat", labelPl: "Chat AI", labelEn: "AI Chat", Icon: MessageSquare },
  { id: "list", labelPl: "Lista", labelEn: "List", Icon: List },
  { id: "graph", labelPl: "Graf", labelEn: "Graph", Icon: Network },
];

export function KnowledgeView({ apiFetch, lang }: Props) {
  const [activeTab, setActiveTab] = useState<InnerTab>("chat");
  const [listKey, setListKey] = useState(0);
  const [graphKey, setGraphKey] = useState(0);

  const handleTabChange = (tab: InnerTab) => {
    setActiveTab(tab);
    if (tab === "list") setListKey((k) => k + 1);
    if (tab === "graph") setGraphKey((k) => k + 1);
  };

  const handleNodeSaved = () => {
    if (activeTab === "list") setListKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Inner tab bar */}
      <div className="flex gap-1 px-4 pt-2 border-b border-[var(--border)] shrink-0">
        {TABS.map(({ id, labelPl, labelEn, Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text2)] hover:text-[var(--text)]"
            }`}
          >
            <Icon size={14} />
            {lang === "pl" ? labelPl : labelEn}
          </button>
        ))}
      </div>

      {/* Content — all panels stay mounted to preserve state */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className={`absolute inset-0 ${activeTab === "chat" ? "" : "hidden"}`}>
          <KnowledgeChatPanel apiFetch={apiFetch} lang={lang} onNodeSaved={handleNodeSaved} />
        </div>
        <div className={`absolute inset-0 ${activeTab === "list" ? "" : "hidden"}`}>
          <KnowledgeListView
            key={listKey}
            apiFetch={apiFetch}
            lang={lang}
            onShowGraph={() => handleTabChange("graph")}
          />
        </div>
        <div className={`absolute inset-0 ${activeTab === "graph" ? "" : "hidden"}`}>
          <KnowledgeGraphView key={graphKey} apiFetch={apiFetch} lang={lang} />
        </div>
      </div>
    </div>
  );
}
