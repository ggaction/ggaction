import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chart } from "../src/index.js";
import { serializeProgram, deserializeProgram } from "../src/persistence.js";

const expression = root => ({ version: 2, registry: "standard@1", root });
const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const rows = [{ group: "A", order: 1, value: 2 }, { group: "A", order: 2, value: 4 },
  { group: "B", order: 3, value: 8 }, { group: "C", order: 4, value: 2 }];
const calls = [], reports = [];
function apply(program, op, args) { calls.push({ op, args }); return program[op](args); }
let program = chart();
for (const [op, args] of [
  ["createCanvas", { width: 300, height: 200, margin: 20 }],
  ["createData", { id: "raw", values: rows }],
  ["createParameter", { id: "minimum", value: 0 }],
  ["filterData", { id: "filtered", where: expression(binary("gte", field("order"), { type: "parameter", id: "minimum" })) }],
  ["createSummaryData", { id: "totals", groupBy: "group", aggregates: [{ op: "sum", field: "value", as: "total" }] }],
  ["createScatterPlot", { id: "points", data: "totals", x: { field: "group", fieldType: "nominal", scale: { emptyDomain: "preserve" } },
    y: { field: "total", scale: { id: "amount", nice: false, zero: true, emptyDomain: "preserve" } }, guides: false }],
  ["encodeOpacity", { target: "points", conditions: [
    { when: expression(binary("gte", field("total"), literal(8))), value: { value: 0 } },
    { when: expression(binary("gte", field("total"), literal(4))), value: { value: 0.5 } }
  ], otherwise: { value: 1 } }]
]) program = apply(program, op, args);
function snapshot(actualProgram) {
  const layer = actualProgram.semanticSpec.layers.find(layer => layer.id === "points");
  const data = actualProgram.semanticSpec.datasets.find(dataset => dataset.id === layer.data);
  return { totals: data.values.map(row => [row.group, row.total]), domain: actualProgram.resolvedScales.amount.domain,
    opacity: actualProgram.graphicSpec.objects.points.items.map(item => item.properties.opacity) };
}
function check(id, expected) {
  const actual = snapshot(program);
  assert.deepEqual(actual, expected, id);
  assert.deepEqual(snapshot(deserializeProgram(serializeProgram(program))), expected, `${id}: restored`);
  reports.push({ id, publicCalls: structuredClone(calls), expected, actual, diff: [], offlineReplay: true });
}
// These totals and branch outcomes are literal independent expectations.
check("every-branch-and-first-match", { totals: [["A", 6], ["B", 8], ["C", 2]], domain: [0, 8], opacity: [0.5, 0, 1] });
for (const [minimum, expected] of [
  [2, { totals: [["A", 4], ["B", 8], ["C", 2]], domain: [0, 8], opacity: [0.5, 0, 1] }],
  [4, { totals: [["C", 2]], domain: [0, 2], opacity: [1] }],
  [5, { totals: [], domain: [0, 2], opacity: [] }],
  [0, { totals: [["A", 6], ["B", 8], ["C", 2]], domain: [0, 8], opacity: [0.5, 0, 1] }]
]) {
  const previous = program, saved = serializeProgram(previous);
  program = apply(program, "editParameter", { target: "minimum", value: minimum });
  assert.equal(serializeProgram(previous), saved);
  check(`parameter-minimum-${minimum}`, expected);
}
program = apply(program, "selectMarks", { id: "opaque", target: "points", property: "opacity", op: "gte", value: 0.5 });
const invalid = [
  ["feedback-cycle", { target: "points", conditions: [{ when: { selection: "opaque" }, value: { value: 0 } }], otherwise: { value: 1 } }, /Cyclic/],
  ["inactive-field", { target: "points", conditions: [{ when: expression(literal(true)), value: { value: 0 } }], otherwise: { field: "absent" } }, /absent/],
  ["required-otherwise", { target: "points", conditions: [{ when: expression(literal(true)), value: { value: 0 } }] }, /otherwise/]
];
for (const [id, args, errorPattern] of invalid) {
  const saved = serializeProgram(program);
  let actualError;
  assert.throws(() => program.encodeOpacity(args), error => { actualError = error.message; return errorPattern.test(error.message); });
  const unchanged = serializeProgram(program) === saved;
  assert.equal(unchanged, true);
  const expected = { rejected: true, messageMatches: errorPattern.source, originalUnchanged: true };
  reports.push({ id, publicCalls: [...structuredClone(calls), { op: "encodeOpacity", args }], expected, actual: { ...expected, originalUnchanged: unchanged }, actualError, diff: [] });
}
const root = fileURLToPath(new URL("../", import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
async function files(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(file));
    else if (!file.endsWith("AGENTS.md")) result.push(file);
  }
  return result.sort();
}
const inputs = {};
for (const file of [...await files("src"), ...await files("types"), "scripts/qualify-conditionals.js", "package-lock.json"])
  inputs[file] = hash(await readFile(path.join(root, file)));
const result = { schemaVersion: 1, command: "node scripts/qualify-conditionals.js", node: process.version,
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  workingTree: execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim() ? "modified" : "clean",
  inputSha256: hash(JSON.stringify(inputs)), inputs, checks: reports.length,
  expectedSha256: hash(JSON.stringify(reports.map(item => item.expected))), actualSha256: hash(JSON.stringify(reports.map(item => item.actual))), diff: [], reports };
const output = path.resolve(root, process.argv[2] ?? ".artifacts/acceptance/conditionals.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(JSON.stringify({ checks: result.checks, inputSha256: result.inputSha256, expectedSha256: result.expectedSha256, actualSha256: result.actualSha256, diff: result.diff, output }) + "\n");
