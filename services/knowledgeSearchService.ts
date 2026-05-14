import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateEmbedding } from "@/lib/openai";
import { KnowledgeNode } from "@/types/knowledge";

const SIMILARITY_THRESHOLD = 0.75;
const DEFAULT_LIMIT = 10;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

export async function searchNodes(
  userId: string,
  query: string,
  limit = DEFAULT_LIMIT
): Promise<Array<{ node: KnowledgeNode; score: number }>> {
  const [queryEmbedding, allNodes] = await Promise.all([
    generateEmbedding(query),
    firestoreKnowledge.listAllKnowledgeNodesWithEmbeddings(userId),
  ]);

  return allNodes
    .filter((n) => n.embedding && n.embedding.length > 0)
    .map((node) => ({ node, score: cosineSimilarity(queryEmbedding, node.embedding) }))
    .filter(({ score }) => score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
