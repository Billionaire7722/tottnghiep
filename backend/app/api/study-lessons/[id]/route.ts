import { getAuthContext, requireQuestionManager } from "@/src/auth";
import { canManageQuestions } from "@/src/roles";
import { deleteStudyLesson, getStudyLesson, updateStudyLesson } from "@/src/studyLessons";
import { emptyResponse, errorResponse, jsonResponse, optionsResponse, readJson, routeParamId } from "@/src/http";
import { studyLessonSchema } from "@/src/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await getAuthContext(request);
    const id = routeParamId(await context.params);
    const lesson = await getStudyLesson(id, canManageQuestions(auth.user.role));

    return jsonResponse({ lesson }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireQuestionManager(request);
    const id = routeParamId(await context.params);
    const body = studyLessonSchema.parse(await readJson(request));
    const lesson = await updateStudyLesson(id, body);

    return jsonResponse({ lesson }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireQuestionManager(request);
    const id = routeParamId(await context.params);
    await deleteStudyLesson(id);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
