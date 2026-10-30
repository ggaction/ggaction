import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../src/index.js";
import { getProjectionView } from "../../src/inspection.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";
import { projectAnimationEndpoint } from "../../src/animation/endpoints.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { releaseTidyTuesdaySourceCache } from "../support/datasets/tidytuesday.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";

function nearTree(actual, expected) {
  if(typeof expected==="number"){assert.ok(Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);return;}
  if(expected!==null&&typeof expected==="object"){
    assert.deepEqual(Object.keys(actual),Object.keys(expected));for(const key of Object.keys(expected))nearTree(actual[key],expected[key]);return;
  }
  assert.equal(actual,expected);
}
const datasets=["tt-penguins","tt-london-marathon-winners","tt-astronauts","tt-us-births","tt-chocolate-ratings"],witness=new Map();
for(const dataset of datasets)for(const recipe of ["planar-points","spherical-points","spherical-line"])test(`${dataset} ${recipe} retains observations through native camera frames`,()=>{
  try {
    const view=realisticRecordView(dataset,{rowLimit:16,groupLimit:3});
    const rows=view.rows.filter(row=>Number.isFinite(row.orderNumeric)&&Number.isFinite(row.value));
    assert.ok(rows.length>=4);assert.equal(view.provenance.sourceDataset,dataset);
    const planar=recipe==="planar-points",line=recipe==="spherical-line";
    const minX=Math.min(...rows.map(row=>row.orderNumeric)),spanX=Math.max(...rows.map(row=>row.orderNumeric))-minX;
    const minY=Math.min(...rows.map(row=>row.value)),spanY=Math.max(...rows.map(row=>row.value))-minY;
    // Spherical views explicitly map the observed extents to [-60,60]×[-30,30].
    // Properties retain the original observations and source-row membership.
    const coordinates=rows.map(row=>planar?[row.orderNumeric,row.value]:[spanX?(row.orderNumeric-minX)/spanX*120-60:0,spanY?(row.value-minY)/spanY*60-30:0]);
    const features=line?[{type:"Feature",id:"cohort",properties:{observations:rows,label:dataset},geometry:{type:"LineString",coordinates}}]
      :rows.map((row,index)=>({type:"Feature",id:row.key,properties:{...row},geometry:{type:"Point",coordinates:coordinates[index]}}));
    let from=chart().createCanvas({width:600,height:400,margin:0}).createGeometryData({id:"source",format:"geojson",coordinateKind:planar?"planar":"geographic",featureKey:"id",values:{type:"FeatureCollection",features}})
      .createProjection(planar?{id:"map",type:"identity",fit:{geometry:"source",width:600,height:400,padding:40}}:{id:"map",type:"equirectangular",scalePx:80,translatePx:[300,200]}).createCoordinate({type:"geo"});
    from=line?from.createGeoLineMark({id:"marks"}):from.createGeoPointMark({id:"marks"});
    from=from.createMarkLabels({source:"marks",id:"names",field:line?"label":"value",fontSize:10,dx:4,dy:-4})
      .layoutLabels({target:"names",axis:"both",padding:1,maxDisplacement:4,leader:{}});
    const original=JSON.stringify(from),initial=getProjectionView(from).parameters;
    const to=from.editProjection({scalePx:initial.scalePx*(planar?1:4),translatePx:initial.translatePx.map((value,index)=>value+(index?20:40)),...(!planar?{rotateDeg:[30,0,0]}:{})});
    const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),current=sampleTransition(plan,50);
    const native=from.editProjection({scalePx:initial.scalePx*(planar?1:2),translatePx:initial.translatePx.map((value,index)=>value+(index?10:20)),...(!planar?{rotateDeg:[15,0,0]}:{})});
    nearTree(current.scene,projectAnimationEndpoint(native).scene);
    assert.ok(current.decisions.some(decision=>decision.kernel==="native-geo"));
    assert.ok(current.decisions.some(decision=>decision.kernel==="native-geo-text"));
    assert.ok(current.decisions.every(decision=>decision.kind!=="crossfade"));
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),current);
    assertSvgIntegrity(renderToSVG(current),`${dataset}/${recipe}`);assert.equal(JSON.stringify(from),original);
    if(!witness.has(dataset))witness.set(dataset,new Set());witness.get(dataset).add(recipe);
  }finally{releaseTidyTuesdaySourceCache(dataset);}
});
test("geographic transition witnesses cover five sources and three native camera recipes",()=>{
  assert.equal(witness.size,5);for(const recipes of witness.values())assert.equal(recipes.size,3);
});
