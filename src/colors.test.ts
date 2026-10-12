import { expect, test } from "bun:test";
import { createColors } from "./colors.ts";

test("aplica los colores ANSI en una terminal", () => {
  const colors = createColors(true, {});
  expect(colors.cyan("menú")).toBe("\u001b[36mmenú\u001b[0m");
  expect(colors.yellow("20.0 °C")).toBe("\u001b[33m20.0 °C\u001b[0m");
  expect(colors.green("ok")).toBe("\u001b[32mok\u001b[0m");
  expect(colors.red("error")).toBe("\u001b[31merror\u001b[0m");
});

test("no agrega códigos al redirigir, con NO_COLOR o TERM=dumb", () => {
  for (const colors of [
    createColors(false, {}),
    createColors(true, { NO_COLOR: "" }),
    createColors(true, { NO_COLOR: "1" }),
    createColors(true, { TERM: "dumb" }),
  ]) {
    for (const color of Object.values(colors)) {
      expect(color("texto")).toBe("texto");
    }
  }
});
