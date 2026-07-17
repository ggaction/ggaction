import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants } from "../charts/polar-line-radar/manifest.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const markContract = readFileSync(path.join(
  root,
  "agent_docs/contract/current/MARKS.md"
), "utf8");

test("promotes the approved Phase 4 capabilities out of Planned inventory", () => {
  const planned = new Set(index.plannedCapabilities.map(capability => capability.id));
  assert.equal(planned.has("polar-line-radar"), false);
  assert.equal(planned.has("polar-line-closed"), false);
});

test("locks closed Polar lines into public types and the current mark contract", () => {
  assert.match(
    declarations,
    /createLineMark\(options\?: \{[\s\S]*?closed\?: boolean;[\s\S]*?\}\): ChartProgram;/
  );
  assert.match(
    declarations,
    /editLineMark\(options: \{[\s\S]*?closed\?: boolean;[\s\S]*?\}\): ChartProgram;/
  );
  assert.match(markContract, /createLineMark\(\{[^\n]*closed\?/);
  assert.match(markContract, /editLineMark\(\{[^\n]*closed\?/);
});

test("registers the approved open and closed primitive/public chart pairs", () => {
  assert.deepEqual(
    visualVariants.map(variant => `${variant.chart}/${variant.variant}`),
    ["gapminder-polar-trends/open", "jobs-radar-chart/closed"]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase4");
    assert.equal(variant.artifact.capability, "polar-line-radar");
    assert.equal(typeof variant.userFacing, "function");
  }
});
