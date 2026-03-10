import { NextResponse } from "next/server";
import { z, ZodSchema } from "zod";

/**
 * Parse and validate JSON body with a Zod schema.
 * Returns either validated data or a 400 NextResponse with error details.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.flatten();
  const message =
    firstError.formErrors[0] ??
    (typeof firstError.fieldErrors === "object" && Object.keys(firstError.fieldErrors).length > 0
      ? "Validation failed"
      : "Invalid request body");

  return {
    success: false,
    response: NextResponse.json(
      { error: message, details: firstError.fieldErrors },
      { status: 400 }
    ),
  };
}
