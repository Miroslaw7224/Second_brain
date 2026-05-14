import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateEmbedding } from "@/lib/openai";
import { KnowledgeNode, KnowledgeNodeInput, KnowledgeNodeType } from "@/types/knowledge";

export async function createNode(
  userId: string,
  input: KnowledgeNodeInput
): Promise<KnowledgeNode> {
  const embedding = await generateEmbedding(`${input.title}\n${input.content}`);
  return firestoreKnowledge.createKnowledgeNode(userId, { ...input, embedding });
}

export async function getNode(userId: string, nodeId: string): Promise<KnowledgeNode | null> {
  return firestoreKnowledge.getKnowledgeNode(userId, nodeId);
}

export async function updateNode(
  userId: string,
  nodeId: string,
  updates: Partial<
    Pick<KnowledgeNode, "title" | "content" | "tags" | "sources" | "dueDate" | "reminderAt">
  >
): Promise<KnowledgeNode> {
  if (updates.title !== undefined || updates.content !== undefined) {
    const node = await firestoreKnowledge.getKnowledgeNode(userId, nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);
    const title = updates.title ?? node.title;
    const content = updates.content ?? node.content;
    const embedding = await generateEmbedding(`${title}\n${content}`);
    return firestoreKnowledge.updateKnowledgeNode(userId, nodeId, { ...updates, embedding });
  }
  return firestoreKnowledge.updateKnowledgeNode(userId, nodeId, updates);
}

export async function deleteNode(userId: string, nodeId: string): Promise<void> {
  await firestoreKnowledge.deleteKnowledgeNode(userId, nodeId);
  await firestoreKnowledge.deleteEdgesForNode(userId, nodeId);
}

export async function listNodes(
  userId: string,
  type?: KnowledgeNodeType
): Promise<KnowledgeNode[]> {
  return firestoreKnowledge.listKnowledgeNodes(userId, type);
}
