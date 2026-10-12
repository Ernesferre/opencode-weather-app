import { expect, test } from "bun:test";
import { cityLabel, formatTemperature, unitSymbol, weatherDescription } from "../src/utils/format.ts";
import { ottawa } from "./helpers/fixtures.ts";

test("formatea ciudades con y sin país", () => {
  expect(cityLabel(ottawa)).toBe("Ottawa, Canadá");
  expect(cityLabel({ ...ottawa, country: "" })).toBe("Ottawa");
});

test("formatea temperaturas con un decimal y la unidad elegida", () => {
  expect(unitSymbol("celsius")).toBe("°C");
  expect(unitSymbol("fahrenheit")).toBe("°F");
  expect(formatTemperature(-3.25, "celsius")).toBe("-3.3 °C");
  expect(formatTemperature(32, "fahrenheit")).toBe("32.0 °F");
  expect(formatTemperature(0, "celsius")).toBe("0.0 °C");
});

test("traduce todos los grupos WMO y admite códigos desconocidos", () => {
  const groups: [number[], string][] = [
    [[0], "Despejado"], [[1], "Mayormente despejado"], [[2], "Parcialmente nublado"], [[3], "Nublado"],
    [[45, 48], "Niebla"], [[51, 53, 55], "Llovizna"], [[56, 57], "Llovizna helada"],
    [[61, 63, 65], "Lluvia"], [[66, 67], "Lluvia helada"], [[71, 73, 75, 77], "Nieve"],
    [[80, 81, 82], "Chubascos"], [[85, 86], "Chubascos de nieve"], [[95], "Tormenta"],
    [[96, 99], "Tormenta con granizo"], [[-1, 999], "Estado desconocido"],
  ];
  for (const [codes, description] of groups) {
    for (const code of codes) expect(weatherDescription(code)).toBe(description);
  }
});
