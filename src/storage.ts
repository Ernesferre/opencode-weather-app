import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isCity, type City, type TemperatureUnit } from "./weather.ts";

export interface Settings {
  cities: City[];
  defaultCityId: number | null;
  unit: TemperatureUnit;
}

export function settingsPath(): string {
  return process.env.WEATHER_CLI_CONFIG || join(homedir(), ".weather-cli", "settings.json");
}

export async function loadSettings(path = settingsPath()): Promise<Settings> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { cities: [], defaultCityId: null, unit: "celsius" };
    }
    throw new Error(`No se pudo leer la configuración: ${path}`);
  }
  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object") throw new Error();
    const settings = data as Settings;
    if (!Array.isArray(settings.cities) || !settings.cities.every(isCity)
      || new Set(settings.cities.map(city => city.id)).size !== settings.cities.length
      || !["celsius", "fahrenheit"].includes(settings.unit)
      || !(settings.defaultCityId === null || settings.cities.some(city => city.id === settings.defaultCityId))) {
      throw new Error();
    }
    return { cities: settings.cities, defaultCityId: settings.defaultCityId, unit: settings.unit };
  } catch {
    throw new Error(`Configuración inválida en ${path}. Revisa el archivo; no se sobrescribirá.`);
  }
}

export async function saveSettings(settings: Settings, path = settingsPath()): Promise<void> {
  // Escribir primero un temporal evita truncar la configuración si falla la escritura.
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(temporary, path);
  } catch {
    throw new Error(`No se pudo guardar la configuración: ${path}`);
  }
}
