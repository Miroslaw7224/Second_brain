import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";
import { handleServiceError } from "@/lib/apiError";
import { migrateAll } from "@/services/migrationService";

export async function POST(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await migrateAll(auth.uid);
    return NextResponse.json(result);
  } catch (err) {
    return handleServiceError(err);
  }
}
