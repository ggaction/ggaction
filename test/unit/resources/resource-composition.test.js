import test from "node:test";
import assert from "node:assert/strict";
import { resourceComparisonFamilies, resourceComparisonRows, createResourceComparison, reviseResourceComparison } from "../../../examples/program-composition/resource-comparison.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

const items = p => getMarkItems(p, { target: "values" });
const sourceItems = (p, family) => getMarkItems(p, { target: "plot" }).filter(item => family !== "graph-nodes" || item.fields.kind === "node");
const labels = (p, id) => p.graphicSpec.objects[id].items.map(item => item.properties.text);
const ticks = p => p.graphicSpec.objects.xAxisTicks.items.map(item => item.properties.x1);
const dataset = (p, id) => p.semanticSpec.datasets.find(value => value.id === id);

for (const family of resourceComparisonFamilies) {
  test(`${family} pairs typed source values with an independently editable analytical scale and guide`, () => {
    const original = createResourceComparison(family), saved = serializeProgram(original), trace = original.trace;
    const structure = original.children.structure, analysis = original.children.analysis, rows = resourceComparisonRows(family);
    const native = sourceItems(structure, family), points = items(analysis);
    assert.deepEqual(native.map(item => item.rows[0].rowKey), points.map(item => item.rows[0].rowKey));
    assert.equal(new Set(points.map(item => item.rows[0].rowKey)).size, rows.length);
    assert.deepEqual(points.map(item => item.fields.id), rows.map(row => row.id));
    assert.ok(points.some(item => item.fields.id === 1)); assert.ok(points.some(item => item.fields.id === "1"));
    assert.deepEqual(points.map(item => item.properties.x), rows.map(row => 40 + 30 * row.amount));
    assert.deepEqual(labels(analysis, "colorLegendLabels"), ["A", "B"]);
    assert.deepEqual(ticks(analysis), [40, 190, 340]);
    assert.deepEqual(structure.semanticSpec.scales, []);
    assert.deepEqual(structure.semanticSpec.guides, {});

    const mapped = original.encodeColor({ target: { childPath: ["analysis"], id: "values" }, field: "alternative" });
    assert.equal(mapped.children.structure, structure);
    assert.equal(mapped.children.structure.graphicSpec, structure.graphicSpec);
    assert.equal(mapped.children.structure.semanticSpec.resources, structure.semanticSpec.resources);
    assert.deepEqual(items(mapped.children.analysis).map(item => item.channels.color), rows.map(row => row.alternative));
    assert.deepEqual(items(mapped.children.analysis).map(item => item.properties.fill), rows.map(row => row.alternative === "B" ? "#dc2626" : "#2563eb"));
    assert.deepEqual(labels(mapped.children.analysis, "colorLegendLabels"), ["B", "A"]);
    assert.equal(mapped.children.analysis.semanticSpec.guides.legend.color.title, "alternative");

    // The path selects the unit; editScale keeps its native `id` option.
    const scaled = mapped.editScale({ target: { childPath: ["analysis"] }, id: "measure", domain: [0, 20] });
    assert.equal(scaled.children.structure, structure);
    assert.deepEqual(items(scaled.children.analysis).map(item => item.properties.x), rows.map(row => 40 + 15 * row.amount));
    assert.deepEqual(ticks(scaled.children.analysis), [40, 115, 190]);
    assert.deepEqual(labels(scaled.children.analysis, "xAxisLabels"), ["0", "5", "10"]);
    const onlyAnalysis = scaled.reviseData({ target: { childPath: ["analysis"] }, source: "data", id: "analysisOnly", values: rows.map(row => ({ ...row, amount: row.amount * 2 })) });
    assert.equal(onlyAnalysis.children.structure, structure, "equal row keys do not implicitly synchronize retained children");

    const revised = reviseResourceComparison(scaled, family), resourceChild = revised.children.structure, analyticalChild = revised.children.analysis;
    const expected = rows.map((row, index) => ({ ...row, amount: row.amount * 2, alternative: index === rows.length - 1 ? "C" : row.alternative }));
    for (const [id, child] of Object.entries(revised.children)) {
      const next = dataset(child, "updated"), previous = dataset(original.children[id], "data");
      assert.deepEqual(next.values, expected); assert.deepEqual(next.rowKeys, previous.rowKeys);
      assert.equal(next.logicalId, previous.logicalId); assert.equal(next.revision, 1);
    }
    assert.deepEqual(resourceChild.semanticSpec.resources.map(resource => [resource.id, resource.revision]), [["model", 1], ["layout", 1]]);
    assert.deepEqual(sourceItems(resourceChild, family).map(item => family === "graph-nodes" ? item.fields["attribute:amount"] : item.fields.value), expected.map(row => row.amount));
    assert.deepEqual(sourceItems(resourceChild, family).map(item => item.key), native.map(item => item.key));
    assert.deepEqual(sourceItems(resourceChild, family).map(item => [item.rows[0].data, item.rows[0].revision, item.rows[0].rowKey]),
      items(analyticalChild).map(item => [item.rows[0].data, item.rows[0].revision, item.rows[0].rowKey]));
    assert.deepEqual(items(analyticalChild).map(item => item.properties.x), points.map(item => item.properties.x));
    assert.deepEqual(labels(analyticalChild, "colorLegendLabels"), family === "sankey-dag" ? ["B", "C"] : ["B", "A", "C"]);
    assert.equal(revised.trace.children.at(-1).op, "reviseData");
    const restored = deserializeProgram(serializeProgram(revised));
    assert.deepEqual(restored.graphicSpec, revised.graphicSpec);
    for (const id of ["structure", "analysis"]) assert.deepEqual(restored.children[id].semanticSpec, revised.children[id].semanticSpec);
    assert.equal(serializeProgram(original), saved); assert.equal(original.trace, trace);
  });

  test(`${family} rejects an invalid resource revision after a valid analytical candidate without publishing either`, () => {
    const original = createResourceComparison(family), saved = serializeProgram(original), trace = original.trace;
    const values = resourceComparisonRows(family).map((row, index) => index !== 1 ? row : family.startsWith("sankey-")
      ? { ...row, target: "missing" } : family === "graph-nodes" ? { ...row, id: "missing" } : { ...row, parent: "missing" });
    const input = structuredClone(values);
    assert.doesNotThrow(() => original.children.analysis.reviseData({ source: "data", id: "candidate", values }));
    assert.throws(() => original.reviseData({ target: [{ childPath: ["analysis"] }, { childPath: ["structure"] }], source: "data", id: "candidate", values }),
      family.startsWith("sankey-") || family === "graph-nodes" ? /endpoints must reference existing nodes/ : /parent key is absent/);
    assert.equal(serializeProgram(original), saved); assert.equal(original.trace, trace);
    assert.deepEqual(values, input);
  });
}
