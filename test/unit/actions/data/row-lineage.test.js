import { createGraph } from "../../../../examples/graph-plots/program.js";
import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { encodeValue, decodeValue } from "../../../../src/persistence/codec.js";
import { TRANSFORM_TYPES } from "../../../../src/grammar/transforms.js";
import { LINEAGE_TRANSFORMS } from "../../../../src/grammar/rowLineage.js";
import { buildActionRelationshipPrograms } from "../../../../scripts/action-relationship-source.js";
import { memberRowReferences } from "../../../../src/materialization/selection/rows.js";
import { resolveMarkItems } from "../../../../src/materialization/selection/policies/index.js";
import { resolveGraphicLineage } from "../../../../src/selectors/resources.js";

const data = (program, id) => program.semanticSpec.datasets.find(dataset => dataset.id === id);
const contributing = (program, id) => {
  const dataset = data(program, id);
  return dataset.lineage.rowRefs.map(index => dataset.lineage.entries[index].map(ref => ({
    data: ref.data, index: data(program, ref.data).rowKeys.indexOf(ref.rowKey), role: ref.role
  })));
};

test("shared diamond lineage expands once per row and rejects a cycle", () => {
  const make = id => ({ id, logicalId: id, revision: 0, rowKeys: [id], values: [{ v: 1 }] });
  const input = dataset => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: 0, rowKey: dataset.id, role: "source" });
  const datasets = [make("root")];
  let previous = datasets;
  for (let depth = 0; depth < 60; depth++) {
    const next = [make(`left${depth}`), make(`right${depth}`)];
    for (const dataset of next) dataset.lineage = { entries: [previous.map(input)], rowRefs: [0] };
    datasets.push(...next); previous = next;
  }
  const target = datasets.at(-1), program = { semanticSpec: { datasets } };
  const refs = memberRowReferences(program, [], target.id, target.rowKeys);
  assert.equal(refs.length, 120);
  assert.equal(new Set(refs.map(ref => ref.data)).size, refs.length);
  assert.equal(refs[0].data, "root");
  const cycle = make("cycle");
  cycle.lineage = { entries: [[input(cycle)]], rowRefs: [0] };
  assert.throws(() => memberRowReferences({ semanticSpec: { datasets: [cycle] } }, [], cycle.id, cycle.rowKeys), /Cyclic/);
});

test("every registered transform emits unique row keys and exact resolvable lineage", () => {
  assert.deepEqual([...LINEAGE_TRANSFORMS].sort(), [...TRANSFORM_TYPES].sort());
  const seen = new Set();
  const inspect = program => {
    for (const dataset of program.semanticSpec.datasets) {
      if (dataset.values === undefined || dataset.source === undefined) continue;
      seen.add(dataset.transform[0].type);
      assert.equal(new Set(dataset.rowKeys).size, dataset.values.length);
      assert.equal(dataset.lineage.rowRefs.length, dataset.values.length);
      for (const refs of dataset.lineage.entries) for (const ref of refs) {
        const source = data(program, ref.data);
        assert.equal(source.logicalId, ref.logicalDataId);
        assert.equal(source.revision, ref.revision);
        assert.ok(source.rowKeys.includes(ref.rowKey));
      }
    }
    for (const layer of program.semanticSpec.layers) {
      const graphic = program.graphicSpec.objects[layer.id];
      if (!graphic?.items?.length || graphic.items.some(item => item.identity === undefined)) continue;
      const stored = new Map(graphic.items.map(item => [item.id, item.identity]));
      for (const item of resolveMarkItems(program, layer.id)) {
        const rowKeys = item.rows.filter(ref => ref.data === layer.data).map(ref => ref.rowKey);
        for (const [index, id] of item.graphicIds.entries()) {
          const identity = stored.get(id);
          assert.equal(identity.key, item.key);
          assert.equal(identity.topology, item.topology);
          assert.equal(identity.role, item.graphicRoles[index]);
          if (identity.lineage.kind === "resource") {
            const resource = resolveGraphicLineage(program, identity);
            const expected = layer.mark.type === "graph" && item.role === "edge" && layer.graphBinding.routes
              ? layer.graphBinding.routes : layer.mark.type === "contour" ? layer.contourBinding.geometry : undefined;
            assert.equal(resource.kind, expected?.kind ?? "layout");
            if (expected) assert.deepEqual(identity.lineage.resource, expected);
            assert.equal(resource.id, identity.lineage.resource.id);
            assert.equal(resource.revision, identity.lineage.resource.revision);
            assert.ok(item.rows.every(ref => data(program, ref.data).rowKeys.includes(ref.rowKey)));
          } else assert.deepEqual(identity.lineage.rowKeys, rowKeys);
        }
      }
    }
    Object.values(program.children).forEach(inspect);
  };
  buildActionRelationshipPrograms().forEach(inspect);
  inspect(createGraph("recomputed"));
  inspect(chart().createData({ id: "rows", values: [1, 2, 3, 4, 50].map(v => ({ g: "a", v })) })
    .createBoxOutlierData({ id: "outliers", category: "g", field: "v" }));
  assert.deepEqual([...seen].sort(), [...TRANSFORM_TYPES].sort());
});

test("window and imputation record the actual contributing rows while retaining output identity", () => {
  const source = chart().createData({ id: "rows", keyField: "id", values: [
    { id: "a", order: 1, v: 2 }, { id: "b", order: 2, v: 4 }, { id: "c", order: 3, v: 8 }
  ] });
  const window = source.createWindowData({ id: "window", sortBy: [{ field: "order" }], operations: [{ op: "movingMean", field: "v", as: "mean", frame: { preceding: 1 } }] });
  assert.deepEqual(data(window, "window").rowKeys, data(source, "rows").rowKeys);
  assert.deepEqual(contributing(window, "window").map(refs => refs.map(ref => ref.index).sort()), [[0], [0, 1], [1, 2]]);
  const missing = chart().createData({ id: "rows", values: [{ t: 0, v: 2 }, { t: 1, v: null }, { t: 2, v: 6 }] })
    .createImputedData({ id: "filled", fields: ["v"], sortBy: [{ field: "t" }], method: "linear" });
  assert.deepEqual(contributing(missing, "filled")[1].map(ref => ref.index).sort(), [0, 1, 2]);
});

test("lookup lineage distinguishes typed left and right contributors", () => {
  const program = chart().createData({ id: "left", values: [{ k: 1 }, { k: "1" }, { k: "missing" }] })
    .createData({ id: "right", values: [{ k: "1", v: 20 }, { k: 1, v: 10 }] })
    .createLookupData({ id: "joined", source: "left", field: "k", lookup: { data: "right", key: "k", fields: ["v"] } });
  assert.deepEqual(contributing(program, "joined"), [
    [{ data: "left", index: 0, role: "left" }, { data: "right", index: 1, role: "right" }],
    [{ data: "left", index: 1, role: "left" }, { data: "right", index: 0, role: "right" }],
    [{ data: "left", index: 2, role: "left" }]
  ]);
});

test("stored lineage rejects stale revisions, out-of-range tables and cycles", () => {
  const program = chart().createData({ id: "rows", values: [{ x: 1 }, { x: 2 }] })
    .createSortedData({ id: "sorted", sortBy: [{ field: "x" }] });
  for (const mutate of [
    dataset => { dataset.lineage.rowRefs[0] = 100; },
    dataset => { dataset.lineage.entries[0][0].revision = 100; },
    dataset => { dataset.lineage.entries[0][0] = { data: dataset.id, logicalDataId: dataset.logicalId, revision: dataset.revision, rowKey: dataset.rowKeys[0], role: "source" }; }
  ]) {
    const envelope = JSON.parse(serializeProgram(program)), state = decodeValue(envelope.payload);
    mutate(state.semanticSpec.datasets[1]); envelope.payload = encodeValue(state);
    assert.throws(() => deserializeProgram(JSON.stringify(envelope)));
  }
});

test("aggregate groups retain exact contributors after filtering and revision", () => {
  const base = chart().createData({ id: "rows", keyField: "id", values: [
    { id: "a", group: "A", v: 1 }, { id: "b", group: "A", v: 2 }, { id: "c", group: "B", v: 5 }
  ] });
  const summarize = program => program.createSummaryData({ id: "summary", source: "rows", groupBy: ["group"], aggregates: [{ op: "sum", field: "v", as: "total" }] });
  const grouped = summarize(base);
  assert.deepEqual(contributing(grouped, "summary").map(refs => refs.map(ref => ref.index)), [[0, 1], [2]]);
  const filtered = base.filterData({ id: "kept", source: "rows", field: "id", oneOf: ["a", "c"] })
    .createSummaryData({ id: "summary", source: "kept", groupBy: ["group"], aggregates: [{ op: "sum", field: "v", as: "total" }] });
  assert.deepEqual(contributing(filtered, "summary"), [[{ data: "kept", index: 0, role: "source" }], [{ data: "kept", index: 1, role: "source" }]]);
  const revised = grouped.reviseData({ source: "rows", id: "next", values: [
    { id: "b", group: "A", v: 8 }, { id: "c", group: "B", v: 5 }, { id: "a", group: "A", v: 1 }
  ] });
  const updated = revised.semanticSpec.datasets.find(dataset => dataset.source === "next" && dataset.transform?.[0].type === "summary");
  assert.deepEqual(updated.rowKeys, data(grouped, "summary").rowKeys);
  assert.deepEqual(contributing(revised, updated.id).map(refs => refs.map(ref => ref.index)), [[0, 2], [1]]);
});
