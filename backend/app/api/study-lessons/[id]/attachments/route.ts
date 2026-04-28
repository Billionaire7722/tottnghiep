import { requireQuestionManager } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, routeParamId } from "@/src/http";
import { getStudyLesson, saveStudyLessonAttachment } from "@/src/studyLessons";

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
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          code: "FILE_REQUIRED",
          message: "Vui lòng chọn file cần tải lên"
        },
        request,
        400
      );
    }

    await saveStudyLessonAttachment(lessonId, file, auth.user.id);
    const lesson = await getStudyLesson(lessonId, true);

    return jsonResponse({ lesson }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}
