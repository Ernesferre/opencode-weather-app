import { addCity } from "../actions/addCity.ts";
import { getForecast } from "../actions/getForecast.ts";
import { getAllWeather, getDefaultWeather } from "../actions/getWeather.ts";
import { removeCity } from "../actions/removeCity.ts";
import { setDefaultCity } from "../actions/setDefaultCity.ts";
import { setTemperatureUnit } from "../actions/setTemperatureUnit.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import type { Settings, SettingsStore } from "../types/Settings.ts";
import { colors } from "../utils/colors.ts";
import { MENU_SEPARATOR } from "../utils/constants.ts";
import { unitSymbol } from "../utils/format.ts";
import type { Ask } from "./input.ts";
import { errorMessage, message } from "./output.ts";

export function renderMenu(settings: Settings, palette = colors): string {
  return palette.cyan([MENU_SEPARATOR, "         WEATHER CLI", MENU_SEPARATOR,
    "  1. Clima de ciudad default",
    `  2. Clima de todas las ciudades (${settings.cities.length})`,
    "  3. Buscar y agregar ciudad", "  4. Eliminar ciudad",
    "  5. Establecer ciudad default", "  6. Pronóstico de 7 días", `  8. Ajustes (${unitSymbol(settings.unit)})`,
    "  9. Salir", MENU_SEPARATOR].join("\n"));
}

export async function runMenu(store: SettingsStore, ask: Ask): Promise<void> {
  const actions: Record<Exclude<MenuOption, "9">, () => Promise<void>> = {
    "1": () => getDefaultWeather(store.get()),
    "2": () => getAllWeather(store.get()),
    "3": () => addCity(store, ask),
    "4": () => removeCity(store, ask),
    "5": () => setDefaultCity(store, ask),
    "6": () => getForecast(store.get(), ask),
    "8": () => setTemperatureUnit(store, ask),
  };
  while (true) {
    message(`\n${renderMenu(store.get())}`);
    const option = await ask("  Selecciona una opción: ");
    if (option === null || option === "9") { message("¡Hasta pronto!"); break; }
    if (!Object.hasOwn(actions, option)) {
      errorMessage("Opción inválida. Elige 1, 2, 3, 4, 5, 6, 8 o 9.");
      continue;
    }
    try {
      await actions[option as Exclude<MenuOption, "9">]();
    } catch (error) {
      errorMessage(`Error: ${error instanceof Error ? error.message : "No se pudo completar la operación."}`);
    }
  }
}
