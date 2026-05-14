import { Timestamp } from "firebase-admin/firestore";

export type KnowledgeNodeType = "note" | "task" | "resource" | "chat" | "document" | "event";

export type KnowledgeRelation = "related" | "supports" | "contradicts" | "part-of" | "derived-from";

export interface KnowledgeSource {
  title: string;
  url?: string;
  nodeId?: string;
}

export interface KnowledgeNode {
  id: string;
  type: KnowledgeNodeType;
  title: string;
  content: string;
  tags: string[];
  sources: KnowledgeSource[];
  embedding: number[];
  dueDate?: string;
  reminderAt?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: "user" | "ai";
}

export interface KnowledgeNodeInput {
  type: KnowledgeNodeType;
  title: string;
  content: string;
  tags?: string[];
  sources?: KnowledgeSource[];
  dueDate?: string;
  reminderAt?: string;
  createdBy: "user" | "ai";
}

export interface KnowledgeEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relation: KnowledgeRelation;
  strength: number;
  createdAt: Timestamp;
}

export interface KnowledgeEdgeInput {
  fromNodeId: string;
  toNodeId: string;
  relation: KnowledgeRelation;
  strength: number;
}
