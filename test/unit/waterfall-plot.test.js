import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { decodeValue, encodeValue } from "../../src/persistence/codec.js";
import { createInteractionSession } from "../../src/interaction.js";
import { exportAccessibleData } from "../../src/accessibility.js";
const rows = [{ id: 1, x: "A", v: 5, r: "delta", group: "first" }, { id: "1", x: "B", v: -2, r: "delta", group: "second" }, { id: "sum", x: "C", r: "subtotal", group: "first" }, { id: "more", x: "D", v: 4, r: "delta", group: "second" }, { id: "total", x: "E", r: "total", group: "first" }];
const base = () => chart().createCanvas({ width: 500, height: 320, margin: 40 }).createData({ id: "d", values: rows, keyField: "id" });
const options = { id: "steps", x: "x", value: "v", role: "r", width: { pixels: 48 }, yScale: { domain: [0, 10] }, guides: false };
const build = patch => base().createWaterfallPlot({ ...options, ...patch });
const items = p => getMarkItems(p, { target: "steps" });
const graphics = p => p.graphicSpec.objects.steps.items;
test("Waterfall exposes ordered stage roles, literal geometry and unique typed row identities", () => {
  const p = build(); assert.equal(basic().createWaterfallPlot, undefined);
  assert.deepEqual(items(p).map(item => [item.channels.role, item.channels.start, item.channels.end]), [["delta",0,5],["delta",5,3],["subtotal",0,3],["delta",3,7],["total",0,7]]);
  assert.deepEqual(graphics(p).filter(item => item.type === "rect").map(({properties:p}) => [p.x,p.y,p.width,p.height]), [[58,160,48,120],[142,160,48,48],[226,208,48,72],[310,112,48,96],[394,112,48,168]]);
  assert.equal(new Set(items(p).map(item => item.key)).size, 5); assert.equal(inspectProgram(p).views[0].logicalDataItems, 5);
  assert.deepEqual(exportAccessibleData(p, { target: "steps" }).views[0].rows.map(row => row.values["steps:end"]), [5,3,3,7,7]);
  assert.deepEqual(items(p)[2].rows.map(row=>row.rowKey), p.semanticSpec.datasets[0].rowKeys.slice(0,3));
});
test("Waterfall accumulated domain and incoming connectors share reset and explicit total semantics", () => {
  const p = chart().createCanvas().createData({id:"d",values:[{x:"a",r:"delta",v:5},{x:"b",r:"total",v:20,reset:true},{x:"c",r:"delta",v:-3},{x:"d",r:"subtotal"}]}).createWaterfallPlot({...options, yScale:{}, reset:"reset"});
  assert.deepEqual(p.resolvedScales["steps-y"].domain, [-3,20]);
  assert.deepEqual(items(p).map(i=>i.channels.runningAfter), [5,0,-3,-3]);
  const connections=graphics(p).filter(i=>i.identity.role==="connector");
  assert.equal(connections[1].properties.commands[0].y, graphics(p).find(i=>i.identity.key===items(p)[2].key&&i.type==="rect").properties.y);
  assert.deepEqual(items(p)[3].rows.map(row=>row.rowKey),p.semanticSpec.datasets[0].rowKeys.slice(2));
  assert.equal(items(p.editWaterfallPlot({reset:false}))[2].channels.start,5);
});
test("Waterfall source revisions, explicit rebinding, scales and Canvas edits rematerialize all owned parts", () => {
  const p=build({labels:{}}), original=serializeProgram(p), keys=items(p).map(i=>i.key);
  const q=p.reviseData({source:"d",id:"d2",values:rows.map(row=>row.r==="delta"?{...row,v:row.v*2}:row)}).editCanvas({width:700}).editScale({id:"steps-y",domain:[0,20]});
  assert.deepEqual(items(q).map(i=>i.key),keys);assert.equal(items(q).at(-1).channels.end,14);
  assert.equal(graphics(q)[0].identity.lineage.revision,1);assert.equal(serializeProgram(p),original);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(q)).graphicSpec,q.graphicSpec);
  const bound=q.createData({id:"other",values:rows,keyField:"id"}).bindMarkData({target:"steps",data:"other"});assert.equal(items(bound).at(-1).channels.end,7);
  assert.equal(bound.removeMark({target:"steps"}).removeData({id:"other"}).markConfigs.steps,undefined);
});
test("Waterfall labels, connector removal, reset editing and compound appearance preserve meaning", () => {
 const p=build({labels:{content:"end"},bars:{outline:{color:"#000",width:1},shadow:{color:"#00000080",blurRadius:1,offsetX:2,offsetY:2}},connectors:{outline:{color:"#fff",width:2}}});
 assert.deepEqual(graphics(p).filter(i=>i.type==="text").map(i=>i.properties.text),["5","3","3","7","7"]);
 assert.ok(graphics(p).find(i=>i.type==="path").properties.outline);
 const q=p.editWaterfallPlot({labels:{content:"category"},connectors:false,bars:{outline:false,shadow:false},clip:false});
 assert.equal(graphics(q).length,10);assert.equal(q.graphicSpec.objects.steps.clip,undefined);assert.equal(graphics(q)[0].properties.shadow,undefined);
 assert.deepEqual(graphics(q).filter(i=>i.type==="text").map(i=>i.properties.text),["A","B","C","D","E"]);
 assert.equal(graphics(q.editWaterfallPlot({labels:false,connectors:{}})).length,9);
});
test("Waterfall selection, row projection and hit testing preserve the compound item", () => {
 const p=build({labels:{}}),key=items(p)[1].key;
 const q=p.selectMarks({id:"s",target:"steps",field:"id",op:"eq",value:"1"}).highlightMarks({selection:"s",fill:"#00f",stroke:"#f00",offset:{x:2,y:3}});
 const chosen=graphics(q).filter(i=>i.identity.key===key);assert.equal(chosen.find(i=>i.type==="rect").properties.fill,"#00f");assert.equal(chosen.find(i=>i.type==="path").properties.fill,undefined);assert.equal(chosen.find(i=>i.type==="text").properties.stroke,undefined);
 assert.equal(chosen.find(i=>i.type==="rect").properties.x,144);assert.equal(items(q.editCanvas({width:700})).length,5);
 const filtered=p.filterMarks({target:"steps",field:"r",op:"eq",value:"delta"}); assert.deepEqual(items(filtered).map(i=>i.channels.end),[5,3,7]);
 const session=createInteractionSession({program:p});session.dispatch({type:"inspect",point:{x:160,y:180}});assert.equal(session.getState().hit.target.itemKey,key);session.destroy();
});
test("Waterfall guides, color scale and family theme styles consume the same materialized geometry", () => {
 let p=base().editCanvas({width:600,margin:{top:40,bottom:70,left:60,right:150}}).createWaterfallPlot({...options,guides:{},color:"group",labels:{}});
 assert.equal(p.semanticSpec.guides.axis.y.scale,"steps-y");assert.equal(p.semanticSpec.guides.legend.color.scale,"steps-color");
 p=p.editColorScale({target:"steps",range:["#000","#fff"]});assert.equal(graphics(p)[0].properties.fill,"#000");
 p=p.editWaterfallPlot({color:false});assert.equal(graphics(p)[0].properties.fill,"#16a34a");
 const themed=p.applyTheme({theme:"dark"});assert.equal(graphics(themed)[0].properties.fill,"#16a34a");assert.notEqual(graphics(themed)[0].properties.stroke,graphics(p)[0].properties.stroke);assert.deepEqual(themed.removeTheme().graphicSpec,p.graphicSpec);
});
test("Waterfall facet calculations are local and nested edits remain explicitly scoped", () => {
 const faceted=build().facet({field:"group"}); assert.deepEqual(Object.values(faceted.children).map(child=>items(child).at(-1).channels.end),[5,2]);
 const p=hconcat({programs:[{id:"left",program:build()},{id:"right",program:build()}]});
 const q=p.editWaterfallPlot({target:{childPath:["right"],id:"steps"},connectors:false});assert.equal(graphics(q.children.left).length,9);assert.equal(graphics(q.children.right).length,5);
});
test("Waterfall rejects malformed complete candidates before the first state-changing child", () => {
 const calls=[];class Capturing extends ChartProgram {editSemantic(a){calls.push(a);return super.editSemantic(a);} createGraphics(a){calls.push(a);return super.createGraphics(a);}createScale(a){calls.push(a);return super.createScale(a);}}
 const p=new Capturing({...base()});
 for(const patch of [{role:null},{value:"absent"},{role:"absent"},{width:{pixels:-1}},{x:{field:"x",fieldType:"quantitative"}},{connectors:true},{labels:{content:"unknown"}},{guides:{axes:{y:{scale:"wrong"}}}}]){calls.length=0;assert.throws(()=>p.createWaterfallPlot({...options,...patch}));assert.deepEqual(calls,[]);}
 assert.throws(()=>build().editWaterfallPlot({}),/nonempty/);
});
test("Waterfall empty and stale materializations are explicit and stored roles are revalidated", async () => {
 const {waterfallSelectionPolicy:policy}=await import("../../src/materialization/selection/policies/waterfall.js");const p=build(),layer=p.semanticSpec.layers[0];
 const emptyGraphic={...p,markConfigs:p.markConfigs,resolvedScales:p.resolvedScales,graphicSpec:{...p.graphicSpec,objects:{canvas:p.graphicSpec.objects.canvas}}};
 assert.equal(policy.resolveSourceItems(emptyGraphic,layer).length,5);assert.throws(()=>policy.resolveItems(emptyGraphic,layer),/materialized/);assert.throws(()=>policy.resolveItems({...emptyGraphic,graphicSpec:{objects:{canvas:p.graphicSpec.objects.canvas,steps:{items:[]}}}},layer),/stale/);
 assert.throws(()=>p.materializeWaterfallPlot({id:"steps",scales:1}),/boolean/);assert.throws(()=>base().createPointMark({id:"other"}).materializeWaterfallPlot({id:"other"}),/Waterfall mark/);
 const empty=chart().createCanvas().createData({id:"empty",values:[]}).createWaterfallPlot({...options,x:{field:"x",scale:{domain:["A"]}}});assert.deepEqual(graphics(empty),[]);
 const stored=JSON.parse(serializeProgram(p));const state=decodeValue(stored.payload);state.semanticSpec.layers[0].waterfall.role="missing";stored.payload=encodeValue(state);assert.throws(()=>deserializeProgram(JSON.stringify(stored)));
});

test("Waterfall exact font metrics and shared guide rebindings reject before state-changing children", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const family = "ggaction Metric Fixture", requestToken = "waterfall-font";
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key, value[key]]));
  const measure = ({ asset, queries }) => ({ contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths: queries.map(query => query.text.length * query.fontSize * .6) });
  let p = build({ labels: { fontFamily: family, fontSize: 12, fontWeight: 400 } });
  p = p.createFontResource({ prepared: await prepareFontResource(p, { kind: "create", id: "font", uri: "fixture:font", mimeType: "font/ttf", expectedHash: createHash("sha256").update(bytes).digest("hex"), family, style: "normal", weight: 400, metricsProviderVersion: "fixture@1" }, { requestToken, load: () => ({ bytes, mimeType: "font/ttf" }), decode }), requestToken });
  p = p.applyTextMetrics({ prepared: await prepareTextMetrics(p, { id: "exact", fonts: ["font"] }, { requestToken, decode, measure }), requestToken });
  assert.ok(graphics(p).filter(item => item.type === "text").every(item => item.properties.font));
  const before = serializeProgram(p), calls = [];
  class Capturing extends ChartProgram { editSemantic(args) { calls.push(args); return super.editSemantic(args); } createGraphics(args) { calls.push(args); return super.createGraphics(args); } createScale(args) { calls.push(args); return super.createScale(args); } }
  assert.throws(() => new Capturing({ ...p }).editWaterfallPlot({ labels: { fontSize: 13 } }), error => error.assetCode === "metrics-required");
  assert.deepEqual(calls, []); assert.equal(serializeProgram(p), before);
  assert.equal(graphics(p.editWaterfallPlot({ labels: false })).length, 9);
  assert.deepEqual(deserializeProgram(before).graphicSpec, p.graphicSpec);
  const guided = base().editCanvas({ width: 500, height: 400, margin: 80 }).createWaterfallPlot({ ...options, guides: {} })
    .createWaterfallPlot({ ...options, id: "shared", yScale: { id: "steps-y" }, guides: false });
  calls.length = 0;
  assert.throws(() => new Capturing({ ...guided }).editWaterfallPlot({ target: "steps", yScale: { id: "other-y" } }), /shared scale/);
  assert.deepEqual(calls, []);
});

test("Waterfall structured paints and negative/zero contributions retain exact endpoints",()=>{
 const pattern={type:"pattern",style:"diagonal",pitch:8,strokeWidth:2,foreground:"#ff0000",background:"#ffffff",coordinateSpace:"plot"};
 const radial={type:"radial-gradient",center:{x:.5,y:.5},focal:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:"#ffffff"},{offset:1,color:"#000000"}]};
 const p=build({bars:{positiveFill:pattern,negativeFill:radial},labels:{fill:radial}});assert.equal(graphics(p)[0].properties.fill.type,"pattern");assert.equal(graphics(p).find(i=>i.identity.key===items(p)[1].key&&i.type==="rect").properties.fill.type,"radial-gradient");
 const q=chart().createCanvas().createData({id:"d",values:[{x:"a",r:"delta",v:-3},{x:"b",r:"delta",v:0},{x:"c",r:"subtotal"},{x:"d",r:"total",v:5}]}).createWaterfallPlot({...options,yScale:{}});
 assert.deepEqual(items(q).map(i=>[i.channels.start,i.channels.end]),[[0,-3],[-3,-3],[0,-3],[0,5]]);assert.equal(graphics(q).filter(i=>i.type==="rect")[1].properties.height,0);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});
