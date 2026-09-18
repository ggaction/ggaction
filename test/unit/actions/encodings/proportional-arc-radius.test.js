import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { resolveStoredSelection } from "../../../../src/materialization/selection/state.js";

const values = [{k:"A",v:1,r:4},{k:"A",v:2,r:5},{k:"B",v:9,r:16}];
const base = () => chart().createCanvas({width:400,height:400,margin:40}).createData({values});
function items(program, target="piePlot") {
  return resolveStoredSelection(program.selectMarks({target,field:"k",op:"eq",value:"A"})).items;
}
function pie(range=[0,80], inner=30) {
  return base().createPiePlot({category:"k",value:"v",aggregate:"sum",
    radius:{field:"r",aggregate:"sum",scale:{type:"sqrt",domain:[0,16],range,nice:false}},
    arc:{innerRadius:{unit:"px",value:inner},padAngle:2},guides:false});
}

test("proportional arcs retain independent grouped radius, angle, and source membership", () => {
  const program=pie();
  const sectors=items(program);
  assert.deepEqual(sectors.map(item=>item.members.length),[2,1]);
  assert.deepEqual(sectors.map(item=>item.channels.radius),[9,16]);
  assert.deepEqual(sectors.map(item=>[item.geometry.startTheta,item.geometry.endTheta]),[[1,89],[91,359]]);
  assert.deepEqual(sectors.map(item=>[item.geometry.innerRadius,item.geometry.outerRadius]),[[30,60],[30,80]]);
  assert.equal((renderToSVG(program).match(/<path/g)??[]).length,2);
  assert.deepEqual(items(pie([20,100],40)).map(item=>[item.geometry.innerRadius,item.geometry.outerRadius]),[[40,80],[40,100]]);
});

test("radius domains use grouped sums in either encoding order", () => {
  const theta={field:"k",aggregate:"sum",weight:"v"};
  const radius={field:"r",aggregate:"sum",scale:{type:"sqrt",range:[20,100],nice:false}};
  const before=base().createArcMark();
  const pending=before.encodeR(radius);
  assert.equal(pending.resolvedScales.radius,undefined);
  const first=pending.encodeTheta(theta);
  const second=before.encodeTheta(theta).encodeR(radius);
  const atomic=before.encodeChannels({target:"arc",channels:{theta,r:radius}});
  for(const program of [first,second,atomic]) {
    assert.deepEqual(program.resolvedScales.radius.domain,[9,16]);
    assert.deepEqual(items(program,"arc").map(item=>item.geometry.outerRadius),[20,100]);
  }
});

test("pie radius defaults include zero and semantic labels retain angular values", () => {
  const program=base().createPiePlot({category:"k",value:"v",aggregate:"sum",
    radius:{field:"r",aggregate:"sum",scale:{type:"sqrt"}},guides:false});
  assert.deepEqual(program.resolvedScales.radius.domain,[0,16]);
  const labeled=program.createMarkLabels({source:"piePlot",content:"value"});
  assert.deepEqual(labeled.graphicSpec.objects["piePlot-labels"].items.map(item=>item.properties.text),["3","9"]);
  const share=program.createMarkLabels({source:"piePlot",content:"share"});
  assert.deepEqual(share.graphicSpec.objects["piePlot-labels"].items.map(item=>item.properties.text),["0.25","0.75"]);
});

test("joint geometry survives resize and persistence without changing explicit radii", () => {
  const original=pie();
  const snapshot=serializeProgram(original);
  const resized=original.editCanvas({width:500});
  assert.deepEqual(items(resized).map(item=>item.geometry.outerRadius),[60,80]);
  assert.equal(items(resized)[0].geometry.centerX,250);
  assert.deepEqual(items(deserializeProgram(serializeProgram(resized))).map(item=>item.geometry),items(resized).map(item=>item.geometry));
  assert.equal(serializeProgram(original),snapshot);
});

test("direct quantitative theta uses per-row radius without inventing aggregation", () => {
  const program=base().createArcMark().encodeTheta({field:"v",fieldType:"quantitative"})
    .encodeR({field:"r",scale:{domain:[0,16],range:[0,80],type:"sqrt",nice:false}});
  const sectors=items(program,"arc");
  assert.equal(sectors.length,3);
  assert.deepEqual(sectors.map(item=>item.geometry.endTheta-item.geometry.startTheta),[30,60,270]);
  assert.equal(sectors[0].geometry.outerRadius,40);
  assert.equal(sectors[2].geometry.outerRadius,80);
  assert.throws(()=>program.encodeR({field:"r",aggregate:"sum"}),/aggregated categorical theta/);
});

test("grouped radius requires a consistent value or explicit aggregate", () => {
  assert.throws(()=>base().createPiePlot({category:"k",radius:"r",guides:false}),/one value per theta group/);
  assert.throws(()=>pie().encodeR({target:"piePlot",field:"r",aggregate:"sum",mapping:false}),/Radial mapping must/);
  const counted=base().createPiePlot({category:"k",value:"v",aggregate:"sum",radius:{aggregate:"count"},guides:false});
  assert.deepEqual(items(counted).map(item=>item.channels.radius),[2,1]);
  assert.throws(()=>pie([0,40],30),/outer radius must exceed/);
});

test("radius edits, removal, and facets retain the proportional angular partition", () => {
  const program=pie();
  const updated=program.editRScale({range:[20,100]});
  assert.deepEqual(items(updated).map(item=>item.geometry.outerRadius),[80,100]);
  assert.deepEqual(items(updated).map(item=>item.channels.radius),[9,16]);
  const constant=program.removeEncoding({target:"piePlot",channel:"radius"});
  assert.deepEqual(items(constant).map(item=>item.geometry.outerRadius),[160,160]);
  assert.deepEqual(items(constant).map(item=>item.geometry.endTheta),[89,359]);
  const faceted=program.facet({field:"k"});
  assert.equal(Object.keys(faceted.children).length,2);
  for(const child of Object.values(faceted.children)) {
    const sector=items(child);
    assert.equal(sector.length,1);
    assert.equal(sector[0].geometry.startTheta,1);
    assert.equal(sector[0].geometry.endTheta,359);
    assert.ok([60,80].includes(sector[0].geometry.outerRadius));
  }
});

test("explicit category order changes angle order without reassigning radial values", () => {
  const program=pie().orderCategories({channel:"theta",values:["B","A"]});
  assert.deepEqual(items(program).map(item=>item.channels.radius),[16,9]);
  assert.deepEqual(items(program).map(item=>item.geometry.outerRadius),[80,60]);
  assert.deepEqual(items(program).map(item=>[item.geometry.startTheta,item.geometry.endTheta]),[[1,269],[271,359]]);
});
