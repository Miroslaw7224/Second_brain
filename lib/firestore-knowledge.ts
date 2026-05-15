import { getFirestore } from "@/lib/firebase-admin";
import { FieldValue, Query, Timestamp } from "firebase-admin/firestore";
import {
  KnowledgeNode,
  KnowledgeNodeInput,
  KnowledgeEdge,
  KnowledgeEdgeInput,
  KnowledgeNodeType,
} from "@/types/knowledge";

const USERS = "users";
const NODES = "knowledgeNodes";
const EDGES = "knowledgeEdges";

function nodesCol(userId: string) {
  return getFirestore().collection(USERS).doc(userId).collection(NODES);
}

function edgesCol(userId: string) {
  return getFirestore().collection(USERS).doc(userId).collection(EDGES);
}

export async function createKnowledgeNode(
  userId: string,
  input: KnowledgeNodeInput & { embedding: number[] }
): Promise<KnowledgeNode> {
  const ref = nodesCol(userId).doc();
  const now = Timestamp.now();
  const node: KnowledgeNode = {
    id: ref.id,
    type: input.type,
    title: input.title,
    content: input.content,
    tags: input.tags ?? [],
    sources: input.sources ?? [],
    embedding: input.embedding,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.reminderAt !== undefined && { reminderAt: input.reminderAt }),
    ...(input.sourceId !== undefined && { sourceId: input.sourceId }),
  };
  await ref.set(node);
  return node;
}

export async function getKnowledgeNode(
  userId: string,
  nodeId: string
): Promise<KnowledgeNode | null> {
  const snap = await nodesCol(userId).doc(nodeId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as KnowledgeNode;
}

export async function updateKnowledgeNode(
  userId: string,
  nodeId: string,
  updates: Partial<Omit<KnowledgeNode, "id" | "createdAt" | "createdBy">>
): Promise<KnowledgeNode> {
  const ref = nodesCol(userId).doc(nodeId);
  await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() });
  const snap = await ref.get();
  return { id: snap.id, ...snap.data() } as KnowledgeNode;
}

export async function deleteKnowledgeNode(userId: string, nodeId: string): Promise<void> {
  await nodesCol(userId).doc(nodeId).delete();
}

export async function listKnowledgeNodes(
  userId: string,
  type?: KnowledgeNodeType
): Promise<KnowledgeNode[]> {
  let query: Query = nodesCol(userId);
  if (type) {
    // Composite index (type + createdAt) may not exist yet — filter in memory instead
    query = query.where("type", "==", type);
    const snap = await query.get();
    const nodes = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KnowledgeNode);
    return nodes.sort((a, b) => {
      const aMs = (a.createdAt as Timestamp)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as Timestamp)?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
  }
  query = query.orderBy("createdAt", "desc");
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KnowledgeNode);
}

export async function createKnowledgeEdge(
  userId: string,
  input: KnowledgeEdgeInput
): Promise<KnowledgeEdge> {
  const ref = edgesCol(userId).doc();
  const edge: KnowledgeEdge = {
    id: ref.id,
    ...input,
    createdAt: Timestamp.now(),
  };
  await ref.set(edge);
  return edge;
}

export async function getEdgesForNode(userId: string, nodeId: string): Promise<KnowledgeEdge[]> {
  const [fromSnap, toSnap] = await Promise.all([
    edgesCol(userId).where("fromNodeId", "==", nodeId).get(),
    edgesCol(userId).where("toNodeId", "==", nodeId).get(),
  ]);
  const seen = new Set<string>();
  const edges: KnowledgeEdge[] = [];
  for (const doc of [...fromSnap.docs, ...toSnap.docs]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      edges.push({ id: doc.id, ...doc.data() } as KnowledgeEdge);
    }
  }
  return edges;
}

export async function deleteEdgesForNode(userId: string, nodeId: string): Promise<void> {
  const [fromSnap, toSnap] = await Promise.all([
    edgesCol(userId).where("fromNodeId", "==", nodeId).get(),
    edgesCol(userId).where("toNodeId", "==", nodeId).get(),
  ]);
  const seen = new Set<string>();
  const batch = getFirestore().batch();
  for (const doc of [...fromSnap.docs, ...toSnap.docs]) {
    if (!seen.has(doc.id)) {
      seen.add(doc.id);
      batch.delete(doc.ref);
    }
  }
  await batch.commit();
}

export async function deleteKnowledgeEdge(userId: string, edgeId: string): Promise<void> {
  await edgesCol(userId).doc(edgeId).delete();
}

export async function listAllKnowledgeNodesWithEmbeddings(
  userId: string
): Promise<KnowledgeNode[]> {
  const snap = await nodesCol(userId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as KnowledgeNode);
}

export async function deleteAllKnowledgeNodes(userId: string): Promise<number> {
  const db = getFirestore();
  const snap = await db.collection(USERS).doc(userId).collection(NODES).get();
  if (snap.empty) return 0;
  const BATCH_SIZE = 25;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, snap.docs.length - i);
  }
  return deleted;
}
