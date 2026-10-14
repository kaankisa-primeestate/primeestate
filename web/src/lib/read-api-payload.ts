export async function readApiPayload(
  response: Response,
  fallbackMessage: string,
): Promise<Record<string, unknown>> {
  const raw = await response.text();
  let payload: unknown = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error(fallbackMessage + " (HTTP " + response.status + ").");
      }
      throw new Error("Sunucudan geçersiz bir yanıt alındı.");
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : fallbackMessage + " (HTTP " + response.status + ").";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Sunucudan beklenen yanıt alınamadı.");
  }

  return payload as Record<string, unknown>;
}
