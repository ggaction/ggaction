import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chart } from "../../../../src/index.js";

process.chdir(fileURLToPath(new URL("../../../../", import.meta.url)));
const baselineCommit = "7d5982aaa472c234182de917251ff973ff913f1c";
const sourceTree = "1e5a95d028132ffaaf6464b95760ea916b85e155";
const typesTree = "2028a79cd493f64f3a739414e20491b5dd783f7a";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("rev-parse", "HEAD:src"), sourceTree);
assert.equal(git("rev-parse", "HEAD:types"), typesTree);
assert.equal(git("diff", baselineCommit, "--", "src", "types"), "");
const clone = value => JSON.parse(JSON.stringify(value));
const call = (op, args = {}) => ({ op, args });
const rows = [
  { x: 0, y: 0, category: "A", amount: 2 },
  { x: 5, y: 10, category: "B", amount: 3 },
  { x: 10, y: 20, category: "C", amount: 4 }
];
const polar = [call("createPointMark"), call("encodeTheta", { field: "x" }),
  call("encodeR", { field: "y", scale: { zero: true } })];
const point = [call("createPointMark"), call("encodeX", { field: "x" }), call("encodeY", { field: "y" })];
const probes = [];
for (const axis of ["Theta", "Radial"]) {
  const complete = call(`create${axis}Axis`);
  probes.push(
    { id: `${axis}-title-omitted-edit`, calls: [...polar, call(complete.op, { title: false }), call(`edit${axis}AxisTitle`, { text: "Restored" })] },
    { id: `${axis}-internal-title-restore`, internal: true, calls: [...polar, call(complete.op, { title: false }), call(`create${axis}AxisTitle`, { text: "Restored" })] },
    { id: `${axis}-remove-title`, calls: [...polar, complete, call(`edit${axis}Axis`, { title: false })] },
    { id: `${axis}-remove-line`, calls: [...polar, complete, call(`edit${axis}Axis`, { line: false })] },
    { id: `${axis}-remove-ticks-labels`, calls: [...polar, complete, call(`edit${axis}Axis`, { ticksAndLabels: false })] },
    { id: `${axis}-remove-recreate`, calls: [...polar, complete, call(`remove${axis}Axis`), complete] },
    { id: `${axis}-style-replay`, calls: [...polar, complete, call(`edit${axis}AxisLabels`, { fontSize: 14, fontWeight: 600, values: [0, 10] }), call("editCanvas", { width: 900 }), call("editScale", { id: axis === "Theta" ? "theta" : "radius", domain: [0, 30] })] }
  );
  for (const component of ["Line", "Ticks", "Labels", "Title"]) {
    probes.push({ id: `${axis}-internal-${component}`, internal: true,
      calls: [...polar, call(`create${axis}Axis${component}`)] });
  }
}
probes.push(
  { id: "cartesian-create-title-false", calls: [...point, call("createXAxis", { title: false })] },
  { id: "cartesian-remove-recreate-title", calls: [...point, call("createXAxis"), call("editXAxis", { title: false }), call("createXAxisTitle", { text: "Restored" })] },
  { id: "parallel-default-replay", calls: [call("createParallelCoordinates", { dimensions: ["x", "y"] }), call("editCanvas", { width: 900 })] },
  { id: "parallel-style-edit", calls: [call("createParallelCoordinates", { dimensions: ["x", "y"] }), call("editParallelAxis", { field: "x", labels: { fontSize: 14 } })] }
);
const legendRecipes = {
  categorical: [...point, call("encodeColor", { field: "category" })],
  continuous: [...point, call("encodeColor", { field: "amount", fieldType: "quantitative" })],
  interval: [...point, call("encodeColor", { field: "amount", fieldType: "quantitative", scale: { type: "quantize", range: ["blue", "red"] } })],
  size: [...point, call("encodeSize", { field: "amount" })],
  combined: [...point, call("encodeColor", { field: "category" }), call("encodeShape", { field: "category" }), call("encodeSize", { field: "amount" })]
};
for (const [kind, calls] of Object.entries(legendRecipes)) {
  for (const position of ["top", "right", "bottom", "left"]) {
    probes.push({ id: `legend-${kind}-${position}`, calls: [...calls, call("createLegend", { position })] });
  }
}
probes.push(
  { id: "legend-channel-revision", calls: [...legendRecipes.combined, call("createLegend"), call("editLegend", { channels: ["size"] })] },
  { id: "legend-bottom-explicit-offset", calls: [...legendRecipes.categorical, call("createLegend", { position: "bottom", offset: 0 })] },
  { id: "text-explicit-source", calls: [...point, call("createTextMark", { source: "point" }), call("encodeText", { field: "amount" })] },
  { id: "text-percent-format", calls: [...point, call("createTextMark"), call("encodeText", { field: "amount", format: ".0%" })] },
  { id: "theme-missing-action", calls: [...point, call("applyTheme", { theme: "dark" })] },
  { id: "fitting-missing-action", calls: [...point, call("fitCanvas")] }
);

let immutableChecks = 0;
const observations = probes.map(probe => {
  let program = chart().createCanvas({ width: 800, height: 600, margin: 140 }).createData({ values: clone(rows) });
  let failure;
  for (const { op, args } of probe.calls) {
    const before = JSON.stringify(program);
    const input = clone(args);
    try {
      if (typeof program[op] !== "function") throw new Error(`Missing method ${op}.`);
      const next = program[op](input);
      assert.equal(JSON.stringify(program), before);
      program = next;
    } catch (error) {
      assert.equal(JSON.stringify(program), before);
      failure = { op, message: error.message };
    }
    assert.deepEqual(input, args);
    immutableChecks += 1;
    if (failure) break;
  }
  const objects = Object.fromEntries(Object.entries(program.graphicSpec.objects)
    .filter(([id]) => /Axis|Legend|text/.test(id))
    .map(([id, object]) => [id, { type: object.type, count: object.items?.length,
      properties: object.properties, first: object.items?.[0]?.properties }]));
  return { ...probe, outcome: failure ? "error" : "success", ...(failure ? { failure } : {}),
    result: { guides: program.semanticSpec.guides, configs: program.guideConfigs,
      objects, trace: program.trace.children.map(node => node.op) } };
});
const index = JSON.parse(await readFile("agent_docs/contract/ACTION_INDEX.json", "utf8"));
const names = probes.filter(probe => probe.internal).map(probe => probe.calls.at(-1).op);
const classification = [...new Set(names)].map(name => ({ name,
  runtime: typeof chart()[name] === "function", direct: index.actions.some(action => action.name === name) }));
assert.ok(classification.every(action => action.runtime && !action.direct));
const evidence = { baselineCommit, sourceTree, typesTree, immutableChecks, classification, observations };
const output = new URL("baseline-results.json", import.meta.url);
if (process.argv.includes("--record")) await writeFile(output, JSON.stringify(evidence, null, 2) + "\n");
else assert.deepEqual(clone(evidence), JSON.parse(await readFile(output, "utf8")));
console.log(JSON.stringify({ cases: observations.length, immutableChecks, classification,
  outcomes: observations.map(({ id, outcome, failure }) => ({ id, outcome, failure })) }, null, 2));
