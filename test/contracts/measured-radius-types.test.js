import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares ordinary and measured radial encodings with exclusive count and sum options", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-radial-types-"));
  try {
    const file = path.join(directory, "radius.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.encodeR({ field: "value" });
p.encodeR({ field: "value", aggregate: "sum", mapping: "area", scale: { domain: [0, 4], range: [70, 140] } });
p.encodeR({ aggregate: "count", mapping: "radius-length" });
p.encodeR({ field: "other", aggregate: "sum" });
p.createScale({ id: "radius", radialMapping: "area" });
p.editScale({ id: "radius", radialMapping: "radius-length" });
p.editScale({ id: "radius", radialMapping: undefined });
// @ts-expect-error only Arc quantitative radius supports this extension
basic.encodeR({ aggregate: "count", mapping: "area" });
// @ts-expect-error count does not consume a measure field
p.encodeR({ field: "value", aggregate: "count", mapping: "area" });
// @ts-expect-error sum needs a field
p.encodeR({ aggregate: "sum", mapping: "area" });
// @ts-expect-error a mapping needs count or sum
p.encodeR({ field: "value", mapping: "area" });
// @ts-expect-error measured mapping is linear
p.encodeR({ field: "value", aggregate: "sum", mapping: "area", scale: { type: "sqrt" } });
// @ts-expect-error measured mapping must be zero based
p.encodeR({ aggregate: "count", mapping: "area", scale: { zero: false } });
// @ts-expect-error closed mapping vocabulary
p.editScale({ id: "radius", radialMapping: "sqrt" });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
