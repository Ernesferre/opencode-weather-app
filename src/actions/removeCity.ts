import { deleteCity } from "../storage/citiesStorage.ts";
import type { SettingsStore } from "../types/Settings.ts";
import { chooseCity, type Ask } from "../presentation/input.ts";
import { success } from "../presentation/output.ts";
import { cityLabel } from "../utils/format.ts";

export async function removeCity(store: SettingsStore, ask: Ask): Promise<void> {
  const city = await chooseCity(store.get(), ask);
  if (!city) return;
  const confirmation = await ask(`¿Eliminar ${cityLabel(city)}? (s/n): `);
  if (confirmation?.toLowerCase() !== "s") return;
  await deleteCity(store, city);
  success("Ciudad eliminada.");
  const settings = store.get();
  if (settings.defaultCityId !== null && settings.defaultCityId !== city.id) {
    const current = settings.cities.find(saved => saved.id === settings.defaultCityId);
    if (current) success(`Ciudad default: ${cityLabel(current)}.`);
  }
}
