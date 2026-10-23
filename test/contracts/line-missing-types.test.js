import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("line missing types expose the closed direct-line policy in Full and Basic", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-line-missing-types-"));
  try {
    const file = path.join(dir, "consumer.mts");
    await writeFile(file, `
import type { ChartProgram, CreateLinePlotOptions, CreatePolarLinePlotOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
p.createLineMark({ missing: 'break' }).editLineMark({ missing: 'error' });
p.createLinePlot({ x: 'x', y: 'y', line: { missing: 'break' } });
basic().createLineMark({ missing: 'break' });
basic().createLinePlot({ x: 'x', y: 'y', line: { missing: 'break' } });
const line: NonNullable<CreateLinePlotOptions['line']> = { missing: 'error' };
// @ts-expect-error missing is a closed vocabulary
p.createLineMark({ missing: 'skip' });
// @ts-expect-error missing is a closed vocabulary
p.editLineMark({ missing: false });
// @ts-expect-error Polar does not expose direct Cartesian missing intent
const polar: NonNullable<CreatePolarLinePlotOptions['line']> = { missing: 'break' };
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
