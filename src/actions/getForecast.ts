import { getForecast as fetchForecast } from "../api/weather.ts";
import type { Settings } from "../types/Settings.ts";
import { chooseCity, type Ask } from "../presentation/input.ts";
import { message, renderForecast } from "../presentation/output.ts";

export async function getForecast(settings: Settings, ask: Ask): Promise<void> {
  const city = await chooseCity(settings, ask);
  if (!city) return;
  message("Consultando pronóstico…");
  const forecast = await fetchForecast(city, settings.unit);
  message(renderForecast(city, forecast, settings.unit));
}
