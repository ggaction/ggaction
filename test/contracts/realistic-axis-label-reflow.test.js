import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation } from "../../src/animation.js";
import { serializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows,tidyTuesdayFixtureReport,releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";

const sources=[{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},{id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},{id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
for(const source of sources)test(`${source.id} reflows actual raw guide values at the current native viewport`,()=>{
  try{
    const original=tidyTuesdaySourceRows(source.id);assert.match(tidyTuesdayFixtureReport(source.id).sha256,/^[a-f0-9]{64}$/);
    // Original source units and rows; only an explicit first-twelve positive
    // cohort and source row index are used for stable public item identity.
    const rows=original.flatMap((row,index)=>Number.isFinite(row[source.field])&&row[source.field]>0&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index}]:[]).slice(0,12);
    assert.equal(rows.length,12);const max=Math.max(...rows.map(row=>row[source.field])),values=[...new Set(rows.map(row=>row[source.field]))].slice(0,3);
    const from=chart().createCanvas({width:400,height:400,margin:80,responsive:{minPlotSize:{width:40,height:40}}})
      .createData({id:"raw",values:rows,keyField:"sourceRowIndex"}).createPointMark({id:"points"})
      .encodeX({field:source.field,scale:{domain:[0,max],nice:false}}).encodeY({field:"sourceRowIndex"})
      .createXAxis({title:{text:source.field,offset:{from:"labels",gap:8}},ticksAndLabels:{values,labels:{fontSize:10,maxWidth:30,wrap:"character",responsive:{maxLines:6},labelMap:values.map(value=>({value,label:String(value)}))}}});
    const before=serializeProgram(from),to=from.editCanvas({width:800}),plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),frame=sampleTransition(plan,50);
    const indices=frame.decisions.flatMap((d,i)=>d.kernel==="native-axis-label"?[i]:[]);assert.ok(indices.length>0);
    const native=from.editCanvas({width:600});
    assert.deepEqual(indices.map(i=>frame.scene.nodes[i].properties),native.graphicSpec.objects.xAxisLabels.items.map(node=>Object.fromEntries(Object.entries({...node.properties,fontWeight:400}).filter(([key,value])=>key!=="rotation"||value!==0))));
    assert.ok(frame.decisions.some(d=>d.role==="guide-title"&&d.kernel==="guide-geometry"));
    const titleIndex=frame.decisions.findIndex(d=>d.role==="guide-title");assert.deepEqual([frame.scene.nodes[titleIndex].properties.x,frame.scene.nodes[titleIndex].properties.y],[native.graphicSpec.objects.xAxisTitle.properties.x,native.graphicSpec.objects.xAxisTitle.properties.y]);
    for(const i of indices){const raw=JSON.parse(frame.decisions[i].guideKey)[4];assert.ok(values.includes(raw));assert.ok(Math.abs(frame.scene.nodes[i].properties.x-(80+440*raw/max))<1e-9);}
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
    const rebased=planTransition({from:frame,to,options:{durationMs:100,easing:"linear"}});assert.strictEqual(sampleTransition(rebased,0),frame);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan,50),sampleTransition(rebased,50));
    assertSvgIntegrity(renderToSVG(frame),source.id);assert.equal(serializeProgram(from),before);
    assert.deepEqual(from.semanticSpec.datasets.find(data=>data.id==="raw").values,rows);
    for(const row of rows)assert.equal(row[source.field],original[row.sourceRowIndex][source.field]);
  }finally{releaseTidyTuesdaySourceCache(source.id);}
});
