import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { structuredPaintRecordBase, structuredPaintVariants } from "../support/scenarios/structured-paints.js";

const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const recipes = {
  records: [
    ["point", p => p.encodeX({ field: "index" }).encodeY({ field: "value" })],
    ["text", p => p.encodeX({ field: "index" }).encodeY({ field: "value" }).encodeText({ field: "category" })]
  ],
  intervals: [
    ["rect", p => p.encodeXRange({ lower: "index", upper: "end" }).encodeYRange({ lower: { datum: 0 }, upper: "magnitude" })],
    ["area", p => p.encodeX({ field: "index" }).encodeYRange({ lower: { datum: 0 }, upper: "magnitude" }).layoutSeries({ mode: "overlay" })]
  ],
  summaries: [
    ["bar", p => p.encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field: "magnitude", aggregate: "sum" })],
    ["arc", p => p.encodeTheta({ field: "category", aggregate: "count" })]
  ]
};

for (const dataset of datasets) for (const [recipe, owners] of Object.entries(recipes)) {
  test(`structured paint ${recipe} preserves source grain and lifecycle on ${dataset}`, () => {
    try {
      const { rows, provenance, program: base } = structuredPaintRecordBase(dataset);
      assert.equal(provenance.sourceDataset, dataset);
      assert.match(provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u);
      assert.ok(rows.length >= 8);
      for (const [owner, encode] of owners) {
        const suffix = owner[0].toUpperCase() + owner.slice(1), create = `create${suffix}Mark`, edit = `edit${suffix}Mark`;
        const plain = encode(base[create]({ id: "marks" }));
        const lineage = plain.graphicSpec.objects.marks.items.map(item => item.identity);
        for (const [index, variant] of structuredPaintVariants.entries()) {
          const fill = variant.fill.type === "pattern" ? { ...variant.fill, coordinateSpace: index % 2 ? "object" : "plot" } : variant.fill;
          const created = encode(base[create]({ id: "marks", fill, opacity: variant.opacity }));
          const edited = plain[edit]({ target: "marks", fill, opacity: variant.opacity });
          assert.deepEqual(created.graphicSpec.objects.marks.items.map(item => item.properties), edited.graphicSpec.objects.marks.items.map(item => item.properties));
          assert.deepEqual(edited.graphicSpec.objects.marks.items.map(item => item.identity), lineage);
          assert.ok(edited.graphicSpec.objects.marks.items.every(item => item.properties.fill.type === fill.type));
          const snapshot = serializeProgram(edited), resized = edited.editCanvas({ width: 400 });
          assert.equal(serializeProgram(edited), snapshot);
          assertGraphicIntegrity(resized, `${dataset}/${recipe}/${owner}/${variant.id}`);
          const svg = renderToSVG(resized); assertSvgIntegrity(svg, `${dataset}/${owner}/${variant.id}`);
          assert.match(svg, fill.type === "pattern" ? /<pattern/ : fill.type === "linear-gradient" ? /<linearGradient/ : /<radialGradient/);
          assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
        }
        assert.ok(plain.graphicSpec.objects.marks.items.every(item => typeof item.properties.fill === "string"));
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
