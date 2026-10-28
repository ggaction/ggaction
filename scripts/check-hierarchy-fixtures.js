import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeHierarchyNodes } from "../src/grammar/hierarchy/normalize.js";
import { normalizeHierarchyInput } from "../src/grammar/hierarchy/input.js";
import { layoutHierarchyTree } from "../src/grammar/hierarchy/tree.js";
import { layoutHierarchyPartition } from "../src/grammar/hierarchy/partition.js";
import { layoutHierarchyTreemap } from "../src/grammar/hierarchy/treemap.js";
import { orderHierarchyModel } from "../src/grammar/hierarchy/order.js";
import { hierarchyRows, hierarchyExpected, hierarchyInputFixtures, hierarchyOrderFixtures } from "../test/oracles/hierarchy.js";
import { naiveHierarchyTree } from "../test/oracles/hierarchy-tree.js";
import { integerHierarchyPartition } from "../test/oracles/hierarchy-partition.js";
import { rationalSquarify } from "../test/oracles/hierarchy-treemap.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = path.join(root, ".artifacts/validation/hierarchy-order");
const hash = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const cases = ["leaf-sum", "inclusive", "own-plus-children"].map(valueMode => {
  const result = normalizeHierarchyNodes(hierarchyRows, { valueMode });
  const actual = { order: result.nodes.map(node => JSON.parse(node.key)[1][0][1]),
    depth: result.nodes.map(node => node.depth), sourceRows: result.nodes.map(node => node.sourceRows),
    total: result.nodes.map(node => node.totalValue), own: result.nodes.map(node => node.ownValue) };
  const expected = { order: hierarchyExpected.order, depth: hierarchyExpected.depth,
    sourceRows: hierarchyExpected.sourceRows, ...hierarchyExpected[valueMode] };
  assert.deepEqual(actual, expected, valueMode);
  const input = { nodes: hierarchyRows, options: { valueMode } }, differences = [];
  return { id: valueMode, call: `normalizeHierarchyNodes(${JSON.stringify(hierarchyRows)},${JSON.stringify({ valueMode })})`,
    input, expected, actual, differences,
    hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } };
});
for (const fixture of hierarchyInputFixtures) {
  const result = normalizeHierarchyInput(fixture.input, fixture.options);
  const actual = { depth: result.nodes.map(node => node.depth), sourceRows: result.nodes.map(node => node.sourceRows),
    total: result.nodes.map(node => node.totalValue), own: result.nodes.map(node => node.ownValue) };
  const expected = fixture.expected, differences = [];
  assert.deepEqual(actual, expected, fixture.id);
  const input = { rows: fixture.input, options: fixture.options };
  cases.push({ id: fixture.id, call: `normalizeHierarchyInput(${JSON.stringify(fixture.input)},${JSON.stringify(fixture.options)})`,
    input, expected, actual, differences, hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
for (const [index, parents] of [[null, 0, 0, 1, 1], [null, 0, 0, 1, 3, 4, 2], [null, 0, 0, 0, 1, 4, 2, 6, 3, 8, 9]].entries()) {
  const model = normalizeHierarchyNodes(parents.map((parentKey, key) => ({ key, parentKey, value: 1 })));
  const options = { nodeSize: [2, 4], siblingGap: 2, depthGap: 6, orientation: "vertical" };
  const actual = layoutHierarchyTree(model, options).nodes.map(({ key, x, y }) => ({ key, x, y }));
  const expected = naiveHierarchyTree(model, 4, 10), differences = [], input = { model, options };
  assert.deepEqual(actual, expected, `tree-${index}`);
  cases.push({ id: `tree-${index}`, call: `layoutHierarchyTree(${JSON.stringify(model)},${JSON.stringify(options)})`,
    input, expected, actual, differences, hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
for (const valueMode of ["leaf-sum", "inclusive", "own-plus-children"]) {
  const model = normalizeHierarchyNodes(hierarchyRows, { valueMode });
  const actual = layoutHierarchyPartition(model).nodes.map(({ key, u0, u1, residualStart }) => ({ key, u0, u1, residualStart }));
  const expected = integerHierarchyPartition(model), differences = [], input = { model };
  actual.forEach((node, index) => {
    assert.equal(node.key, expected[index].key);
    for (const field of ["u0", "u1", "residualStart"]) {
      const difference = node[field] - expected[index][field];
      assert.ok(Math.abs(difference) <= 2e-15);
      if (difference !== 0) differences.push({ key: node.key, field, difference });
    }
  });
  cases.push({ id: `partition-${valueMode}`, call: `layoutHierarchyPartition(${JSON.stringify(model)})`,
    input, expected, actual, differences, absoluteTolerance: 2e-15,
    hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
for (const [index, weights] of [[6, 6, 4, 3, 2, 2, 1], [1, 1], [1, 4, 4, 2]].entries()) {
  const model = normalizeHierarchyNodes([{ key: "root", parentKey: null }, ...weights.map((value, key) => ({ key, parentKey: "root", value }))]);
  const options = { size: index === 1 ? [2, 2] : [6, 4], padding: 0, method: "squarify" };
  const actual = layoutHierarchyTreemap(model, options).nodes.slice(1).map(node => node.rect);
  const expected = rationalSquarify(weights, ...options.size), differences = [], input = { model, options };
  actual.forEach((rect, nodeIndex) => Object.keys(rect).forEach(field => {
    const difference = rect[field] - expected[nodeIndex][field];
    assert.ok(Math.abs(difference) <= 2e-12 * Math.max(1, Math.abs(expected[nodeIndex][field])));
    if (difference !== 0) differences.push({ nodeIndex, field, difference });
  }));
  cases.push({ id: `treemap-${index}`, call: `layoutHierarchyTreemap(${JSON.stringify(model)},${JSON.stringify(options)})`,
    input, expected, actual, differences, relativeTolerance: 2e-12,
    hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
for (const fixture of hierarchyOrderFixtures) {
  const model = normalizeHierarchyNodes(hierarchyRows), result = orderHierarchyModel(model, fixture.options, fixture.values);
  const actual = result.nodes.map(node => node.sourceRows[0]), expected = fixture.expectedSourceRows, differences = [];
  assert.deepEqual(actual, expected);
  const input = { model, options: fixture.options, values: fixture.values };
  cases.push({ id: `order-${fixture.options.by}`, call: `orderHierarchyModel(${JSON.stringify(model)},${JSON.stringify(fixture.options)},${JSON.stringify(fixture.values)})`,
    input, expected, actual, differences, hashes: { input: hash(input), expected: hash(expected), actual: hash(actual), differences: hash(differences) } });
}
const oracles = ["test/oracles/hierarchy.js", "test/oracles/hierarchy-tree.js", "test/oracles/hierarchy-partition.js", "test/oracles/hierarchy-treemap.js"];
const sources = ["src/grammar/hierarchy/normalize.js", "src/grammar/hierarchy/input.js", "src/grammar/hierarchy/model.js", "src/grammar/hierarchy/tree.js", "src/grammar/hierarchy/partition.js", "src/grammar/hierarchy/treemap.js", "src/grammar/hierarchy/order.js", "src/grammar/numeric.js", "src/grammar/sort.js", "src/core/itemIdentity.js"];
const receipt = { schemaVersion: 1, command: "node scripts/check-hierarchy-fixtures.js", exitCode: 0,
  testedHead: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(), node: process.version,
  oracleHashes: Object.fromEntries(await Promise.all(oracles.map(async oracle => [oracle, hash(await readFile(path.join(root, oracle), "utf8"))]))),
  sourceHashes: Object.fromEntries(await Promise.all(sources.map(async source => [source, hash(await readFile(path.join(root, source), "utf8"))]))), cases };
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, "numeric-evidence.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Verified ${cases.length} independent hierarchy input, aggregate and layout fixtures.`);
