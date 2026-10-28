import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("observed graph declarations distinguish source target columns from graph edit targets", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-graph-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type GraphResource, type GraphLayoutResource, type CreateGraphDataOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const definition: CreateGraphDataOptions = { id: "graph", nodes: "nodes", edges: "edges", nodeKey: ["family", "id"], source: "from", target: ["tf", "tn"], weight: "weight" };
const program = chart().createGraphData(definition).editGraphData({ target: "graph", definition: { target: "to", directed: true } });
program.editGraphData({ target: { childPath: ["left"], id: "graph" }, definition: { selfLoops: true } });
program.layoutGraph({ id: "fixed", method: "fixed", options: { positions: [{ key: ["a", 1], x: 2, y: 3 }] } })
  .layoutGraph({ id: "circular", method: "circular" })
  .layoutGraph({ id: "force", graph: "graph", method: "force", options: { seed: 2, pinned: [{ key: "a", fx: 0, fy: 0 }] } })
  .editLayout({ target: "force", options: { iterations: 10 } });
program.createGraphPlot().editGraphPlot({ nodes: { fill: { type: "pattern", style: "dots", foreground: "red", background: "white", pitch: 8 } } });
program.createGraphPlot({ labels: { field: "name", overrides: [{ key: ["a", 1], text: "A" }] } });
program.editGraphPlot({ target: { childPath: ["left"], id: "networkPlot" }, edges: { arrows: false } });
// @ts-expect-error graph nodes are circles
program.createGraphPlot({ nodes: { shape: "square" } });
// @ts-expect-error label field is a string
program.createGraphPlot({ labels: { field: 1 } });
// @ts-expect-error graph labels are disabled or an option object
program.createGraphPlot({ labels: true });
// @ts-expect-error node override keys are required
program.editGraphPlot({ nodes: { overrides: [{ fill: "red" }] } });
// @ts-expect-error Full graph plots are not Basic methods
basicChart().createGraphPlot();
const layout = program.semanticSpec.resources.find((value): value is GraphLayoutResource => value.kind === "layout" && value.inputs[0].kind === "graph");
if (layout) {
  const graphKind: "graph" = layout.inputs[0].kind;
  // @ts-expect-error stored coordinates are immutable
  layout.result.nodes[0].x = 2;
}
// @ts-expect-error Basic does not register graph layouts
basicChart().layoutGraph({ id: "circular", method: "circular" });
// @ts-expect-error fixed needs complete explicit positions
program.layoutGraph({ id: "fixed", method: "fixed" });
// @ts-expect-error method-specific options stay closed
program.layoutGraph({ id: "circular", method: "circular", options: { seed: 2 } });
// @ts-expect-error graph layouts do not accept hierarchy order
program.editLayout({ options: { iterations: 2 }, order: "input" });
// @ts-expect-error explicit undefined is not omission
program.layoutGraph({ id: "force", method: "force", options: undefined });
const resource = program.semanticSpec.resources.find((value): value is GraphResource => value.kind === "graph");
if (resource) {
  const inputKind: "data" = resource.inputs[0].kind;
  const diagnostics: null = resource.result.diagnostics;
  const origin: "observed" = resource.result.model.edges[0].origin;
  // @ts-expect-error stored topology is immutable
  resource.result.model.nodes.push(resource.result.model.nodes[0]);
}
// @ts-expect-error Full graph authoring is not a Basic method
basicChart().createGraphData(definition);
// @ts-expect-error explicit node and edge table roles are required
chart().createGraphData({ id: "g", nodeKey: "id", source: "from", target: "to" });
// @ts-expect-error createGraphData target is a column, not a scoped target
chart().createGraphData({ ...definition, target: { childPath: ["left"] } });
// @ts-expect-error graph options are closed
program.editGraphData({ definition: { force: true } });
// @ts-expect-error edit target resource IDs cannot be numbers
program.editGraphData({ target: [1] });
// @ts-expect-error edits reject explicit missing values
program.editGraphData({ definition: { directed: undefined } });
// @ts-expect-error weight selects one numeric column
chart().createGraphData({ ...definition, weight: ["a", "b"] });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
