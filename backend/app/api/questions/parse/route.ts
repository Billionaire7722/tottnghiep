import { requireQuestionManager } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { parseAndReviewQuestions } from "@/src/questionImportReview";
import { questionTextImportSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await requireQuestionManager(request);
    const body = questionTextImportSchema.parse(await readJson(request));
    const { questions, warnings } = await parseAndReviewQuestions(body.text, body.subject);

    return jsonResponse({ questions, warnings }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
