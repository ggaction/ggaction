import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { withPreviewDatasetValues } from "../../src/actions/primitives/semanticAction.js";
import { cloneAndFreeze } from "../../src/core/immutable.js";

test("preview shares owned unrelated rows while isolating caller-owned updates", () => {
  const source = chart().createData({ id: "large", values: [{ x: 1 }] })
    .createData({ id: "small", values: [{ x: 2 }] });
  const values = [{ x: 3 }];
  const preview = withPreviewDatasetValues(source, { id: "small", values });
  assert.equal(preview.semanticSpec.datasets[0], source.semanticSpec.datasets[0]);
  assert.equal(preview.semanticSpec.layers, source.semanticSpec.layers);
  assert.notEqual(preview.semanticSpec.datasets[1].values, values);
  values[0].x = 99;
  assert.equal(preview.semanticSpec.datasets[1].values[0].x, 3);
  assert.equal(source.semanticSpec.datasets[1].values[0].x, 2);
  const external = Object.freeze({ nested: { x: 1 } });
  const owned = cloneAndFreeze(external);
  external.nested.x = 2;
  assert.equal(owned.nested.x, 1);
  assert.equal(cloneAndFreeze({ owned }).owned, owned);
});

test("data-only actions preserve every themed visual branch and later styling works", () => {
  const source = chart().createCanvas().createData({ values: [{ x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false }).applyTheme({ theme: "dark" });
  const next = source.createData({ id: "other", values: [{ x: 9 }] });
  assert.equal(next.graphicSpec, source.graphicSpec);
  assert.equal(next.materializationConfigs, source.materializationConfigs);
  assert.equal(next.semanticSpec.layers, source.semanticSpec.layers);
  assert.equal(next.trace.children.at(-1).op, "createData");
  const styled = next.editPointMark({ fill: "red" });
  const mark = styled.graphicSpec.objects.scatterPlot;
  assert.equal(mark.items[0].properties.fill, "red");
  assert.notEqual(styled.graphicSpec, source.graphicSpec);
});
