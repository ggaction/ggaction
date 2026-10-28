import test from "node:test";
import assert from "node:assert/strict";
import { orderedDatasetClosure } from "../../../src/grammar/datasetDependencies.js";

const unary = (id, source) => ({ id, source, transform: [{ type: "computed" }] });
const lookup = (id, source, right) => ({ id, source, transform: [{ type: "lookup", lookup: { data: right } }] });

test("multi-root closure emits every affected dataset once after both lookup inputs", () => {
  const datasets = [{ id: "raw" }, unary("left", "raw"), unary("right", "raw"),
    lookup("joined", "left", "right"), unary("last", "joined"), unary("untouched", "raw")];
  const before = JSON.stringify(datasets);
  assert.deepEqual(orderedDatasetClosure(datasets, ["right", "left", "right"]).map(dataset => dataset.id), ["left", "right", "joined", "last"]);
  assert.equal(JSON.stringify(datasets), before);
  assert.deepEqual(orderedDatasetClosure(datasets, []).map(dataset => dataset.id), []);
});

test("deep dataset closure is independent from the host call stack", () => {
  const datasets = [{ id: "raw" }];
  for (let index = 0; index < 6000; index += 1) datasets.push(unary(`d${index}`, index === 0 ? "raw" : `d${index - 1}`));
  const result = orderedDatasetClosure(datasets, ["d0", "d2000", "d4000"]);
  assert.equal(result.length, 6000);
  assert.equal(result[0], datasets[1]);
  assert.equal(result.at(-1), datasets.at(-1));
  assert.ok(result.every((dataset, index) => dataset.id === `d${index}`));
});

test("closure excludes owned caches and descendants while retaining an independently affected input", () => {
  const datasets = [{ id: "raw" }, { id: "cache", source: "raw", transform: [{ type: "statisticalReference" }] },
    unary("cacheChild", "cache"), unary("ordinary", "raw"), lookup("joined", "cacheChild", "ordinary")];
  const result = orderedDatasetClosure(datasets, ["raw"], { skip: dataset => dataset.transform?.[0]?.type === "statisticalReference" });
  assert.deepEqual(result.map(dataset => dataset.id), ["raw", "ordinary", "joined"]);
});

test("closure rejects duplicate identities, missing inputs, absent roots, and cycles", () => {
  for (const [datasets, roots, error] of [
    [[{ id: "raw" }, { id: "raw" }], ["raw"], /duplicate/],
    [[{ id: "raw" }, lookup("joined", "raw", "missing")], ["raw"], /missing input/],
    [[{ id: "raw" }], ["missing"], /no root/],
    [[unary("first", "second"), unary("second", "first")], ["first"], /cycle/],
    [[{ id: "raw" }, unary("cycle", "cycle")], ["raw"], /cycle/]
  ]) {
    const before = JSON.stringify(datasets);
    assert.throws(() => orderedDatasetClosure(datasets, roots), error);
    assert.equal(JSON.stringify(datasets), before);
  }
});

test("duplicate primary and secondary input edges retain one ordering dependency", () => {
  const datasets = [{ id: "raw" }, lookup("joined", "raw", "raw"), unary("last", "joined")];
  assert.deepEqual(orderedDatasetClosure(datasets, ["raw"]).map(dataset => dataset.id), ["raw", "joined", "last"]);
});
