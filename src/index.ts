import { createInput } from "./presentation/input.ts";
import { runMenu } from "./presentation/menu.ts";
import { loadSettings, saveSettings } from "./storage/settingsStorage.ts";
import type { SettingsStore } from "./types/Settings.ts";
import { createColors } from "./utils/colors.ts";

export async function runCli(): Promise<void> {
  let settings = await loadSettings();
  const store: SettingsStore = {
    get: () => settings,
    async commit(next) {
      await saveSettings(next);
      settings = next;
    },
  };
  const input = createInput();
  try {
    await runMenu(store, input.ask);
  } finally {
    input.close();
  }
}

if (import.meta.main) {
  try {
    await runCli();
  } catch (error) {
    const colors = createColors(process.stderr.isTTY === true);
    console.error(colors.red(`Error: ${error instanceof Error ? error.message : "No se pudo iniciar la aplicación."}`));
    process.exitCode = 1;
  }
}
