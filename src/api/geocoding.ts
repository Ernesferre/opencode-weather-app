import { isCity, type City } from "../types/City.ts";
import { GEOCODING_URL } from "../utils/constants.ts";
import { request } from "./request.ts";

export async function searchCity(name: string): Promise<City | null> {
  const query = name.trim();
  if (!query) throw new Error("Ingresa el nombre de una ciudad.");
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: query, count: "1", language: "es", format: "json" }).toString();
  const data = (await request(url)) as { results?: unknown[] } | null;
  if (!data || typeof data !== "object") throw new Error("Respuesta de geocodificación inválida.");
  if (data.results === undefined || (Array.isArray(data.results) && data.results.length === 0)) return null;
  if (!Array.isArray(data.results)) throw new Error("Respuesta de geocodificación inválida.");
  const result = data.results[0];
  if (!result || typeof result !== "object") throw new Error("Respuesta de geocodificación inválida.");
  const raw = result as Record<string, unknown>;
  const city = { id: raw.id, name: raw.name, country: raw.country ?? "", latitude: raw.latitude, longitude: raw.longitude };
  if (!isCity(city)) throw new Error("Open-Meteo no devolvió coordenadas válidas.");
  return city;
}
