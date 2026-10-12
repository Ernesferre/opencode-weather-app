import type { City } from "../types/City.ts";
import type { ForecastDay, TemperatureUnit } from "../types/Weather.ts";
import { WEATHER_URL } from "../utils/constants.ts";
import { request } from "./request.ts";

export async function getTemperature(
  city: City,
  unit: TemperatureUnit,
): Promise<number> {
  const url = new URL(WEATHER_URL);
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
  const url = new URL(WEATHER_URL);
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

