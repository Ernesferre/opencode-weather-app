import { afterEach, describe, expect, mock, test } from "bun:test";
import { getForecast, getTemperature } from "../src/api/weather.ts";
import { searchCity } from "../src/api/geocoding.ts";
import { weatherDescription } from "../src/utils/format.ts";
import type { City } from "../src/types/City.ts";

const originalFetch = globalThis.fetch;
const city: City = { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.41117, longitude: -75.69812 };
afterEach(() => { globalThis.fetch = originalFetch; });

function respond(body: unknown, status = 200) {
  const fetchMock = mock(async (_url: Parameters<typeof fetch>[0], _options?: RequestInit) => new Response(JSON.stringify(body), { status }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function forecastResponse() {
  return { daily: {
    time: Array.from({ length: 7 }, (_, index) => `2026-10-${12 + index}`),
    temperature_2m_min: Array(7).fill(-3.2),
    temperature_2m_max: Array(7).fill(12.5),
    weather_code: [0, 2, 3, 61, 71, 95, 999],
    precipitation_probability_max: [0, 10, 20, 80, 50, 100, 0],
  } };
}

describe("pronóstico de 7 días", () => {
  for (const unit of ["celsius", "fahrenheit"] as const) {
    test(`consulta siete días en la zona de la ciudad y en ${unit}`, async () => {
      const fetchMock = respond(forecastResponse());
      const days = await getForecast(city, unit);
      expect(days).toHaveLength(7);
      expect(days[0]).toEqual({ date: "2026-10-12", minimum: -3.2, maximum: 12.5, weatherCode: 0, precipitationProbability: 0 });
      expect(days[6]?.date).toBe("2026-10-18");
      const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(url.hostname).toBe("api.open-meteo.com");
      expect(url.searchParams.get("latitude")).toBe(String(city.latitude));
      expect(url.searchParams.get("longitude")).toBe(String(city.longitude));
      expect(url.searchParams.get("forecast_days")).toBe("7");
      expect(url.searchParams.get("timezone")).toBe("auto");
      expect(url.searchParams.get("temperature_unit")).toBe(unit);
      expect(url.searchParams.get("daily")).toBe("temperature_2m_min,temperature_2m_max,weather_code,precipitation_probability_max");
    });
  }
  test("rechaza respuestas incompletas, fechas inválidas y valores inválidos", async () => {
    const valid = forecastResponse();
    const invalidBodies = [null, {}, { daily: null },
      { daily: { ...valid.daily, time: valid.daily.time.slice(0, 6) } },
      { daily: { ...valid.daily, temperature_2m_max: [] } },
      { daily: { ...valid.daily, temperature_2m_min: Array(7).fill(null) } },
      { daily: { ...valid.daily, temperature_2m_min: Array(7).fill(20) } },
      { daily: { ...valid.daily, weather_code: Array(7).fill(1.5) } },
      { daily: { ...valid.daily, precipitation_probability_max: Array(7).fill(101) } },
      { daily: { ...valid.daily, time: Array(7).fill("2026-02-30") } },
      { daily: { ...valid.daily, time: Array(7).fill("2026-10-12") } },
    ];
    for (const body of invalidBodies) {
      respond(body);
      await expect(getForecast(city, "celsius")).rejects.toThrow("pronóstico válido");
    }
  });
  test("reporta errores HTTP y de conexión", async () => {
    respond({}, 503);
    await expect(getForecast(city, "celsius")).rejects.toThrow("HTTP 503");
    globalThis.fetch = mock(async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    await expect(getForecast(city, "celsius")).rejects.toThrow("conexión");
  });
  test("traduce códigos meteorológicos y admite códigos desconocidos", () => {
    expect(weatherDescription(0)).toBe("Despejado");
    expect(weatherDescription(61)).toBe("Lluvia");
    expect(weatherDescription(71)).toBe("Nieve");
    expect(weatherDescription(99)).toBe("Tormenta con granizo");
    expect(weatherDescription(999)).toBe("Estado desconocido");
  });
});

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
