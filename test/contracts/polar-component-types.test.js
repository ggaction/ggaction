import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Polar component creation with resource, angle and tick mode boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-polar-component-types-"));
  try {
    const file = path.join(directory, "components.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const labels: import(${JSON.stringify(path.join(root, "types/index.js"))}).CreateRadialAxisLabelsOptions = { values: [0, 10] };
p.createRadialAxisLabels(labels);
p.createThetaAxisLine({ scale: "theta", coordinate: "polar", color: "red", lineWidth: 2 });
p.createRadialAxisLine({ angle: 135 });
p.createThetaAxisTicks({ count: 3, length: 6 });
p.createRadialAxisTicks({ values: [0, 10] as const, angle: 135, color: "red" });
p.createThetaAxisLabels({ count: 3, format: ".1f", fontWeight: 600 });
p.createRadialAxisLabels({ values: [0, 10] as const, angle: 135, offset: 12 });
p.createThetaAxisTitle({ text: "Direction", fontFamily: "sans-serif" });
p.createRadialAxisTitle({ text: "Distance", angle: 135, position: "outside" });
p.createThetaAxisLine().createThetaAxisTicks().createThetaAxisLabels().createThetaAxisTitle();
p.createRadialAxisLine().createRadialAxisTicks().createRadialAxisLabels().createRadialAxisTitle();
// @ts-expect-error Theta has no radial-axis angle
p.createThetaAxisLine({ angle: 90 });
// @ts-expect-error Theta has no radial-axis angle
p.createThetaAxisTicks({ angle: 90 });
// @ts-expect-error Theta has no radial-axis angle
p.createThetaAxisLabels({ angle: 90 });
// @ts-expect-error Theta has no radial-axis angle
p.createThetaAxisTitle({ angle: 90 });
// @ts-expect-error outside placement belongs only to radial titles
p.createThetaAxisTitle({ position: "outside" });
// @ts-expect-error Count and exact values are exclusive
p.createThetaAxisTicks({ count: 3, values: [0, 10] });
// @ts-expect-error Count and exact values are exclusive
p.createRadialAxisTicks({ count: 3, values: [0, 10] });
// @ts-expect-error Count and exact values are exclusive
p.createThetaAxisLabels({ count: 3, values: [0, 10] });
// @ts-expect-error Count and exact values are exclusive
p.createRadialAxisLabels({ count: 3, values: [0, 10] });
// @ts-expect-error Creation does not edit an existing component
p.createThetaAxisTitle({ remove: true });
// @ts-expect-error Basic has no Polar components
basic.createThetaAxisLine();
// @ts-expect-error Basic has no Polar components
basic.createRadialAxisTitle();
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
