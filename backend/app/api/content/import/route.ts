import { requireQuestionManager } from "@/src/auth";
import { parseAndReviewImportedContent } from "@/src/contentImport";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";
import { extractTextFromQuestionFile } from "@/src/importQuestions";
import { isSubjectCode } from "@/src/subjects";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request) {
  try {
    await requireQuestionManager(request);
    const formData = await request.formData();
    const file = formData.get("file");
    const rawSubject = formData.get("subject");
    const subjectCandidate = typeof rawSubject === "string" ? rawSubject : null;
    const subject = isSubjectCode(subjectCandidate) ? subjectCandidate : "dich_te";

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          code: "FILE_REQUIRED",
          message: "Vui lòng chọn file cần nhập"
        },
        request,
        400
      );
    }

    const text = await extractTextFromQuestionFile(file);
    const review = await parseAndReviewImportedContent(text, subject, file.name);

    return jsonResponse(review, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
