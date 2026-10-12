import { getTemperature } from "../api/weather.ts";
import type { City } from "../types/City.ts";
import type { Settings } from "../types/Settings.ts";
import type { TemperatureUnit } from "../types/Weather.ts";
import { errorMessage, message, noCities, showTemperature } from "../presentation/output.ts";
import { cityLabel } from "../utils/format.ts";

export async function getWeather(city: City, unit: TemperatureUnit): Promise<void> {
  showTemperature(city, await getTemperature(city, unit), unit);
}

export async function getDefaultWeather(settings: Settings): Promise<void> {
  const city = settings.cities.find(city => city.id === settings.defaultCityId);
  if (city) await getWeather(city, settings.unit);
  else message("No hay ciudad default. Agrega una con la opción 3 o selecciónala con la opción 5.");
}

export async function getAllWeather(settings: Settings): Promise<void> {
  if (!settings.cities.length) noCities();
  for (const city of settings.cities) {
    try { await getWeather(city, settings.unit); }
    catch (error) { errorMessage(`${cityLabel(city)}: ${error instanceof Error ? error.message : "Error al consultar el clima."}`); }
  }
}
