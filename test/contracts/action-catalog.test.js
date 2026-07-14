import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/core/ChartProgram.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const catalogPath = path.join(
  root,
  "agent_docs/contract/ACTION_CATALOG.md"
);
const catalog = readFileSync(catalogPath, "utf8");

function declaredProgramMethods() {
  const declaration = readFileSync(
    path.join(root, "types/program.d.ts"),
    "utf8"
  );
  const classBody = declaration.slice(
    declaration.indexOf("export class ChartProgram")
  );

  return [...classBody.matchAll(/^  ([A-Za-z][A-Za-z0-9]*)\(/gm)]
    .map(match => match[1])
    .filter(name => name !== "constructor");
}

function summaryRows() {
  return [...catalog.matchAll(
    /^\| (User-facing|Primitive) \| \[`([A-Za-z][A-Za-z0-9]*)`\]\(#([a-z0-9-]+)\) \| (Implemented|Planned|Proposed) \| (✅|⚠️|❌|—) \| (✅|⚠️|❌|—) \| (✅|⚠️|❌|—) \|$/gmu
  )].map(match => ({
    layer: match[1],
    action: match[2],
    anchor: match[3],
    status: match[4],
    contract: match[5],
    effects: match[6],
    tests: match[7]
  }));
}

function detailSections() {
  const headings = [...catalog.matchAll(
    /^#{3,6} `([A-Za-z][A-Za-z0-9]*)`$/gm
  )];

  return headings.map((heading, index) => ({
    action: heading[1],
    source: catalog.slice(
      heading.index,
      headings[index + 1]?.index ?? catalog.length
    )
  }));
}

function valueCoverageSections() {
  const headings = [...catalog.matchAll(
    /^### Value coverage — `([A-Za-z][A-Za-z0-9]*)`$/gm
  )];

  return headings.map((heading, index) => ({
    action: heading[1],
    source: catalog.slice(
      heading.index,
      headings[index + 1]?.index ?? catalog.length
    )
  }));
}

function formalValueSections() {
  const headings = [...catalog.matchAll(
    /^### Formal values — `([A-Za-z][A-Za-z0-9]*)`$/gm
  )];

  return headings.map((heading, index) => ({
    action: heading[1],
    source: catalog.slice(
      heading.index,
      headings[index + 1]?.index ?? catalog.indexOf(
        "## Parameter value coverage and proposals",
        heading.index
      )
    )
  }));
}

function expectedTestStatus(source) {
  if (source.includes("❌ Missing")) return "❌";
  if (source.includes("⚠️ Partial")) return "⚠️";
  return "✅";
}

function runtimeActionMethods() {
  return Object.entries(
    Object.getOwnPropertyDescriptors(ChartProgram.prototype)
  )
    .filter(([name, descriptor]) =>
      !name.startsWith("_") && typeof descriptor.value === "function"
    )
    .map(([name]) => name)
    .filter(name => name !== "constructor");
}

test("keeps the action catalog aligned with every declared direct action", () => {
  const declared = declaredProgramMethods();
  const rows = summaryRows();
  const details = detailSections();
  const rowActions = rows.map(row => row.action);
  const detailActions = details.map(section => section.action);

  assert.equal(new Set(declared).size, declared.length);
  assert.equal(new Set(rowActions).size, rowActions.length);
  assert.equal(new Set(detailActions).size, detailActions.length);
  assert.deepEqual(new Set(rowActions), new Set(declared));
  assert.deepEqual(new Set(detailActions), new Set(declared));

  for (const row of rows) {
    assert.equal(row.anchor, row.action.toLowerCase(), row.action);
    assert.equal(row.status, "Implemented", row.action);
  }

  for (const section of details) {
    assert.match(section.source, /Coverage:/, section.action);
  }
});

test("keeps primitive and runtime-only actions out of the wrong catalog layer", () => {
  const rows = summaryRows();
  const primitives = rows
    .filter(row => row.layer === "Primitive")
    .map(row => row.action);

  assert.deepEqual(primitives, [
    "editSemantic",
    "createGraphics",
    "editGraphics"
  ]);

  const declared = new Set(declaredProgramMethods());
  const cataloged = new Set(rows.map(row => row.action));
  const internal = runtimeActionMethods().filter(name => !declared.has(name));

  assert.equal(internal.includes("rematerializePointMark"), true);
  assert.equal(internal.includes("createLegendSymbols"), true);
  for (const action of internal) {
    assert.equal(cataloged.has(action), false, action);
  }
});

test("keeps one value coverage and proposal ledger for every direct action", () => {
  const declared = declaredProgramMethods();
  const rows = new Map(summaryRows().map(row => [row.action, row]));
  const sections = valueCoverageSections();
  const actions = sections.map(section => section.action);

  assert.equal(new Set(actions).size, actions.length);
  assert.deepEqual(new Set(actions), new Set(declared));

  for (const section of sections) {
    assert.match(
      section.source,
      /(✅ Covered|⚠️ Partial|❌ Missing)/,
      `${section.action} has no current value coverage state`
    );
    assert.match(
      section.source,
      /(🟣 Proposed|Proposed:|Proposed values|No proposal|Planned capability|future)/i,
      `${section.action} has no future value state`
    );
    assert.equal(
      rows.get(section.action)?.tests,
      expectedTestStatus(section.source),
      `${section.action} summary does not reflect its value ledger`
    );
  }
});

test("separates implemented and proposed values for every direct action", () => {
  const declared = declaredProgramMethods();
  const sections = formalValueSections();
  const actions = sections.map(section => section.action);

  assert.equal(new Set(actions).size, actions.length);
  assert.deepEqual(new Set(actions), new Set(declared));

  for (const section of sections) {
    assert.match(
      section.source,
      /^- Implemented: /m,
      `${section.action} has no formal implemented signature`
    );
    assert.match(
      section.source,
      /^- Proposed \(NOT IMPLEMENTED\): /m,
      `${section.action} has no explicit unimplemented proposal state`
    );
  }

  const encodeY = sections.find(section => section.action === "encodeY").source;
  assert.match(encodeY, /aggregate\?: "mean" \| "count"/);
  assert.match(
    encodeY,
    /aggregate\?: "sum" \| "min" \| "max" \| "median"/
  );
  const point = sections.find(
    section => section.action === "createPointMark"
  ).source;
  assert.match(point, /shape\?: "circle" \| "square"/);
  assert.match(point, /shape\?: "triangle" \| "diamond"/);
});

test("keeps catalog coverage evidence paths executable", () => {
  const evidence = [...catalog.matchAll(/`(test\/[A-Za-z0-9_./-]+\.test\.js)`/g)]
    .map(match => match[1]);

  assert.equal(evidence.length > 0, true);
  for (const relative of new Set(evidence)) {
    assert.equal(
      existsSync(path.join(root, relative)),
      true,
      `Missing catalog coverage evidence: ${relative}`
    );
  }
});
