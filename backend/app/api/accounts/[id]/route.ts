import { requireAdmin } from "@/src/auth";
import { deleteAccount, updateAccount } from "@/src/accounts";
import { accountUpdateSchema } from "@/src/validation";
import { emptyResponse, errorResponse, jsonResponse, optionsResponse, readJson, routeParamUuid } from "@/src/http";

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
    const id = routeParamUuid(await context.params);
    const body = accountUpdateSchema.parse(await readJson(request));
    const account = await updateAccount(id, body);

    return jsonResponse({ account }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const contextAuth = await requireAdmin(request);
    const id = routeParamUuid(await context.params);
    await deleteAccount(id, contextAuth.user.id);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

