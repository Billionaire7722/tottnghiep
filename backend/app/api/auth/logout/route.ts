import { logoutSession } from "@/src/auth";
import { emptyResponse, errorResponse, optionsResponse } from "@/src/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await logoutSession(request);
    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

