import { getAuthContext } from "@/src/auth";
import { listAttempts, submitAnswers } from "@/src/results";
import { answerSubmitSchema } from "@/src/validation";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    const attempts = await listAttempts(context.user);

    return jsonResponse({ attempts }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = answerSubmitSchema.parse(await readJson(request));
    const result = await submitAnswers(body, context.user);

    return jsonResponse({ result }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}

