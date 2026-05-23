import { requireQuestionManager } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, readJson, routeParamId } from "@/src/http";
import { createStudyLessonReviewQuestion, getStudyLesson } from "@/src/studyLessons";
import { studyLessonReviewQuestionSchema } from "@/src/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireQuestionManager(request);
    const lessonId = routeParamId(await context.params);
    const body = studyLessonReviewQuestionSchema.parse(await readJson(request));
    await createStudyLessonReviewQuestion(lessonId, body, auth.user.id);
    const lesson = await getStudyLesson(lessonId, true);

    return jsonResponse({ lesson }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}
