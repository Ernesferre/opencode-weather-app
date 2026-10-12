import { afterEach, describe, expect, mock, test } from "bun:test";
import { getTemperature, searchCity, type City } from "./weather.ts";

const originalFetch = globalThis.fetch;
const city: City = { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.41117, longitude: -75.69812 };
afterEach(() => { globalThis.fetch = originalFetch; });

function respond(body: unknown, status = 200) {
  const fetchMock = mock(async (_url: Parameters<typeof fetch>[0], _options?: RequestInit) => new Response(JSON.stringify(body), { status }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("Open-Meteo", () => {
  test("obtiene coordenadas con una búsqueda codificada y en español", async () => {
    const fetchMock = respond({ results: [city] });
    expect(await searchCity("  Ottawa  ")).toEqual(city);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.hostname).toBe("geocoding-api.open-meteo.com");
    expect(url.searchParams.get("name")).toBe("Ottawa");
    expect(url.searchParams.get("language")).toBe("es");
    expect(url.searchParams.get("count")).toBe("1");
  });
  test("una ciudad desconocida no produce un resultado", async () => {
    respond({});
    expect(await searchCity("Ciudad inexistente")).toBeNull();
  });
  test("rechaza coordenadas inválidas", async () => {
    respond({ results: [{ ...city, latitude: 100 }] });
    await expect(searchCity("Ottawa")).rejects.toThrow("coordenadas válidas");
  });
  test("consulta temperatura con las coordenadas y la unidad elegida", async () => {
    const fetchMock = respond({ current: { temperature_2m: -3.2 } });
    expect(await getTemperature(city, "fahrenheit")).toBe(-3.2);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.hostname).toBe("api.open-meteo.com");
    expect(url.searchParams.get("latitude")).toBe(String(city.latitude));
    expect(url.searchParams.get("longitude")).toBe(String(city.longitude));
    expect(url.searchParams.get("current")).toBe("temperature_2m");
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
  });
  test("reporta errores HTTP", async () => {
    respond({}, 503);
    await expect(getTemperature(city, "celsius")).rejects.toThrow("HTTP 503");
  });
  test("rechaza temperatura ausente", async () => {
    respond({ current: { temperature_2m: null } });
    await expect(getTemperature(city, "celsius")).rejects.toThrow("temperatura válida");
  });
  test("reporta errores de conexión", async () => {
    globalThis.fetch = mock(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(searchCity("Ottawa")).rejects.toThrow("conexión");
  });
});
