import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("contour declarations preserve explicit density methods and immutable geometry", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-contour-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type ContourResource, type ContourGrid, type ContourDensityDefinition } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const grid: ContourGrid = { origin: [0, 0], dx: 1, dy: 1, width: 2, height: 2, values: [0, 1, null, 2] };
const p = chart().createCanvas().createContourData({ id: "surface", grid, thresholds: [0, 1, 2] })
  .createContourMark({ geometry: "surface", x: { type: "log", domain: [1, 3] }, y: { reverse: true }, color: { type: "quantize", range: ["red", "blue"] } })
  .editContourMark({ target: { childPath: ["left"], id: "contour" }, mode: "line", fill: "none", opacity: 0 })
  .editContourData({ target: "surface", grid: { ...grid, dx: 2 } });
const density: ContourDensityDefinition = { x: "x", y: "y", weight: "weight", estimator: "kde", bandwidth: [.5, .8], kernel: "gaussian", grid, normalization: "unit" };
p.createDensityContourData({ id: "density", data: "points", thresholds: [.1, .3], ...density });
p.createDensityContourData({ id: "bins", x: "x", y: "y", grid, estimator: "histogram", normalization: "count", thresholds: [0, 1] });
p.editContourData({ definition: { bandwidth: [1, 1] } });
p.createContourMark({ color: false, fill: { type: "pattern", style: "dots", foreground: "black", background: "white", pitch: 8 } });
p.removeResource({ kind: "geometry", id: "surface" });
const resource = p.semanticSpec.resources.find((value): value is ContourResource => value.kind === "geometry");
if (resource) {
  const lower: number = resource.result.contours.bands[0].lower;
  // @ts-expect-error stored contours are immutable
  resource.result.contours.grid.values.push(lower);
}
// @ts-expect-error Basic has no contour resources
basicChart().createContourData({ id: "surface", grid, thresholds: [0, 1] });
// @ts-expect-error Basic has no contour marks
basicChart().createContourMark();
// @ts-expect-error KDE requires an explicit bandwidth and kernel
p.createDensityContourData({ id: "d", x: "x", y: "y", grid, estimator: "kde", normalization: "count", thresholds: [1] });
// @ts-expect-error histogram has no kernel
p.createDensityContourData({ id: "d", x: "x", y: "y", grid, estimator: "histogram", kernel: "gaussian", normalization: "unit", thresholds: [1] });
// @ts-expect-error arbitrary row fields do not replace intrinsic x coordinates
p.createContourMark({ x: { field: "temperature" } });
// @ts-expect-error position scales require quantitative mappings
p.createContourMark({ x: { type: "time" } });
// @ts-expect-error color requires a quantitative mapping
p.createContourMark({ color: { type: "ordinal" } });
// @ts-expect-error explicit undefined is not an edit
p.editContourMark({ fill: undefined });
// @ts-expect-error stored points are pairs
const bad: ContourGrid = { ...grid, origin: [0, 1, 2] };
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
