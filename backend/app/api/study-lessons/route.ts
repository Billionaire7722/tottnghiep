import { getAuthContext, requireQuestionManager } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { canManageQuestions } from "@/src/roles";
import { isSubjectCode } from "@/src/subjects";
import { createStudyLesson, listStudyLessons } from "@/src/studyLessons";
import { studyLessonSchema } from "@/src/validation";

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
    const lessons = await listStudyLessons(adminListMode, subject);

    return jsonResponse({ lessons }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireQuestionManager(request);
    const body = studyLessonSchema.parse(await readJson(request));
    const lesson = await createStudyLesson(body, context.user.id);

    return jsonResponse({ lesson }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}
