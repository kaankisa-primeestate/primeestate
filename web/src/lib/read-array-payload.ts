export function readArrayPayload<T>(
  payload: Record<string, unknown>,
  key: string,
  errorMessage: string,
): T[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }
  return value as T[];
}
