import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createGapminderPopulationDonut } from
  "../../examples/gapminder-population-donut/program.js";
import { loadGapminder } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("locks the P3-A weighted theta public declaration and semantic contract", () => {
  const declarations = read("types/program.d.ts");
  const contract = read("agent_docs/contract/current/ENCODINGS.md");

  assert.match(declarations, /aggregate\?: "count" \| "sum";\n  weight\?: string;/);
  assert.match(contract, /aggregate\?: "count" \| "sum"; weight\?: FieldName/);
  assert.match(contract, /non-negative finite weights/);
});

test("keeps weighted theta as one immutable encodeTheta vertical slice", () => {
  const sourceRows = loadGapminder();
  const program = createGapminderPopulationDonut(sourceRows);
  const layer = program.semanticSpec.layers.find(candidate => candidate.id === "arc");
  const theta = program.trace.children.find(node => node.op === "encodeTheta");

  assert.deepEqual(layer.encoding.theta, {
    field: "cluster",
    fieldType: "nominal",
    aggregate: "sum",
    weight: "pop",
    scale: "theta"
  });
  assert.equal(program.semanticSpec.datasets[0].values.length, 62);
  assert.equal(sourceRows.length, 682);
  assert.equal(program.graphicSpec.objects.arc.items.length, 6);
  assert.equal(theta.children.some(child => child.op === "editSemantic"), true);
  assert.equal(theta.children.some(child => child.op === "rematerializeArcMark"), true);
});

test("keeps P3-B field-driven stroke width behind its hard gate", () => {
  const declarations = read("types/program.d.ts");
  assert.match(
    declarations,
    /encodeStrokeWidth\(options: \{ target\?: string; value: number \}\)/
  );
  assert.doesNotMatch(
    declarations,
    /encodeStrokeWidth\(options: \{[^}]*field:/
  );
});
