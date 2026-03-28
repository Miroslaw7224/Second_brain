import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { DomainError } from "@/lib/errors";
import { importMindMap } from "@/services/mindMapAIService";
import type { MindMapNode } from "@/src/features/mind-maps/mindMapTypes";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

function resolveImageMime(file: File): string | null {
  const ty = file.type?.trim();
  if (ty && ty.startsWith("image/")) return ty;
  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  return EXT_TO_MIME[name.slice(dot)] ?? null;
}

const MindMapNodeSchema: z.ZodType<MindMapNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    note: z.string(),
    collapsed: z.boolean(),
    children: z.array(MindMapNodeSchema),
  })
);

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const fd = await request.formData();
    const structureText = String(fd.get("structureText") ?? "").trim();

    let image: { mimeType: string; bytes: Uint8Array } | undefined;
    const img = fd.get("image");
    if (img instanceof File) {
      const mime = resolveImageMime(img);
      if (!mime) {
        return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
      }
      if (img.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 });
      }
      const ab = await img.arrayBuffer();
      image = { mimeType: mime, bytes: new Uint8Array(ab) };
    } else if (img != null) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    if (!structureText && !image) {
      return NextResponse.json(
        { error: "Provide structureText and/or a valid image file" },
        { status: 400 }
      );
    }

    const rootNode = await importMindMap({ structureText, image });
    const validated = MindMapNodeSchema.safeParse(rootNode);
    if (!validated.success) {
      throw new DomainError("AI zwróciło niepoprawny format drzewa", 422);
    }
    if (validated.data.id !== "root") {
      throw new DomainError('Root node must have id="root"', 422);
    }

    return NextResponse.json({ rootNode: validated.data });
  } catch (err) {
    return handleServiceError(err);
  }
}
