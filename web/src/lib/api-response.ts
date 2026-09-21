import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export function apiError(
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function authenticationRequired() {
  return apiError(401, "AUTHENTICATION_REQUIRED", "Authentication required.");
}

export function forbidden(message = "Yetkiniz yok.") {
  return apiError(403, "FORBIDDEN", message);
}

export function notFound(message = "Kayıt bulunamadı.") {
  return apiError(404, "NOT_FOUND", message);
}

export function validationError(message: string, details?: unknown) {
  return apiError(400, "VALIDATION_ERROR", message, details);
}

export function conflict(message: string, details?: unknown) {
  return apiError(409, "CONFLICT", message, details);
}

export function internalError(message = "Beklenmeyen bir sunucu hatası oluştu.") {
  return apiError(500, "INTERNAL_ERROR", message);
}
