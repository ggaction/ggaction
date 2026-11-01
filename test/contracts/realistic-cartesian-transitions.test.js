import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { tidyTuesdaySourceRows, tidyTuesdayFixtureReport, releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const sources=[{id:"tt-us-births",field:"births"},{id:"tt-trash-wheel",field:"Weight"},
  {id:"tt-stock-prices",field:"volume",eligible:row=>row.stock_symbol==="AAPL"},{id:"tt-animal-rescues",field:"incident_notional_cost"},{id:"tt-movie-profit",field:"production_budget"}];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const source of sources)test(`${source.id} retains original units through conditional, overlay and density transition recipes`,()=>{
  try {
    const original=tidyTuesdaySourceRows(source.id);assert.match(tidyTuesdayFixtureReport(source.id).sha256,/^[a-f0-9]{64}$/);
    // The same declared cohort in all recipes: twelve first positive original
    // observations, no rescaling or invented measurement columns.
    const rows=original.flatMap((row,index)=>Number.isFinite(row[source.field])&&row[source.field]>0&&(!source.eligible||source.eligible(row))?[{...row,sourceRowIndex:index}]:[]).slice(0,12);
    assert.equal(rows.length,12);const max=Math.max(...rows.map(row=>row[source.field]));
    const base=()=>chart().createCanvas({width:400,height:400,margin:40}).createData({id:"raw",values:rows,keyField:"sourceRowIndex"});
    const binding={field:source.field,fieldType:"quantitative",scale:{id:"x",domain:[0,max],nice:false}};
    const rule=base().createRuleMark({id:"m"}).encodeX({conditions:[{when:{version:2,registry:"standard@1",root:{type:"literal",value:false}},value:binding}],otherwise:binding});
    const overlay=base().createBarMark({id:"m"}).encodeX({field:"sourceRowIndex",fieldType:"nominal"}).encodeY({field:source.field,aggregate:"sum",scale:{domain:[0,max],nice:false}}).createOverlay({id:"overlay",source:"m",type:"point"});
    const density=base().createDensityPlot({id:"m",field:source.field,bandwidth:max/12,extent:[0,max],steps:12,guides:false}).editScale({id:"x",domain:[0,max],nice:false});
    for(const [recipe,from] of [["conditional",rule],["overlay",overlay],["density",density]]) {
      const to=recipe==="density"?from.editCanvas({width:600}):from.editScale({id:recipe==="conditional"?"x":"y",domain:[0,max*2]});
      const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),frame=sampleTransition(plan,50);
      const decisions=frame.decisions.flatMap((decision,index)=>decision.kernel==="cartesian-geometry"?[{decision,node:frame.scene.nodes[index]}]:[]);assert.ok(decisions.length);
      if(recipe==="conditional")decisions.forEach(({node},i)=>{close(node.properties.x1,40+320*rows[i][source.field]/(1.5*max));assert.equal(node.properties.x1,node.properties.x2);});
      if(recipe==="overlay")decisions.filter(({node})=>node.type==="circle").forEach(({node},i)=>close(node.properties.y,360-320*rows[i][source.field]/(1.5*max)));
      if(recipe==="density") {
        const commands=decisions[0].node.properties.commands;
        assert.equal(commands[0].x,40);assert.equal(commands.at(-2).x,460);
        for(let i=0;i<12;i++)close(commands[i+1].x,40+420*i/11);
      }
      for(const time of [0,25,50,75,100])assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,time),sampleTransition(plan,time));
      assertSvgIntegrity(renderToSVG(frame),`${source.id}/${recipe}`);
      assert.deepEqual(from.semanticSpec.datasets.find(data=>data.id==="raw").values,rows);
    }
    rows.forEach(row=>assert.equal(row[source.field],original[row.sourceRowIndex][source.field]));
  }finally{releaseTidyTuesdaySourceCache(source.id);}
});
