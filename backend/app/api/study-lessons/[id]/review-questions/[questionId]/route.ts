import { requireQuestionManager } from "@/src/auth";
import { emptyResponse, errorResponse, jsonResponse, optionsResponse, readJson, routeParamId } from "@/src/http";
import { deleteStudyLessonReviewQuestion, getStudyLesson, updateStudyLessonReviewQuestion } from "@/src/studyLessons";
import { studyLessonReviewQuestionSchema } from "@/src/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; questionId: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireQuestionManager(request);
    const params = await context.params;
    const lessonId = routeParamId(params);
    const questionId = routeParamId({ id: params.questionId });
    const body = studyLessonReviewQuestionSchema.parse(await readJson(request));
    await updateStudyLessonReviewQuestion(lessonId, questionId, body);
    const lesson = await getStudyLesson(lessonId, true);

    return jsonResponse({ lesson }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireQuestionManager(request);
    const params = await context.params;
    const lessonId = routeParamId(params);
    const questionId = routeParamId({ id: params.questionId });
    await deleteStudyLessonReviewQuestion(lessonId, questionId);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
