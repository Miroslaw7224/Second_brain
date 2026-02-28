import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/getAuth";

export async function GET(request: NextRequest) {
  const auth = await getAuthUserId(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ allowed: true });
}
