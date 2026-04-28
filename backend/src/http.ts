import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowOrigin =
    origin && (allowedOrigins.includes("*") || allowedOrigins.includes(origin))
      ? origin
      : allowedOrigins[0] ?? "http://localhost:5173";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
}

export function jsonResponse(data: unknown, request: Request, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(request)
  });
}

export function emptyResponse(request: Request, status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders(request)
  });
}

export function optionsResponse(request: Request) {
  return emptyResponse(request, 204);
}

export function errorResponse(error: unknown, request: Request) {
  if (error instanceof ApiError) {
    return jsonResponse(
      {
        code: error.code,
        message: error.message
      },
      request,
      error.status
    );
  }

  if (error instanceof ZodError) {
    return jsonResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        errors: error.flatten()
      },
      request,
      400
    );
  }

  writeServerError(error);

  return jsonResponse(
    {
      code: "INTERNAL_ERROR",
      message: "Có lỗi hệ thống, vui lòng thử lại sau"
    },
    request,
    500
  );
}

export function writeServerError(error: unknown) {
  const detail = formatServerError(error);
  process.stderr.write(`[cnxh] ${new Date().toISOString()} ${detail}\n`);
}

function formatServerError(error: unknown) {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Dữ liệu gửi lên không đúng định dạng JSON");
  }
}

export function routeParamId(params: { id?: string }) {
  const id = Number(params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "INVALID_ID", "Mã dữ liệu không hợp lệ");
  }

  return id;
}

export function routeParamUuid(params: { id?: string }) {
  const id = params.id ?? "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, "INVALID_ID", "Mã tài khoản không hợp lệ");
  }

  return id;
}
