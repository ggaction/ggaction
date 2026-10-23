import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("ordered categorical dash declarations cover direct, facade and bulk APIs while preserving Basic method boundaries and constant restrictions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-ordinal-dash-types-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
p.encodeStrokeDash({ field: "level", fieldType: "ordinal", scale: { domain: [1, 2], range: [[1, 0], [4, 2]] } });
p.encodeStrokeDash({ field: "level", fieldType: "nominal" });
p.encodeStrokeDash({ field: "level" });
p.encodeStrokeDash({ value: "solid" });
p.encodeStrokeDash({ field: "level", scale: { domain: [1], range: ["dotted"], unknown: [] } });
p.editStrokeDashScale({ unknown: "dashdot" });
p.editStrokeDashScale({ unknown: undefined });
p.createLinePlot({ x: "x", y: "y", strokeDash: { field: "level", scale: { unknown: [2, 2] } } });
p.encodeChannels({ target: "paths", channels: { strokeDash: { field: "level", scale: { unknown: "solid" } } } });
// @ts-expect-error fallback is a dash style, not a coordinate
p.encodeStrokeDash({ field: "level", scale: { unknown: 3 } });
// @ts-expect-error creation does not accept an undefined fallback
p.encodeStrokeDash({ field: "level", scale: { unknown: undefined } });
p.createLinePlot({ x: "x", y: "y", strokeDash: { field: "level", fieldType: "ordinal" } });
p.encodeChannels({ target: "paths", channels: { strokeDash: { field: "level", fieldType: "ordinal" } } });
// @ts-expect-error continuous values remain unsupported
p.encodeStrokeDash({ field: "level", fieldType: "quantitative" });
// @ts-expect-error temporal mapping remains unsupported
p.encodeStrokeDash({ field: "level", fieldType: "temporal" });
// @ts-expect-error fieldType remains forbidden in constant mode
p.encodeStrokeDash({ value: "solid", fieldType: "ordinal" });
// @ts-expect-error no invented ordering option
p.encodeStrokeDash({ field: "level", fieldType: "ordinal", order: "ascending" });
// @ts-expect-error facade types remain closed
p.createLinePlot({ x: "x", y: "y", strokeDash: { field: "level", fieldType: "ordered" } });
// @ts-expect-error bulk uses the same closed field types
p.encodeChannels({ target: "paths", channels: { strokeDash: { field: "level", fieldType: "temporal" } } });
basic.encodeStrokeDash({ field: "level", fieldType: "ordinal" });
// @ts-expect-error bulk assignment remains outside Basic
basic.encodeChannels({ target: "paths", channels: { strokeDash: { field: "level", fieldType: "ordinal" } } });
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
