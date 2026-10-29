import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { signedPolygonArea } from "../oracles/geometry.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
const datasets=["tt-tv-ratings","tt-space-launches","tt-big-mac","tt-world-cup-matches","tt-stock-prices"];
// Dense width and pointed layouts can exhaust both the inscribed label rectangle
// and outside lane; those recipes explicitly omit labels. Area recipes retain
// stage labels, then edit to formatted percentages on the same authentic rows.
const recipes=[
  {id:"ordered-spans",options:{encoding:"width",orientation:"down",lastStage:"flat",labels:false},edit:{orientation:"up"}},
  {id:"proportional-areas",options:{encoding:"area",orientation:"right",taperRatio:.5},edit:{taperRatio:.8,percentBase:"total",labels:{content:"percent",format:".1%"}}},
  {id:"pointed-stages",options:{encoding:"width",orientation:"left",lastStage:"point",labels:false},edit:{orientation:"down",color:{field:"category",fieldType:"nominal"}}}
];
const witnesses=new Map(["createPyramidPlot","editPyramidPlot"].map(name=>[name,new Map()]));
for(const dataset of datasets)for(const recipe of recipes)test(`${dataset} ${recipe.id} Pyramid retains authentic nonnegative observations`,()=>{
  try{
    const view=realisticRecordView(dataset,{rowLimit:60,groupLimit:4});
    // A stage count/amount must be nonnegative; select valid source observations
    // without changing their measured values, ordering or provenance.
    const rows=view.rows.filter(row=>Number.isFinite(row.value)&&row.value>=0).slice(0,12);
    assert.ok(rows.length>=2);assert.equal(view.provenance.sourceDataset,dataset);
    assert.ok(rows.every(row=>view.provenance.sourceRowIndexes.includes(row.sourceRowIndex)));
    const p=chart().createCanvas({width:600,height:1200,margin:30}).createData({id:"observations",values:rows,keyField:"key"})
      .createPyramidPlot({id:"stages",stage:"category",value:"value",...recipe.options})
      .editPyramidPlot({target:"stages",...recipe.edit});
    const items=getMarkItems(p,{target:"stages"});assert.deepEqual(items.map(item=>item.fields.value),rows.map(row=>row.value));
    assert.deepEqual(items.map(item=>item.fields.key),rows.map(row=>row.key));
    assert.equal(new Set(items.map(item=>item.key)).size,rows.length);
    if(recipe.options.encoding==="area"){
      const areas=p.graphicSpec.objects.stages.items.filter(item=>item.identity.role==="body").map(item=>Math.abs(signedPolygonArea(item.properties.commands.filter(c=>c.op!=="Z").map(c=>[c.x,c.y]))));
      const index=rows.findIndex(row=>row.value>0);assert.ok(index>=0);
      areas.forEach((area,i)=>assert.ok(Math.abs(area/areas[index]-rows[i].value/rows[index].value)<1e-9));
    }
    const saved=serializeProgram(p),keys=items.map(item=>item.key);
    const q=deserializeProgram(saved).reviseData({source:"observations",id:"reordered",values:[...rows].reverse()});
    assert.deepEqual(getMarkItems(q,{target:"stages"}).map(item=>item.key),[...keys].reverse());
    assertGraphicIntegrity(q,`${dataset}/${recipe.id}`);assertSvgIntegrity(renderToSVG(q),`${dataset}/${recipe.id}`);assert.equal(serializeProgram(p),saved);
    for(const entry of p.trace.children)if(witnesses.has(entry.op)){const map=witnesses.get(entry.op);if(!map.has(dataset))map.set(dataset,new Set());map.get(dataset).add(recipe.id);}
  }finally{releaseTidyTuesdaySourceCache(dataset);}
});
test("each Pyramid action has five authentic datasets and three direct recipes",()=>{
  for(const[action,map]of witnesses){assert.equal(map.size,5,action);for(const values of map.values())assert.equal(values.size,3,action);}
});
