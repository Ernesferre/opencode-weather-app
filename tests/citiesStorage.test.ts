import { expect, test } from "bun:test";
import { deleteCity, saveCity, saveDefaultCity } from "../src/storage/citiesStorage.ts";
import type { Settings, SettingsStore } from "../src/types/Settings.ts";

const ottawa = { id: 1, name: "Ottawa", country: "Canadá", latitude: 45.4, longitude: -75.7 };
const madrid = { id: 2, name: "Madrid", country: "España", latitude: 40.4, longitude: -3.7 };

function memoryStore(initial: Settings): SettingsStore {
  let settings = initial;
  return { get: () => settings, async commit(next) { settings = next; } };
}

test("agregar ciudades establece solo la primera como default", async () => {
  const store = memoryStore({ cities: [], defaultCityId: null, unit: "fahrenheit" });
  await saveCity(store, ottawa);
  await saveCity(store, madrid);
  expect(store.get()).toEqual({ cities: [ottawa, madrid], defaultCityId: 1, unit: "fahrenheit" });
});

test("cambiar y eliminar default selecciona la restante o deja null", async () => {
  const store = memoryStore({ cities: [ottawa, madrid], defaultCityId: 1, unit: "celsius" });
  await saveDefaultCity(store, madrid);
  expect(store.get().defaultCityId).toBe(2);
  await deleteCity(store, madrid);
  expect(store.get().defaultCityId).toBe(1);
  await deleteCity(store, ottawa);
  expect(store.get()).toEqual({ cities: [], defaultCityId: null, unit: "celsius" });
});

test("eliminar una ciudad no default conserva la selección", async () => {
  const store = memoryStore({ cities: [ottawa, madrid], defaultCityId: 2, unit: "celsius" });
  await deleteCity(store, ottawa);
  expect(store.get()).toEqual({ cities: [madrid], defaultCityId: 2, unit: "celsius" });
});

test("las operaciones propagan el fallo de persistencia sin mutar el estado original", async () => {
  const initial: Settings = { cities: [ottawa], defaultCityId: 1, unit: "celsius" };
  const store: SettingsStore = {
    get: () => initial,
    async commit() { throw new Error("No se pudo guardar la configuración"); },
  };
  for (const operation of [() => saveCity(store, madrid), () => deleteCity(store, ottawa), () => saveDefaultCity(store, madrid)]) {
    await expect(operation()).rejects.toThrow("No se pudo guardar");
    expect(initial).toEqual({ cities: [ottawa], defaultCityId: 1, unit: "celsius" });
  }
});
