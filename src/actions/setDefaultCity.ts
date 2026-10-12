import { saveDefaultCity } from "../storage/citiesStorage.ts";
import type { SettingsStore } from "../types/Settings.ts";
import { chooseCity, type Ask } from "../presentation/input.ts";
import { success } from "../presentation/output.ts";
import { cityLabel } from "../utils/format.ts";

export async function setDefaultCity(store: SettingsStore, ask: Ask): Promise<void> {
  const city = await chooseCity(store.get(), ask);
  if (!city) return;
  await saveDefaultCity(store, city);
  success(`Ciudad default: ${cityLabel(city)}.`);
}
