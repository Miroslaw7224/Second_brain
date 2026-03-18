import { getFirestore } from "@/lib/firebase-admin";
import { DomainError } from "@/lib/errors";
import { mindMapsCol } from "@/lib/firestore-db";
import type { MindMap, MindMapNode } from "@/src/features/mind-maps/mindMapTypes";
import { FieldValue } from "firebase-admin/firestore";

function db() {
  return getFirestore();
}

function ensureOwnMap(userId: string, map: MindMap) {
  if (map.userId !== userId) {
    throw new DomainError("Mind map not found", 404);
  }
}

export async function createMindMap(userId: string, title: string): Promise<MindMap> {
  const trimmedTitle = (title ?? "").trim();
  const rootNode: MindMapNode = {
    id: "root",
    label: trimmedTitle || "Nowa mapa",
    note: "",
    collapsed: false,
    children: [],
  };

  const ref = mindMapsCol(userId).doc();
  await ref.set({
    userId,
    title: trimmedTitle || "Nowa mapa",
    rootNode,
    colWidths: {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const snap = await ref.get();
  const data = snap.data()!;
  return {
    id: ref.id,
    userId: data.userId ?? userId,
    title: data.title ?? "",
    rootNode: data.rootNode ?? rootNode,
    colWidths: data.colWidths ?? {},
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getMindMaps(userId: string): Promise<MindMap[]> {
  const snap = await mindMapsCol(userId).get();
  const list = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? userId,
      title: data.title ?? "",
      rootNode: data.rootNode,
      colWidths: data.colWidths ?? {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as MindMap;
  });
  list.sort((a, b) => {
    const tA = (a.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    const tB = (b.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
    return tB - tA;
  });
  return list;
}

export async function getMindMap(userId: string, mapId: string): Promise<MindMap> {
  const ref = mindMapsCol(userId).doc(mapId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new DomainError("Mind map not found", 404);
  }
  const data = snap.data() as Omit<MindMap, "id">;
  const map: MindMap = {
    id: snap.id,
    userId: (data as { userId?: string }).userId ?? "",
    title: (data as { title?: string }).title ?? "",
    rootNode: (data as { rootNode?: MindMapNode }).rootNode as MindMapNode,
    colWidths: (data as { colWidths?: Record<number, number> }).colWidths ?? {},
    createdAt: (data as { createdAt?: unknown }).createdAt,
    updatedAt: (data as { updatedAt?: unknown }).updatedAt,
  };
  ensureOwnMap(userId, map);
  return map;
}

export async function saveMindMap(
  userId: string,
  mapId: string,
  data: { title?: string; rootNode?: MindMapNode; colWidths?: Record<number, number> }
): Promise<void> {
  const existing = await getMindMap(userId, mapId);
  ensureOwnMap(userId, existing);

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (data.title !== undefined) update.title = (data.title ?? "").trim();
  if (data.rootNode !== undefined) update.rootNode = data.rootNode;
  if (data.colWidths !== undefined) update.colWidths = data.colWidths ?? {};

  await mindMapsCol(userId).doc(mapId).update(update);
}

export async function deleteMindMap(userId: string, mapId: string): Promise<void> {
  const existing = await getMindMap(userId, mapId);
  ensureOwnMap(userId, existing);
  await mindMapsCol(userId).doc(mapId).delete();
}
