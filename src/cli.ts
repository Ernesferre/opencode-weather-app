import { createInterface } from "node:readline";
import { colors } from "./colors.ts";
import { loadSettings, saveSettings, type Settings } from "./storage.ts";
import { cityLabel, getForecast, getTemperature, searchCity, weatherDescription, type City, type ForecastDay, type TemperatureUnit } from "./weather.ts";

const separator = "════════════════════════════════════════";

export function renderMenu(settings: Settings, palette = colors): string {
  const symbol = settings.unit === "celsius" ? "°C" : "°F";
  return palette.cyan([separator, "         WEATHER CLI", separator,
    "  1. Clima de ciudad default",
    `  2. Clima de todas las ciudades (${settings.cities.length})`,
    "  3. Buscar y agregar ciudad", "  4. Eliminar ciudad",
    "  5. Establecer ciudad default", "  6. Pronóstico de 7 días", `  8. Ajustes (${symbol})`,
    "  9. Salir", separator].join("\n"));
}

export function renderForecast(city: City, days: ForecastDay[], unit: TemperatureUnit, palette = colors): string {
  const symbol = unit === "celsius" ? "°C" : "°F";
  const dateFormat = new Intl.DateTimeFormat("es", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const rows = days.map(day => {
    // Las fechas diarias ya pertenecen a la zona de la ciudad; UTC evita desplazarlas al formatear.
    const date = dateFormat.format(new Date(`${day.date}T00:00:00Z`)).padEnd(14);
    const minimum = palette.yellow(`${day.minimum.toFixed(1)} ${symbol}`.padStart(10));
    const maximum = palette.yellow(`${day.maximum.toFixed(1)} ${symbol}`.padStart(10));
    return `  ${date} ${minimum} ${maximum} ${`${day.precipitationProbability}%`.padStart(8)}  ${weatherDescription(day.weatherCode)}`;
  });
  return [
    palette.cyan(`Pronóstico de 7 días: ${cityLabel(city)} (incluye hoy)`),
    "  Fecha                Mín.       Máx.   Precip.  Estado",
    ...rows,
  ].join("\n");
}

export async function runCli(): Promise<void> {
  let settings = await loadSettings();
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = input[Symbol.asyncIterator]();
  const ask = async (prompt: string): Promise<string | null> => {
    process.stdout.write(prompt);
    const next = await lines.next();
    return next.done ? null : next.value.trim();
  };
  const commit = async (next: Settings) => {
    await saveSettings(next);
    settings = next;
  };
  const chooseCity = async (): Promise<City | null> => {
    if (!settings.cities.length) {
      console.log("No hay ciudades guardadas. Agrega una con la opción 3.");
      return null;
    }
    settings.cities.forEach((city, index) => {
      console.log(`  ${index + 1}. ${cityLabel(city)}${city.id === settings.defaultCityId ? " (default)" : ""}`);
    });
    const answer = await ask("Selecciona una ciudad (0 para cancelar): ");
    if (answer === null || answer === "0") return null;
    const city = /^\d+$/.test(answer) ? settings.cities[Number(answer) - 1] : undefined;
    if (!city) console.log(colors.red("Selección inválida."));
    return city ?? null;
  };
  const showWeather = async (city: City) => {
    const temperature = await getTemperature(city, settings.unit);
    const value = `${temperature.toFixed(1)} ${settings.unit === "celsius" ? "°C" : "°F"}`;
    console.log(`  ${cityLabel(city)}: ${colors.yellow(value)}`);
  };

  try {
    while (true) {
      console.log(`\n${renderMenu(settings)}`);
      const option = await ask("  Selecciona una opción: ");
      if (option === null || option === "9") {
        console.log("¡Hasta pronto!");
        break;
      }
      try {
        switch (option) {
          case "1": {
            const city = settings.cities.find(city => city.id === settings.defaultCityId);
            if (city) await showWeather(city);
            else console.log("No hay ciudad default. Agrega una con la opción 3 o selecciónala con la opción 5.");
            break;
          }
          case "2":
            if (!settings.cities.length) console.log("No hay ciudades guardadas. Agrega una con la opción 3.");
            for (const city of settings.cities) {
              try { await showWeather(city); }
              catch (error) { console.log(colors.red(`${cityLabel(city)}: ${error instanceof Error ? error.message : "Error al consultar el clima."}`)); }
            }
            break;
          case "3": {
            const name = await ask("Nombre de la ciudad (vacío para cancelar): ");
            if (!name) break;
            console.log("Buscando ciudad…");
            const city = await searchCity(name);
            if (!city) { console.log(colors.red("No se encontró la ciudad.")); break; }
            if (settings.cities.some(saved => saved.id === city.id)) {
              console.log(`${cityLabel(city)} ya está guardada.`);
              break;
            }
            console.log(`Ciudad encontrada: ${cityLabel(city)} (${city.latitude}, ${city.longitude}).`);
            const confirmation = await ask("¿Agregar esta ciudad? (s/n): ");
            if (confirmation?.toLowerCase() !== "s") break;
            await commit({ ...settings, cities: [...settings.cities, city], defaultCityId: settings.defaultCityId ?? city.id });
            console.log(colors.green("Ciudad guardada. La primera ciudad se establece como default automáticamente."));
            await showWeather(city);
            break;
          }
          case "4": {
            const city = await chooseCity();
            if (!city) break;
            const confirmation = await ask(`¿Eliminar ${cityLabel(city)}? (s/n): `);
            if (confirmation?.toLowerCase() !== "s") break;
            const cities = settings.cities.filter(saved => saved.id !== city.id);
            await commit({ ...settings, cities, defaultCityId: settings.defaultCityId === city.id ? (cities[0]?.id ?? null) : settings.defaultCityId });
            console.log(colors.green("Ciudad eliminada."));
            if (settings.defaultCityId !== null && settings.defaultCityId !== city.id) {
              const current = cities.find(saved => saved.id === settings.defaultCityId);
              if (current) console.log(colors.green(`Ciudad default: ${cityLabel(current)}.`));
            }
            break;
          }
          case "5": {
            const city = await chooseCity();
            if (!city) break;
            await commit({ ...settings, defaultCityId: city.id });
            console.log(colors.green(`Ciudad default: ${cityLabel(city)}.`));
            break;
          }
          case "6": {
            const city = await chooseCity();
            if (!city) break;
            console.log("Consultando pronóstico…");
            const forecast = await getForecast(city, settings.unit);
            console.log(renderForecast(city, forecast, settings.unit));
            break;
          }
          case "8": {
            console.log(colors.cyan("  1. Celsius (°C)\n  2. Fahrenheit (°F)\n  0. Cancelar"));
            const unit = await ask("Selecciona la unidad: ");
            if (unit === null || unit === "0") break;
            if (unit !== "1" && unit !== "2") { console.log(colors.red("Selección inválida.")); break; }
            await commit({ ...settings, unit: unit === "1" ? "celsius" : "fahrenheit" });
            console.log(colors.green("Unidad de temperatura guardada."));
            break;
          }
          default:
            console.log(colors.red("Opción inválida. Elige 1, 2, 3, 4, 5, 6, 8 o 9."));
        }
      } catch (error) {
        console.log(colors.red(`Error: ${error instanceof Error ? error.message : "No se pudo completar la operación."}`));
      }
    }
  } finally {
    input.close();
  }
}
