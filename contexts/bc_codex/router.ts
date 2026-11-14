import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/http/apiError";
import { parseBody } from "@/lib/http/parseBody";
import { ChecklistEventInputSchema, toChecklistStateDto, toCodexDto } from "./schemas";
import * as services from "./services";

export async function getCodexFile(): Promise<NextResponse> {
  try {
    return NextResponse.json(toCodexDto(services.getCodex()));
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function getChecklists(request: NextRequest): Promise<NextResponse> {
  try {
    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    return NextResponse.json(toChecklistStateDto(services.getChecklistState(month)));
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function postChecklistEvent(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseBody(request, ChecklistEventInputSchema, { details: false });
  if (parsed.success === false) return parsed.response;
  try {
    return NextResponse.json(await services.recordEvent(parsed.data), { status: 201 });
  } catch (err) {
    return handleServiceError(err);
  }
}
