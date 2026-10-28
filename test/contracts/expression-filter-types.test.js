import { compileTypeScript } from "../support/typescript.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

test("expression filter declarations admit closed predicates and reject mixed legacy modes", () => {
  const directory = path.resolve(".artifacts/types/expression-filter");
  mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "consumer.ts");
  writeFileSync(file, `import { chart, type ComputedExpressionV2 } from '../../../types/index.js';
const where: ComputedExpressionV2 = { version: 2, registry: 'standard@1', root: { type: 'literal', value: true } };
const program = chart().createData({ values: [{ x: 1 }] }).filterData({ id: 'filtered', where });
program.editFilteredData({ target: 'filtered', where });
program.createDerivedData({ id: 'derived', source: 'data', transform: [{ type: 'filter', where }] });
program.editFilteredData({ target: 'filtered', field: 'x', range: { min: 0 } });
// @ts-expect-error Predicate modes exclude field.
program.filterData({ id: 'mixed', where, field: 'x' });
// @ts-expect-error Predicate modes exclude null policy.
program.editFilteredData({ target: 'filtered', where, nulls: 'include' });
// @ts-expect-error Runtime callbacks are not predicates.
program.filterData({ id: 'callback', where: () => true });
// @ts-expect-error Exact parameter references are internal state.
program.createDerivedData({ id: 'forged', source: 'data', transform: [{ type: 'filter', where, parameterInputs: [] }] });
`);
  const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
