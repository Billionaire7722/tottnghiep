import { requireAdmin } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";
import { extractTextFromQuestionFile } from "@/src/importQuestions";
import { parseAndReviewQuestions } from "@/src/questionImportReview";
import { isSubjectCode } from "@/src/subjects";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const rawSubject = formData.get("subject");
    const subjectCandidate = typeof rawSubject === "string" ? rawSubject : null;
    const subject = isSubjectCode(subjectCandidate) ? subjectCandidate : "dich_te";

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
    const { questions, warnings } = await parseAndReviewQuestions(text, subject);

    return jsonResponse({ questions, warnings }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
