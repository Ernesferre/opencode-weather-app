import type { City } from "../types/City.ts";
import type { Settings } from "../types/Settings.ts";
import type { ForecastDay, TemperatureUnit } from "../types/Weather.ts";
import { colors } from "../utils/colors.ts";
import { cityLabel, formatTemperature, weatherDescription } from "../utils/format.ts";

export function message(text: string): void { console.log(text); }
export function success(text: string): void { console.log(colors.green(text)); }
export function errorMessage(text: string): void { console.log(colors.red(text)); }
export function noCities(): void { message("No hay ciudades guardadas. Agrega una con la opción 3."); }

export function showTemperatureUnits(): void {
  message(colors.cyan("  1. Celsius (°C)\n  2. Fahrenheit (°F)\n  0. Cancelar"));
}

export function showCities(settings: Settings): void {
  settings.cities.forEach((city, index) => {
    message(`  ${index + 1}. ${cityLabel(city)}${city.id === settings.defaultCityId ? " (default)" : ""}`);
  });
}

export function showTemperature(city: City, temperature: number, unit: TemperatureUnit): void {
  message(`  ${cityLabel(city)}: ${colors.yellow(formatTemperature(temperature, unit))}`);
}

export function renderForecast(city: City, days: ForecastDay[], unit: TemperatureUnit, palette = colors): string {
  const dateFormat = new Intl.DateTimeFormat("es", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const rows = days.map(day => {
    // Las fechas diarias ya pertenecen a la zona de la ciudad; UTC evita desplazarlas al formatear.
    const date = dateFormat.format(new Date(`${day.date}T00:00:00Z`)).padEnd(14);
    const minimum = palette.yellow(formatTemperature(day.minimum, unit).padStart(10));
    const maximum = palette.yellow(formatTemperature(day.maximum, unit).padStart(10));
    return `  ${date} ${minimum} ${maximum} ${`${day.precipitationProbability}%`.padStart(8)}  ${weatherDescription(day.weatherCode)}`;
  });
  return [palette.cyan(`Pronóstico de 7 días: ${cityLabel(city)} (incluye hoy)`),
    "  Fecha                Mín.       Máx.   Precip.  Estado", ...rows].join("\n");
}
