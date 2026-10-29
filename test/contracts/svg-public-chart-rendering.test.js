import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { prepareShadowRendering } from "../../src/index.js";
import { prepareNativeFonts } from "../../src/renderers/nativeBackend.js";
import { loadDataset } from "../support/data.js";

function chartData(definition) {
  if (definition === undefined) return undefined;
  if (typeof definition === "string") return loadDataset(definition);
  return Object.fromEntries(
    Object.entries(definition).map(([key, dataset]) => [
      key,
      loadDataset(dataset)
    ])
  );
}

test("renders every public chart through the SVG concrete schema", async () => {
  for (const chart of PUBLIC_CHARTS) {
    const program = chart.createProgram(chartData(chart.data));
    const hasShadow = Object.values(program.graphicSpec.objects).some(object =>
      [object, ...(object.items ?? [])].some(item => item.properties?.shadow !== undefined));
    let fonts, shadows, svg;
    try {
      if (hasShadow) {
        fonts = await prepareNativeFonts(program, GlobalFonts);
        shadows = await prepareShadowRendering(program, { createCanvas, fonts });
      }
      svg = renderToSVG(program, { title: chart.id, ...(shadows ? { shadows } : {}) });
    } finally { shadows?.dispose(); fonts?.dispose(); }
    assertSvgIntegrity(svg, chart.id);

    assert.match(
      svg,
      new RegExp(
        `^<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="${chart.width}" height="${chart.height}" ` +
        `viewBox="0 0 ${chart.width} ${chart.height}"(?: style="isolation:isolate")?>`
      ),
      chart.id
    );
    assert.match(svg, /<(?:circle|rect|line|path|text)\b/, chart.id);
    assert.match(svg, new RegExp(`<title>${chart.id}</title>`), chart.id);
    assert.equal(svg.endsWith("</svg>"), true, chart.id);
    const hasBlend = Object.values(program.graphicSpec.objects).some(object =>
      [object, ...(object.items ?? [])].some(item => ["multiply", "screen", "difference"].includes(item.properties?.blend)));
    assert.equal(svg.includes('style="isolation:isolate"'), hasBlend, chart.id);
  }
});
