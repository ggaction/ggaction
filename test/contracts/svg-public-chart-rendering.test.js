import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { renderToSVG } from "../../src/renderers/svg.js";
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

test("renders every public chart through the SVG concrete schema", () => {
  for (const chart of PUBLIC_CHARTS) {
    const program = chart.createProgram(chartData(chart.data));
    const svg = renderToSVG(program, { title: chart.id });

    assert.match(
      svg,
      new RegExp(
        `^<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="${chart.width}" height="${chart.height}" ` +
        `viewBox="0 0 ${chart.width} ${chart.height}">`
      ),
      chart.id
    );
    assert.match(svg, /<(?:circle|rect|line|path|text)\b/, chart.id);
    assert.match(svg, new RegExp(`<title>${chart.id}</title>`), chart.id);
    assert.equal(svg.endsWith("</svg>"), true, chart.id);
  }
});
