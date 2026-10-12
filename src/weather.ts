export interface City {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface ForecastDay {
  date: string;
  minimum: number;
  maximum: number;
  weatherCode: number;
  precipitationProbability: number;
}

export function weatherDescription(code: number): string {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Niebla";
  if ([51, 53, 55].includes(code)) return "Llovizna";
  if ([56, 57].includes(code)) return "Llovizna helada";
  if ([61, 63, 65].includes(code)) return "Lluvia";
  if ([66, 67].includes(code)) return "Lluvia helada";
  if ([71, 73, 75, 77].includes(code)) return "Nieve";
  if ([80, 81, 82].includes(code)) return "Chubascos";
  if ([85, 86].includes(code)) return "Chubascos de nieve";
  if (code === 95) return "Tormenta";
  if ([96, 99].includes(code)) return "Tormenta con granizo";
  return "Estado desconocido";
}

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

export async function getForecast(
  city: City,
  unit: TemperatureUnit,
): Promise<ForecastDay[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    daily: "temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max",
    forecast_days: "7",
    timezone: "auto",
    temperature_unit: unit,
  }).toString();
  const data = await request(url);
  const invalid = () => new Error("Open-Meteo no devolvió un pronóstico válido de 7 días.");
  if (!data || typeof data !== "object" || !("daily" in data)) throw invalid();
  const daily = data.daily;
  if (!daily || typeof daily !== "object") throw invalid();
  const fields = daily as Record<string, unknown>;
  const keys = ["time", "temperature_2m_min", "temperature_2m_max", "weather_code", "precipitation_probability_max"];
  for (const key of keys) {
    if (!Array.isArray(fields[key]) || fields[key].length !== 7) throw invalid();
  }
  const dates = fields.time as unknown[];
  const minimums = fields.temperature_2m_min as unknown[];
  const maximums = fields.temperature_2m_max as unknown[];
  const codes = fields.weather_code as unknown[];
  const probabilities = fields.precipitation_probability_max as unknown[];
  return dates.map((date, index) => {
    const minimum = minimums[index];
    const maximum = maximums[index];
    const weatherCode = codes[index];
    const precipitationProbability = probabilities[index];
    if (
      typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
      (index > 0 && Date.parse(`${date}T00:00:00Z`) - Date.parse(`${dates[index - 1]}T00:00:00Z`) !== 86_400_000) ||
      typeof minimum !== "number" || !Number.isFinite(minimum) ||
      typeof maximum !== "number" || !Number.isFinite(maximum) || minimum > maximum ||
      typeof weatherCode !== "number" || !Number.isInteger(weatherCode) || weatherCode < 0 ||
      typeof precipitationProbability !== "number" || !Number.isFinite(precipitationProbability) ||
      precipitationProbability < 0 || precipitationProbability > 100
    ) throw invalid();
    return { date, minimum, maximum, weatherCode, precipitationProbability };
  });
}

export function cityLabel(city: City): string {
  return city.country ? `${city.name}, ${city.country}` : city.name;
}
