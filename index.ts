import { runCli } from "./src/cli.ts";
import { createColors } from "./src/colors.ts";

try {
  await runCli();
} catch (error) {
  const colors = createColors(process.stderr.isTTY === true);
  console.error(colors.red(`Error: ${error instanceof Error ? error.message : "No se pudo iniciar la aplicación."}`));
  process.exitCode = 1;
}
