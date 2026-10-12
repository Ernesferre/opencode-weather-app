import { expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadSettings, saveSettings } from "../src/storage/settingsStorage.ts";
import { ottawa, madrid, settings } from "./helpers/fixtures.ts";
import { runCli, withSandbox } from "./helpers/sandbox.ts";

test("el CLI recorta espacios, tolera CRLF y sale al terminar la entrada", async () => {
  await withSandbox(async directory => {
    const result = await runCli(directory, "  8  \r\n  2  \r\n");
    expect(result.code).toBe(0);
    expect(result.errors).toBe("");
    expect(result.output).toContain("Ajustes (°F)");
    expect(result.output).toContain("¡Hasta pronto!");
    expect((await loadSettings(join(directory, "settings.json"))).unit).toBe("fahrenheit");
  });
});

test("el CLI informa las acciones sin ciudades y no necesita red", async () => {
  await withSandbox(async directory => {
    const result = await runCli(directory, "1\n2\n4\n5\n6\n9\n", `
      globalThis.fetch = () => { throw new Error("No debe consultar la red"); };
    `);
    expect(result.code).toBe(0);
    expect(result.errors).toBe("");
    expect(result.output).toContain("No hay ciudad default.");
    expect(result.output.match(/No hay ciudades guardadas\./g)).toHaveLength(4);
    expect(result.output).not.toContain("Error:");
  });
});

test("configuración corrupta impide iniciar y no se sobrescribe", async () => {
  await withSandbox(async directory => {
    const path = join(directory, "settings.json");
    await writeFile(path, "broken JSON");
    const result = await runCli(directory, "9\n");
    expect(result.code).not.toBe(0);
    expect(result.errors).toContain("Configuración inválida");
    expect(result.errors).toContain(path);
    expect(result.output).not.toContain("WEATHER CLI");
    expect(await readFile(path, "utf8")).toBe("broken JSON");
  });
});

test("clima default y todas las ciudades usan la unidad guardada y recuperan errores", async () => {
  await withSandbox(async directory => {
    const initial = { ...settings([ottawa, madrid]), unit: "fahrenheit" as const };
    await saveSettings(initial, join(directory, "settings.json"));
    const result = await runCli(directory, "1\n2\n1\n9\n", `
      let calls = 0;
      globalThis.fetch = async input => {
        const url = new URL(String(input));
        if (url.searchParams.get("temperature_unit") !== "fahrenheit") throw new Error("Unidad incorrecta");
        if (++calls <= 2) return new Response("", { status: 503 });
        return Response.json({ current: { temperature_2m: 55 } });
      };
    `);
    expect(result.code).toBe(0);
    expect(result.errors).toBe("");
    expect(result.output).toContain("Error: Open-Meteo respondió con un error (HTTP 503).");
    expect(result.output).toContain("Ottawa, Canadá: Open-Meteo respondió con un error (HTTP 503).");
    expect(result.output).toContain("Madrid, España: 55.0 °F");
    expect(result.output).toContain("Ottawa, Canadá: 55.0 °F");
    expect(await loadSettings(join(directory, "settings.json"))).toEqual(initial);
  });
});

test("el CLI conserva su estado y vuelve al menú si falla la persistencia", async () => {
  await withSandbox(async directory => {
    const initial = settings([ottawa, madrid]);
    const path = join(directory, "settings.json");
    await saveSettings(initial, path);
    const storageModule = join(import.meta.dir, "..", "src", "storage", "settingsStorage.ts");
    const result = await runCli(directory, "8\n2\n5\n2\n4\n1\ns\n9\n", `
      import { mock } from "bun:test";
      mock.module(${JSON.stringify(storageModule)}, () => ({
        loadSettings: async () => (${JSON.stringify(initial)}),
        saveSettings: async () => { throw new Error("No se pudo guardar la configuración."); },
      }));
    `);
    expect(result.code).toBe(0);
    expect(result.errors).toBe("");
    expect(result.output.match(/Error: No se pudo guardar la configuración\./g)).toHaveLength(3);
    expect(result.output).not.toContain("Ajustes (°F)");
    expect(result.output).not.toContain("Ciudad eliminada.");
    expect(result.output).not.toContain("Ciudad default: Madrid");
    expect(result.output).toContain("Ottawa, Canadá (default)");
    expect(await loadSettings(path)).toEqual(initial);
  });
});

test("entradas inválidas y cancelaciones no guardan cambios", async () => {
  await withSandbox(async directory => {
    const path = join(directory, "settings.json");
    const initial = settings([ottawa]);
    await saveSettings(initial, path);
    const result = await runCli(directory, "__proto__\nconstructor\n8\n99\n8\n0\n4\n1\nn\n5\n0\n3\n\n9\n");
    expect(result.code).toBe(0);
    expect(result.errors).toBe("");
    expect(result.output.match(/Opción inválida/g)).toHaveLength(2);
    expect(result.output).toContain("Selección inválida.");
    expect(await loadSettings(path)).toEqual(initial);
  });
});

test("fin de entrada durante selección o confirmación cancela sin escribir", async () => {
  await withSandbox(async directory => {
    const path = join(directory, "settings.json");
    const initial = settings([ottawa]);
    await saveSettings(initial, path);
    for (const input of ["4\n", "4\n1\n", "5\n", "6\n", "8\n", "3\n"]) {
      const result = await runCli(directory, input);
      expect(result.code).toBe(0);
      expect(result.errors).toBe("");
      expect(result.output).toContain("¡Hasta pronto!");
      expect(await loadSettings(path)).toEqual(initial);
    }
  });
});
