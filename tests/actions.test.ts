import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { stripVTControlCharacters } from "node:util";
import { addCity } from "../src/actions/addCity.ts";
import { getAllWeather, getDefaultWeather } from "../src/actions/getWeather.ts";
import { getForecast } from "../src/actions/getForecast.ts";
import { removeCity } from "../src/actions/removeCity.ts";
import { setDefaultCity } from "../src/actions/setDefaultCity.ts";
import { setTemperatureUnit } from "../src/actions/setTemperatureUnit.ts";
import { listCities } from "../src/actions/listCities.ts";
import { answers, madrid, memoryStore, ottawa, settings } from "./helpers/fixtures.ts";

const originalFetch = globalThis.fetch;
let output: string[];
beforeEach(() => {
  output = [];
  spyOn(console, "log").mockImplementation((text: unknown) => {
    output.push(stripVTControlCharacters(String(text)));
  });
  // Cualquier petición no esperada falla inmediatamente, nunca usa la red real.
  globalThis.fetch = mock(async () => { throw new Error("Petición inesperada"); }) as unknown as typeof fetch;
});
afterEach(() => { globalThis.fetch = originalFetch; mock.restore(); });

function respond(body: unknown) {
  const fetchMock = mock(async () => Response.json(body));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

test("listar ciudades muestra numeración y default; una lista vacía informa", () => {
  listCities(settings());
  listCities(settings([ottawa, madrid]));
  expect(output.join("\n")).toContain("No hay ciudades guardadas.");
  expect(output.join("\n")).toContain("1. Ottawa, Canadá (default)");
  expect(output.join("\n")).toContain("2. Madrid, España");
});

test("agregar permite cancelar el nombre sin consultar la API", async () => {
  for (const name of ["", null]) {
    const store = memoryStore();
    await addCity(store, answers(name));
    expect(store.get()).toEqual(settings());
  }
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("agregar informa cuando no hay resultados o la ciudad ya existe", async () => {
  const store = memoryStore(settings([ottawa]));
  respond({ results: [] });
  await addCity(store, answers("desconocida"));
  respond({ results: [ottawa] });
  await addCity(store, answers("Ottawa"));
  expect(output.join("\n")).toContain("No se encontró la ciudad.");
  expect(output.join("\n")).toContain("ya está guardada.");
  expect(store.get()).toEqual(settings([ottawa]));
});

test("agregar requiere confirmación y no consulta temperatura al cancelar", async () => {
  for (const confirmation of ["n", "", null]) {
    const store = memoryStore();
    const fetchMock = respond({ results: [ottawa] });
    await addCity(store, answers("Ottawa", confirmation));
    expect(store.get()).toEqual(settings());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }
});

test("agregar otra ciudad conserva default y consulta la unidad configurada", async () => {
  const store = memoryStore({ ...settings([ottawa]), unit: "fahrenheit" });
  const fetchMock = mock(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    if (url.hostname === "geocoding-api.open-meteo.com") return Response.json({ results: [madrid] });
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
    return Response.json({ current: { temperature_2m: 55 } });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await addCity(store, answers("Madrid", "S"));
  expect(store.get()).toEqual({ cities: [ottawa, madrid], defaultCityId: 1, unit: "fahrenheit" });
  expect(output.join("\n")).toContain("55.0 °F");
});

test("agregar no anuncia éxito ni consulta temperatura si falla el guardado", async () => {
  const store = memoryStore(settings(), true);
  const fetchMock = respond({ results: [ottawa] });
  await expect(addCity(store, answers("Ottawa", "s"))).rejects.toThrow("No se pudo guardar");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(store.get()).toEqual(settings());
  expect(output.join("\n")).not.toContain("Ciudad guardada.");
});

test("la ciudad queda guardada aunque falle la consulta posterior de clima", async () => {
  const store = memoryStore();
  let calls = 0;
  globalThis.fetch = mock(async () => {
    if (++calls === 1) return Response.json({ results: [ottawa] });
    return new Response("", { status: 503 });
  }) as unknown as typeof fetch;
  await expect(addCity(store, answers("Ottawa", "s"))).rejects.toThrow("HTTP 503");
  expect(store.get()).toEqual(settings([ottawa]));
});

test("eliminar permite cancelar selección y confirmación sin mutar", async () => {
  for (const values of [["0"], [null], ["1", "n"], ["1", null]] as (string | null)[][]) {
    const store = memoryStore(settings([ottawa]));
    await removeCity(store, answers(...values));
    expect(store.get()).toEqual(settings([ottawa]));
  }
});

test("eliminar la última ciudad deja default null", async () => {
  const store = memoryStore(settings([ottawa]));
  await removeCity(store, answers("1", "S"));
  expect(store.get()).toEqual(settings());
  expect(output.join("\n")).toContain("Ciudad eliminada.");
});

test("cambiar default permite cancelar y rechaza índices inválidos", async () => {
  for (const value of ["0", "99", "texto", null]) {
    const store = memoryStore(settings([ottawa, madrid]));
    await setDefaultCity(store, answers(value));
    expect(store.get().defaultCityId).toBe(1);
  }
  expect(output.join("\n")).toContain("Selección inválida.");
});

test("fallos de guardado al eliminar o cambiar default conservan estado", async () => {
  const initial = settings([ottawa, madrid]);
  for (const action of [removeCity, setDefaultCity]) {
    const store = memoryStore(initial, true);
    await expect(action(store, answers("2", "s"))).rejects.toThrow("No se pudo guardar");
    expect(store.get()).toEqual(initial);
  }
  expect(output.join("\n")).not.toContain("Ciudad eliminada.");
  expect(output.join("\n")).not.toContain("Ciudad default: Madrid");
});

test("ajustes permite cancelar, valida entradas y guarda ambas unidades", async () => {
  const store = memoryStore(settings([ottawa]));
  for (const value of ["0", "", "99", null]) {
    await setTemperatureUnit(store, answers(value));
    expect(store.get()).toEqual(settings([ottawa]));
  }
  await setTemperatureUnit(store, answers("2"));
  expect(store.get().unit).toBe("fahrenheit");
  await setTemperatureUnit(store, answers("1"));
  expect(store.get().unit).toBe("celsius");
});

test("ajustes no cambia estado ni anuncia éxito si falla la escritura", async () => {
  const store = memoryStore(settings(), true);
  await expect(setTemperatureUnit(store, answers("2"))).rejects.toThrow("No se pudo guardar");
  expect(store.get().unit).toBe("celsius");
  expect(output.join("\n")).not.toContain("Unidad de temperatura guardada.");
});

test("clima default y de todas las ciudades informan si no hay ciudades", async () => {
  await getDefaultWeather(settings());
  await getAllWeather(settings());
  expect(output.join("\n")).toContain("No hay ciudad default.");
  expect(output.join("\n")).toContain("No hay ciudades guardadas.");
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("clima de todas las ciudades continúa si una consulta falla", async () => {
  globalThis.fetch = mock(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    return url.searchParams.get("latitude") === String(ottawa.latitude)
      ? new Response("", { status: 503 }) : Response.json({ current: { temperature_2m: 21 } });
  }) as unknown as typeof fetch;
  await getAllWeather(settings([ottawa, madrid]));
  expect(output.join("\n")).toContain("Ottawa, Canadá: Open-Meteo respondió con un error (HTTP 503).");
  expect(output.join("\n")).toContain("Madrid, España: 21.0 °C");
});

test("pronóstico permite cancelar sin red ni cambios", async () => {
  const initial = settings([ottawa]);
  await getForecast(initial, answers("0"));
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(initial).toEqual(settings([ottawa]));
});

test("pronóstico muestra siete días en la unidad guardada sin mutar datos", async () => {
  const initial = { ...settings([ottawa]), unit: "fahrenheit" as const };
  globalThis.fetch = mock(async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input));
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
    return Response.json({ daily: {
      time: Array.from({ length: 7 }, (_, index) => `2026-10-${12 + index}`),
      temperature_2m_min: Array(7).fill(40), temperature_2m_max: Array(7).fill(60),
      weather_code: Array(7).fill(0), precipitation_probability_max: Array(7).fill(10),
    } });
  }) as unknown as typeof fetch;
  await getForecast(initial, answers("1"));
  expect(output.join("\n")).toContain("Pronóstico de 7 días: Ottawa, Canadá");
  expect(output.join("\n")).toContain("40.0 °F");
  expect(output.join("\n")).toContain("60.0 °F");
  expect(output.join("\n")).toContain("18/10");
  expect(initial).toEqual({ ...settings([ottawa]), unit: "fahrenheit" });
});

test("eliminar default informa cuál es la nueva ciudad seleccionada", async () => {
  const store = memoryStore(settings([ottawa, madrid]));
  await removeCity(store, answers("1", "s"));
  expect(store.get()).toEqual(settings([madrid]));
  expect(output.join("\n")).toContain("Ciudad default: Madrid, España.");
});
