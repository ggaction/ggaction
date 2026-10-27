import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../../../src/index.js";
import { assertAtomicFailures } from "../../../support/program-state.js";

function overlappingLabels() {
  return chart()
    .createCanvas({ width: 320, height: 220, margin: 30 })
    .createData({
      values: [
        { x: 1, y: 1, label: "Alpha" },
        { x: 1, y: 1, label: "Beta" }
      ]
    })
    .createPointMark({ id: "points" })
    .encodeX({ target: "points", field: "x" })
    .encodeY({ target: "points", field: "y" })
    .createTextMark({ id: "labels", align: "center", baseline: "middle" })
    .encodeText({ target: "labels", field: "label" });
}

function traceNode(node, op) {
  if (node.op === op) return node;
  for (const child of node.children ?? []) {
    const found = traceNode(child, op);
    if (found !== undefined) return found;
  }
  return undefined;
}

test("lays out one complete text mark through the approved wrapped hierarchy", () => {
  const base = overlappingLabels();
  const semantic = base.semanticSpec;
  const original = base.graphicSpec.objects.labels.items.map(
    item => [item.properties.x, item.properties.y]
  );
  const program = base.layoutLabels({
    target: "labels",
    maxDisplacement: 48,
    leader: { stroke: "#64748b", strokeWidth: 0.8, opacity: 0.9 }
  });
  const config = program.materializationConfigs.labelLayouts.labels;
  const positions = program.graphicSpec.objects.labels.items.map(
    item => [item.properties.x, item.properties.y]
  );

  assert.strictEqual(program.semanticSpec, semantic);
  assert.notDeepEqual(positions, original);
  assert.equal(config.resolution.overlapBefore, 1);
  assert.equal(config.resolution.overlapAfter, 0);
  assert.equal(config.resolution.displaced, 1);
  assert.equal(config.resolution.leaders, 1);
  assert.equal(config.resolution.maximumDisplacement <= 48, true);
  assert.deepEqual(config.resolution.warnings, []);
  assert.equal(program.graphicSpec.objects[config.leaderId].type, "line");
  const leader = program.graphicSpec.objects[config.leaderId].items[0];
  const label = program.graphicSpec.objects.labels.items.find(item => item.identity.key === leader.identity.key);
  assert.ok(label);
  assert.equal(leader.identity.role, "leader");
  assert.deepEqual(leader.identity.lineage, label.identity.lineage);
  assert.notEqual(leader.id, label.id);
  const layout = traceNode(program.trace, "layoutLabels");
  const materialize = traceNode(layout, "materializeLabelLayout");
  assert.ok(materialize);
  assert.ok(traceNode(materialize, "rematerializeTextMark"));
  assert.equal(base.materializationConfigs.labelLayouts, undefined);
  assert.deepEqual(
    base.graphicSpec.objects.labels.items.map(item => [item.properties.x, item.properties.y]),
    original
  );
});

test("replaces policy, replays after text and Canvas edits, and restores base positions", () => {
  const base = overlappingLabels();
  const original = base.graphicSpec.objects.labels.items.map(
    item => [item.properties.x, item.properties.y]
  );
  const first = base.layoutLabels({ target: "labels", leader: {} });
  const replaced = first.layoutLabels({
    target: "labels",
    axis: "x",
    padding: 6,
    maxDisplacement: 60,
    bounds: "canvas"
  });
  assert.deepEqual(
    {
      axis: replaced.materializationConfigs.labelLayouts.labels.axis,
      padding: replaced.materializationConfigs.labelLayouts.labels.padding,
      maxDisplacement:
        replaced.materializationConfigs.labelLayouts.labels.maxDisplacement,
      bounds: replaced.materializationConfigs.labelLayouts.labels.bounds,
      leader: replaced.materializationConfigs.labelLayouts.labels.leader
    },
    {
      axis: "x",
      padding: 6,
      maxDisplacement: 60,
      bounds: "canvas",
      leader: false
    }
  );
  assert.equal(
    replaced.graphicSpec.objects.labels.items.every(
      (item, index) => item.properties.y === original[index][1]
    ),
    true
  );
  const styled = replaced.editTextMark({ target: "labels", fontSize: 16 });
  assert.equal(styled.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
  assert.ok(traceNode(styled.trace.children.at(-1), "materializeLabelLayout"));
  const resized = styled.editCanvas({ width: 420 });
  assert.equal(resized.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
  assert.notDeepEqual(
    resized.graphicSpec.objects.labels.items.map(item => item.properties.x),
    styled.graphicSpec.objects.labels.items.map(item => item.properties.x)
  );

  const restored = first.removeLabelLayout({ target: "labels" });
  assert.equal(restored.materializationConfigs.labelLayouts?.labels, undefined);
  assert.equal(restored.graphicSpec.objects["labels-label-leaders"], undefined);
  assert.deepEqual(
    restored.graphicSpec.objects.labels.items.map(
      item => [item.properties.x, item.properties.y]
    ),
    original
  );
  assert.ok(traceNode(restored.trace.children.at(-1), "rematerializeTextMark"));
});

test("records deterministic best-effort warnings instead of silently succeeding", () => {
  const program = overlappingLabels().layoutLabels({
    target: "labels",
    maxDisplacement: 0,
    padding: 3
  });
  const resolution = program.materializationConfigs.labelLayouts.labels.resolution;
  assert.equal(resolution.overlapAfter, 1);
  assert.deepEqual(resolution.warnings.map(warning => warning.code), ["overlap"]);
  assert.deepEqual(resolution.warnings[0].pairs, [program.graphicSpec.objects.labels.items.map(item => item.id)]);
});

test("replays after text encoding, source filtering, and scale edits", () => {
  const laidOut = overlappingLabels().layoutLabels({
    target: "labels",
    leader: {}
  });
  const encoded = laidOut.encodeText({ target: "labels", value: "Same" });
  assert.equal(encoded.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
  assert.ok(traceNode(encoded.trace.children.at(-1), "materializeLabelLayout"));

  const scaled = encoded.editScale({ id: "x", domain: [0, 4] });
  assert.equal(scaled.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
  assert.notEqual(
    scaled.graphicSpec.objects.labels.items[0].properties.x,
    encoded.graphicSpec.objects.labels.items[0].properties.x
  );

  const filtered = scaled.filterMarks({
    target: "points",
    field: "label",
    op: "eq",
    value: "Alpha"
  });
  assert.equal(filtered.graphicSpec.objects.labels.items.length, 1);
  assert.equal(filtered.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
  assert.equal(filtered.graphicSpec.objects["labels-label-leaders"], undefined);
});

test("converges across action order and constrains y-only displacement", () => {
  const base = overlappingLabels();
  const policy = {
    target: "labels",
    axis: "both",
    padding: 4,
    maxDisplacement: 72,
    leader: { stroke: "#64748b" }
  };
  const configuredFirst = base
    .editTextMark({ target: "labels", fontSize: 15 })
    .editCanvas({ width: 400 })
    .editScale({ id: "x", domain: [0, 4] })
    .layoutLabels(policy);
  const layoutFirst = base
    .layoutLabels(policy)
    .editTextMark({ target: "labels", fontSize: 15 })
    .editCanvas({ width: 400 })
    .editScale({ id: "x", domain: [0, 4] });
  assert.deepEqual(layoutFirst.graphicSpec, configuredFirst.graphicSpec);
  assert.deepEqual(
    layoutFirst.materializationConfigs.labelLayouts.labels,
    configuredFirst.materializationConfigs.labelLayouts.labels
  );

  const original = base.graphicSpec.objects.labels.items.map(
    item => [item.properties.x, item.properties.y]
  );
  const yOnly = base.layoutLabels({
    target: "labels",
    axis: "y",
    maxDisplacement: 48
  });
  assert.equal(yOnly.graphicSpec.objects.labels.items.every(
    (item, index) => item.properties.x === original[index][0]
  ), true);
  assert.equal(yOnly.materializationConfigs.labelLayouts.labels.resolution.overlapAfter, 0);
});

test("infers only a current or unique complete text target", () => {
  const unique = overlappingLabels().layoutLabels();
  assert.ok(unique.materializationConfigs.labelLayouts.labels);

  const ambiguous = overlappingLabels()
    .createTextMark({ id: "other", data: "data" })
    .encodeText({ target: "other", field: "label" })
    .encodeX({ target: "other", field: "x" })
    .encodeY({ target: "other", field: "y" })
    ._withContext({ currentMark: undefined });
  assert.throws(() => ambiguous.layoutLabels(), /target is ambiguous/);
  const incomplete = chart()
    .createCanvas()
    .createData({ values: [{ label: "A" }] })
    .createTextMark({ data: "data" });
  assert.throws(
    () => incomplete.layoutLabels({ target: "text" }),
    /requires a complete text mark/
  );
});

test("validates the complete policy atomically and cleans up with its mark", () => {
  const base = overlappingLabels();
  assertAtomicFailures(base, [
    {
      operation: () => base.layoutLabels({ target: "labels", axis: "radial" }),
      error: /Unsupported label layout axis/
    },
    {
      operation: () => base.layoutLabels({ target: "labels", padding: -1 }),
      error: /must be a non-negative/
    },
    {
      operation: () => base.layoutLabels({
        target: "labels",
        leader: { strokeWidth: -1 }
      }),
      error: /must not be negative/
    },
    {
      operation: () => base.layoutLabels({
        target: "labels",
        leader: { width: 2 }
      }),
      error: /Unknown label leader option/
    },
    {
      operation: () => base.removeLabelLayout({ target: "labels" }),
      error: /Unknown removeLabelLayout/
    }
  ]);

  const laidOut = base.layoutLabels({ target: "labels", leader: {} });
  const removed = laidOut.removeMark({ target: "points" });
  assert.equal(removed.graphicSpec.objects.points, undefined);
  assert.equal(removed.graphicSpec.objects.labels, undefined);
  assert.equal(removed.graphicSpec.objects["labels-label-leaders"], undefined);
  assert.equal(removed.materializationConfigs.labelLayouts?.labels, undefined);
});
