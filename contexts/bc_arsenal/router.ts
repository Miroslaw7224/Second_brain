import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/http/apiError";
import { parseBody } from "@/lib/http/parseBody";
import {
  DeployQuerySchema,
  MarkDeployedBodySchema,
  toCatalogDto,
  toEntryDto,
  toInstructionsDto,
} from "./schemas";
import * as services from "./services";

type SlugContext = { params: Promise<{ slug: string }> };

export async function getCatalog(): Promise<NextResponse> {
  try {
    return NextResponse.json(toCatalogDto(services.listArsenal()));
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function getDeployInstructions(
  request: Request,
  ctx: SlugContext
): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const query = DeployQuerySchema.safeParse({
    project: params.get("project"),
    mode: params.get("mode"),
  });
  if (!query.success) {
    return NextResponse.json({ error: "Nieprawidłowy projekt lub tryb" }, { status: 400 });
  }
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(
      toInstructionsDto(services.getDeployInstructions(slug, query.data.project, query.data.mode))
    );
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function postDeployed(request: Request, ctx: SlugContext): Promise<NextResponse> {
  const parsed = await parseBody(request, MarkDeployedBodySchema);
  if (parsed.success === false) return parsed.response;
  try {
    const { slug } = await ctx.params;
    const skill = await services.markDeployed(slug, parsed.data.project, parsed.data.mode);
    return NextResponse.json(toEntryDto(skill));
  } catch (err) {
    return handleServiceError(err);
  }
}
