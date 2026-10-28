import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("flow declarations preserve typed keys, method boundaries and immutable results", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-flow-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type FlowResource, type FlowLayoutResource, type CreateFlowDataOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const definition: CreateFlowDataOptions = { id: "flow", nodes: "nodes", edges: "edges", nodeKey: ["group", "id"], source: ["fromGroup", "from"], target: ["toGroup", "to"], edgeKey: "id", value: "amount", balance: "strict" };
const p = chart().createFlowData(definition).editFlowData({ target: "flow", definition: { balance: "allow" } })
  .layoutFlow({ id: "layout", method: "dag", options: { order: [["a", 1], ["b", 2]], align: "justify", orientation: "vertical" } })
  .createFlowLinks({ links: { fill: "#123456", opacity: 0, overrides: [{ key: 1, opacity: 1 }] } })
  .createFlowNodes({ nodes: { fill: { type: "pattern", style: "dots", foreground: "#000", background: "#fff", pitch: 8 } }, labels: { content: { field: "label" }, overrides: [{ key: ["a", 1], text: "A", fill: "#333" }] } })
  .editFlowNodes({ target: { childPath: ["left"], id: "flowNodes" }, labels: false })
  .editFlowLinks({ target: "flowLinks", clip: false, links: { strokeWidth: 0 } })
  .editLayout({ target: "layout", options: { nodeWidth: 14, laneGap: 4, iterations: 4 } });
p.layoutFlow({ id: "cycle", graph: "flow", method: "cyclic" });
const flow = p.semanticSpec.resources.find((r): r is FlowResource => r.kind === "graph" && "flow" in r.options);
if (flow) {
  const value: number = flow.result.diagnostics.flow.nodes[0].throughput;
  // @ts-expect-error stored flow diagnostics are immutable
  flow.result.diagnostics.flow.nodes[0].incoming = value;
}
const layout = p.semanticSpec.resources.find((r): r is FlowLayoutResource => r.kind === "layout" && ["dag", "cyclic"].includes(r.options.method));
if (layout) {
  const route: "forward" | "feedback" | "loop" = layout.result.edges[0].route;
  // @ts-expect-error stored paths are immutable
  layout.result.edges.push(layout.result.edges[0]);
}
// @ts-expect-error Basic has no flow resources
basicChart().createFlowData(definition);
// @ts-expect-error Basic has no flow marks
basicChart().createFlowNodes();
// @ts-expect-error flow values are mandatory
chart().createFlowData({ id: "f", nodes: "n", edges: "e", nodeKey: "id", source: "s", target: "t" });
// @ts-expect-error flow has no undirected mode
chart().createFlowData({ ...definition, directed: false });
// @ts-expect-error target is a source column on create, not a scoped mark target
chart().createFlowData({ ...definition, target: { childPath: ["left"] } });
// @ts-expect-error flow layout does not use graph position solvers
p.layoutFlow({ id: "l", method: "force" });
// @ts-expect-error graph layout does not use flow solvers
p.layoutGraph({ id: "l", method: "dag" });
// @ts-expect-error links do not own node labels
p.createFlowLinks({ labels: {} });
// @ts-expect-error exact optionals reject undefined
p.editFlowNodes({ labels: undefined });
// @ts-expect-error explicit ordering requires typed keys, not a lexical private key mode
p.layoutFlow({ id: "l", method: "dag", options: { order: "lexical" } });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
