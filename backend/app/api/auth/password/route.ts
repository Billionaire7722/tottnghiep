import { changeUserPassword, getAuthContext } from "@/src/auth";
import { errorResponse, emptyResponse, optionsResponse, readJson } from "@/src/http";
import { passwordChangeSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = passwordChangeSchema.parse(await readJson(request));
    await changeUserPassword(context.user.id, body.currentPassword, body.newPassword);

    return emptyResponse(request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
