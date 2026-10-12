import { expect, test } from "bun:test";
import { isCity } from "../src/types/City.ts";
import { ottawa } from "./helpers/fixtures.ts";

test("valida ciudades y los límites de las coordenadas", () => {
  expect(isCity(ottawa)).toBe(true);
  for (const latitude of [-90, 90]) {
    for (const longitude of [-180, 180]) expect(isCity({ ...ottawa, latitude, longitude, country: "" })).toBe(true);
  }
});

test("rechaza formas inválidas y coordenadas no finitas", () => {
  const invalid: unknown[] = [null, undefined, false, "Ottawa", [], {},
    { ...ottawa, id: 1.5 }, { ...ottawa, id: "1" }, { ...ottawa, name: "" },
    { ...ottawa, name: 1 }, { ...ottawa, country: null }];
  for (const latitude of [91, -91, NaN, Infinity, -Infinity, "45", null]) invalid.push({ ...ottawa, latitude });
  for (const longitude of [181, -181, NaN, Infinity, -Infinity, "75", null]) invalid.push({ ...ottawa, longitude });
  for (const value of invalid) expect(isCity(value)).toBe(false);
});
