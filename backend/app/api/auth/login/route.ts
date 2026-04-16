import { loginUser } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { loginSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await readJson(request));
    const result = await loginUser(body, request);
    return jsonResponse(result, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

