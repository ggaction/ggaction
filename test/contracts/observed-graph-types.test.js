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
import { chart, type GraphResource, type CreateGraphDataOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const definition: CreateGraphDataOptions = { id: "graph", nodes: "nodes", edges: "edges", nodeKey: ["family", "id"], source: "from", target: ["tf", "tn"], weight: "weight" };
const program = chart().createGraphData(definition).editGraphData({ target: "graph", definition: { target: "to", directed: true } });
program.editGraphData({ target: { childPath: ["left"], id: "graph" }, definition: { selfLoops: true } });
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
