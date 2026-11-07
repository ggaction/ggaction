import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { createInteractionSession } from "../../src/interaction.js";
const rows = [{ id: 1, x: 0, y: 5, w: 2, g: "A" }, { id: "1", x: 10, y: 5, w: 6, g: "A" }, { id: "b0", x: 0, y: 2, w: 4, g: "B" }, { id: "b1", x: 10, y: 2, w: 8, g: "B" }];
const base = values => chart().createCanvas({ width: 300, height: 180, margin: 20 }).createData({ id: "d", keyField: "id", values: values ?? rows });
const options = { x: { field: "x", scale: { domain: [0, 10] } }, y: { field: "y", scale: { domain: [0, 10] } }, width: "w", groupBy: "g", guides: false, clip: false };
const build = patch => base().createTrailPlot({ ...options, ...patch });
const graphics = p => p.graphicSpec.objects.trail.items;
const items = p => getMarkItems(p, { target: "trail" });

test("Trail admits a shared Y frame and rejects independent create and edit before children", () => {
  const source = base().createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
  const shared = source.createTrailPlot({ ...options, y: { field: "y", scale: { id: "y" } } });
  assert.equal(shared.semanticSpec.layers.find(layer => layer.id === "trail").encoding.y.scale, "y");
  const calls = [];
  class Capturing extends ChartProgram {
    editSemantic(args) { calls.push("editSemantic"); return super.editSemantic(args); }
    createGraphics(args) { calls.push("createGraphics"); return super.createGraphics(args); }
    editGraphics(args) { calls.push("editGraphics"); return super.editGraphics(args); }
  }
  for (const [program, operation] of [
    [source, p => p.createTrailPlot(options)],
    [shared, p => p.editTrailPlot({ target: "trail", y: { field: "y", scale: { id: "other-y" } } })]
  ]) {
    const before = serializeProgram(program);
    assert.throws(() => operation(new Capturing({ ...program })), /requires one Y scale|overlaps an independent/);
    assert.deepEqual(calls, []);
    assert.equal(serializeProgram(program), before);
  }
});

test("Trail creates literal tapered fill geometry with source-series typed identity", () => {
  const p = build(); assert.equal(basic().createTrailPlot, undefined);
  assert.deepEqual(graphics(p)[0].properties.commands, [{ op: "M", x: 20, y: 91 }, { op: "L", x: 280, y: 93 }, { op: "L", x: 280, y: 87 }, { op: "L", x: 280, y: 87 }, { op: "L", x: 20, y: 89 }, { op: "L", x: 20, y: 91 }, { op: "Z" }]);
  assert.equal(items(p).length, 2); assert.equal(inspectProgram(p).views[0].logicalDataItems, 2);
  assert.deepEqual(items(p)[0].rows.map(row => row.rowKey), p.semanticSpec.datasets[0].rowKeys.slice(0, 2));
  assert.notEqual(items(p)[0].rows.map(row => row.rowKey)[0], items(p)[0].rows.map(row => row.rowKey)[1]);
  assert.equal(new Set(items(p).map(item => item.key)).size, 2);
  assert.deepEqual(exportAccessibleData(p, { target: "trail" }).views[0].rows.map(row => row.values["trail:width"]), [2, 6, 4, 8]);
});

test("Trail edit, source revision, Canvas and scales rematerialize immutable series", () => {
  const p = build(), before = serializeProgram(p), keys = items(p).map(item => item.key);
  const q = p.editTrailPlot({ width: 10, lineCap: "round", body: { fill: "#ff0000" } });
  assert.equal(q.semanticSpec.layers[0].trail.width.datum, 10); assert.equal(graphics(q)[0].properties.fill, "#ff0000");
  assert.deepEqual(items(q).map(item => item.key), keys); assert.equal(serializeProgram(p), before);
  const resized = p.editCanvas({ width: 500 }); assert.notDeepEqual(graphics(resized)[0].properties.commands, graphics(p)[0].properties.commands);
  assert.equal(graphics(resized)[0].properties.commands[1].y - graphics(resized)[0].properties.commands[2].y, 6);
  const revised = p.reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, w: row.w * 2 })) });
  assert.deepEqual(items(revised).map(item => item.key), keys);
  assert.equal(graphics(revised)[0].properties.commands[1].y - graphics(revised)[0].properties.commands[2].y, 12);
  assert.notDeepEqual(graphics(p.editScale({ id: "trail-y", domain: [0, 20] })), graphics(p));
});

test("Trail uses explicit computed width with source revision closure", () => {
  const p = base().createComputedData({ id: "wide", source: "d", as: "screenWidth", expression: { version: 2, registry: "standard@1", root: { type: "binary", op: "multiply", left: { type: "field", name: "w" }, right: { type: "literal", value: 2 } } } })
    .createTrailPlot({ ...options, data: "wide", width: "screenWidth" });
  assert.equal(graphics(p)[0].properties.commands[1].y - graphics(p)[0].properties.commands[2].y, 12);
  const q = p.reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, w: row.w * 2 })) });
  assert.equal(graphics(q)[0].properties.commands[1].y - graphics(q)[0].properties.commands[2].y, 24);
});

test("Trail gaps remain separate through selection filtering and closing", () => {
  const input = [{ id: 0, x: 0, y: 5, w: 2, g: "A" }, { id: 1, x: 3, y: 5, w: null, g: "A" }, { id: 2, x: 6, y: 5, w: 6, g: "A" }, { id: 3, x: 8, y: null, w: 6, g: "A" }, { id: 4, x: 10, y: 5, w: 4, g: "A" }];
  const p = base(input).createTrailPlot({ ...options, missing: "break", closed: true, lineCap: "round" });
  assert.equal(graphics(p).length, 3); assert.equal(items(p).length, 1); assert.equal(items(p)[0].geometry.length, 3);
  assert.deepEqual(items(p)[0].rows.map(row => row.rowKey), [0, 2, 4].map(i => p.semanticSpec.datasets[0].rowKeys[i]));
  const q = p.filterMarks({ target: "trail", field: "g", op: "eq", value: "A" });
  assert.equal(graphics(q).length, 3); assert.deepEqual(graphics(q).map(g => g.properties), graphics(p).map(g => g.properties));
  const empty = p.filterMarks({ target: "trail", field: "g", op: "eq", value: "absent" }); assert.equal(items(empty).length, 0);
});

test("Trail selection, highlight, labels and hit use the original series", () => {
  const p = build(), key = items(p)[0].key;
  const q = p.selectMarks({ id: "a", target: "trail", field: "g", op: "eq", value: "A" }).highlightMarks({ selection: "a", fill: "#ff0000", stroke: "#111111", offset: { x: 2, y: 3 } });
  assert.equal(graphics(q).find(g => g.identity.key === key).properties.fill, "#ff0000");
  assert.deepEqual(items(q).map(item => item.key).sort(), items(p).map(item => item.key).sort());
  const labeled = p.createMarkLabels({ source: "trail", field: "w", dx: -8 });
  assert.deepEqual(labeled.graphicSpec.objects["trail-labels"].items.map(item => [item.properties.text, item.properties.x, item.properties.y]), [["6",272,90],["8",272,132]]);
  const highlightedLabels = q.createMarkLabels({ source: "trail", field: "w", dx: -8 });
  assert.ok(highlightedLabels.graphicSpec.objects["trail-labels"].items.some(item => item.properties.text === "6" && item.properties.x === 272 && item.properties.y === 90));
  assert.equal(graphics(highlightedLabels).find(item => item.identity.key === key).properties.commands[0].x, 22);
  const session = createInteractionSession({ program: p }); session.dispatch({ type: "inspect", point: { x: 150, y: 90 } });
  assert.equal(session.getState().hit.target.itemKey, key); session.destroy();
});

test("Trail Polar projection and closed seam preserve a hollow ribbon", () => {
  const p = base([{ id: 0, a: 0, r: 1, w: 8 }, { id: 1, a: 90, r: 1, w: 8 }, { id: 2, a: 180, r: 1, w: 8 }, { id: 3, a: 270, r: 1, w: 8 }])
    .createTrailPlot({ theta: { field: "a", scale: { domain: [0, 360] } }, radius: { field: "r", scale: { domain: [0, 1] } }, width: "w", closed: true, guides: false });
  assert.equal(p.semanticSpec.coordinates[1]?.type ?? p.semanticSpec.coordinates[0].type, "polar");
  assert.equal(graphics(p)[0].properties.commands.filter(command => command.op === "Z").length, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
});

test("Trail colors, theme, nested composition and facet preserve native ownership", () => {
  const p = build({ color: "g" }); assert.notEqual(graphics(p)[0].properties.fill, graphics(p)[1].properties.fill);
  const native = build(), q = native.applyTheme({ theme: "dark" }); assert.notEqual(graphics(q)[0].properties.fill, graphics(native)[0].properties.fill);
  assert.deepEqual(q.removeTheme().graphicSpec, native.graphicSpec);
  const facets = p.facet({ field: "g" }); assert.deepEqual(Object.values(facets.children).map(child => items(child).length), [1, 1]);
  const joined = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const edited = joined.editTrailPlot({ target: { id: "trail", childPath: ["left"] }, width: 20 });
  assert.deepEqual(edited.children.right.graphicSpec, joined.children.right.graphicSpec);
  assert.notDeepEqual(edited.children.left.graphicSpec, joined.children.left.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(p)).graphicSpec, p.graphicSpec);
});

test("Trail validates the complete candidate before state-changing children", () => {
  const p = base(), old = serializeProgram(p), calls = [];
  class Capturing extends ChartProgram {
    editSemantic(args) { calls.push(args); return super.editSemantic(args); }
    createCoordinate(args) { calls.push(args); return super.createCoordinate(args); }
    createGraphics(args) { calls.push(args); return super.createGraphics(args); }
    editGraphics(args) { calls.push(args); return super.editGraphics(args); }
  }
  for (const patch of [{ width: -1 }, { width: "absent" }, { x: { field: "x", aggregate: "sum" } }, { body: { strokeWidth: -1 } }, { curve: "bogus" }, { theta: "x", radius: "y" }, { color: { field: "w", fieldType: "quantitative" } }]) {
    assert.throws(() => new Capturing({ ...p }).createTrailPlot({ ...options, ...patch })); assert.deepEqual(calls, []);
  }
  let access = false;
  assert.throws(() => new Capturing({ ...p }).createTrailPlot({ ...options, x: { get field() { access = true; return "x"; } } }));
  assert.equal(access, false); assert.deepEqual(calls, []); assert.equal(serializeProgram(p), old);
  assert.throws(() => build().editTrailPlot({}), /nonempty/);
});


test("Trail common effects preserve ribbon geometry and remove explicitly", () => {
  const pattern = { type: "pattern", style: "diagonal", pitch: 8, strokeWidth: 2, foreground: "#ff0000", background: "#ffffff", coordinateSpace: "plot" };
  const plain = build(), styled = plain.editTrailPlot({ blend: "multiply", body: { fill: pattern, opacity: .6, outline: { color: "#111111", width: 2 }, shadow: { color: "#000000", blurRadius: 2, offsetX: 3, offsetY: 4 } } });
  assert.deepEqual(graphics(styled)[0].properties.commands, graphics(plain)[0].properties.commands);
  assert.equal(graphics(styled)[0].properties.fill.type, "pattern"); assert.equal(graphics(styled)[0].properties.blend, "multiply");
  assert.ok(graphics(styled)[0].properties.outline); assert.ok(graphics(styled)[0].properties.shadow);
  const removed = styled.editTrailPlot({ blend: "normal", body: { outline: false, shadow: false } });
  assert.equal(graphics(removed)[0].properties.blend, undefined); assert.equal(graphics(removed)[0].properties.outline, undefined); assert.equal(graphics(removed)[0].properties.shadow, undefined);
  assert.deepEqual(deserializeProgram(serializeProgram(styled)).graphicSpec, styled.graphicSpec);
});

test("Trail direct order, continuous series color and legend edits share existing scale owners", () => {
  const input=rows.map(row=>({...row,tint:row.g==="A"?1:4}));
  const p=chart().createCanvas({width:600,height:300,margin:{left:60,right:200,top:60,bottom:60}}).createData({id:"d",values:input,keyField:"id"})
    .createTrailPlot({...options,order:{field:"x",order:"descending"},color:{field:"tint",fieldType:"quantitative",scale:{type:"log",domain:[1,4]}},guides:{axes:false,grid:false,legend:{}}});
  assert.ok(p.semanticSpec.guides.legend); assert.equal(graphics(p)[0].properties.commands[0].x,400);
  const q=p.editTrailPlot({order:false,color:{field:"g",fieldType:"nominal"}});
  assert.equal(q.semanticSpec.layers[0].encoding.pathOrder,undefined);
  assert.notEqual(graphics(q)[0].properties.fill,graphics(q)[1].properties.fill);
  const removed=q.editTrailPlot({color:false,groupBy:false,clip:false});
  assert.equal(removed.semanticSpec.layers[0].encoding.group,undefined);assert.equal(removed.semanticSpec.layers[0].encoding.color,undefined);
  assert.equal(removed.graphicSpec.objects.trail.clip,undefined);assert.equal(items(removed).length,1);
  const changed=p.editTrailPlot({order:"x",body:{opacity:0}});assert.equal(changed.semanticSpec.layers[0].encoding.pathOrder.order,"ascending");
  assert.ok(graphics(changed).every(item=>item.properties.opacity===0));
});

test("Trail categorical and temporal positions retain domain order and explicit source units", () => {
 const p=base([{id:0,x:"first",y:1,w:2},{id:1,x:"second",y:2,w:4}]).createTrailPlot({x:{field:"x",fieldType:"nominal",scale:{type:"point",domain:["second","first"]}},y:"y",width:"w",guides:false});
 assert.deepEqual(items(p)[0].rows.map(row=>row.rowKey),p.semanticSpec.datasets[0].rowKeys);
 const commands=graphics(p)[0].properties.commands;assert.deepEqual([(commands[0].x+commands[4].x)/2,(commands[0].y+commands[4].y)/2],[85,20]);
 const q=base([{id:0,x:0,y:1,w:2},{id:1,x:1,y:2,w:4}]).createTrailPlot({x:{field:"x",fieldType:"temporal",temporalUnit:"timestamp"},y:"y",width:"w",guides:false});
 assert.equal(q.semanticSpec.layers[0].encoding.x.temporalUnit,"timestamp");assert.deepEqual(q.resolvedScales["trail-x"].domain,[0,1]);
 assert.throws(()=>p.editTrailPlot({order:{field:"x",extra:true}}));assert.throws(()=>p.editTrailPlot({color:{field:"x",fieldType:"bad"}}));
 assert.throws(()=>p.materializeTrailPlot({id:"trail",scales:"yes"}));assert.throws(()=>p.materializeTrailPlot());
 assert.deepEqual(p.materializeTrailPlot({id:"trail",scales:false}).graphicSpec,p.graphicSpec);
 assert.throws(()=>base().createPointMark({id:"point"}).materializeTrailPlot({id:"point"}),/Trail mark/);
});
