import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { exportAccessibleData as out } from "../../../src/accessibility.js";
import { buildActionRelationshipPrograms } from "../../../scripts/action-relationship-source.js";

const rows = [{g:"A",x:1,y:2},{g:"A",x:1,y:4},{g:"B",x:2,y:6},{g:"B",x:2,y:10}];
const base = (values = rows, factory = chart) => factory().createCanvas({width:500,height:400,margin:50}).createData({values});
const values = (view, role, component = view.ownerId) => view.rows.filter(row => row.component === component).map(row => row.values[`${component}:${role}`]);

test("exports final aggregate endpoints with metadata, immutable output, and no trace changes", () => {
  const p = base().createBarPlot({id:"sales",x:"g",y:{field:"y",aggregate:"mean"},guides:false}).createTitle({text:"Sales"});
  const before = JSON.stringify(p);
  const result = out(p,{target:"sales"});
  assert.equal(result.schemaVersion,1); assert.equal(result.title,"Sales");
  const view=result.views[0];
  assert.deepEqual(values(view,"x"),["A","B"]);
  assert.deepEqual(values(view,"y"),[0,0]);
  assert.deepEqual(values(view,"y2"),[3,8]);
  assert.equal(view.columns.find(c=>c.role==="y2").aggregate,"mean");
  assert.throws(()=>{view.rows[0].values["sales:y2"]=100;},TypeError);
  assert.equal(JSON.stringify(p),before);
  assert.equal(out(base(rows,basicChart).createBarPlot({x:"g",y:"y",guides:false})).views[0].rows.length,2);
});

test("exports histogram bins and count conservation, and filtered point rows", () => {
  const h=base().createHistogram({field:"y",binStep:2,guides:false});
  const view=out(h).views[0];
  const starts=values(view,"x"),ends=values(view,"x2");
  assert.ok(starts.every((value,index)=>ends[index]>value));
  assert.equal(values(view,"y2").reduce((sum,value,index)=>sum+value-values(view,"y")[index],0),rows.length);
  const p=base().createScatterPlot({x:"x",y:"y",guides:false}).filterMarks({field:"g",op:"oneOf",values:["A"]});
  assert.deepEqual(values(out(p).views[0],"y"),[2,4]);
});

test("exports computed interval bounds under one stable owner, including owned caps", () => {
  const p=base().createErrorBar({x:{field:"x",fieldType:"quantitative"},y:{field:"y",center:"mean",extent:"stderr"}});
  const result=out(p); assert.equal(result.views.length,1);
  const view=result.views[0];
  assert.deepEqual(values(view,"y"),[2,6]); assert.deepEqual(values(view,"y2"),[4,10]);
  assert.equal(new Set(view.rows.map(r=>r.component)).size,3);
  assert.throws(()=>out(p,{target:"errorBarLowerCap"}),/owned by "errorBar"/);
});

test("exports line aggregate points and UTC units instead of underlying duplicate rows", () => {
  const p=base([{t:"2024-01-01",y:2},{t:"2024-01-01",y:4},{t:"2024-01-02",y:8}])
    .createLineMark({id:"trend"}).encodeX({field:"t",fieldType:"temporal"}).encodeY({field:"y",aggregate:"mean"});
  const view=out(p).views[0];
  assert.deepEqual(values(view,"y"),[3,8]);
  assert.deepEqual(values(view,"x"),[Date.UTC(2024,0,1),Date.UTC(2024,0,2)]);
  assert.equal(view.units["trend:x"],"utc-milliseconds");
});

test("exports distinct Parallel dimensions and drops incomplete rows by the stored policy", () => {
  const p=base([{a:1,b:2},{a:3,b:4}]).createParallelCoordinates({id:"parallel",dimensions:["a","b"],guides:false});
  const view=out(p).views[0];
  assert.deepEqual(values(view,"a"),[1,3]); assert.deepEqual(values(view,"b"),[2,4]);
  assert.deepEqual(view.columns.map(c=>c.field),["a","b"]);
});

test("preserves ordered nested composition and facet labels without selecting repeated mark IDs", () => {
  const p=base().createScatterPlot({x:"x",y:"y",guides:false});
  const facet=p.facet({field:"g"});
  const composition=hconcat({programs:[{id:"facets",program:facet},{id:"plain",program:p}]});
  const result=out(composition);
  assert.deepEqual(result.views.map(v=>v.ownerId),["facets","plain"]);
  assert.deepEqual(result.views[0].views.map(v=>v.facet),[{g:"A"},{g:"B"}]);
  assert.equal(result.views[0].views[0].views[0].rows.length,2);
  assert.throws(()=>out(composition,{target:"scatterPlot"}),/explicit child/);
});

test("rejects invalid arguments, unknown targets, incomplete or unsupported owners without partial output", () => {
  assert.deepEqual(out(chart()),{schemaVersion:1,title:null,views:[]});
  for(const arg of [null,[],1,{typo:true}]) assert.throws(()=>out(chart(),arg));
  for(const program of [null,{}, {graphicSpec:chart().graphicSpec}]) assert.throws(()=>out(program),/editable/);
  assert.throws(()=>out(chart(),{target:"missing"}),/Unknown mark/);
  assert.throws(()=>out(chart(),{target:""}));
  const p=base().createScatterPlot({x:"x",y:"y",guides:false});
  assert.throws(()=>out(p._clone({actionStack:[0]})),/closed action stack/);
  assert.throws(()=>out(p._clone({graphicSpec:{...p.graphicSpec,objects:{}}})),/not materialized/);
});

test("exports every supported relationship corpus owner or explicitly identifies unsupported standalone text", () => {
  let supported=0, unsupported=0;
  for(const p of buildActionRelationshipPrograms()) {
    const before=JSON.stringify(p);
    try { const result=out(p); assert.equal(result.schemaVersion,1); supported++; }
    catch(error) { assert.match(error.message,/Cannot export accessible data for mark "[^"]+": unsupported text owner/); unsupported++; }
    assert.equal(JSON.stringify(p),before);
  }
  assert.ok(supported>100); assert.ok(unsupported>0);
});

test("accessibility entry bundles for browsers without Full action registration or Node dependencies", async () => {
  const result=await build({entryPoints:[fileURLToPath(new URL("../../../src/accessibility.js",import.meta.url))],bundle:true,platform:"browser",format:"esm",write:false,metafile:true});
  assert.ok(result.outputFiles[0].text.includes("exportAccessibleData"));
  assert.equal(Object.keys(result.metafile.inputs).some(file=>/node_modules|src\/actions\/|src\/ChartProgram.js|src\/mcp\//.test(file)),false);
});
