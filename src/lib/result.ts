export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): Result<never> {
  return { ok: false, error: { code, message, details } };
}
