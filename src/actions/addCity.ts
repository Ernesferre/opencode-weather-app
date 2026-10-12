import { searchCity } from "../api/geocoding.ts";
import { saveCity } from "../storage/citiesStorage.ts";
import type { SettingsStore } from "../types/Settings.ts";
import type { Ask } from "../presentation/input.ts";
import { errorMessage, message, success } from "../presentation/output.ts";
import { cityLabel } from "../utils/format.ts";
import { getWeather } from "./getWeather.ts";

export async function addCity(store: SettingsStore, ask: Ask): Promise<void> {
  const name = await ask("Nombre de la ciudad (vacío para cancelar): ");
  if (!name) return;
  message("Buscando ciudad…");
  const city = await searchCity(name);
  if (!city) { errorMessage("No se encontró la ciudad."); return; }
  if (store.get().cities.some(saved => saved.id === city.id)) {
    message(`${cityLabel(city)} ya está guardada.`);
    return;
  }
  message(`Ciudad encontrada: ${cityLabel(city)} (${city.latitude}, ${city.longitude}).`);
  const confirmation = await ask("¿Agregar esta ciudad? (s/n): ");
  if (confirmation?.toLowerCase() !== "s") return;
  await saveCity(store, city);
  success("Ciudad guardada. La primera ciudad se establece como default automáticamente.");
  await getWeather(city, store.get().unit);
}
