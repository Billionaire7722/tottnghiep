import { requireAdmin } from "@/src/auth";
import { createAccount, listAccounts } from "@/src/accounts";
import { accountCreateSchema } from "@/src/validation";
import { errorResponse, jsonResponse, optionsResponse, readJson } from "@/src/http";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const accounts = await listAccounts();

    return jsonResponse({ accounts }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = accountCreateSchema.parse(await readJson(request));
    const account = await createAccount(body);

    return jsonResponse({ account }, request, 201);
  } catch (error) {
    return errorResponse(error, request);
  }
}

