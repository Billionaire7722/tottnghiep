import { errorResponse, optionsResponse } from "@/src/http";
import { buildSlideResponse, getSlideFileForAccess } from "@/src/slides";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ subject: string; filePath: string[] }>;
};

export async function OPTIONS(request: Request) {
  return optionsResponse(request);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const url = new URL(request.url);
    const slide = await getSlideFileForAccess(params.subject, params.filePath);
    const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

    return buildSlideResponse(request, slide, disposition);
  } catch (error) {
    return errorResponse(error, request);
  }
}
