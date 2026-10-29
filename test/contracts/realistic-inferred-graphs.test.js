import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { getMarkItems } from "../../src/inspection.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";

const datasets=["tt-penguins","tt-london-marathon-winners","tt-astronauts","tt-us-births","tt-chocolate-ratings"];
const resource=p=>p.semanticSpec.resources.find(r=>r.kind==="graph");
for(const dataset of datasets) for(const rule of ["knn","mst","sequence"]) test(`inferred ${rule} graph preserves ${dataset} records through rendering and revisions`,()=>{
  try {
    const view=realisticRecordView(dataset,{rowLimit:24,groupLimit:6});
    assert.equal(view.provenance.sourceDataset,dataset);assert.ok(view.rows.length>=4);
    // These rules express explicit numeric proximity or source order only.
    // They make no claim about observed links or causation in the dataset.
    const rows=view.rows.map((row,index)=>({id:row.key,value:row.value,category:String(row.category),order:index}));
    const definition=rule==="sequence" ? {rule,options:{orderField:"order",groupBy:["category"]}} :
      {rule,features:["value"],metric:"euclidean",preprocess:"minmax",...(rule==="knn"?{options:{k:2,symmetrize:"union",search:{algorithm:"kd-tree"}}}:{})};
    const p=chart().createData({id:"records",values:rows,keyField:"id"})
      .createInferredGraphData({id:"network",nodeKey:"id",ruleId:"record-links",attributes:["category"],...definition})
      .layoutGraph({id:"placement",method:"circular"}).createCanvas({width:420,height:300})
      .createGraphPlot({labels:{field:"category"}});
    const graph=resource(p), model=graph.result.model, snapshot=serializeProgram(p);
    assert.equal(model.nodes.length,rows.length);
    if(rule==="mst") assert.equal(model.edges.length,rows.length-1);
    assert.ok(model.edges.every(edge=>edge.origin==="inferred"&&edge.ruleId==="record-links"&&Number.isFinite(edge.weight)));
    const items=getMarkItems(p);
    assert.equal(items.length,model.nodes.length+model.edges.length);
    assert.ok(items.every(item=>item.fields.rule===rule&&item.rows.every(row=>row.data==="records")));
    assert.equal(exportAccessibleData(p).views[0].rows.length,items.length);
    const kept = new Set(rows.slice(0, Math.ceil(rows.length / 2)).map(row => row.id));
    const filtered = p.filterMarks({ field: "key", op: "oneOf", values: [...kept] });
    assert.equal(resource(filtered), graph);
    const expected = items.filter(item => item.fields.kind === "node" ? kept.has(item.fields.key)
      : kept.has(item.fields.sourceKey) && kept.has(item.fields.targetKey));
    assert.deepEqual(getMarkItems(filtered).map(item => item.key), expected.map(item => item.key));
    assert.equal(exportAccessibleData(filtered).views[0].rows.length, expected.length);
    assert.deepEqual(filtered.removeMarkFilter().graphicSpec, p.graphicSpec);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(filtered))), renderToSVG(filtered));
    const selected=p.highlightMarks({id:"nodes",target:"graphPlot",select:{field:"kind",op:"eq",value:"node"},stroke:"red"});
    assert.equal(resource(selected),graph);
    const changed=p.reviseData({source:"records",id:"reordered",values:[...rows].reverse()});
    assert.equal(resource(changed).revision,1);
    assert.deepEqual(resource(changed).result.model.edges.map(edge=>edge.key),model.edges.map(edge=>edge.key));
    assert.ok(getMarkItems(changed).every(item=>item.rows.every(row=>row.data==="reordered")));
    const restored=deserializeProgram(serializeProgram(changed));
    assert.deepEqual(restored.semanticSpec,changed.semanticSpec);assert.equal(renderToSVG(restored),renderToSVG(changed));
    assert.equal(serializeProgram(p),snapshot);
  } finally { releaseTidyTuesdaySourceCache(dataset); }
});
