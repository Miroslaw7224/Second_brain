import { NextRequest, NextResponse } from "next/server";
import { handleServiceError } from "@/lib/http/apiError";
import { parseBody } from "@/lib/http/parseBody";
import {
  CreateInboxItemSchema,
  MoveInboxItemSchema,
  toInboxDto,
  toInboxItemDto,
  toMoveResultDto,
} from "./schemas";
import * as services from "./services";

export async function listInbox(): Promise<NextResponse> {
  try {
    return NextResponse.json(toInboxDto(services.listItems(), services.countClosed()));
  } catch (err) {
    return handleServiceError(err);
  }
}

export async function createItem(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseBody(request, CreateInboxItemSchema, { details: false });
  if (parsed.success === false) return parsed.response;
  try {
    return NextResponse.json(toInboxItemDto(await services.addItem(parsed.data.text)), {
      status: 201,
    });
  } catch (err) {
    return handleServiceError(err);
  }
}

/** PATCH: oznacza wpis jako posegregowany (znika z listy, zostaje w pliku). */
export async function resolveItem(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await ctx.params;
  try {
    await services.resolve(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}

/** POST: przenosi otwarty wpis do zadania projektu, zadania ogólnego albo notatki (UI i agent CLI). */
export async function moveItem(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const parsed = await parseBody(request, MoveInboxItemSchema, { details: false });
  if (parsed.success === false) return parsed.response;
  const { id } = await ctx.params;
  try {
    return NextResponse.json(toMoveResultDto(await services.moveItem(id, parsed.data)));
  } catch (err) {
    return handleServiceError(err);
  }
}

/** DELETE: trwale usuwa otwarty wpis z pliku inboxu. */
export async function deleteItem(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await ctx.params;
  try {
    await services.remove(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServiceError(err);
  }
}

/** DELETE /api/inbox: trwale usuwa wszystkie zamknięte wpisy (`[x]`) z pliku inboxu. */
export async function clearClosedItems(): Promise<NextResponse> {
  try {
    return NextResponse.json({ removed: await services.clearClosed() });
  } catch (err) {
    return handleServiceError(err);
  }
}
