import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  searchGgaction,
  taskPacketBytes,
  validateResolverKnowledge
} from "../../knowledge/task-resolver.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const knowledgeRoot = path.join(root, "knowledge");
const typesRoot = path.join(root, "types");
const tscFile = path.join(root, "node_modules/.bin/tsc");

async function json(name) {
  return JSON.parse(await readFile(path.join(knowledgeRoot, name), "utf8"));
}

function runtimeSignature(source, name) {
  const marker = `export function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, name);
  let depth = 0;
  let closed = -1;
  for (let index = start + marker.length - 1; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    if (source[index] === ")") {
      depth -= 1;
      if (depth === 0) {
        closed = index;
        break;
      }
    }
  }
  assert.notEqual(closed, -1, name);
  const finish = source.indexOf(";", closed);
  assert.notEqual(finish, -1, name);
  return source.slice(start + "export function ".length, finish + 1)
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

test("intent taxonomy covers every supported constraint with exact owners", async () => {
  const [taxonomy, cards] = await Promise.all([
    json("intent-taxonomy.json"),
    json("action-cards.json")
  ]);
  assert.deepEqual(validateResolverKnowledge(), {
    cards: 173,
    constraints: 79,
    providers: 74,
    supported: 74,
    unsupported: 5
  });
  const requiredFamilies = [
    "chart",
    "transform",
    "scale",
    "encoding",
    "guide",
    "layout",
    "selection",
    "renderer"
  ];
  for (const family of requiredFamilies) {
    assert.equal(
      taxonomy.constraints.some(constraint => constraint.id.startsWith(`${family}.`)),
      true,
      family
    );
  }
  assert.equal(cards.count, 173);

  const declarationByRuntime = {
    hconcat: "index.d.ts",
    vconcat: "index.d.ts",
    render: "index.d.ts",
    renderToSVG: "svg.d.ts",
    renderToPNG: "png.d.ts",
    renderToPDF: "pdf.d.ts"
  };
  for (const provider of taxonomy.providers.filter(entry => entry.kind === "runtime")) {
    const source = await readFile(path.join(typesRoot, declarationByRuntime[provider.name]), "utf8");
    assert.equal(provider.signature, runtimeSignature(source, provider.name), provider.id);
  }
});

test("every exact action name resolves to its compact card without gaps", async () => {
  const cards = await json("action-cards.json");
  for (const card of cards.cards) {
    const first = searchGgaction(card.name);
    const second = searchGgaction(card.name);
    assert.deepEqual(second, first, card.name);
    assert.deepEqual(first.matchedConstraints, [`action.${card.name}`], card.name);
    assert.equal(first.actionPlan.length, 1, card.name);
    assert.equal(first.actionPlan[0].id, `exact.${card.name}`, card.name);
    assert.equal(first.actionPlan[0].signature, card.signature, card.name);
    assert.equal(first.actionPlan[0].route, card.route, card.name);
    for (const option of card.options.filter(entry => entry.required)) {
      assert.equal(first.actionPlan[0].requiredOptions.includes(option.name), true, `${card.name}.${option.name}`);
    }
    assert.deepEqual(first.exactCalls, [card.snippet], card.name);
    assert.deepEqual(first.unresolved, [], card.name);
    assert.equal(first.candidates.length, 1, card.name);
    assert.equal(taskPacketBytes(first) <= 6144, true, card.name);
  }
});

test("design fixtures prove bounded one-call task closure without silent partials", async () => {
  const [fixtures, schema] = await Promise.all([
    json("task-closure-cases.json"),
    json("task-packet.schema.json")
  ]);
  assert.equal(fixtures.role, "resolver-design-fixtures-not-evaluation-corpus");
  const sizes = [];
  for (const fixture of fixtures.cases) {
    const packet = searchGgaction(fixture.query);
    assert.deepEqual(Object.keys(packet).sort(), [...schema.required].sort(), fixture.id);
    assert.deepEqual(packet.matchedConstraints, fixture.constraints, fixture.id);
    assert.deepEqual(
      packet.actionPlan.map(entry => ({ id: entry.id, options: entry.requiredOptions })),
      fixture.plan,
      fixture.id
    );
    assert.deepEqual(
      packet.unresolved.map(entry => entry.constraint),
      fixture.unresolved,
      fixture.id
    );
    const covered = new Set(packet.actionPlan.flatMap(entry => entry.constraints));
    const unresolved = new Set(packet.unresolved.map(entry => entry.constraint));
    for (const constraint of packet.matchedConstraints) {
      assert.equal(
        covered.has(constraint) || unresolved.has(constraint),
        true,
        `${fixture.id}: ${constraint}`
      );
    }
    assert.equal(packet.exactCalls.length, packet.actionPlan.length, fixture.id);
    assert.equal(packet.candidates.length <= 3, true, fixture.id);
    const bytes = taskPacketBytes(packet);
    assert.equal(bytes <= 6144, true, fixture.id);
    sizes.push(bytes);
  }
  sizes.sort((left, right) => left - right);
  assert.equal(Math.max(...sizes) <= 6144, true);
  assert.equal(sizes[Math.floor(sizes.length / 2)] <= 4096, true);
});

test("every supported semantic constraint resolves and every produced call type-checks", async () => {
  const [taxonomy, cards, fixtures] = await Promise.all([
    json("intent-taxonomy.json"),
    json("action-cards.json"),
    json("task-closure-cases.json")
  ]);
  const calls = new Set(cards.cards.map(card => searchGgaction(card.name).exactCalls[0]));
  for (const constraint of taxonomy.constraints.filter(entry => entry.unresolved === undefined)) {
    const packet = searchGgaction(constraint.phrases[0]);
    assert.equal(packet.matchedConstraints.includes(constraint.id), true, constraint.id);
    const covered = packet.actionPlan.flatMap(entry => entry.constraints);
    assert.equal(covered.includes(constraint.id), true, constraint.id);
    assert.equal(packet.unresolved.some(entry => entry.constraint === constraint.id), false, constraint.id);
    for (const call of packet.exactCalls) calls.add(call);
  }
  for (const fixture of fixtures.cases) {
    for (const call of searchGgaction(fixture.query).exactCalls) calls.add(call);
  }

  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-task-resolver-"));
  try {
    for (const name of ["program.d.ts", "index.d.ts", "svg.d.ts", "png.d.ts", "pdf.d.ts"]) {
      await copyFile(path.join(typesRoot, name), path.join(temporary, name));
    }
    const source = [
      'import type { ChartProgram } from "./program.js";',
      'import { hconcat, render, vconcat } from "./index.js";',
      'import { renderToSVG } from "./svg.js";',
      'import { renderToPNG } from "./png.js";',
      'import { renderToPDF } from "./pdf.js";',
      "declare let program: ChartProgram;",
      "declare const chart: () => ChartProgram;",
      "declare const context: CanvasRenderingContext2D;",
      "async function verifyCompactCalls() {",
      ...[...calls].map(call => `  ${call};`),
      "}",
      "void verifyCompactCalls;",
      ""
    ].join("\n");
    const sourceFile = path.join(temporary, "resolver-calls.ts");
    await writeFile(sourceFile, source);
    const result = spawnSync(tscFile, [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target", "ES2022",
      "--module", "NodeNext",
      "--moduleResolution", "NodeNext",
      sourceFile
    ], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("task packets reject ambiguous, unsupported, empty, and oversized input explicitly", () => {
  const conflict = searchGgaction("legend at top and legend at bottom");
  assert.deepEqual(conflict.unresolved.map(entry => entry.constraint), [
    "layout.legend.bottom",
    "layout.legend.top"
  ]);
  assert.equal(conflict.actionPlan.some(entry => entry.name === "editLegendLayout"), false);

  const geo = searchGgaction("map chart");
  assert.deepEqual(geo.unresolved.map(entry => entry.constraint), ["unsupported.geo"]);
  assert.throws(() => searchGgaction(""), /non-empty string/);
  assert.throws(() => searchGgaction("x".repeat(501)), /at most 500 characters/);

  const dense = [
    "createCanvas", "createData", "createPointMark", "createTickMark",
    "createTextMark", "createLineMark", "createBarMark", "createAreaMark",
    "createRuleMark", "createArcMark", "createRectMark", "encodeX",
    "encodeY", "encodeColor", "encodeSize", "encodeShape", "createAxes",
    "createLegend", "createGrid", "createTitle"
  ].join(" ");
  assert.equal(dense.length <= 500, true);
  assert.throws(() => searchGgaction(dense), /hard ceiling is 6144 bytes/);
});
