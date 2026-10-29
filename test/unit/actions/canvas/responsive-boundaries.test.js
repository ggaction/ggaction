import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";
import { getErrorDetails } from "../../../../src/core/diagnostics.js";
import { withResponsiveLayout } from "../../../../src/materialization/responsiveLayout.js";
import { guideCanvasProperties } from "../../../../src/materialization/guides/canvas.js";

test("measured guide Canvas values are private and prior transient context is restored", () => {
  assert.equal(guideCanvasProperties(chart()), undefined);
  const native = chart().createCanvas();
  assert.equal(guideCanvasProperties(native), native.graphicSpec.objects.canvas.properties);
  assert.equal(guideCanvasProperties(native._withContext({ responsiveMeasuring: true })).deferCanvasFit, true);
  assert.equal(native.graphicSpec.objects.canvas.properties.deferCanvasFit, undefined);
  const source = chart().createCanvas({ responsive: {} })._withContext({
    responsivePlot: { left: 80, right: 500, top: 40, bottom: 300 }, responsiveMeasuring: false,
    deferGuideLayoutValidation: false
  });
  const result = withResponsiveLayout(source, candidate => candidate);
  assert.deepEqual(result.context, source.context);
  assert.throws(() => serializeProgram(result), /calculation context/);
});

test("unbounded title ink rejects before a nonpositive next plot is constructed", () => {
  const source = chart().createCanvas({ width: 400, height: 320, margin: 20, responsive: {} });
  const before = serializeProgram(source);
  assert.throws(() => source.createTitle({ text: "W".repeat(1000) }), error => {
    const details = getErrorDetails(error);
    assert.equal(details.reason, "layout-unsatisfied");
    assert.equal(details.layout.reason, "insufficient-space");
    assert.ok(details.layout.requiredBounds.right - details.layout.requiredBounds.left > 400);
    return true;
  });
  assert.equal(serializeProgram(source), before);
});

test("label fallback exhaustion retains the last measured bounds and never truncates lines", () => {
  const source = chart().createCanvas({ width: 400, height: 320, margin: 20, responsive: {} })
    .createData({ values: [{ x: "one\ntwo\nthree", y: 1 }] })
    .createBarPlot({ x: "x", y: "y", guides: false });
  const before = serializeProgram(source);
  assert.throws(() => source.createXAxisLabels({ responsive: { maxLines: 1 } }), error => {
    const details = getErrorDetails(error);
    assert.equal(details.reason, "layout-unsatisfied");
    assert.equal(details.layout.reason, "label-lines");
    assert.ok(details.layout.requiredBounds);
    return true;
  });
  assert.equal(serializeProgram(source), before);
});
