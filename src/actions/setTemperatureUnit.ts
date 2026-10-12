import type { SettingsStore } from "../types/Settings.ts";
import type { Ask } from "../presentation/input.ts";
import { errorMessage, showTemperatureUnits, success } from "../presentation/output.ts";

export async function setTemperatureUnit(store: SettingsStore, ask: Ask): Promise<void> {
  showTemperatureUnits();
  const unit = await ask("Selecciona la unidad: ");
  if (unit === null || unit === "0") return;
  if (unit !== "1" && unit !== "2") { errorMessage("Selección inválida."); return; }
  await store.commit({ ...store.get(), unit: unit === "1" ? "celsius" : "fahrenheit" });
  success("Unidad de temperatura guardada.");
}
