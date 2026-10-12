import { expect, test } from "bun:test";
import { renderForecast, renderMenu } from "./cli.ts";
import { createColors } from "./colors.ts";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSettings, saveSettings } from "./storage.ts";

test("el menú conserva la numeración del README y muestra cantidad y unidad", () => {
  const menu = renderMenu({ cities: [], defaultCityId: null, unit: "fahrenheit" });
  expect(menu).toContain("2. Clima de todas las ciudades (0)");
  expect(menu).toContain("8. Ajustes (°F)");
  expect(menu).toContain("9. Salir");
  expect(menu).toContain("6. Pronóstico de 7 días");
});

test("el menú usa cyan sin alterar su contenido", () => {
  const settings = { cities: [], defaultCityId: null, unit: "celsius" as const };
  const plain = renderMenu(settings, createColors(false, {}));
  expect(renderMenu(settings, createColors(true, {}))).toBe(`\u001b[36m${plain}\u001b[0m`);
  expect(plain).not.toContain("\u001b[");
});

test("el pronóstico muestra siete fechas, unidades y estados sin colores al redirigir", () => {
  const city = { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 };
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-10-${12 + index}`, minimum: -3.2, maximum: 12.5,
    weatherCode: 61, precipitationProbability: 80,
  }));
  for (const unit of ["celsius", "fahrenheit"] as const) {
    const plain = renderForecast(city, days, unit, createColors(false, {}));
    expect(plain.split("\n")).toHaveLength(9);
    expect(plain).toContain("Ottawa, Canadá (incluye hoy)");
    expect(plain).toContain("12/10");
    expect(plain).toContain("18/10");
    expect(plain).toContain(`-3.2 ${unit === "celsius" ? "°C" : "°F"}`);
    expect(plain).toContain("80%");
    expect(plain).toContain("Lluvia");
    expect(plain).not.toContain("\u001b[");
    const colored = renderForecast(city, days, unit, createColors(true, {}));
    expect(colored).toContain("\u001b[33m");
    expect(colored.replace(/\u001b\[[0-9;]*m/g, "")).toBe(plain);
  }
});

test("la opción 6 permite cancelar y avisa si no hay ciudades", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weather-cli-forecast-"));
  const path = join(directory, "settings.json");
  try {
    for (const cities of [[], [{ id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 }]]) {
      await saveSettings({ cities, defaultCityId: cities[0]?.id ?? null, unit: "celsius" }, path);
      const child = Bun.spawn([process.execPath, "run", join(import.meta.dir, "..", "index.ts")], {
        env: { ...process.env, WEATHER_CLI_CONFIG: path }, stdin: "pipe", stdout: "pipe", stderr: "pipe",
      });
      child.stdin.write(cities.length ? "6\n0\n6\n99\n9\n" : "6\n9\n");
      child.stdin.end();
      const [output, errors, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect(code).toBe(0);
      expect(errors).toBe("");
      expect(output).toContain(cities.length ? "Selección inválida." : "No hay ciudades guardadas.");
      expect(output).not.toContain("Consultando pronóstico…");
      expect(output).toContain("¡Hasta pronto!");
      expect((await loadSettings(path)).cities).toEqual(cities);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("la opción 6 consulta el pronóstico y vuelve al menú tras un error", async () => {
  const directory = await mkdtemp(join(tmpdir(), "weather-cli-forecast-network-"));
  const path = join(directory, "settings.json");
  const preload = join(directory, "mock-fetch.ts");
  const settings = {
    cities: [{ id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 }],
    defaultCityId: 1, unit: "fahrenheit" as const,
  };
  try {
    await saveSettings(settings, path);
    await writeFile(preload, `
      let calls = 0;
      globalThis.fetch = async (input) => {
        const url = new URL(String(input));
        if (url.hostname !== "api.open-meteo.com" || url.searchParams.get("temperature_unit") !== "fahrenheit") {
          return new Response("", { status: 400 });
        }
        if (++calls === 2) return new Response("", { status: 503 });
        return Response.json({ daily: {
          time: Array.from({ length: 7 }, (_, index) => "2026-10-" + (12 + index)),
          temperature_2m_min: Array(7).fill(40), temperature_2m_max: Array(7).fill(60),
          weather_code: Array(7).fill(0), precipitation_probability_max: Array(7).fill(10),
        } });
      };
    `);
    const child = Bun.spawn([process.execPath, "run", "--preload", preload, join(import.meta.dir, "..", "index.ts")], {
      env: { ...process.env, WEATHER_CLI_CONFIG: path }, stdin: "pipe", stdout: "pipe", stderr: "pipe",
    });
    child.stdin.write("6\n1\n6\n1\n6\n1\n9\n");
    child.stdin.end();
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(code).toBe(0);
    expect(errors).toBe("");
    expect(output).toContain("Pronóstico de 7 días: Ottawa");
    expect(output.match(/Pronóstico de 7 días: Ottawa/g)).toHaveLength(2);
    expect(output).toContain("40.0 °F");
    expect(output).toContain("60.0 °F");
    expect(output).toContain("HTTP 503");
    expect(output).toContain("¡Hasta pronto!");
    expect(await loadSettings(path)).toEqual(settings);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
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
