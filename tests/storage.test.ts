import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadSettings, saveSettings, settingsPath } from "../src/storage/settingsStorage.ts";
import type { Settings } from "../src/types/Settings.ts";
import { ottawa, settings } from "./helpers/fixtures.ts";

const directories: string[] = [];
async function temporaryPath() {
  const dir = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
  directories.push(dir);
  return join(dir, "settings.json");
}
afterEach(async () => {
  for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});

test("sin archivo comienza vacío y en Celsius", async () => {
  expect(await loadSettings(await temporaryPath())).toEqual({ cities: [], defaultCityId: null, unit: "celsius" });
});

test("conserva ciudades, default y unidad entre lecturas; permite actualizar", async () => {
  const path = await temporaryPath();
  const settings: Settings = {
    cities: [{ id: 1, name: "Ottawa", country: "Canadá", latitude: 45.41117, longitude: -75.69812 }],
    defaultCityId: 1, unit: "fahrenheit",
  };
  await saveSettings(settings, path);
  expect(await loadSettings(path)).toEqual(settings);
  await saveSettings({ ...settings, unit: "celsius" }, path);
  expect((await loadSettings(path)).unit).toBe("celsius");
});

test("no sobrescribe un archivo corrupto", async () => {
  const path = await temporaryPath();
  await writeFile(path, "invalid JSON");
  await expect(loadSettings(path)).rejects.toThrow("no se sobrescribirá");
  expect(await readFile(path, "utf8")).toBe("invalid JSON");
});

test("rechaza una ciudad default que no está guardada", async () => {
  const path = await temporaryPath();
  await writeFile(path, JSON.stringify({ cities: [], defaultCityId: 99, unit: "celsius" }));
  await expect(loadSettings(path)).rejects.toThrow("Configuración inválida");
});

test("rechaza configuraciones incompletas, duplicadas o con valores inválidos sin sobrescribir", async () => {
  const path = await temporaryPath();
  for (const value of [null, [], {}, "settings", { ...settings(), cities: null },
    { ...settings(), cities: [{}] }, { ...settings([ottawa]), cities: [ottawa, ottawa] },
    { ...settings(), unit: "kelvin" }, { ...settings(), defaultCityId: "1" },
    { ...settings(), defaultCityId: undefined }]) {
    const text = JSON.stringify(value);
    await writeFile(path, text);
    await expect(loadSettings(path)).rejects.toThrow("Configuración inválida");
    expect(await readFile(path, "utf8")).toBe(text);
  }
});

test("la ruta usa WEATHER_CLI_CONFIG o el directorio del usuario", () => {
  const previous = process.env.WEATHER_CLI_CONFIG;
  try {
    process.env.WEATHER_CLI_CONFIG = "custom-settings.json";
    expect(settingsPath()).toBe("custom-settings.json");
    delete process.env.WEATHER_CLI_CONFIG;
    expect(settingsPath()).toBe(join(homedir(), ".weather-cli", "settings.json"));
    process.env.WEATHER_CLI_CONFIG = "";
    expect(settingsPath()).toBe(join(homedir(), ".weather-cli", "settings.json"));
  } finally {
    if (previous === undefined) delete process.env.WEATHER_CLI_CONFIG;
    else process.env.WEATHER_CLI_CONFIG = previous;
  }
});

test("crea directorios y reemplaza configuración sin dejar temporales tras el éxito", async () => {
  const root = dirname(await temporaryPath());
  const path = join(root, "nested", "settings.json");
  await saveSettings(settings([ottawa]), path);
  await saveSettings(settings(), path);
  expect(await loadSettings(path)).toEqual(settings());
  expect(await readdir(dirname(path))).toEqual(["settings.json"]);
});

test("informa errores de lectura sin tratarlos como archivo inexistente", async () => {
  const path = await temporaryPath();
  await mkdir(path);
  await expect(loadSettings(path)).rejects.toThrow();
  expect((await readdir(path)).length).toBe(0);
});

test("informa fallos de escritura sin truncar la configuración existente", async () => {
  const path = await temporaryPath();
  await saveSettings(settings([ottawa]), path);
  const original = await readFile(path, "utf8");
  // Bloqueo determinista y portable: el nombre del temporal está ocupado por un directorio.
  await mkdir(`${path}.${process.pid}.tmp`);
  await expect(saveSettings(settings(), path)).rejects.toThrow("No se pudo guardar la configuración");
  expect(await readFile(path, "utf8")).toBe(original);
});

test("informa errores al crear el directorio o renombrar el temporal", async () => {
  const path = await temporaryPath();
  await writeFile(path, "parent-file");
  await expect(saveSettings(settings(), join(path, "settings.json"))).rejects.toThrow("No se pudo guardar");
  expect(await readFile(path, "utf8")).toBe("parent-file");
  await rm(path);
  await mkdir(path);
  await writeFile(join(path, "keep.txt"), "conservar");
  await expect(saveSettings(settings(), path)).rejects.toThrow("No se pudo guardar");
  expect(await readFile(join(path, "keep.txt"), "utf8")).toBe("conservar");
});
