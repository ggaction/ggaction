import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../../src/persistence.js";
import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
const rows = [{ x: 0, y: 2, c: "A", r: "north", text: "First" }, { x: 1, y: 4, c: "B", r: "south", text: "Second" }];
const base = (factory = chart) => factory().createCanvas({ width: 340, height: 260, margin: 30 }).createData({ id: "rows", values: rows });
const recipes = [
  ["bar", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "y" })],
  ["point", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rect", p => p.encodeX({ field: "c", fieldType: "nominal" }).encodeY({ field: "r", fieldType: "nominal" })],
  ["arc", p => p.encodeTheta({ field: "c", aggregate: "count" })],
  ["area", p => p.encodeX({ field: "x" }).encodeYRange({ lower: "y", upper: { datum: 0 } }).layoutSeries({ mode: "overlay" })],
  ["text", p => p.encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ field: "text" })],
  ["line", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })],
  ["rule", p => p.encodeX({ field: "x", fieldType: "quantitative" }).encodeYRange({ lower: { datum: 0 }, upper: "y", fieldType: "quantitative" })],
  ["tick", p => p.encodeX({ field: "x" }).encodeY({ field: "y" })]
];
const shadow = Object.freeze({ color: "rgba(20,40,60,.5)", offsetX: 3, offsetY: -2, blurRadius: 4 });
for (const [id, encode] of recipes) {
  const suffix = id[0].toUpperCase() + id.slice(1), create = `create${suffix}Mark`, edit = `edit${suffix}Mark`;
  test(`${id} shadow preserves one normalized appearance owner and original item grain`, () => {
    const p = encode(base()[create]()), snapshot = serializeProgram(p);
    const q = p[edit]({ shadow }), fromCreate = encode(base()[create]({ shadow }));
    assertEquivalentMeaning(q.graphicSpec, fromCreate.graphicSpec);
    assert.equal(q.semanticSpec.layers[0].mark.shadow, undefined);
    assert.deepEqual(id === "bar" ? q.markConfigs[id].barAppearance.shadow : q.markConfigs[id].shadow, shadow);
    assert.ok(q.graphicSpec.objects[id].items.length > 0);
    assert.ok(q.graphicSpec.objects[id].items.every(item => JSON.stringify(item.properties.shadow) === JSON.stringify(shadow)));
    assert.deepEqual(q.graphicSpec.objects[id].items.map(item => item.identity), p.graphicSpec.objects[id].items.map(item => item.identity));
    assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec, q.graphicSpec);
    assert.deepEqual(deserializeGraphic(serializeGraphic(q)).graphicSpec, q.graphicSpec);
    for (const replay of [q.editCanvas({ width: 360 }), q[edit]({ opacity: .5 }), q.reviseData({ source: "rows", id: "revised", values: rows.map(row => ({ ...row, y: row.y + 1 })) })]) {
      assert.ok(replay.graphicSpec.objects[id].items.every(item => item.properties.shadow.blurRadius === 4));
    }
    const removed = q[edit]({ shadow: false });
    assert.deepEqual(removed.graphicSpec, p.graphicSpec);
    assert.deepEqual(removed.semanticSpec, p.semanticSpec);
    assert.equal(serializeProgram(p), snapshot);
  });
  test(`${id} validates shadow before mutable caller reads and keeps pending style`, () => {
    const pending = base()[create]({ shadow: { color: "blue" } });
    assert.deepEqual(id === "bar" ? pending.markConfigs[id].barAppearance.shadow : pending.markConfigs[id].shadow,
      { color: "blue", offsetX: 0, offsetY: 0, blurRadius: 0 });
    const p = encode(pending), snapshot = serializeProgram(p);
    for (const shadow of [null, undefined, true, "blue", {}, { color: "currentColor" }, { color: "blue", offsetX: NaN }]) {
      assert.throws(() => p[edit]({ shadow }));
      assert.throws(() => base()[create]({ shadow }));
    }
    let reads = 0;
    assert.throws(() => p[edit]({ get shadow() { reads++; return false; } }), /accessors/);
    assert.equal(reads, 0);
    assert.equal(serializeProgram(p), snapshot);
  });
}

test("Basic and existing Text/Rect/Rule facades forward shadow without new semantic items", () => {
  for (const [id, encode] of recipes.filter(([id]) => ["point", "bar", "rect", "line"].includes(id))) {
    const suffix = id[0].toUpperCase() + id.slice(1);
    const p = encode(base(basicChart)[`create${suffix}Mark`]({ shadow }));
    assert.ok(p.graphicSpec.objects[id].items.every(item => item.properties.shadow.color === shadow.color));
  }
  const p = base().createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" });
  for (const q of [p.createMarkLabels({ field: "text", shadow }),
    p.createAnnotation({ text: "Note", anchor: "plot-center", shadow }),
    p.createReferenceBand({ y: [2, 3], shadow }),
    p.createStatisticalReference({ source: "point", axis: "y", statistics: [{ op: "min" }, { op: "max" }], shadow })]) {
    assert.ok(q.graphicSpec.objects[q.context.currentMark].items.every(item => item.properties.shadow.color === shadow.color));
  }
  for (const q of [base().createDotPlot({ category: "c", value: "y", guides: false, labels: { value: "Label", shadow } }),
    base().createECDFPlot({ field: "y", guides: false, labels: { value: "Label", shadow } }),
    base().createTextPlot({ x: "x", y: "y", text: "text", guides: false, style: { shadow } })]) {
    const layer = q.semanticSpec.layers.find(layer => layer.mark.type === "text");
    assert.ok(q.graphicSpec.objects[layer.id].items.every(item => item.properties.shadow.color === shadow.color));
  }
});

test("shadow occupancy is separated from source item bounds and survives shape highlights and legend replay", async () => {
  const { getMarkItems } = await import("../../../../src/inspection.js");
  const { resolveConcreteGraphicBounds } = await import("../../../../src/grammar/schemas/graphicBounds.js");
  const seed = base().editCanvas({width:460,margin:{left:30,right:120,top:30,bottom:30}}).createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeShape({ field: "c" });
  const p = seed.editPointMark({ shadow }).createLegend({ channels: ["shape"], title: false });
  assert.deepEqual(getMarkItems(p, { target: "point" }).map(item => item.bounds), getMarkItems(seed, { target: "point" }).map(item => item.bounds));
  assert.ok(p.graphicSpec.objects.seriesLegendSymbolPoints.items.every(item => item.properties.shadow.blurRadius === 4));
  const item = p.graphicSpec.objects.point.items[1], raw = resolveConcreteGraphicBounds(p.graphicSpec, item.id, undefined, {includeOwnerClips:false,includeEffects:false});
  const occupied = resolveConcreteGraphicBounds(p.graphicSpec, item.id, undefined, {includeOwnerClips:false});
  assert.deepEqual(occupied, { left: raw.left - 3, right: raw.right + 9, top: raw.top - 8, bottom: raw.bottom + 4 });
  const selected = p.selectMarks({ id: "chosen", target: "point", rows: { data: "rows", indices: [0] } });
  const highlighted = selected.highlightMarks({ selection: "chosen", shape: "square", fill: "red", dimOthers: false });
  assert.ok(highlighted.graphicSpec.objects.point.items.every(item => item.properties.shadow.color === shadow.color));
  assert.deepEqual(highlighted.removeMarkHighlight({ selection: "chosen" }).graphicSpec, p.graphicSpec);
  const removed = p.editPointMark({ shadow: false });
  assert.ok(removed.graphicSpec.objects.seriesLegendSymbolPoints.items.every(item => item.properties.shadow === undefined));
});

test("line and swatch legend samples inherit and remove shadow while explicit recipes retain their own style", () => {
  for (const id of ["line", "bar"]) {
    const encode = recipes.find(recipe => recipe[0] === id)[1], suffix = id[0].toUpperCase()+id.slice(1);
    const p = encode(base().editCanvas({width:460,margin:{left:30,right:120,top:30,bottom:30}})[`create${suffix}Mark`]({ shadow })).encodeColor({ field: "c" }).createLegend({ title: false });
    const symbols = Object.values(p.graphicSpec.objects).filter(object => object.items?.some(item => item.properties.shadow));
    assert.ok(symbols.length >= 2);
    const q = p[`edit${suffix}Mark`]({ shadow: false });
    assert.equal(Object.values(q.graphicSpec.objects).flatMap(object => object.items ?? []).filter(item => item.properties.shadow).length,0);
  }
});

test("facet, repeat, concat, conditional replay and labels retain normalized shadow across fresh codec loads", () => {
  const p = base().createPointMark({ id: "points", shadow }).encodeX({ field: "x" }).encodeY({ field: "y" })
    .createMarkLabels({ id: "labels", source: "points", field: "text", shadow });
  for (const composite of [p.facet({field:"c"}),p.repeatCharts({target:"points",channel:"y",fields:["x","y"]}),hconcat({programs:[p,p]})]) {
    const resized=composite.editCompositionLayout({gap:45});
    assert.deepEqual(deserializeProgram(serializeProgram(resized)).graphicSpec,resized.graphicSpec);
    for(const child of Object.values(resized.children))for(const id of ["points","labels"]){
      assert.ok(child.graphicSpec.objects[id].items.every(item=>item.properties.shadow.blurRadius===4));
    }
  }
  const when={version:2,registry:"standard@1",root:{type:"parameter",id:"enabled"}};
  const conditional=base().createParameter({id:"enabled",value:true}).createPointMark({shadow})
    .encodeX({field:"x"}).encodeY({field:"y"}).encodeOpacity({conditions:[{when,value:{value:.25}}],otherwise:{value:1}});
  const changed=conditional.editParameter({target:"enabled",value:false});
  assert.ok(changed.graphicSpec.objects.point.items.every(item=>item.properties.shadow.blurRadius===4&&item.properties.opacity===1));
  assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec,changed.graphicSpec);
});


test("combined color-shape legend preserves each source owner's shadow separately", () => {
  const p=base().editCanvas({width:460,margin:{left:30,right:130,top:30,bottom:30}})
    .createLineMark({id:"trend",shadow}).encodeX({field:"x"}).encodeY({field:"y"})
    .encodeColor({field:"c",scale:{id:"shared-color",domain:["A","B"],range:["red","blue"]}})
    .createPointMark({id:"dots",shadow:{color:"green",blurRadius:2}}).encodeX({field:"x"}).encodeY({field:"y"})
    .encodeColor({field:"c",scale:{id:"shared-color"}}).encodeShape({field:"c"})
    .createLegend({target:"dots",channels:["color","shape"],title:false});
  const symbols=Object.entries(p.graphicSpec.objects).filter(([id])=>id.includes("LegendSymbol"));
  const lines=symbols.flatMap(([,o])=>(o.items??[]).filter(i=>(i.type??o.type)==="line"));
  assert.ok(lines.length);assert.ok(lines.every(i=>i.properties.shadow.color===shadow.color));
});

test("endpoint and ECDF label outline forwarding shares the ordinary Text owner", () => {
  const outline={color:"white",width:4},labels={value:"Label",outline};
  for(const p of [base().createDotPlot({category:"c",value:"y",labels,guides:false}),
    base().createLollipopPlot({category:"c",value:"y",labels,guides:false}),
    base().createDumbbellPlot({category:"c",start:"x",end:"y",labels,guides:false}),
    base().createECDFPlot({field:"y",labels,guides:false})]){
    const layer=p.semanticSpec.layers.find(layer=>layer.mark.type==="text");
    assert.ok(p.graphicSpec.objects[layer.id].items.every(i=>i.properties.outline.width===4));
    assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
  }
});
