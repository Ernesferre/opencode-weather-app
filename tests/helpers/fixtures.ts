import type { City } from "../../src/types/City.ts";
import type { Settings, SettingsStore } from "../../src/types/Settings.ts";
import type { Ask } from "../../src/presentation/input.ts";

export const ottawa: City = { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 };
export const madrid: City = { id: 2, name: "Madrid", country: "España", latitude: 40.4, longitude: -3.7 };

export function settings(cities: City[] = []): Settings {
  return { cities: [...cities], defaultCityId: cities[0]?.id ?? null, unit: "celsius" };
}

export function memoryStore(initial = settings(), fail = false): SettingsStore {
  let current = structuredClone(initial);
  return {
    get: () => current,
    async commit(next) {
      if (fail) throw new Error("No se pudo guardar la configuración.");
      current = next;
    },
  };
}

export function answers(...values: (string | null)[]): Ask {
  let index = 0;
  return async () => values[index++] ?? null;
}
