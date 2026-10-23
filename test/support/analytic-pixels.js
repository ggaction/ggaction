import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "../../src/index.js";

/** Differential raster witness: guides alone cannot satisfy this assertion. */
export function assertAnalyticPixels(program, label = "chart") {
  const children = Object.values(program.children ?? {});
  if (children.length) {
    const counts = children.filter(child => (child.semanticSpec?.layers ?? []).some(layer =>
      (child.graphicSpec.objects[layer.id]?.items?.length ?? 0) > 0
    )).map((child, index) => assertAnalyticPixels(child, `${label}/child-${index}`));
    assert.ok(counts.length > 0, `${label} has no populated analytic children`);
    return counts.reduce((sum, value) => sum + value, 0);
  }
  const hidden = structuredClone(program.graphicSpec);
  const layers = program.semanticSpec?.layers ?? [];
  assert.ok(layers.length > 0, `${label} has no analytic layers`);
  for (const layer of layers) {
    const graphic = hidden.objects[layer.id];
    if (!graphic) continue;
    if (graphic.items) graphic.items = [];
    else graphic.properties = { ...graphic.properties, opacity: 0 };
  }
  const actual = createCanvas(1, 1), withoutMarks = createCanvas(1, 1);
  const canvas = Object.values(program.graphicSpec.objects).find(object => object.type === "canvas");
  const { width, height } = canvas.properties;
  // Large category layouts still get a bounded whole-chart raster witness.
  const pixelRatio = Math.min(1, Math.sqrt(4_000_000 / (width * height)), 4096 / width, 4096 / height);
  render(program, actual.getContext("2d"), { pixelRatio });
  render({ graphicSpec: hidden }, withoutMarks.getContext("2d"), { pixelRatio });
  assert.equal(actual.width, withoutMarks.width, label);
  assert.equal(actual.height, withoutMarks.height, label);
  const pixels = actual.getContext("2d").getImageData(0, 0, actual.width, actual.height).data;
  const baseline = withoutMarks.getContext("2d").getImageData(0, 0, actual.width, actual.height).data;
  let changed = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] !== baseline[i] || pixels[i + 1] !== baseline[i + 1] || pixels[i + 2] !== baseline[i + 2] || pixels[i + 3] !== baseline[i + 3]) changed++;
  }
  assert.ok(changed > 0, `${label} analytic marks contribute no visible pixels`);
  return changed;
}
