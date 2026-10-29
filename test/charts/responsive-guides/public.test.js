import test from "node:test";
import assert from "node:assert/strict";
import { createResponsiveGuides } from "../../../examples/responsive-guides/program.js";
import { createResponsiveGuidesPrimitive } from "./primitive.program.js";
import { withoutAllocatedIdentity } from "../../support/identity-equivalence.js";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene } from "../../../src/scene.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";

test("fixed Canvas responsive bars equal the literal primitive and retain independent plot geometry", () => {
  const p = createResponsiveGuides(), primitive = createResponsiveGuidesPrimitive();
  assert.deepEqual(withoutAllocatedIdentity(p.graphicSpec), withoutAllocatedIdentity(primitive.graphicSpec));
  const plot = p.materializationConfigs.canvas.responsiveResult.snapshot.plot;
  assert.deepEqual(plot, { left: 58.5, right: 380, top: 20, bottom: 258.5 });
  p.graphicSpec.objects.barPlot.items.forEach((item, i) => {
    const box = item.properties;
    assert.equal(box.x + box.width / 2, 58.5 + (i + 0.5) * 321.5 / 4);
    assert.equal(box.height, (i + 1) * 238.5 / 4);
  });
  assert.equal(p.graphicSpec.objects.xAxisLabels.items.length, 8);
  const contexts = [createMockCanvasContext(), createMockCanvasContext()];
  render(p, contexts[0]); render(primitive, contexts[1]);
  assert.deepEqual(contexts[0].calls, contexts[1].calls);
  assert.equal(renderToSVG(p, { resourceNamespace: "same" }), renderToSVG(primitive, { resourceNamespace: "same" }));
  assert.deepEqual(createTransitionScene(deserializeGraphic(serializeGraphic(p)), { format: "canvas" }),
    createTransitionScene(p, { format: "canvas" }));
});
