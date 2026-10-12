import type { City } from "./City.ts";
import type { TemperatureUnit } from "./Weather.ts";

export interface Settings {
  cities: City[];
  defaultCityId: number | null;
  unit: TemperatureUnit;
}

export interface SettingsStore {
  get(): Settings;
  commit(next: Settings): Promise<void>;
}
