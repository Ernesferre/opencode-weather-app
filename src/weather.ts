export interface City {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export type TemperatureUnit = "celsius" | "fahrenheit";

export function isCity(value: unknown): value is City {
  if (!value || typeof value !== "object") return false;
  const city = value as Record<string, unknown>;
  return (
    Number.isInteger(city.id) &&
    typeof city.name === "string" &&
    city.name.length > 0 &&
    typeof city.country === "string" &&
    typeof city.latitude === "number" &&
    Number.isFinite(city.latitude) &&
    Math.abs(city.latitude) <= 90 &&
    typeof city.longitude === "number" &&
    Number.isFinite(city.longitude) &&
    Math.abs(city.longitude) <= 180
  );
}

async function request(url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error(
      "No se pudo conectar con Open-Meteo. Revisa tu conexión e inténtalo de nuevo.",
    );
  }
  if (!response.ok)
    throw new Error(
      `Open-Meteo respondió con un error (HTTP ${response.status}).`,
    );
  try {
    return await response.json();
  } catch {
    throw new Error("Open-Meteo devolvió una respuesta inválida.");
  }
}

export async function searchCity(name: string): Promise<City | null> {
  const query = name.trim();
  if (!query) throw new Error("Ingresa el nombre de una ciudad.");
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query,
    count: "1",
    language: "es",
    format: "json",
  }).toString();
  const data = (await request(url)) as { results?: unknown[] } | null;
  if (!data || typeof data !== "object")
    throw new Error("Respuesta de geocodificación inválida.");
  if (
    data.results === undefined ||
    (Array.isArray(data.results) && data.results.length === 0)
  )
    return null;
  if (!Array.isArray(data.results))
    throw new Error("Respuesta de geocodificación inválida.");
  const result = data.results[0];
  if (!result || typeof result !== "object")
    throw new Error("Respuesta de geocodificación inválida.");
  const raw = result as Record<string, unknown>;
  const city = {
    id: raw.id,
    name: raw.name,
    country: raw.country ?? "",
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
  if (!isCity(city))
    throw new Error("Open-Meteo no devolvió coordenadas válidas.");
  return city;
}

export async function getTemperature(
  city: City,
  unit: TemperatureUnit,
): Promise<number> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m",
    temperature_unit: unit,
  }).toString();
  const data = (await request(url)) as {
    current?: { temperature_2m?: unknown };
  } | null;
  const temperature = data?.current?.temperature_2m;
  if (typeof temperature !== "number" || !Number.isFinite(temperature)) {
    throw new Error("Open-Meteo no devolvió una temperatura válida.");
  }
  return temperature;
}

export function cityLabel(city: City): string {
  return city.country ? `${city.name}, ${city.country}` : city.name;
}
