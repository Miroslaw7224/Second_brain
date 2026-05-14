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
    dueDate: input.dueDate,
    reminderAt: input.reminderAt,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
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
  if (type) query = query.where("type", "==", type);
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
