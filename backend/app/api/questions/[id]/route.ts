import { requireAdmin } from "@/src/auth";
import { deleteQuestion, updateQuestion } from "@/src/questions";
import { emptyResponse, errorResponse, jsonResponse, optionsResponse, readJson, routeParamId } from "@/src/http";
import { questionSchema } from "@/src/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const id = routeParamId(await context.params);
    const body = questionSchema.parse(await readJson(request));
    const question = await updateQuestion(id, body);

    return jsonResponse({ question }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    await requireAdmin(request);
    const id = routeParamId(await context.params);
    await deleteQuestion(id);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
