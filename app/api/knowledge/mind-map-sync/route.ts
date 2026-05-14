import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { getFirestore } from "firebase-admin/firestore";
import * as knowledgeNodeService from "@/services/knowledgeNodeService";
import * as knowledgeEdgeService from "@/services/knowledgeEdgeService";
import { KnowledgeNodeInput } from "@/types/knowledge";
import { MindMapNode } from "@/src/features/mind-maps/mindMapTypes";

interface MindMapData {
  title: string;
  rootNode: MindMapNode;
}

function stripHtml(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function flattenNodes(
  node: MindMapNode,
  parentId: string | null = null
): Array<{ node: MindMapNode; parentId: string | null }> {
  return [
    { node, parentId },
    ...(node.children ?? []).flatMap((child) => flattenNodes(child, node.id)),
  ];
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mindMapId } = body as { mindMapId?: string };
  if (!mindMapId) {
    return NextResponse.json({ error: "mindMapId is required" }, { status: 400 });
  }

  try {
    const mapDoc = await getFirestore()
      .collection("users")
      .doc(auth.uid)
      .collection("mindMaps")
      .doc(mindMapId)
      .get();

    if (!mapDoc.exists) {
      return NextResponse.json({ error: "Mind map not found" }, { status: 404 });
    }

    const mapData = mapDoc.data() as MindMapData;
    const allNodes = flattenNodes(mapData.rootNode);

    const idMap = new Map<string, string>();

    for (const { node } of allNodes) {
      const input: KnowledgeNodeInput = {
        type: "note",
        title: node.label || "Bez tytułu",
        content: stripHtml(node.note),
        tags: [],
        sources: [{ title: mapData.title, nodeId: mindMapId }],
        createdBy: "user",
      };
      const created = await knowledgeNodeService.createNode(auth.uid, input);
      idMap.set(node.id, created.id);
    }

    const edgePromises = allNodes
      .filter(({ parentId }) => parentId !== null)
      .map(({ node, parentId }) => {
        const fromId = idMap.get(node.id);
        const toId = idMap.get(parentId!);
        if (!fromId || !toId) return Promise.resolve(null);
        return knowledgeEdgeService.createEdge(auth.uid, {
          fromNodeId: fromId,
          toNodeId: toId,
          relation: "part-of",
          strength: 1.0,
        });
      });

    await Promise.all(edgePromises);

    return NextResponse.json({
      nodes: allNodes.length,
      edges: allNodes.filter(({ parentId }) => parentId !== null).length,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}
