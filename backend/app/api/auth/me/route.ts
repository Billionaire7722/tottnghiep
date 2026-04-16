import { getAuthContext } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    return jsonResponse({ user: context.user }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

