import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares full-only coordinate aspect editing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-coordinate-aspect-types-"));
  try {
    const file = path.join(directory, "coordinate-aspect.mts");
    await writeFile(file, `
import type { ChartProgram, CoordinateAspect, EditCoordinateOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
const aspect: CoordinateAspect = { mode: "data", ratio: 1, alignX: "end", alignY: "start" };
const options: EditCoordinateOptions = { target: "main", aspect };
program.editCoordinate(options);
program.editCoordinate({ target: "main", aspect: "auto" });
program.editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 16 / 9 } });
// @ts-expect-error editCoordinate is Full-only
basic.editCoordinate(options);
// @ts-expect-error target is required
program.editCoordinate({ aspect });
// @ts-expect-error aspect is required until another coordinate patch exists
program.editCoordinate({ target: "main" });
// @ts-expect-error aspect modes are closed
program.editCoordinate({ target: "main", aspect: { mode: "square", ratio: 1 } });
// @ts-expect-error align values are closed
program.editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 1, alignX: "middle" } });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
