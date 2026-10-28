import assert from "node:assert/strict";
import test from "node:test";
import { renderToSVG } from "../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { structuredPaintRecordBase } from "../support/scenarios/structured-paints.js";
const datasets = ["tt-penguins", "tt-london-marathon-winners", "tt-astronauts", "tt-us-births", "tt-chocolate-ratings"];
const owners = ["point", "bar", "rect", "area", "arc", "text", "line", "rule", "tick"];
function encode(p, owner, recipe) {
  const horizontal = recipe === "horizontal", field = recipe === "magnitude" ? "magnitude" : "value";
  const x = horizontal ? field : "index", y = horizontal ? "index" : field;
  if (owner === "arc") return p.encodeTheta({ field: "category", aggregate: "count" }).editArcMark({ innerRadius: recipe === "horizontal" ? .3 : 0 });
  if (owner === "bar") return horizontal ? p.encodeY({ field: "category", fieldType: "nominal" }).encodeX({ field, aggregate: "sum" })
    : p.encodeX({ field: "category", fieldType: "nominal" }).encodeY({ field, aggregate: "sum" });
  if (owner === "rect") return p.encodeXRange({ lower: "index", upper: "end" }).encodeYRange({ lower: { datum: 0 }, upper: field });
  if (owner === "area" || owner === "rule") return p.encodeX({ field: x, fieldType: "quantitative" })
    .encodeYRange({ lower: { datum: 0 }, upper: y, fieldType: "quantitative" });
  p = p.encodeX({ field: x }).encodeY({ field: y });
  return owner === "text" ? p.encodeText({ field: "category" }) : p;
}
for (const dataset of datasets) for (const recipe of ["vertical", "horizontal", "magnitude"]) {
  test(`mark blend ${recipe} retains source grain and exact mode across all owners on ${dataset}`, () => {
    try {
      const { rows, provenance, program: base } = structuredPaintRecordBase(dataset);
      assert.equal(provenance.sourceDataset, dataset); assert.match(provenance.sourceSelectionSha256, /^[a-f0-9]{64}$/u); assert.ok(rows.length >= 8);
      for (const owner of owners) {
        const suffix = owner[0].toUpperCase() + owner.slice(1), create = `create${suffix}Mark`, edit = `edit${suffix}Mark`;
        const options = {};
        const plain = encode(base[create]({ id: "marks", ...options }), owner, recipe);
        assert.ok(plain.graphicSpec.objects.marks.items.length > 0);
        const identities = plain.graphicSpec.objects.marks.items.map(item => item.identity);
        for (const blend of ["normal", "multiply", "screen", "difference"]) {
          const created = encode(base[create]({ id: "marks", blend, ...options }), owner, recipe), edited = plain[edit]({ target: "marks", blend });
          assert.deepEqual(created.graphicSpec.objects.marks.items.map(item => item.properties), edited.graphicSpec.objects.marks.items.map(item => item.properties));
          assert.deepEqual(edited.graphicSpec.objects.marks.items.map(item => item.identity), identities);
          assert.equal(edited.trace.children.at(-1).args.blend, blend);
          assert.ok(edited.graphicSpec.objects.marks.items.every(item => item.properties.blend === (blend === "normal" ? undefined : blend)));
          const before = serializeProgram(edited), resized = edited.editCanvas({ width: 390 });
          assertGraphicIntegrity(resized, `${dataset}/${recipe}/${owner}`); const svg = renderToSVG(resized); assertSvgIntegrity(svg, `${dataset}/${recipe}/${owner}`);
          if (blend !== "normal") assert.match(svg, new RegExp(`mix-blend-mode:${blend}`));
          assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
          assert.deepEqual(edited[edit]({ blend: "normal" }).graphicSpec, plain.graphicSpec);
          assert.equal(serializeProgram(edited), before);
        }
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
