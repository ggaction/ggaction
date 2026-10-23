import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("range encoders declare numeric datum pairs without widening temporal or Basic options", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-ranged-datum-types-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.encodeYRange({ lower: { datum: 45000 }, upper: { datum: 0 }, scale: { domain: [0, 45000], nice: false } });
p.encodeXRange({ lower: { datum: 1 }, upper: { datum: 100 }, scale: { type: "log", domain: [1, 100] } });
p.encodeYRange({ lower: "low", upper: { datum: 100 } });
p.encodeXRange({ lower: { datum: 1 }, upper: "high" });
p.encodeXRange({ lower: "start", upper: "end", fieldType: "temporal", temporalUnit: "timestamp" });
// @ts-expect-error numeric datum bounds do not accept strings
p.encodeYRange({ lower: { datum: "0" }, upper: "high" });
// @ts-expect-error datum objects remain closed
p.encodeYRange({ lower: { datum: 0, field: "low" }, upper: "high" });
// @ts-expect-error a datum object needs its datum
p.encodeXRange({ lower: {}, upper: "high" });
// @ts-expect-error this wrapper does not introduce temporal datum ranges
p.encodeXRange({ lower: { datum: 1 }, upper: { datum: 2 }, fieldType: "temporal" });
// @ts-expect-error range encoders remain Full only
basic.encodeYRange({ lower: { datum: 1 }, upper: { datum: 2 } });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
