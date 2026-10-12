import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { chooseCity } from "../src/presentation/input.ts";
import { answers, ottawa, madrid, settings } from "./helpers/fixtures.ts";

afterEach(() => { mock.restore(); });

test("selección devuelve la ciudad correcta sin modificar la lista", async () => {
  spyOn(console, "log").mockImplementation(() => {});
  const initial = settings([ottawa, madrid]);
  expect(await chooseCity(initial, answers("2"))).toEqual(madrid);
  expect(initial).toEqual(settings([ottawa, madrid]));
});

test("selección vacía no solicita input", async () => {
  spyOn(console, "log").mockImplementation(() => {});
  const ask = mock(answers("1"));
  expect(await chooseCity(settings(), ask)).toBeNull();
  expect(ask).not.toHaveBeenCalled();
});

test("selección rechaza negativos, decimales, texto y fuera de rango", async () => {
  const log = spyOn(console, "log").mockImplementation(() => {});
  for (const value of ["-1", "1.5", "abc", "", "99", "9999999999999999999999999"]) {
    expect(await chooseCity(settings([ottawa]), answers(value))).toBeNull();
  }
  expect(log.mock.calls.filter(([value]) => String(value).includes("Selección inválida."))).toHaveLength(6);
});

test("selección cancela con cero o fin de entrada sin avisar error", async () => {
  const log = spyOn(console, "log").mockImplementation(() => {});
  for (const value of ["0", null]) expect(await chooseCity(settings([ottawa]), answers(value))).toBeNull();
  expect(log.mock.calls.some(([value]) => String(value).includes("Selección inválida."))).toBe(false);
});
