import { expect, test } from "bun:test";
import { renderMenu } from "./cli.ts";
import { createColors } from "./colors.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSettings, saveSettings } from "./storage.ts";

test("el menú conserva la numeración del README y muestra cantidad y unidad", () => {
  const menu = renderMenu({ cities: [], defaultCityId: null, unit: "fahrenheit" });
  expect(menu).toContain("2. Clima de todas las ciudades (0)");
  expect(menu).toContain("8. Ajustes (°F)");
  expect(menu).toContain("9. Salir");
  expect(menu).not.toContain("6.");
});

test("el menú usa cyan sin alterar su contenido", () => {
  const settings = { cities: [], defaultCityId: null, unit: "celsius" as const };
  const plain = renderMenu(settings, createColors(false, {}));
  expect(renderMenu(settings, createColors(true, {}))).toBe(`\u001b[36m${plain}\u001b[0m`);
  expect(plain).not.toContain("\u001b[");
});

test("la consola cambia default, guarda unidades, elimina y sale", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weather-cli-integration-"));
  const path = join(directory, "settings.json");
  try {
    await saveSettings({
      cities: [
        { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 },
        { id: 2, name: "Madrid", country: "España", latitude: 40.4, longitude: -3.7 },
      ], defaultCityId: 1, unit: "celsius",
    }, path);
    const child = Bun.spawn([process.execPath, "run", join(import.meta.dir, "..", "index.ts")], {
      env: { ...process.env, WEATHER_CLI_CONFIG: path },
      stdin: "pipe", stdout: "pipe", stderr: "pipe",
    });
    child.stdin.write("invalida\n5\n2\n8\n2\n4\n2\ns\n9\n");
    child.stdin.end();
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(code).toBe(0);
    expect(errors).toBe("");
    expect(output).not.toContain("\u001b[");
    expect(output).toContain("Opción inválida");
    expect(output).toContain("Ciudad default: Madrid, España.");
    expect(output).toContain("Ciudad eliminada.");
    expect(output).toContain("Clima de todas las ciudades (1)");
    expect(output).toContain("Ajustes (°F)");
    expect(output).toContain("¡Hasta pronto!");
    const saved = await loadSettings(path);
    expect(saved.cities.map(city => city.id)).toEqual([1]);
    expect(saved.defaultCityId).toBe(1);
    expect(saved.unit).toBe("fahrenheit");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
