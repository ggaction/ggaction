import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants as arcVariants } from "../charts/polar-arcs/manifest.js";
import { visualVariants as widthVariants } from
  "../gates/field-stroke-width/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const ACTIONS = Object.freeze(["encodeTheta", "encodeStrokeWidth"]);

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

test("closes every Phase 3 capability into Current and out of Planned", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  for (const name of ACTIONS) {
    const current = index.actions.filter(action => action.name === name);
    assert.equal(current.length, 1, name);
    assert.equal(current[0].status, "implemented", name);
    assert.equal(
      current[0].contract.file,
      "agent_docs/contract/current/ENCODINGS.md",
      name
    );
    assert.equal(index.plannedActions.some(action => action.name === name), false, name);
    assert.equal(index.plannedCapabilities.some(capability =>
      capability.name === name || capability.actions?.includes(name)
    ), false, name);
  }
  assert.doesNotMatch(
    read("agent_docs/contract/planned/ENCODINGS.md"),
    /encodeStrokeWidth|aggregate:\s*"sum"|weight\?: FieldName/
  );
});

test("exports the complete Phase 3 strict option surface", () => {
  const programTypes = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");
  for (const name of [
    "ThetaEncodingOptions",
    "ThetaScaleOptions",
    "StrokeWidthEncodingOptions",
    "StrokeWidthScaleOptions"
  ]) {
    assert.match(rootTypes, new RegExp(`^  ${name},?$`, "m"), name);
  }
  assert.match(
    programTypes,
    /encodeTheta\(options: ThetaEncodingOptions\): ChartProgram/
  );
  assert.match(
    programTypes,
    /encodeStrokeWidth\(options: StrokeWidthEncodingOptions\): ChartProgram/
  );
});

test("keeps both Phase 3 visual capabilities executable and equivalent", () => {
  const weightedTheta = arcVariants.find(variant =>
    variant.artifact.capability === "weighted-theta"
  );
  const strokeWidth = widthVariants.find(variant =>
    variant.artifact.capability === "field-stroke-width"
  );
  for (const variant of [weightedTheta, strokeWidth]) {
    assert.ok(variant);
    assert.equal(variant.artifact.roadmap, "roadmap4");
    assert.equal(variant.artifact.phase, "phase3");
    assert.deepEqual(variant.userFacing().graphicSpec, variant.primitive().graphicSpec);
  }
});

test("documents both additive Phase 3 contracts and their limits", () => {
  const polar = read("docs/tutorials/polar-arcs.md");
  const appearance = read("docs/api/appearance/mark-style.md");
  assert.match(polar, /aggregate: "sum"/);
  assert.match(polar, /weight: "pop"/);
  assert.match(appearance, /encodeStrokeWidth\(\{ field, target\?, fieldType\?, scale\? \}\)/);
  assert.match(appearance, /complete series/);
  assert.match(appearance, /No implicit mean, sum/);
});
