import { requireAdmin } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";
import { extractTextFromQuestionFile, parseQuestionText } from "@/src/importQuestions";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          code: "FILE_REQUIRED",
          message: "Vui lòng chọn file câu hỏi"
        },
        request,
        400
      );
    }

    const text = await extractTextFromQuestionFile(file);
    const questions = parseQuestionText(text);
    const warnings = questions.flatMap((question) => question.warnings);

    return jsonResponse({ questions, warnings }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

