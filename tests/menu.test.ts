import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { runMenu } from "../src/presentation/menu.ts";
import { answers, madrid, memoryStore, ottawa, settings } from "./helpers/fixtures.ts";

const originalFetch = globalThis.fetch;
let output: string[];
beforeEach(() => {
  output = [];
  spyOn(console, "log").mockImplementation((value: unknown) => {
    output.push(stripVTControlCharacters(String(value)));
  });
  globalThis.fetch = mock(async () => Response.json({ current: { temperature_2m: 20 } })) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; mock.restore(); });

test("el menú despacha todas las acciones y refleja los ajustes guardados", async () => {
  const store = memoryStore(settings([ottawa, madrid]));
  await runMenu(store, answers(
    "1", "2", "3", "", "4", "2", "n", "5", "2", "6", "0", "8", "2", "9",
  ));
  expect(store.get()).toEqual({ cities: [ottawa, madrid], defaultCityId: 2, unit: "fahrenheit" });
  expect(output.join("\n")).toContain("Ottawa, Canadá: 20.0 °C");
  expect(output.join("\n")).toContain("Madrid, España: 20.0 °C");
  expect(output.join("\n")).toContain("Ciudad default: Madrid, España.");
  expect(output.join("\n")).toContain("Ajustes (°F)");
  expect(output.at(-1)).toBe("¡Hasta pronto!");
});

test("el menú rechaza opciones ajenas sin ejecutar propiedades heredadas", async () => {
  const store = memoryStore();
  await runMenu(store, answers("", "7", "__proto__", "constructor", null));
  expect(output.filter(line => line.includes("Opción inválida"))).toHaveLength(4);
  expect(store.get()).toEqual(settings());
  expect(output.at(-1)).toBe("¡Hasta pronto!");
});

test("el menú muestra el error y continúa después de fallar una acción", async () => {
  const store = memoryStore(settings([ottawa]), true);
  globalThis.fetch = mock(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
  await runMenu(store, answers("1", "8", "2", "9"));
  expect(output.join("\n")).toContain("Error: Open-Meteo respondió con un error (HTTP 503).");
  expect(output.join("\n")).toContain("Error: No se pudo guardar la configuración.");
  expect(store.get()).toEqual(settings([ottawa]));
  expect(output.at(-1)).toBe("¡Hasta pronto!");
});

test("el menú ofrece un mensaje seguro si una operación lanza un valor no Error", async () => {
  const store = { get: () => settings(), async commit() { throw "fallo"; } };
  await runMenu(store, answers("8", "2", "9"));
  expect(output.join("\n")).toContain("Error: No se pudo completar la operación.");
});
