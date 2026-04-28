import { getAuthContext, requireQuestionManager } from "@/src/auth";
import { emptyResponse, errorResponse, optionsResponse, routeParamId, routeParamUuid } from "@/src/http";
import { buildAttachmentResponse, deleteStudyLessonAttachment, getAttachmentForAccess } from "@/src/studyLessons";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const lessonId = routeParamId(params);
    const attachmentId = routeParamUuid({ id: params.attachmentId });
    const role = await getOptionalRole(request);
    const attachment = await getAttachmentForAccess(lessonId, attachmentId, role);

    return buildAttachmentResponse(request, attachment);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireQuestionManager(request);
    const params = await context.params;
    const lessonId = routeParamId(params);
    const attachmentId = routeParamUuid({ id: params.attachmentId });
    await deleteStudyLessonAttachment(lessonId, attachmentId);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

async function getOptionalRole(request: Request) {
  if (!request.headers.get("authorization")) {
    return null;
  }

  return getAuthContext(request)
    .then((context) => context.user.role)
    .catch(() => null);
}
