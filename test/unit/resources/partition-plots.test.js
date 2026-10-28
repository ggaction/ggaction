import assert from "node:assert/strict";
import test from "node:test";
import { chart, prepareDataUpdate } from "../../../src/index.js";
import { chart as basic } from "../../../src/basic.js";
import { getMarkItems, inspectProgram } from "../../../src/inspection.js";
import { exportAccessibleData } from "../../../src/accessibility.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { resolveHierarchyPlot } from "../../../src/materialization/hierarchy/plot.js";
import { resolveStoredSelection } from "../../../src/materialization/selection/state.js";

const rows = [{ id: "r", parent: null }, { id: "a", parent: "r" }, { id: "a1", parent: "a", v: 2 }, { id: "a2", parent: "a", v: 4 }, { id: "b", parent: "r", v: 4 }];
const source = (values = rows) => chart().createCanvas({ plot: { width: 1000, height: 300 }, margin: { left: 0, right: 0, top: 0, bottom: 0 }, plotBorder: false })
  .createData({ id: "d", values, keyField: "id" }).createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v" }).layoutHierarchy({ id: "l", method: "partition" });
const resolved = p => resolveHierarchyPlot(p, p.semanticSpec.layers.find(layer => layer.id === "partitionPlot"), p.markConfigs.partitionPlot.hierarchyPlot);
const item = (p, id) => getMarkItems(p).find(item => item.fields.id === id);

test("shares stored intervals, node identity and values across Cartesian and polar mappings", () => {
  const p = source().createPartitionPlot({ labels: {} }), before = serializeProgram(p);
  assert.deepEqual([item(p, "a").properties.x, item(p, "a").properties.width], [0, 600]);
  assert.equal(item(p, "a1").properties.height, 100);
  const q = p.createCoordinate({ id: "polar", type: "polar" }).editPartitionPlot({ coordinate: "polar", innerRadius: 20, outerRadius: 120 });
  const a = resolved(q).items.find(item => item.fields.id === "a");
  assert.ok(Math.abs(a.geometry.endAngle - a.geometry.startAngle - 1.2 * Math.PI) < 1e-12);
  assert.deepEqual(getMarkItems(q).map(item => [item.key, item.fields.value]), getMarkItems(p).map(item => [item.key, item.fields.value]));
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "layout"), p.semanticSpec.resources.find(r => r.kind === "layout"));
  assert.equal(serializeProgram(p), before);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
  assert.equal(basic().createPartitionPlot, undefined);
});

test("focus keeps hidden selection identities and exposes ancestor and keyboard metadata", () => {
  const p = source().createPartitionPlot().selectMarks({ id: "chosen", field: "id", op: "eq", value: "b" }).highlightMarks({ color: "red" });
  const q = p.editPartitionPlot({ focus: { key: "a" } });
  const visible = getMarkItems(q).filter(item => item.visible);
  assert.deepEqual(visible.map(item => item.fields.id), ["a", "a1", "a2"]);
  assert.equal(item(q, "a1").properties.width, 1000 / 3);
  assert.deepEqual(resolveStoredSelection(q, "chosen").keys, resolveStoredSelection(p, "chosen").keys);
  assert.equal(item(q, "b").geometry.length, 0);
  assert.equal(item(q, "a1").navigation.nextSibling, item(q, "a2").fields.nodeKey);
  assert.equal(inspectProgram(q).views[0].partition.breadcrumbKeys.length, 1);
  const back = q.editPartitionPlot({ focus: null });
  assert.equal(item(back, "b").properties.fill, "red");
  const dropped = q.editPartitionPlot({ prunedSelection: "drop" }).editPartitionPlot({ focus: null });
  assert.deepEqual(resolveStoredSelection(dropped, "chosen").keys, []);
});

test("source revision recovers the nearest surviving ancestor without mutating layout history", () => {
  const p = source().createPartitionPlot({ focus: { key: "a1" } }), before = serializeProgram(p);
  const q = p.reviseData({ source: "d", id: "next", values: rows.filter(row => row.id !== "a1") });
  const info = inspectProgram(q).views[0].partition;
  assert.equal(info.focusKey, item(q, "a").fields.nodeKey);
  assert.equal(info.recovery.reason, "ancestor");
  assert.equal(q.semanticSpec.resources.find(resource => resource.kind === "layout").revision, 1);
  assert.equal(serializeProgram(p), before);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(q))), renderToSVG(q));
  const r = q.reviseData({ source: "next", id: "root", values: [{ id: "new", parent: null, v: 1 }] });
  assert.equal(inspectProgram(r).views[0].partition.recovery.reason, "root");
  assert.equal(getMarkItems(r)[0].visible, true);
});

test("pixel gaps, hidden root and labels preserve metadata while invisible geometry has no hit candidate", () => {
  const p = source().createPartitionPlot({ rootVisible: false, padding: [10, 4], labels: { minWidth: 500, overrides: [{ key: "a1", text: "Small node" }] } });
  assert.deepEqual([item(p, "a").properties.x, item(p, "a").properties.width, item(p, "a").properties.height], [5, 590, 146]);
  assert.equal(item(p, "r").visible, false);
  assert.equal(item(p, "a1").geometry.length, 1);
  assert.ok(JSON.stringify(exportAccessibleData(p)).includes("Small node"));
  const tiny = p.createCoordinate({ id: "polar", type: "polar" }).editPartitionPlot({ coordinate: "polar", padding: 1000 });
  assert.equal(tiny.graphicSpec.objects.partitionPlot.items.length, 0);
  assert.equal(getMarkItems(tiny).length, rows.length);
  const only = source([{ id: "root", parent: null, v: 0 }]).createPartitionPlot({ rootVisible: false });
  assert.equal(only.graphicSpec.objects.partitionPlot.items.length, 0);
  assert.equal(inspectProgram(only).views[0].partition.diagnostics.emptyChildrenView, true);
});

test("coordinate and Canvas edits reuse mapping intent and invalid changes are atomic", () => {
  const p = source().createPartitionPlot({ orientation: "vertical", reverseU: true, clip: true });
  assert.equal(item(p, "a").properties.height, 180);
  const q = p.editCanvas({ plot: { width: 800, height: 600 } });
  assert.equal(item(q, "a").properties.height, 360);
  const polar = q.createCoordinate({ id: "p", type: "polar" }).editPartitionPlot({ coordinate: "p", outerRadius: 100 });
  const shifted = polar.editCoordinate({ target: "p", polarFrame: { center: { x: 0.25, y: 0.5 } } });
  assert.notDeepEqual(item(shifted, "a").geometry[0].properties.commands, item(polar, "a").geometry[0].properties.commands);
  const before = serializeProgram(polar);
  for (const patch of [{ focus: { key: "absent" } }, { padding: [-1, 2] }, { sweep: 0 }, { outerRadius: 1000 }, { labels: { minWidth: -1 } }, {}]) assert.throws(() => polar.editPartitionPlot(patch));
  assert.equal(serializeProgram(polar), before);
});

test("layout order changes navigation and visible order together with exact item identity", () => {
  const p = source().createPartitionPlot(), q = p.editLayout({ order: { by: "value", direction: "descending" } });
  assert.deepEqual(getMarkItems(q).map(item => item.fields.id), ["r", "a", "a2", "a1", "b"]);
  assert.equal(item(q, "a2").navigation.nextSibling, item(q, "a1").fields.nodeKey);
  assert.equal(item(q, "a2").key, item(p, "a2").key);
});

test("complete-subtree facets and child editing retain exact partition resource closure", () => {
  const values = [{ id: "ra", parent: null, group: "a" }, { id: "a", parent: "ra", group: "a", v: 2 },
    { id: "rb", parent: null, group: "b" }, { id: "b", parent: "rb", group: "b", v: 3 }];
  const p = chart().createCanvas({ width: 400, height: 200 }).createData({ id: "d", values, keyField: "id" })
    .createHierarchyData({ id: "h", key: "id", parent: "parent", value: "v", forest: true })
    .layoutHierarchy({ id: "l", method: "partition" }).createPartitionPlot().facet({ field: "group" });
  assert.equal(Object.keys(p.children).length, 2);
  for (const child of Object.values(p.children)) assert.equal(getMarkItems(child).length, 2);
  assert.equal(renderToSVG(deserializeProgram(serializeProgram(p))), renderToSVG(p));
});

test("malformed restored partition view and mapping fail closed without evaluating input getters", () => {
  const p = source().createPartitionPlot(), before = serializeProgram(p);
  let reads = 0;
  assert.throws(() => p.editPartitionPlot({ labels: { get minWidth() { reads++; return 0; } } }), /accessors/);
  assert.equal(reads, 0);
  const bad = p._clone({ semanticSpec: { ...p.semanticSpec, layers: p.semanticSpec.layers.map(layer => ({ ...layer, partitionView: { ...layer.partitionView, focusKey: "absent" } })) } });
  assert.throws(() => serializeProgram(bad), /focus/);
  const wrong = p._withMarkConfig("partitionPlot", { hierarchyPlot: { ...p.markConfigs.partitionPlot.hierarchyPlot,
    mapping: { ...p.markConfigs.partitionPlot.hierarchyPlot.mapping, direction: "sideways" } } });
  assert.throws(() => serializeProgram(wrong), /direction/);
  assert.equal(serializeProgram(p), before);
});

test("explicit drop prunes deleted source nodes before their old predicate could select them again", () => {
  const p = source().createPartitionPlot({ prunedSelection: "drop" }).selectMarks({ id: "chosen", field: "id", op: "eq", value: "b" });
  const q = p.reviseData({ source: "d", id: "smaller", values: rows.filter(row => row.id !== "b") });
  assert.deepEqual(resolveStoredSelection(q, "chosen").keys, []);
  const restored = q.reviseData({ source: "smaller", id: "back", values: rows });
  assert.deepEqual(resolveStoredSelection(restored, "chosen").keys, []);
});

test("partition inference follows current and unique coordinates and rejects ambiguity before changes", () => {
  const p=source().createCoordinate({id:"first",type:"cartesian"}).createCoordinate({id:"second",type:"polar"});
  assert.equal(p.createPartitionPlot().semanticSpec.layers[0].coordinate,"second");
  const ambiguous=p.createCoordinate({id:"parallel",type:"parallel"}),before=serializeProgram(ambiguous);
  assert.throws(()=>ambiguous.createPartitionPlot(),/ambiguous/);
  assert.throws(()=>ambiguous.createPartitionPlot({coordinate:"parallel"}),/Cartesian or polar/);
  assert.equal(serializeProgram(ambiguous),before);
  const unique=source().createCoordinate({id:"only",type:"cartesian"}).createCoordinate({id:"parallel",type:"parallel"});
  assert.equal(unique.createPartitionPlot().semanticSpec.layers[0].coordinate,"only");
  const occupied=source().createCoordinate({id:"main",type:"parallel"});
  assert.throws(()=>occupied.createPartitionPlot(),/ambiguous/);
});

test("drop intersects mixed selections with current geometry and orphan labels remain dormant",()=>{
  const p=source().createPartitionPlot({labels:{overrides:[{key:"a1",text:"Named leaf"}]},cells:{overrides:[{key:"a1",fill:"red"}]}})
    .selectMarks({id:"mixed",field:"id",op:"oneOf",values:["a1","b"]});
  const q=p.editPartitionPlot({focus:{key:"a"},prunedSelection:"drop"});
  assert.deepEqual(resolveStoredSelection(q,"mixed").keys,[item(q,"a1").key]);
  const removed=q.reviseData({source:"d",id:"removed",values:rows.filter(row=>row.id!=="a1")});
  assert.ok(resolved(removed).diagnostics.some(entry=>entry.code==="orphan-style"));
  assert.deepEqual(resolveStoredSelection(removed,"mixed").keys,[]);
  const empty=p.editPartitionPlot({focus:{key:"a1"}}).reviseData({source:"d",id:"empty",values:[]});
  assert.equal(inspectProgram(empty).views[0].partition.recovery.reason,"empty");
  assert.equal(getMarkItems(empty).length,0);
});

test("typed group paths, nested source names and filtered labels retain exact membership",()=>{
  const grouped=chart().createCanvas().createData({values:[{a:null,b:1,v:2},{a:null,b:"1",v:3},{a:"x",b:true,v:4}]})
    .createHierarchyData({id:"h",groupFields:["a","b"],value:"v",missingCategory:"include"})
    .layoutHierarchy({id:"l",method:"partition"}).createPartitionPlot({focus:{path:[null]},labels:{overrides:[{path:[null,1],text:"Numeric child"}]}});
  assert.equal(getMarkItems(grouped).filter(item=>item.visible).length,3);
  assert.equal(inspectProgram(grouped).views[0].partition.breadcrumbKeys.length,0,"synthetic root is not a breadcrumb");
  const polar=grouped.createCoordinate({id:"p",type:"polar"}).editPartitionPlot({coordinate:"p",reverseU:true,reverseV:true,labels:{minArcLength:1e4}});
  assert.ok(polar.graphicSpec.objects.partitionPlot.items.every(item=>item.type!=="text"));
  assert.ok(JSON.stringify(exportAccessibleData(polar)).includes("Numeric child"));
});

test("partition mapping edits reject malformed closed options without state or trace changes",()=>{
 const p=source().createPartitionPlot(),before=serializeProgram(p);
 const patches=[{orientation:"diagonal"},{reverseU:1},{reverseV:null},{padding:[]},{padding:[0]},{padding:"none"},{innerRadius:-1},
  {outerRadius:0},{startAngle:Infinity},{sweep:361},{direction:"left"},{radiusPolicy:"sqrt"},{rootVisible:1},{prunedSelection:"erase"},
  {labels:{minWidth:undefined}},{labels:{minArcLength:-1}},{focus:{}},{focus:{key:"a",extra:true}},{clip:undefined},{padding:[0,Infinity]}];
 for(const patch of patches) assert.throws(()=>p.editPartitionPlot(patch),JSON.stringify(patch));
 assert.equal(serializeProgram(p),before);
});

test("prepared and parameter source revisions preflight focused partition geometry and selections together",async()=>{
 const base=chart().createCanvas(),sourceRows=rows.map(row=>({...row,v:row.v??0}));
 const response=values=>({text:JSON.stringify(values),mimeType:"application/json",encoding:"utf-8"});
 const prepared=await prepareDataUpdate(base,{kind:"create",id:"raw",keyField:"id",source:{kind:"named",name:"nodes",format:"json"}},
  {requestToken:"create",resolveNamed:async()=>response(sourceRows)});
 const p=base.applyDataUpdate({prepared,requestToken:"create"}).createParameter({id:"factor",value:1})
  .createComputedData({id:"computed",source:"raw",as:"scaled",expression:{version:2,registry:"standard@1",root:{type:"binary",op:"multiply",left:{type:"field",name:"v"},right:{type:"parameter",id:"factor"}}}})
  .createHierarchyData({id:"h",data:"computed",key:"id",parent:"parent",value:"scaled"}).layoutHierarchy({id:"l",method:"partition"})
  .createPartitionPlot({focus:{key:"a1"},labels:{}}).selectMarks({id:"chosen",field:"id",op:"eq",value:"b"});
 const saved=serializeProgram(p),q=p.editParameter({target:"factor",value:2});
 assert.equal(item(q,"a1").fields.value,4);assert.equal(item(q,"b").key,item(p,"b").key);
 assert.equal(q.semanticSpec.resources.find(r=>r.kind==="layout").revision,1);
 const update=await prepareDataUpdate(q,{kind:"revise",target:"raw",id:"fresh"},{requestToken:"revise",resolveNamed:async()=>response(sourceRows.filter(row=>row.id!=="a1"))});
 const next=q.applyDataUpdate({prepared:update,requestToken:"revise"});
 assert.equal(inspectProgram(next).views[0].partition.recovery.reason,"ancestor");
 assert.equal(item(next,"a2").fields.value,8);
 assert.deepEqual(resolveStoredSelection(next,"chosen").keys,resolveStoredSelection(p,"chosen").keys);
 assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))),renderToSVG(next));
 assert.throws(()=>q.editParameter({target:"factor",value:-1}),/nonnegative|negative/);
 const invalid=await prepareDataUpdate(q,{kind:"revise",target:"raw",id:"invalid"},{requestToken:"bad",resolveNamed:async()=>response([{id:"a",parent:"missing",v:1}])});
 assert.throws(()=>q.applyDataUpdate({prepared:invalid,requestToken:"bad"}),/parent/);
 assert.equal(serializeProgram(p),saved);
});
