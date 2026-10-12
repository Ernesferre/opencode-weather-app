import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function withSandbox<T>(run: (directory: string) => Promise<T>): Promise<T> {
  const base = process.platform === "win32" && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "Temp", "opencode")
    : tmpdir();
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, "weather-tests-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function runCli(directory: string, input: string, preload?: string) {
  const args = [process.execPath, "run"];
  const path = join(directory, "preload.ts");
  await writeFile(path, `
    globalThis.fetch = async () => { throw new Error("Red no simulada en una prueba"); };
    ${preload ?? ""}
  `);
  args.push("--preload", path);
  args.push(join(import.meta.dir, "..", "..", "src", "index.ts"));
  const child = Bun.spawn(args, {
    env: { ...process.env, WEATHER_CLI_CONFIG: join(directory, "settings.json"), NO_COLOR: "1" },
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  child.stdin.write(input);
  child.stdin.end();
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  return { output, errors, code };
}
