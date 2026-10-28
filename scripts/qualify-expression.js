import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chart } from "../src/index.js";
import { getExpressionFunctions } from "../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../src/persistence.js";

// Literal references are independent of the production evaluator. Keep missing
// and signed zero explicit in the machine-readable qualification report.
const token = value => value === undefined ? { kind: "missing" }
  : Object.is(value, -0) ? { kind: "negative-zero" } : value;
const literal = value => ({ type: "literal", value });
const field = name => ({ type: "field", name });
const binary = (op, left, right) => ({ type: "binary", op, left, right });
const call = (name, values, options) => ({ type: "call", name, args: values.map(literal),
  ...(options === undefined ? {} : { options }) });
const envelope = root => ({ version: 2, registry: "standard@1", root });
const functions = [
  ["abs", [-3], 3], ["min", [4, -2, 7], -2], ["max", [4, -2, 7], 7],
  ["pow", [2, 3], 8], ["sqrt", [9], 3], ["log", [1], 0], ["exp", [0], 1],
  ["round", [-0.5], -0], ["floor", [-1.1], -2], ["ceil", [-1.1], -1],
  ["toNumber", [" -1.25e2 "], -125],
  ["sin", [90], 1, { angleUnit: "degrees" }],
  ["cos", [0], 1, { angleUnit: "radians" }],
  ["tan", [0], 0, { angleUnit: "degrees" }],
  ["atan2", [1, 0], 90, { angleUnit: "degrees" }],
  ["lower", ["ABCÄ"], "abcä"], ["upper", ["Straße"], "STRASSE"],
  ["length", ["A😀é"], 4], ["substring", ["A😀B", 1, 2], "😀"],
  ["replace", ["aa-aa", "aa", "$&"], "$&-aa"], ["concat", ["a", "😀", "b"], "a😀b"],
  ["isNull", [null], true], ["isMissing", [null], false], ["isFinite", [1], true],
  ["coalesce", [null, 7], 7],
  ["parseTime", ["2024-02-29"], 1709164800000, { format: "%Y-%m-%d" }],
  ["datePart", [1712319967890], 4, { part: "month", timeZone: "UTC" }],
  ["timeFloor", [1712319967890], 1711929600000, { unit: "week", timeZone: "UTC", weekStartsOn: 1 }]
];
const cases = functions.map(([name, values, expected, options]) => ({
  id: `function-${name}`, root: call(name, values, options), expected: [expected]
}));
cases.push(
  { id: "function-arrayLength", rows: [{ list: [4, 8, 9] }], root: { type: "call", name: "arrayLength", args: [field("list")] }, expected: [3] },
  { id: "function-at", rows: [{ list: [4, 8] }], root: { type: "call", name: "at", args: [field("list"), literal(1)] }, expected: [8] },
  { id: "array-bounds", rows: [{ list: [] }], root: { type: "call", name: "at", args: [field("list"), literal(1)] }, expected: [undefined], counts: { arrayBounds: 1 } },
  { id: "typed-equality", root: binary("eq", literal("1"), literal(1)), expected: [false] },
  { id: "null-equality", root: binary("eq", literal(null), literal(null)), expected: [false] },
  { id: "explicit-null", root: literal(null), expected: [null] },
  { id: "division-missing", root: binary("divide", literal(1), literal(0)), expected: [undefined], counts: { divideByZero: 1 } },
  { id: "lazy-if", root: { type: "if", condition: literal(false), then: binary("divide", literal(1), literal(0)), else: literal(7) }, expected: [7], counts: { divideByZero: 0 } },
  { id: "lazy-or", root: binary("or", literal(true), binary("eq", binary("divide", literal(1), literal(0)), literal(0))), expected: [true], counts: { divideByZero: 0 } },
  { id: "dotted-field", rows: [{ "a.b": 9, a: { b: 4 } }, { "a.b": 3 }], root: field("a.b"), expected: [9, 3] },
  { id: "nested-path", rows: [{ "a.b": 9, a: { b: 4 } }, { "a.b": 3 }], root: { type: "fieldPath", root: "a", path: ["b"] }, expected: [4, undefined] },
  { id: "parameter", rows: [{ x: 2 }], parameters: [{ id: "factor", value: 3 }], root: binary("multiply", field("x"), { type: "parameter", id: "factor" }), expected: [6] },
  { id: "invalid-leap-day", root: call("parseTime", ["2023-02-29"], { format: "%Y-%m-%d" }), expected: [undefined], counts: { dateRange: 1 } },
  { id: "spring-dst", root: call("timeFloor", [1710086400000], { unit: "day", timeZone: "America/New_York" }), expected: [1710046800000] },
  { id: "fall-dst", root: call("timeFloor", [1730616300000], { unit: "hour", timeZone: "America/New_York" }), expected: [1730610000000] },
  { id: "unknown-function", root: { type: "call", name: "constructor", args: [] }, error: "Unknown expression function" },
  { id: "global-lookup", root: { type: "global", name: "process" }, error: "node type" },
  { id: "prototype-path", rows: [{ a: {} }], root: { type: "fieldPath", root: "a", path: ["constructor"] }, error: "reserved" },
  { id: "inactive-invalid-field", root: { type: "if", condition: literal(true), then: literal(1), else: field("absent") }, error: "Unknown expression fields reference" }
);

const reports = [];
for (const item of cases) {
  const data = { id: "source", values: item.rows ?? [{ x: 1 }] };
  let base = chart().createData(data);
  for (const parameter of item.parameters ?? []) base = base.createParameter(parameter);
  const before = serializeProgram(base);
  const options = { id: "computed", source: "source", as: "output", expression: envelope(item.root) };
  const publicCalls = [{ op: "chart", args: [] }, { op: "createData", args: [data] },
    ...(item.parameters ?? []).map(parameter => ({ op: "createParameter", args: [parameter] })),
    { op: "createComputedData", args: [options] }];
  let actual, expected, actualError;
  try {
    const program = base.createComputedData(options);
    assert.equal(item.error, undefined, `${item.id}: expected rejection`);
    actual = program.semanticSpec.datasets.at(-1).values.map(row => token(row.output));
    expected = item.expected.map(token);
    assert.deepEqual(actual, expected, item.id);
    const counts = program.materializationConfigs.calculations.datasets.computed.counts;
    for (const [key, value] of Object.entries(item.counts ?? {})) assert.equal(counts[key], value, item.id);
    const restored = deserializeProgram(serializeProgram(program));
    assert.deepEqual(restored.semanticSpec.datasets.at(-1).values.map(row => token(row.output)), expected, `${item.id}: codec`);
  } catch (error) {
    if (!item.error) throw error;
    assert.ok(error.message.includes(item.error), `${item.id}: ${error.message}`);
    actualError = error.message;
    actual = expected = { rejected: true, messageIncludes: item.error };
  }
  assert.equal(serializeProgram(base), before, `${item.id}: original program`);
  reports.push({ id: item.id, publicCalls, expected, actual, diff: [],
    ...(item.counts ? { diagnosticCounts: item.counts } : {}),
    ...(actualError ? { actualError } : {}), originalUnchanged: true });
}

let getterCalls = 0;
const accessor = Object.defineProperty({ type: "literal" }, "value", {
  enumerable: true, get() { getterCalls++; return 4; }
});
const base = chart().createData({ id: "source", values: [{ x: 1 }] });
const before = serializeProgram(base);
assert.throws(() => base.createComputedData({ id: "computed", as: "output", expression: envelope(accessor) }), /own data|accessors/);
assert.equal(getterCalls, 0);
assert.equal(serializeProgram(base), before);
reports.push({ id: "accessor-rejected", input: "literal node with enumerable getter for value",
  expected: { getterCalls: 0, originalUnchanged: true }, actual: { getterCalls, originalUnchanged: true }, diff: [] });
const expectedNames = [...functions.map(([name]) => name), "arrayLength", "at"].sort();
const registry = getExpressionFunctions();
assert.deepEqual(registry.map(item => item.name).sort(), expectedNames);
reports.push({ id: "closed-registry", publicCalls: [{ op: "getExpressionFunctions", args: [] }], expected: expectedNames, actual: registry.map(item => item.name).sort(), diff: [] });

const root = fileURLToPath(new URL("../", import.meta.url));
const hash = value => createHash("sha256").update(value).digest("hex");
async function inputFiles(directory) {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await inputFiles(file));
    else if (!file.endsWith("AGENTS.md")) result.push(file);
  }
  return result.sort();
}
const inputs = {};
for (const file of [...await inputFiles("src"), ...await inputFiles("types"), "scripts/qualify-expression.js", "package-lock.json"])
  inputs[file] = hash(await readFile(path.join(root, file)));
const result = { schemaVersion: 1, command: "node scripts/qualify-expression.js", node: process.version,
  commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  inputSha256: hash(JSON.stringify(inputs)), inputs, checks: reports.length,
  expectedSha256: hash(JSON.stringify(reports.map(item => item.expected))),
  actualSha256: hash(JSON.stringify(reports.map(item => item.actual))),
  diff: [], reports };
const output = path.resolve(root, process.argv[2] ?? ".artifacts/acceptance/expressions.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(JSON.stringify({ checks: result.checks, inputSha256: result.inputSha256,
  expectedSha256: result.expectedSha256, actualSha256: result.actualSha256, diff: result.diff, output }) + "\n");
