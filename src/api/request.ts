import { REQUEST_TIMEOUT_MS } from "../utils/constants.ts";

export async function request(url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    throw new Error("No se pudo conectar con Open-Meteo. Revisa tu conexión e inténtalo de nuevo.");
  }
  if (!response.ok) throw new Error(`Open-Meteo respondió con un error (HTTP ${response.status}).`);
  try {
    return await response.json();
  } catch {
    throw new Error("Open-Meteo devolvió una respuesta inválida.");
  }
}
