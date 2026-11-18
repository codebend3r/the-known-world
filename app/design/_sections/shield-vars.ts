import type { CSSProperties } from "react";

type HouseToken = `--house-${string}`;

export function shieldVars({
  token,
  ink = `${token}-ink`,
}: {
  token: HouseToken;
  ink?: HouseToken;
}): CSSProperties {
  return {
    "--shield-bg": `var(${token})`,
    "--shield-metal": `var(${token}-metal)`,
    "--shield-ink": `var(${ink})`,
  };
}
