import type { Settings } from "../types/Settings.ts";
import { showCities, noCities } from "../presentation/output.ts";

export function listCities(settings: Settings): void {
  if (!settings.cities.length) noCities();
  else showCities(settings);
}
