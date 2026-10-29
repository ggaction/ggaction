import assert from "node:assert/strict";
import test from "node:test";
import { getMarkItems } from "../../src/inspection.js";
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
function resourceEffectWitnesses(base, rows, recipe, shadow) {
  const outline = { color: "white", width: recipe === "magnitude" ? 4 : 2 };
  for (const kind of ["tree", "treemap", "partition", "graph", "flow-node", "flow-link"]) {
    let p = base;
    const role = kind === "tree" || kind === "graph" || kind === "flow-node" ? "nodes" : kind === "flow-link" ? "links" : "cells";
    const suffix = { tree: "TreePlot", treemap: "TreemapPlot", partition: "PartitionPlot", graph: "GraphPlot", "flow-node": "FlowNodes", "flow-link": "FlowLinks" }[kind];
    if (["graph", "flow-node", "flow-link"].includes(kind)) {
      const edges = rows.slice(1).map((row, index) => ({ id: row.key, from: rows[index].key, to: row.key, value: row.magnitude }));
      p = p.createData({ id: "edges", values: edges, keyField: "id" });
      const binding = { id: "network", nodes: "rows", edges: "edges", nodeKey: "key", source: "from", target: "to", edgeKey: "id" };
      p = kind === "graph" ? p.createGraphData(binding).layoutGraph({ id: "layout", method: "circular", options: { radius: 70 } })
        : p.createFlowData({ ...binding, value: "value", balance: "allow" }).layoutFlow({ id: "layout", method: "dag", options: { nodePadding: 1, iterations: 0, orientation: recipe === "horizontal" ? "horizontal" : "vertical" } });
    } else {
      p = p.createHierarchyData({ id: "hierarchy", groupFields: ["category", "key"], value: "magnitude" })
        .layoutHierarchy({ id: "layout", method: kind, ...(kind === "partition" ? {} : { options: kind === "tree"
          ? { orientation: recipe === "horizontal" ? "horizontal" : "vertical", nodeSize: [3, 3], siblingGap: 1, depthGap: 25 }
          : { size: [250, 160], padding: 1, method: "squarify" } }) });
    }
    const withLabels = kind !== "flow-link";
    const plain = p[`create${suffix}`]({ id: "resource-plot", ...(withLabels ? { labels: {} } : {}) });
    const before = serializeProgram(plain), keys = getMarkItems(plain, { target: "resource-plot" }).map(item => item.key);
    const styled = plain[`edit${suffix}`]({ target: "resource-plot", [role]: { shadow, outline }, ...(withLabels ? { labels: { shadow, outline } } : {}) });
    assert.equal(styled.semanticSpec.resources, plain.semanticSpec.resources, `${kind} style keeps layout resources`);
    const restored = deserializeProgram(serializeProgram(styled)).editCanvas({ width: 410 });
    assert.deepEqual(getMarkItems(restored, { target: "resource-plot" }).map(item => item.key), keys);
    const children = restored.graphicSpec.objects["resource-plot"].items.filter(item => item.identity.role !== "link" && (kind !== "graph" || ["circle", "text"].includes(item.type)));
    assert.ok(children.length > 0);
    assert.ok(children.every(item => JSON.stringify(item.properties.shadow) === JSON.stringify(shadow) && item.properties.outline.width === outline.width), kind);
    const removed = restored[`edit${suffix}`]({ target: "resource-plot", [role]: { shadow: false, outline: false }, ...(withLabels ? { labels: { shadow: false, outline: false } } : {}) });
    assert.ok(removed.graphicSpec.objects["resource-plot"].items.every(item => item.properties.shadow === undefined && item.properties.outline === undefined));
    assert.deepEqual(deserializeProgram(serializeProgram(removed)).graphicSpec, removed.graphicSpec);
    assert.equal(serializeProgram(plain), before);
  }
}
for (const dataset of datasets) for (const recipe of ["vertical", "horizontal", "magnitude"]) {
  test(`mark shadow ${recipe} retains source grain and complete effect options on ${dataset}`, () => {
    try {
      const { rows, provenance, program: base } = structuredPaintRecordBase(dataset);
      assert.equal(provenance.sourceDataset,dataset);assert.match(provenance.sourceSelectionSha256,/^[a-f0-9]{64}$/u);assert.ok(rows.length>=8);
      const shadow = { color: recipe === "vertical" ? "blue" : "rgba(20,40,60,.5)", offsetX: recipe === "horizontal" ? -3 : 2,
        offsetY: recipe === "magnitude" ? -2 : 3, blurRadius: recipe === "vertical" ? 0 : 2 };
      resourceEffectWitnesses(base, rows, recipe, shadow);
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
