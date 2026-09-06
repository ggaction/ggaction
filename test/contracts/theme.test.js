import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { chart } from "../../src/index.js";
import { chart as basicChart } from "../../src/basic.js";
import { loadDataset } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

function read(relative) {
  return readFileSync(path.join(root, relative), "utf8");
}

function chartData(definition) {
  if (definition === undefined) return undefined;
  if (typeof definition === "string") return loadDataset(definition);
  return Object.fromEntries(
    Object.entries(definition).map(([key, dataset]) => [
      key,
      loadDataset(dataset)
    ])
  );
}

test("publishes program theme lifecycle in runtime, types, and the Current catalog", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  for (const name of ["applyTheme", "removeTheme"]) {
    const entry = index.actions.filter(action => action.name === name);
    assert.equal(entry.length, 1, name);
    assert.equal(entry[0].contract.file, "agent_docs/contract/current/CORE.md");
    assert.equal(typeof chart()[name], "function");
    assert.equal(typeof basicChart()[name], "function");
  }

  const program = read("types/program.d.ts");
  const basic = read("types/basic.d.ts");
  const rootTypes = read("types/index.d.ts");
  assert.match(program, /^export type ThemeName = "light" \| "dark";$/m);
  assert.match(program, /^export interface ApplyThemeOptions \{$/m);
  assert.match(program, /^  applyTheme\(options: ApplyThemeOptions\): ChartProgram;$/m);
  assert.match(program, /^  removeTheme\(\): ChartProgram;$/m);
  for (const source of [basic, rootTypes]) {
    assert.match(source, /^  ThemeName,?$/m);
    assert.match(source, /^  ApplyThemeOptions,?$/m);
  }
});

test("keeps theme reconciliation nested under the authoring action trace", () => {
  const program = chart()
    .createCanvas()
    .createData({ values: [{ x: 1, y: 2 }] })
    .createPointMark()
    .encodeX({ field: "x" })
    .encodeY({ field: "y" })
    .applyTheme({ theme: "dark" });
  const node = program.trace.children.at(-1);
  assert.equal(node.op, "applyTheme");
  assert.equal(node.args.theme, "dark");
  assert.equal(node.children.some(child => child.op === "editGraphics"), true);
  assert.equal(program.trace.children.some(child => child.op === "editGraphics"), false);
});

test("applies the dark theme to every public unit chart without semantic drift", () => {
  let unitCount = 0;
  for (const definition of PUBLIC_CHARTS) {
    const program = definition.createProgram(chartData(definition.data));
    if (Object.keys(program.children).length > 0) continue;
    unitCount += 1;
    const semantic = JSON.stringify(program.semanticSpec);
    const scales = JSON.stringify(program.resolvedScales);
    const order = JSON.stringify(program.graphicSpec.order);
    const themed = program.applyTheme({ theme: "dark" });

    assert.equal(JSON.stringify(themed.semanticSpec), semantic, definition.id);
    assert.equal(JSON.stringify(themed.resolvedScales), scales, definition.id);
    assert.equal(JSON.stringify(themed.graphicSpec.order), order, definition.id);
  }
  assert.equal(unitCount > 0, true);
});
