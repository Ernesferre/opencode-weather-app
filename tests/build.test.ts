import { expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { withSandbox } from "./helpers/sandbox.ts";

const manifest = await Bun.file(join(import.meta.dir, "..", "package.json")).json();

for (const failure of ["typecheck", "test", null]) {
  test(`build ${failure ? `se bloquea si falla ${failure}` : "compila después de validar"}`, async () => {
    for (const existing of failure ? [false, true] : [false]) await withSandbox(async directory => {
      // Se conserva el flujo real de check/build; solo se simulan sus validaciones.
      // Así no se ejecuta recursivamente esta suite ni se toca dist del proyecto.
      await writeFile(join(directory, "package.json"), JSON.stringify({
        type: "module",
        scripts: { ...manifest.scripts, typecheck: "bun run stage.ts typecheck", test: "bun run stage.ts test" },
      }));
      await writeFile(join(directory, "stage.ts"), `
        import { appendFileSync } from "node:fs";
        const stage = process.argv[2];
        appendFileSync("stages.log", stage + "\\n");
        process.exit(stage === process.env.FAIL_STAGE ? 1 : 0);
      `);
      await mkdir(join(directory, "src"));
      await writeFile(join(directory, "src", "index.ts"), 'console.log("build verificado");');
      const artifact = join(directory, "dist", process.platform === "win32" ? "weather.exe" : "weather");
      if (existing) {
        await mkdir(join(directory, "dist"));
        await writeFile(artifact, "ejecutable anterior");
      }
      const child = Bun.spawn([process.execPath, "run", "build"], {
        cwd: directory, env: { ...process.env, FAIL_STAGE: failure ?? "" }, stdout: "pipe", stderr: "pipe",
      });
      const [output, errors, code] = await Promise.all([
        new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
      ]);
      expect(await readFile(join(directory, "stages.log"), "utf8")).toBe(
        failure === "typecheck" ? "typecheck\n" : "typecheck\ntest\n",
      );
      if (failure) {
        expect(code).not.toBe(0);
        if (existing) expect(await readFile(artifact, "utf8")).toBe("ejecutable anterior");
        else expect(await Bun.file(artifact).exists()).toBe(false);
        expect(output + errors).not.toContain("bundle");
      } else {
        expect(code).toBe(0);
        expect(await Bun.file(artifact).exists()).toBe(true);
        const executable = Bun.spawn([artifact], { stdout: "pipe", stderr: "pipe" });
        expect((await new Response(executable.stdout).text()).trim()).toBe("build verificado");
        expect(await executable.exited).toBe(0);
      }
    });
  }, 20_000);
}
