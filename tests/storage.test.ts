import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSettings, saveSettings } from "../src/storage/settingsStorage.ts";
import type { Settings } from "../src/types/Settings.ts";

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
