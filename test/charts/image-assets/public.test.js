import test from "node:test";
import assert from "node:assert/strict";
import { render, prepareImageRendering } from "../../../src/index.js";
import { variants } from "./manifest.js";
import { withoutAllocatedIdentity } from "../../support/identity-equivalence.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

for (const variant of variants) test(`image ${variant.variant} preserves literal primitive structure and draw calls`, async () => {
  const actual = variant.userFacing(variant.fixture), expected = variant.primitive(variant.fixture);
  assert.deepEqual(withoutAllocatedIdentity(actual.graphicSpec), withoutAllocatedIdentity(expected.graphicSpec));
  assert.deepEqual(actual.graphicSpec.order, expected.graphicSpec.order);
  const backendImage = {}, contexts = [];
  for (const program of [expected, actual]) {
    const context = createMockCanvasContext();
    context.drawImage = (...args) => context.calls.push({ op: "drawImage", args });
    const images = await prepareImageRendering(program, { decode: () => ({ image: backendImage, width: 200, height: 100, originClean: true }) });
    render(program, context, { images }); contexts.push(context.calls);
  }
  assert.deepEqual(contexts[0], contexts[1]);
  assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(actual))), renderToSVG(actual));
  const image = actual.graphicSpec.objects.image.items[0];
  assert.deepEqual([image.properties.x, image.properties.y, image.properties.width, image.properties.height], variant.fixture.rect);
  assert.deepEqual(image.identity.lineage, { kind: "resource", resource: { kind: "image", id: "logo", revision: 0 } });
  assert.deepEqual(actual.actionStack, []);
});
