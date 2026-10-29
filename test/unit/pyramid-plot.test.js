import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolveTextBounds, textBoundsIntersect } from "../../src/core/textMetrics.js";
import { chart, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { pyramidSelectionPolicy } from "../../src/materialization/selection/policies/pyramid.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { createInteractionSession } from "../../src/interaction.js";

const rows = [{ id: "a", stage: "Same", value: 100, group: "x" }, { id: "b", stage: "Same", value: 60, group: "y" }, { id: "c", stage: "Last", value: 20, group: "x" }];
const base = () => chart().createCanvas({ width: 100, height: 90, margin: 0 }).createData({ id: "d", values: rows, keyField: "id" });
const build = options => base().createPyramidPlot({ stage: "stage", value: "value", labels: {fontSize:4}, ...options });
const bodies = program => program.graphicSpec.objects.pyramid.items.filter(item => item.identity.role === "body");
const labels = program => program.graphicSpec.objects.pyramid.items.filter(item => item.identity.role === "label");

test("Pyramid explicit stage call preserves row identity despite duplicate stage labels and uses literal trapezoids", () => {
  const shortest=chart().createCanvas().createData({values:rows}).createPyramidPlot({stage:"stage",value:"value"});
  assert.equal(labels(shortest)[0].properties.fontSize,12);
  const p = build(), items = getMarkItems(p, { target: "pyramid" });
  assert.deepEqual(bodies(p).map(item => item.properties.commands), [
    [{ op: "M", x: 0, y: 0 }, { op: "L", x: 100, y: 0 }, { op: "L", x: 80, y: 30 }, { op: "L", x: 20, y: 30 }, { op: "Z" }],
    [{ op: "M", x: 20, y: 30 }, { op: "L", x: 80, y: 30 }, { op: "L", x: 60, y: 60 }, { op: "L", x: 40, y: 60 }, { op: "Z" }],
    [{ op: "M", x: 40, y: 60 }, { op: "L", x: 60, y: 60 }, { op: "L", x: 60, y: 90 }, { op: "L", x: 40, y: 90 }, { op: "Z" }]
  ]);
  assert.equal(items.length, 3); assert.equal(new Set(items.map(item => item.key)).size, 3);
  assert.deepEqual(labels(p).map(item => item.properties.text), ["Same", "Same", "Last"]);
  for (const item of items) assert.equal(item.geometry.length, 2);
  assert.equal(inspectProgram(p).views[0].logicalDataItems, 3);
  assert.equal(basic().createPyramidPlot, undefined);
});

test("Pyramid area, directions and explicit percent meaning edit without mutating previous state", () => {
  const p = build(), before = serializeProgram(p);
  const q = p.editPyramidPlot({ encoding: "area", percentBase: "total", labels: { content: "percent", format: ".1%" } });
  assert.deepEqual(labels(q).map(item => item.properties.text), ["55.6%", "33.3%", "11.1%"]);
  assert.deepEqual(bodies(q).map(item => item.properties.commands[2].x - item.properties.commands[3].x), [80, 48, 16]);
  assert.equal(serializeProgram(p), before);
  for (const orientation of ["up", "right", "left", "down"]) {
    const next = q.editPyramidPlot({ orientation });
    assert.equal(next.semanticSpec.layers[0].pyramid.options.orientation, orientation);
    assert.deepEqual(getMarkItems(next, { target: "pyramid" }).map(item => item.key), getMarkItems(p, { target: "pyramid" }).map(item => item.key));
  }
  assert.equal(p.editPyramidPlot({ labels: false }).graphicSpec.objects.pyramid.items.length, 3);
  assert.equal(p.editCanvas({width:400,height:300}).editPyramidPlot({ labels: false }).editPyramidPlot({ labels: {} }).graphicSpec.objects.pyramid.items.length, 6);
  assert.throws(() => p.editPyramidPlot({ labels: { content: "percent" } }), /percentBase/);
});

test("Pyramid source revisions, resize and codec replay preserve stage lineage and completed graphics", () => {
  const p = build(), keys = getMarkItems(p, { target: "pyramid" }).map(item => item.key);
  const revised = p.reviseData({ source: "d", id: "d2", values: [...rows].reverse() });
  assert.deepEqual(getMarkItems(revised, { target: "pyramid" }).map(item => item.key), [...keys].reverse());
  assert.deepEqual(labels(revised).map(item => item.properties.text), ["Last", "Same", "Same"]);
  const resized = revised.editCanvas({ width: 200 });
  assert.equal(bodies(resized)[2].properties.commands[1].x, 200);
  assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec, resized.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(resized)).graphicSpec, resized.graphicSpec);
  assert.equal(bodies(p)[0].identity.lineage.revision, 0);
  assert.equal(bodies(revised)[0].identity.lineage.revision, 1);
});

test("Pyramid selection highlights one logical body-label pair, filters rows and drives actual hit", () => {
  const p = build(), selected = p.selectMarks({ id: "s", target: "pyramid", field: "id", op: "eq", value: "b" })
    .highlightMarks({ selection: "s", fill: "#ff0000", stroke: "#000000", strokeWidth: 2, bringToFront: true });
  const item = getMarkItems(selected, { target: "pyramid" }).find(item => item.fields.id === "b");
  const children = selected.graphicSpec.objects.pyramid.items.filter(child => child.identity.key === item.key);
  assert.deepEqual(children.map(child => child.properties.fill), ["#ff0000", "#ff0000"]);
  assert.equal(children[1].properties.stroke, undefined);
  assert.equal(selected.editCanvas({ width: 200 }).graphicSpec.objects.pyramid.items.at(-1).identity.key, item.key);
  const filtered = p.filterMarks({ target: "pyramid", field: "value", op: "gt", value: 50 });
  assert.equal(getMarkItems(filtered, { target: "pyramid" }).length, 2);
  const session = createInteractionSession({ program: p });
  session.dispatch({ type: "inspect", point: { x: 50, y: 45 } });
  assert.equal(session.getState().hit.target.ownerId, "pyramid");
  assert.equal(session.getState().hit.target.itemKey, item.key);
  session.destroy();
});

test("Pyramid empty and zero values retain their exact source meaning", () => {
  const empty = chart().createCanvas().createData({ id: "d", values: [] }).createPyramidPlot({ stage: "stage", value: "value" });
  assert.deepEqual(empty.graphicSpec.objects.pyramid.items, []);
  const zero = chart().createCanvas().createData({ id: "d", values: [{ stage: "A", value: 0 }, { stage: "B", value: 0 }] })
    .createPyramidPlot({ stage: "stage", value: "value", percentBase: "previous", labels: { content: "percent" } });
  assert.equal(labels(zero).length, 0); assert.equal(bodies(zero).length, 2);
  assert.ok(getMarkItems(zero, { target: "pyramid" }).every(item => item.properties.width === 0));
});

test("Pyramid color scales, legends, theme and effect removal use shared consumers", () => {
  let p = build({ color: "stage" }).editCanvas({ width: 500, height: 250, margin: { top: 20, right: 150, bottom: 20, left: 20 } }).createLegend();
  assert.equal(p.semanticSpec.guides.legend.color.scale, "pyramid-color");
  assert.equal(bodies(p)[0].properties.fill, bodies(p)[1].properties.fill);
  p = p.editPyramidPlot({ color: { field: "value", fieldType: "quantitative" } });
  assert.notEqual(bodies(p)[0].properties.fill, bodies(p)[1].properties.fill);
  p = p.editPyramidPlot({ color: false, stages: { outline: { color: "#000000", width: 2 }, shadow: { color: "#00000080", offsetX: 2, offsetY: 3, blurRadius: 1 }, opacity: .5 } });
  assert.equal(bodies(p)[0].properties.outline.width, 2);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec, p.graphicSpec);
  p = p.editPyramidPlot({ stages: { outline: false, shadow: false } });
  assert.equal(bodies(p)[0].properties.outline, undefined); assert.equal(bodies(p)[0].properties.shadow, undefined);
  const plain = build(), themed = plain.applyTheme({ theme: "dark" });
  assert.notEqual(bodies(themed)[0].properties.fill, bodies(build())[0].properties.fill);
  assert.deepEqual(themed.removeTheme().graphicSpec, plain.graphicSpec);
});

test("Pyramid facet projects source rows and materializes each viewport", () => {
  const p = build().editCanvas({ width: 300, height: 200, margin: 30 }).facet({ field: "group" });
  assert.deepEqual(Object.values(p.children).map(child => getMarkItems(child, { target: "pyramid" }).length), [2, 1]);
  const next = p.reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, value: row.value / 2 })) });
  assert.deepEqual(Object.values(next.children).map(child => getMarkItems(child, { target: "pyramid" }).length), [2, 1]);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
});

test("Pyramid rejects invalid final candidates before any state-changing child", () => {
  const calls = [];
  class Capturing extends ChartProgram { editSemantic(args) { calls.push(args); return super.editSemantic(args); } createGraphics(args) { calls.push(args); return super.createGraphics(args); } }
  const plain = base(), captured = new Capturing({ ...plain });
  for (const patch of [{ value: "missing" }, { gap: 100 }, { encoding: "area", lastStage: "point" }, { stages: { opacity: 2 } }, { labels: { content: "percent" } }]) {
    calls.length = 0;
    assert.throws(() => captured.createPyramidPlot({ stage: "stage", value: "value", ...patch }));
    assert.deepEqual(calls, []);
  }
  assert.throws(() => build().createPyramidPlot({ stage: "stage", value: "value" }), /explicit|exists|id/);
  assert.throws(() => build().editPyramidPlot({}), /nonempty/);
});


test("Pyramid source items survive absent graphics while concrete consumers reject stale identities", () => {
  const p = build(), layer = p.semanticSpec.layers[0];
  const source = pyramidSelectionPolicy.resolveSourceItems({ ...p, markConfigs: p.markConfigs, resolvedScales: p.resolvedScales, graphicSpec: { ...p.graphicSpec, objects: {canvas:p.graphicSpec.objects.canvas} } }, layer);
  assert.equal(source.length, 3); assert.equal(source[0].fields.id, "a"); assert.equal(source[0].graphicIds, undefined);
  assert.equal(exportAccessibleData(p, { target: "pyramid" }).views[0].rows.length, 3);
  assert.throws(() => pyramidSelectionPolicy.resolveItems({ ...p, markConfigs: p.markConfigs, resolvedScales: p.resolvedScales, graphicSpec: { objects: {canvas:p.graphicSpec.objects.canvas} } }, layer), /materialized/);
  assert.throws(() => pyramidSelectionPolicy.resolveItems({ ...p, markConfigs: p.markConfigs, resolvedScales: p.resolvedScales, graphicSpec: { objects: { canvas:p.graphicSpec.objects.canvas, pyramid: { items: [] } } } }, layer), /stale/);
  const fresh = { ...p, markConfigs: p.markConfigs, resolvedScales: p.resolvedScales, graphicSpec: { objects: { canvas:p.graphicSpec.objects.canvas, pyramid: { items: p.graphicSpec.objects.pyramid.items.map(({identity, ...item}) => item) } } } };
  assert.throws(() => pyramidSelectionPolicy.resolveItems(fresh,layer), /stale|identity/);
});

test("Pyramid color and viewport errors preserve immutable state and clip reset", () => {
  const p = build(), saved = serializeProgram(p);
  for (const color of [{ field: "stage", bad: 1 }, { field: "stage", fieldType: "invalid" }, { field: "" }, null]) assert.throws(() => p.editPyramidPlot({color}));
  assert.throws(() => p.editPyramidPlot({ clip: undefined }));
  assert.throws(() => p.materializePyramidPlot({ id: "pyramid", scales: 1 }));
  assert.throws(() => p.createPointMark({ id: "point", data:"d" }).materializePyramidPlot({id:"point"}), /Pyramid mark/);
  const q = p.editPyramidPlot({ clip:false }); assert.equal(q.graphicSpec.objects.pyramid.clip, undefined);
  assert.equal(q.editPyramidPlot({clip:true}).graphicSpec.objects.pyramid.clip.width, 100);
  assert.equal(p.editPyramidPlot({ color: { field:"stage",fieldType:"ordinal" } }).semanticSpec.layers[0].encoding.color.fieldType, "ordinal");
  const temporal=chart().createCanvas().createData({values:rows.map((row,i)=>({...row,when:`2024-01-0${i+1}`}))})
    .createPyramidPlot({stage:"stage",value:"value",color:{field:"when",fieldType:"temporal"}});
  assert.notEqual(bodies(temporal)[0].properties.fill,bodies(temporal)[2].properties.fill);
  assert.equal(serializeProgram(p), saved);
});

test("Pyramid rebind, scale edit, coordinate edit and removal retain explicit resource ownership", () => {
  const p=build({color:"stage"}).createData({id:"other",values:[{id:"z",stage:"Z",value:8}],keyField:"id"});
  const q=p.bindMarkData({target:"pyramid",data:"other"});
  assert.deepEqual(getMarkItems(q,{target:"pyramid"}).map(item=>item.fields.id),["z"]);
  assert.equal(q.graphicSpec.objects.pyramid.items.length,2);
  assert.throws(()=>q.removeData({id:"other"}),/referenc|consum|depend/i);
  const r=q.removeMark({target:"pyramid"}).removeData({id:"other"});
  assert.equal(r.graphicSpec.objects.pyramid,undefined);assert.equal(r.semanticSpec.datasets.some(d=>d.id==="other"),false);
  const framed=p.editCoordinate({target:"main",aspect:{mode:"frame",ratio:1}});
  assert.equal(framed.graphicSpec.objects.pyramid.clip.width,90);
  const edited=p.editColorScale({id:"pyramid-color",range:["#000000","#ffffff"]});
  assert.equal(bodies(edited)[0].properties.fill,"#000000");
});

test("Pyramid structured fill and exact label paint preserve shared coordinate bounds through resize",()=>{
  const pattern={type:"pattern",style:"diagonal",pitch:8,strokeWidth:2,foreground:"#ff0000",background:"#ffffff",coordinateSpace:"plot"};
  const radial={type:"radial-gradient",center:{x:.5,y:.5},focal:{x:.5,y:.5},radius:.5,stops:[{offset:0,color:"#ffffff"},{offset:1,color:"#000000"}]};
  const p=build({stages:{fill:pattern},labels:{fill:radial,fontSize:4}});
  assert.equal(bodies(p)[0].properties.fill.type,"pattern"); assert.equal(labels(p)[0].properties.fill.type,"radial-gradient");
  const q=p.editCanvas({width:200});assert.equal(bodies(q)[0].properties.commands[1].x,200);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});

test("Pyramid wrapped and outside labels stay inside the viewport and apart without changing stage geometry", () => {
  const source = [{id:"a",stage:"A long stage label",value:100},{id:"b",stage:"한글 단계",value:50},{id:"c",stage:"Returned",value:10}];
  for (const orientation of ["down","up","right","left"]) for (const shape of [{encoding:"area"},{lastStage:"point"}]) {
    const base = chart().createCanvas({width:600,height:600,margin:30}).createData({id:"d",values:source,keyField:"id"});
    const p = base.createPyramidPlot({stage:"stage",value:"value",orientation,...shape,labels:{fontSize:14}});
    const without = base.createPyramidPlot({stage:"stage",value:"value",orientation,...shape,labels:false});
    assert.deepEqual(bodies(p).map(g=>g.properties),bodies(without).map(g=>g.properties));
    const bounds=labels(p).map(g=>resolveTextBounds(g.properties));
    for(const bound of bounds) {
      assert.ok(bound.left >= 34 && bound.right <= 566 && bound.top >= 34 && bound.bottom <= 566);
    }
    for(let i=0;i<bounds.length;i++) for(let j=i+1;j<bounds.length;j++) assert.equal(textBoundsIntersect(bounds[i],bounds[j]),false);
    const last=labels(p).at(-1).properties;
    if(shape.lastStage) assert.ok(orientation === "down" || orientation === "up" ? last.x > 327 : last.y > 327);
  }
});

test("Pyramid wrapping keeps hard breaks, empty text and grapheme clusters as concrete lines", () => {
  for(const stage of ["", "   ", "  A   B  ", "A\n\nB", "👩‍👩‍👧‍👦👩‍👩‍👧‍👦", "가나다라마바"]) {
    const p=chart().createCanvas({width:200,height:300,margin:0}).createData({id:"d",values:[{stage:"A",value:100},{stage,value:10}]})
      .createPyramidPlot({stage:"stage",value:"value",labels:{fontSize:14}});
    if(stage === "") {assert.equal(labels(p).length,1);continue;}
    const label=labels(p).at(-1).properties;
    assert.equal(label.text,stage);
    if(stage === "  A   B  ") assert.deepEqual(label.lines.map(line=>line.text),["A","B"]);
    if(stage === "A\n\nB") assert.deepEqual(label.lines.map(line=>line.text),["A","","B"]);
    if(stage.startsWith("👩")) assert.ok((label.lines??[{text:label.text}]).every(line=>!line.text.startsWith("\u200d")&&!line.text.endsWith("\u200d")));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  }
});

test("Pyramid insufficient label width and line height fail before children, while labels false bypasses text layout", () => {
  const calls=[];
  class Capturing extends ChartProgram {
    editSemantic(args){calls.push(args);return super.editSemantic(args);}
    createGraphics(args){calls.push(args);return super.createGraphics(args);}
    editGraphics(args){calls.push(args);return super.editGraphics(args);}
  }
  const base=chart().createCanvas({width:12,height:12,margin:0}).createData({id:"d",values:[{stage:"Wide",value:1}]});
  for(const fontSize of [5,20]) {
    assert.throws(()=>new Capturing({...base}).createPyramidPlot({stage:"stage",value:"value",labels:{fontSize}}),/label cannot fit/);
    assert.deepEqual(calls,[]);
  }
  assert.equal(base.createPyramidPlot({stage:"stage",value:"value",labels:false}).graphicSpec.objects.pyramid.items.length,1);
  const good=build(); calls.length=0;
  assert.throws(()=>new Capturing({...good}).editPyramidPlot({labels:{fontSize:100}}),/label cannot fit/);
  assert.deepEqual(calls,[]);
});

test("Pyramid font preparation closes wrapping queries and rejects missing exact metrics before children", async () => {
  const bytes=new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf",import.meta.url)));
  const family="ggaction Metric Fixture",requestToken="pyramid-font";
  const decode=value=>Object.fromEntries(["contentHash","family","style","weight","metricsProviderVersion"].map(key=>[key,value[key]]));
  const measure=({asset,queries})=>({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,
    widths:queries.map(query=>[...query.text].reduce((n,char)=>n+(char === "A" ? .6 : char === "B" ? .8 : .25)*query.fontSize,0))});
  let p=chart().createCanvas({width:400,height:300,margin:20}).createData({id:"d",values:[{stage:"AB",value:100},{stage:"ABABABAB",value:10}]})
    .createPyramidPlot({stage:"stage",value:"value",encoding:"area",labels:{fontFamily:family,fontSize:12,fontWeight:400}});
  p=p.createFontResource({prepared:await prepareFontResource(p,{kind:"create",id:"font",uri:"fixture:font",mimeType:"font/ttf",
    expectedHash:createHash("sha256").update(bytes).digest("hex"),family,style:"normal",weight:400,metricsProviderVersion:"fixture@1"},
    {requestToken,load:()=>({bytes,mimeType:"font/ttf"}),decode}),requestToken});
  p=p.applyTextMetrics({prepared:await prepareTextMetrics(p,{id:"exact",fonts:["font"]},{requestToken,decode,measure}),requestToken});
  assert.ok(labels(p).at(-1).properties.lines.length > 1);
  assert.ok(p.materializationConfigs.textMetrics.measurements.some(query=>query.text === "AB"));
  for(const label of labels(p)) assert.ok(label.properties.font);
  const before=serializeProgram(p),calls=[];
  class Capturing extends ChartProgram {editSemantic(args){calls.push(args);return super.editSemantic(args);}createGraphics(args){calls.push(args);return super.createGraphics(args);}}
  assert.throws(()=>new Capturing({...p}).editPyramidPlot({labels:{fontSize:13}}),error=>error.assetCode === "metrics-required");
  assert.deepEqual(calls,[]);assert.equal(serializeProgram(p),before);
  assert.equal(p.editPyramidPlot({labels:false}).graphicSpec.objects.pyramid.items.length,2);
  assert.deepEqual(deserializeProgram(before).graphicSpec,p.graphicSpec);
});
