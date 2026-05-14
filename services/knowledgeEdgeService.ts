import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { KnowledgeEdge, KnowledgeEdgeInput } from "@/types/knowledge";

export async function createEdge(
  userId: string,
  input: KnowledgeEdgeInput
): Promise<KnowledgeEdge> {
  return firestoreKnowledge.createKnowledgeEdge(userId, input);
}

export async function getEdgesForNode(userId: string, nodeId: string): Promise<KnowledgeEdge[]> {
  return firestoreKnowledge.getEdgesForNode(userId, nodeId);
}

export async function deleteEdge(userId: string, edgeId: string): Promise<void> {
  return firestoreKnowledge.deleteKnowledgeEdge(userId, edgeId);
}
