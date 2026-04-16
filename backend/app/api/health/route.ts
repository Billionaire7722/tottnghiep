import { ensureDatabase } from "@/src/db";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    await ensureDatabase();
    return jsonResponse({ ok: true, service: "CNXH API" }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

