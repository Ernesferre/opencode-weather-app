import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { request } from "../src/api/request.ts";
import { REQUEST_TIMEOUT_MS } from "../src/utils/constants.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; mock.restore(); });
const url = new URL("https://api.open-meteo.com/v1/forecast");

test("parsea JSON y configura una señal de timeout", async () => {
  const timeout = spyOn(AbortSignal, "timeout");
  const fetchMock = mock(async (_input: unknown, _options?: RequestInit) => Response.json({ ok: true }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  expect(await request(url)).toEqual({ ok: true });
  expect(timeout).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
  expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
});

test("rechaza un cuerpo que no es JSON", async () => {
  globalThis.fetch = mock(async () => new Response("no-json")) as unknown as typeof fetch;
  await expect(request(url)).rejects.toThrow("respuesta inválida");
});

test("informa el código HTTP sin intentar leer JSON", async () => {
  globalThis.fetch = mock(async () => new Response("no-json", { status: 429 })) as unknown as typeof fetch;
  await expect(request(url)).rejects.toThrow("HTTP 429");
});

test("traduce errores de conexión y abortos por timeout", async () => {
  for (const error of [new Error("offline"), new DOMException("timeout", "TimeoutError")]) {
    globalThis.fetch = mock(async () => { throw error; }) as unknown as typeof fetch;
    await expect(request(url)).rejects.toThrow("No se pudo conectar");
  }
});

test("entrega a fetch la señal abortada y maneja el timeout sin esperar diez segundos", async () => {
  const signal = AbortSignal.abort(new DOMException("timeout", "TimeoutError"));
  spyOn(AbortSignal, "timeout").mockReturnValue(signal);
  globalThis.fetch = mock(async (_input: unknown, options?: RequestInit) => {
    expect(options?.signal).toBe(signal);
    options?.signal?.throwIfAborted();
    return Response.json({});
  }) as unknown as typeof fetch;
  await expect(request(url)).rejects.toThrow("No se pudo conectar");
});
