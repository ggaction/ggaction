import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares channel-specific scale editors with channel-appropriate options", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-focused-scale-types-"));
  try {
    const file = path.join(directory, "focused-scales.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { EditColorScaleOptions, EditRScaleOptions, EditStrokeScaleOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const colorOptions: EditColorScaleOptions = { palette: "set2" };
const radiusOptions: EditRScaleOptions = { domain: [0, 10] };
const strokeOptions: EditStrokeScaleOptions = { target: "points", palette: "set2" };
p.editColorScale(colorOptions);
p.createLinePlot({ x: "x", y: "y", color: { field: "kind", scale: { domain: ["A"], unknown: "transparent" } } });
basic.createLinePlot({ x: "x", y: "y", color: { field: "kind", scale: { domain: ["A"], unknown: "transparent" } } });
// @ts-expect-error polar line color does not support a categorical unknown paint
p.createPolarLinePlot({ theta: "x", radius: "y", color: { field: "kind", scale: { domain: ["A"], unknown: "transparent" } } });
// @ts-expect-error rect color does not support a categorical unknown paint
p.createHeatmap({ x: "x", y: "y", color: { field: "kind", scale: { domain: ["A"], unknown: "transparent" } } });
p.editRScale(radiusOptions);
p.editStrokeScale(strokeOptions);
p.editXScale({ target: "points", type: "log", domain: [1, 100], base: 10 });
p.editYScale({ id: "y", type: "band", paddingInner: 0.2 });
p.editThetaScale({ reverse: true, range: [0, 270] });
p.editRScale({ domain: [0, 10], radialMapping: "area" });
p.editColorScale({ range: ["#111", "#eee"] });
p.editColorScale({ type: "sqrt", domain: [-100, 100], range: ["black", "white"] });
p.editStrokeScale({ target: "points", type: "sqrt", domain: [0, 100] });
p.encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "sqrt" } });
basic.encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "sqrt" } });
p.encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "pow", exponent: 3, interpolate: "lab", whitePoint: "d50" } });
basic.encodeColor({ field: "m", fieldType: "quantitative", scale: { interpolate: "cubehelix", gamma: 2.2 } });
basic.encodeColor({ field: "m", fieldType: "quantitative", scale: { interpolate: "cubehelix-long", gamma: 0 } });
p.encodeColor({ field: "m", fieldType: "quantitative", scale: { interpolate: "cubehelix-long", gamma: -0.1 } });
p.editColorScale({ gamma: 0 });
p.editStrokeScale({ target: "points", gamma: -0.1 });
p.editColorScale({ interpolate: "hcl", whitePoint: "d50" });
p.editColorScale({ whitePoint: "auto" });
p.editColorScale({ gamma: "auto" });
p.editColorScale({ type: "pow", exponent: 3 });
p.editColorScale({ exponent: 1 });
p.editStrokeScale({ target: "points", type: "pow", exponent: 3 });
p.editStrokeScale({ target: "points", interpolate: "lab", whitePoint: "d50" });
p.editStrokeScale({ target: "points", gamma: "auto" });
// @ts-expect-error white-point convention is closed
p.editColorScale({ whitePoint: "d55" });
// @ts-expect-error gamma creation does not accept the editor reset value
p.encodeColor({ field: "m", fieldType: "quantitative", scale: { interpolate: "cubehelix", gamma: "auto" } });
// @ts-expect-error square-root color has fixed exponent
p.encodeColor({ field: "m", fieldType: "quantitative", scale: { type: "sqrt", exponent: 0.5 } });
// @ts-expect-error temporal color remains sequential
p.encodeColor({ field: "date", fieldType: "temporal", scale: { type: "sqrt" } });
p.editColorScale({ type: "sequential", palette: "viridis", midpoint: "auto" });
p.editStrokeScale({ target: "points", type: "sequential", palette: "viridis" });
p.editSizeScale({ range: [20, 200], unknown: 20 });
p.editSizeScale({ reverse: true });
p.editSizeScale({ type: "log", domain: [1, 100], range: "auto", base: 10 });
p.editSizeScale({ exponent: 2 });
p.editSizeScale({ type: "quantize", domain: [0, 10], range: [20, 80] });
p.encodeSize({ field: "m", scale: { type: "pow", exponent: 2, domain: [0, 10] } });
p.encodeSize({ field: "m", scale: { type: "threshold", domain: [10], range: [20, 80] } });
p.editOpacityScale({ range: [0.2, 0.9], clamp: true });
p.editShapeScale({ range: ["circle", "diamond"], unknown: "square" });
p.editStrokeWidthScale({ type: "sqrt", range: [1, 8] });
p.editStrokeDashScale({ range: [[], [4, 2]] });
// @ts-expect-error focused editors are Full-only
basic.editColorScale({ range: ["red", "blue"] });
// @ts-expect-error color scales do not support nice
p.editColorScale({ nice: true });
// @ts-expect-error stroke scale editing requires a mark target
p.editStrokeScale({ range: ["red", "blue"] });
// @ts-expect-error stroke scale editing resolves through target, not raw scale id
p.editStrokeScale({ target: "points", id: "stroke", range: ["red", "blue"] });
// @ts-expect-error quantized size scales do not support clamp
p.editSizeScale({ type: "quantize", domain: [0, 10], range: [20, 80], clamp: true });
// @ts-expect-error size scales do not support symlog
p.editSizeScale({ type: "symlog", domain: [-1, 1], range: [20, 80] });
// @ts-expect-error initial power size scales require an exponent
p.encodeSize({ field: "m", scale: { type: "pow", domain: [0, 10] } });
// @ts-expect-error threshold size scales require an explicit domain
p.encodeSize({ field: "m", scale: { type: "threshold", range: [20, 80] } });
// @ts-expect-error discrete size scales require at least two areas
p.encodeSize({ field: "m", scale: { type: "quantile", range: [20] } });
// @ts-expect-error theta scales do not support logarithmic parameters
p.editThetaScale({ base: 10 });
// @ts-expect-error graphical radius is separate from radial position scale editing
p.editRScale({ value: 4 });
// @ts-expect-error stroke dash ranges contain dash patterns
p.editStrokeDashScale({ range: [1, 2] });
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
