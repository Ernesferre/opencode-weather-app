export function createColors(
  isTTY: boolean = process.stdout.isTTY === true,
  env: Record<string, string | undefined> = process.env,
) {
  const enabled = isTTY && env.NO_COLOR === undefined && env.TERM !== "dumb";
  const wrap = (code: number) => (text: string): string =>
    enabled ? `\u001b[${code}m${text}\u001b[0m` : text;

  return {
    cyan: wrap(36),
    yellow: wrap(33),
    green: wrap(32),
    red: wrap(31),
  };
}

export const colors = createColors();
