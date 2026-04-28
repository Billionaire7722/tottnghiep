import { getAuthContext } from "@/src/auth";
import { errorResponse, jsonResponse, optionsResponse } from "@/src/http";
import { isSubjectCode } from "@/src/subjects";
import { listSlides } from "@/src/slides";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request) {
  try {
    await getAuthContext(request);
    const url = new URL(request.url);
    const requestedSubject = url.searchParams.get("subject");
    const subject = isSubjectCode(requestedSubject) ? requestedSubject : null;
    const slides = await listSlides(subject);

    return jsonResponse({ slides }, request);
  } catch (error) {
    return errorResponse(error, request);
  }
}
