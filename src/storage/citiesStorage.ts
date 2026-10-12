import type { City } from "../types/City.ts";
import type { SettingsStore } from "../types/Settings.ts";

export async function saveCity(store: SettingsStore, city: City): Promise<void> {
  const settings = store.get();
  await store.commit({ ...settings, cities: [...settings.cities, city], defaultCityId: settings.defaultCityId ?? city.id });
}

export async function deleteCity(store: SettingsStore, city: City): Promise<void> {
  const settings = store.get();
  const cities = settings.cities.filter(saved => saved.id !== city.id);
  await store.commit({ ...settings, cities, defaultCityId: settings.defaultCityId === city.id ? (cities[0]?.id ?? null) : settings.defaultCityId });
}

export async function saveDefaultCity(store: SettingsStore, city: City): Promise<void> {
  await store.commit({ ...store.get(), defaultCityId: city.id });
}
