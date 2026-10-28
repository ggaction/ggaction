import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("parameter and expression declarations preserve typed closed calls in Full and Basic", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-parameters-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type ComputedExpressionV2 } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import { getExpressionFunctions } from ${JSON.stringify(path.join(root, "types/inspection.js"))};
const expression: ComputedExpressionV2 = { version: 2, registry: "standard@1", root: {
  type: "binary", op: "multiply", left: { type: "field", name: "value" }, right: { type: "parameter", id: "factor" }
} };
const program = chart().createParameter({ id: "factor", value: 2 })
  .createParameter({ id: "label", type: "string", nullable: true, value: null })
  .createData({ values: [{ value: 4 }] }).createComputedData({ id: "scaled", as: "result", expression })
  .editParameter({ target: "factor", value: 3 });
program.removeParameter({ id: "label" });
basicChart().createParameter({ id: "factor", value: 2 }).createData({ values: [{ value: 4 }] })
  .createComputedData({ id: "scaled", as: "result", expression });
const functions = getExpressionFunctions({ registry: "standard@1" });
// @ts-expect-error read-only registry
functions.push(functions[0]);
// @ts-expect-error basic has no parameter revision orchestration
basicChart().editParameter({ target: "factor", value: 2 });
// @ts-expect-error explicit null needs type and nullability
chart().createParameter({ id: "p", value: null });
// @ts-expect-error declared scalar type must match value
chart().createParameter({ id: "p", type: "number", value: "x" });
// @ts-expect-error a parameter is scalar
chart().createParameter({ id: "p", value: [] });
// @ts-expect-error undefined does not request inference
chart().createParameter({ id: "p", value: 1, type: undefined });
// @ts-expect-error null is not valid without nullable true
chart().createParameter({ id: "p", type: "boolean", value: null, nullable: false });
// @ts-expect-error edit does not change a parameter's type
program.editParameter({ target: "factor", value: 1, type: "number" });
// @ts-expect-error removal is restrict only
program.removeParameter({ id: "factor", force: true });
// @ts-expect-error literal missing is forbidden
const missing: ComputedExpressionV2 = { version: 2, registry: "standard@1", root: { type: "literal", value: undefined } };
// @ts-expect-error no executable expressions
program.createComputedData({ id: "bad", as: "x", expression: () => 1 });
// @ts-expect-error exact parameter refs belong to stored state
program.createComputedData({ id: "bad", as: "x", expression, parameterInputs: [] });
// @ts-expect-error unknown registry
getExpressionFunctions({ registry: "custom" });
// @ts-expect-error trigonometric units are explicit
const trig: ComputedExpressionV2 = { version: 2, registry: "standard@1", root: { type: "call", name: "sin", args: [{ type: "literal", value: 1 }] } };
// @ts-expect-error week requires a start day
const week: ComputedExpressionV2 = { version: 2, registry: "standard@1", root: { type: "call", name: "timeFloor", args: [], options: { unit: "week", timeZone: "UTC" } } };
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
