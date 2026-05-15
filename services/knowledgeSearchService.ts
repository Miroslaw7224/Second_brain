import * as firestoreKnowledge from "@/lib/firestore-knowledge";
import { generateEmbedding } from "@/lib/openai";
import { KnowledgeNode } from "@/types/knowledge";

const SIMILARITY_THRESHOLD = 0.6;
const FALLBACK_COUNT = 3;
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

  const scored = allNodes
    .filter((n) => n.embedding && n.embedding.length > 0)
    .map((node) => ({ node, score: cosineSimilarity(queryEmbedding, node.embedding) }))
    .sort((a, b) => b.score - a.score);

  const aboveThreshold = scored.filter(({ score }) => score >= SIMILARITY_THRESHOLD);

  // If nothing passes the threshold, return the closest matches as a fallback
  // so the AI always has context to reason about rather than saying "no data"
  const results = aboveThreshold.length > 0 ? aboveThreshold : scored.slice(0, FALLBACK_COUNT);
  return results.slice(0, limit);
}
