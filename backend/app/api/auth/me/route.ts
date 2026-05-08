import { getAuthContext, updateUserAvatar } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";
import { profileAvatarSchema } from "@/src/validation";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    const context = await getAuthContext(request);
    return jsonResponse({ user: context.user }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getAuthContext(request);
    const body = profileAvatarSchema.parse(await readJson(request));
    const user = await updateUserAvatar(context.user.id, body.avatarKey);

    return jsonResponse({ user }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
