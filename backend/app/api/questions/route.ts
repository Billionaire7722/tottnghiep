import { getAuthContext, requireQuestionManager } from "@/src/auth";
import { createQuestion, listQuestions } from "@/src/questions";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { canManageQuestions } from "@/src/roles";
import { isSubjectCode } from "@/src/subjects";
import { questionSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    const url = new URL(request.url);
    const adminListMode = canManageQuestions(context.user.role) && url.searchParams.get("includeInactive") === "true";
    const requestedSubject = url.searchParams.get("subject");
    const subject = isSubjectCode(requestedSubject) ? requestedSubject : null;

    if (!adminListMode && !subject) {
      return jsonResponse(
        { code: "SUBJECT_REQUIRED", message: "Vui lòng chọn môn trước khi bắt đầu làm bài" },
        request,
        400
      );
    }

    const questions = await listQuestions(adminListMode, adminListMode, subject);

    return jsonResponse({ questions }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireQuestionManager(request);
    const body = questionSchema.parse(await readJson(request));
    const question = await createQuestion(body, context.user.id);

    return jsonResponse({ question }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}
