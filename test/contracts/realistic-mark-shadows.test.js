import assert from "node:assert/strict";
import test from "node:test";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
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
  test(`mark shadow ${recipe} retains source grain and complete effect options on ${dataset}`, () => {
    try {
      const { rows, provenance, program: base } = structuredPaintRecordBase(dataset);
      assert.equal(provenance.sourceDataset,dataset);assert.match(provenance.sourceSelectionSha256,/^[a-f0-9]{64}$/u);assert.ok(rows.length>=8);
      const shadow = { color: recipe === "vertical" ? "blue" : "rgba(20,40,60,.5)", offsetX: recipe === "horizontal" ? -3 : 2,
        offsetY: recipe === "magnitude" ? -2 : 3, blurRadius: recipe === "vertical" ? 0 : 2 };
      for (const owner of owners) {
        const suffix=owner[0].toUpperCase()+owner.slice(1),create=`create${suffix}Mark`,edit=`edit${suffix}Mark`;
        const plain=encode(base[create]({id:"marks"}),owner,recipe),created=encode(base[create]({id:"marks",shadow}),owner,recipe);
        const edited=plain[edit]({target:"marks",shadow}),items=edited.graphicSpec.objects.marks.items;
        assert.ok(items.length>0);assert.ok(items.every(item=>JSON.stringify(item.properties.shadow)===JSON.stringify(shadow)));
        assert.deepEqual(items.map(item=>item.identity),plain.graphicSpec.objects.marks.items.map(item=>item.identity));
        assert.deepEqual(items.map(item=>item.properties),created.graphicSpec.objects.marks.items.map(item=>item.properties));
        const before=serializeProgram(edited),resized=edited.editCanvas({width:390});
        assertGraphicIntegrity(resized,`${dataset}/${recipe}/${owner}`);
        assert.ok(resized.graphicSpec.objects.marks.items.every(item=>item.properties.shadow.blurRadius===shadow.blurRadius));
        assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec,resized.graphicSpec);
        assert.deepEqual(edited[edit]({target:"marks",shadow:false}).graphicSpec,plain.graphicSpec);
        assert.equal(serializeProgram(edited),before);
      }
      const field=recipe==="magnitude"?"magnitude":"value",orientation=recipe==="horizontal"?"horizontal":"vertical";
      const labels={value:"Label",shadow,outline:{color:"white",width:2}};
      for(const q of [base.createDotPlot({category:"category",value:field,summary:"mean",orientation,guides:false,labels}),
        base.createLollipopPlot({category:"category",value:field,summary:"mean",orientation,guides:false,labels,stem:{shadow}}),
        base.createDumbbellPlot({category:"category",start:"index",end:field,summary:"mean",orientation,guides:false,labels,connector:{shadow}}),
        base.createECDFPlot({field,guides:false,labels}),base.createTextPlot({x:"index",y:field,text:"category",style:{shadow},guides:false})]) {
        const texts=q.semanticSpec.layers.filter(layer=>layer.mark.type==="text");assert.ok(texts.length>0);
        for(const text of texts)assert.ok(q.graphicSpec.objects[text.id].items.every(item=>item.properties.shadow.offsetX===shadow.offsetX));
        assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
      }
    } finally { releaseTidyTuesdaySourceCache(dataset); }
  });
}
