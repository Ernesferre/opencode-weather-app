import { createInterface } from "node:readline";
import { listCities } from "../actions/listCities.ts";
import type { City } from "../types/City.ts";
import type { Settings } from "../types/Settings.ts";
import { errorMessage } from "./output.ts";

export type Ask = (prompt: string) => Promise<string | null>;

export function createInput(): { ask: Ask; close(): void } {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = input[Symbol.asyncIterator]();
  return {
    async ask(prompt) {
      process.stdout.write(prompt);
      const next = await lines.next();
      return next.done ? null : next.value.trim();
    },
    close() { input.close(); },
  };
}

export async function chooseCity(settings: Settings, ask: Ask): Promise<City | null> {
  listCities(settings);
  if (!settings.cities.length) return null;
  const answer = await ask("Selecciona una ciudad (0 para cancelar): ");
  if (answer === null || answer === "0") return null;
  const city = /^\d+$/.test(answer) ? settings.cities[Number(answer) - 1] : undefined;
  if (!city) errorMessage("Selección inválida.");
  return city ?? null;
}
