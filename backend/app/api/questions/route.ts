import { getAuthContext, requireAdmin } from "@/src/auth";
import { createQuestion, listQuestions } from "@/src/questions";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { questionSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    const url = new URL(request.url);
    const includeInactive = context.user.role === "admin" && url.searchParams.get("includeInactive") === "true";
    const questions = await listQuestions(includeInactive, context.user.role === "admin");

    return jsonResponse({ questions }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAdmin(request);
    const body = questionSchema.parse(await readJson(request));
    const question = await createQuestion(body, context.user.id);

    return jsonResponse({ question }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}

