import test from "node:test";
import assert from "node:assert/strict";
import { compileTypeScript } from "../support/typescript.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test("adjacent constructors and explicit action targets retain native closed types", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), "ggaction-adjacent-types-"));
  try {
    const file = join(directory, "adjacent.mts");
    await writeFile(file, `import { hconcat, chart } from ${JSON.stringify(join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(join(root, "types/basic.js"))};
const unit = chart();
unit.createAdjacentPlot({ id: "trend", position: "left", share: { y: true } });
unit.createAdjacentPlot({ plot: { action: "createAreaPlot", options: { data: "summary", x: "x", y: "y" } } });
unit.createAdjacentPlot({ plot: { action: "createBoxPlot", options: { x: { field: "category", fieldType: "nominal" }, y: { field: "value" } } } });
const row = hconcat({ programs: [unit, unit], share: { x: true, color: true }, align: "plot" });
row.editCompositionScales({ share: { x: false } });
row.encodeColor({ target: [{ childPath: ["left"], id: "bars" }, { childPath: ["right"], id: "trend" }], value: "red" });
row.createTitle({ target: { childPath: ["left"] }, text: "Sales" });
row.encodeOpacity({ target: ["bars", "line"], value: 0.5 });
row.createAdjacentPlot({ target: { childPath: ["left"] }, id: "more" });
basicChart().encodeColor({ target: "bars", value: "red" });
// @ts-expect-error empty target list is ambiguous
row.encodeOpacity({ target: [], value: 0.5 });
// @ts-expect-error scalar field and constant remain exclusive in a target batch
row.encodeColor({ target: ["bars", "line"], field: "group", value: "red" });
// @ts-expect-error native options are checked for the selected constructor
unit.createAdjacentPlot({ plot: { action: "createAreaPlot", options: { x: "x", y: "y", line: { curve: "linear" } } } });
// @ts-expect-error chart facade is a closed public vocabulary
unit.createAdjacentPlot({ plot: { action: "anything", options: {} } });
// @ts-expect-error view id owns the initial mark id
unit.createAdjacentPlot({ plot: { action: "createLinePlot", options: { id: "wrong" } } });
// @ts-expect-error Basic has no full composition dispatcher
basicChart().encodeColor({ target: { childPath: [], id: "bars" }, value: "red" });
// @ts-expect-error primitive target contract remains unchanged
unit.editGraphics({ target: { childPath: [], id: "bars" }, property: "fill", value: "red" });
// @ts-expect-error share policies are booleans
row.editCompositionScales({ share: { y: "shared" } });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("inspection exposes adjacency policies and respects explicit editable view boundaries", async () => {
  const { chart } = await import("../../src/index.js");
  const { describeAction } = await import("../../src/inspection.js");
  const p = chart().createCanvas({ plot: { width: 200, height: 200 }, margin: 70 })
    .createData({ values: [{ x: "A", y: 2 }, { x: "B", y: 4 }] })
    .createBarPlot({ id: "bars", x: "x", y: { field: "y", aggregate: "sum" } });
  const info = describeAction(p, { action: "createAdjacentPlot" });
  assert.equal(info.applicability, "supported");
  assert.deepEqual(new Set(info.parameterDefinitions.find(p => p.path === "position").choices), new Set(["left", "right", "top", "bottom"]));
  assert.equal(describeAction(chart(), { action: "createAdjacentPlot" }).applicability, "needs-input");
  assert.equal(describeAction(p, { action: "editCompositionScales", options: { share: { y: true } } }).applicability, "incompatible");
  const row = p.createAdjacentPlot({ id: "line" });
  assert.equal(describeAction(row, { action: "createAdjacentPlot" }).applicability, "incompatible");
  assert.equal(describeAction(row, { action: "encodeColor", options: { target: { childPath: ["line"], id: "line" }, value: "red" } }).applicability, "supported");
  assert.equal(describeAction(row, { action: "editCompositionScales", options: { share: {} } }).applicability, "incompatible");
  assert.equal(describeAction(row, { action: "editCompositionScales", options: { share: { y: false } } }).applicability, "supported");
});
