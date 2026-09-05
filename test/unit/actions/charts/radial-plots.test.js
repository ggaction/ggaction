import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { resolveArcItems } from "../../../../src/materialization/selection/items/arc.js";
const rows = [{ category: "A", value: 1 }, { category: "A", value: 1 }, { category: "B", value: 3 }, { category: "C", value: 4 }, { category: "Z", value: 0 }];
const base = () => chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ id: "source", values: rows });
const options = { category: "category", value: "value", aggregate: "sum" };
const state = p => ({ semantic: p.semanticSpec, graphic: p.graphicSpec, scales: p.resolvedScales, guides: p.guideConfigs });
function reject(p, call, pattern) { const before = state(p); const trace = p.trace; assert.throws(() => call(p), pattern); assert.deepEqual(state(p), before); assert.equal(p.trace, trace); }
for (const [operation, id, mapping] of [["createRosePlot", "rosePlot", "area"], ["createRadialBarPlot", "radialBarPlot", "radius-length"]]) {
  test(`${operation} shortest call counts categories and produces complete Polar guides`, () => {
    const p = base()[operation]({ category: "category" });
    assert.equal(p.semanticSpec.layers[0].id, id);
    assert.equal(p.semanticSpec.layers[0].encoding.radius.field, undefined);
    assert.deepEqual(p.resolvedScales.radius.domain, [0, 2]);
    assert.equal(p.resolvedScales.radius.radialMapping, mapping);
    assert.equal(p.graphicSpec.objects[id].items.length, 4);
    assert.deepEqual(Object.keys(p.guideConfigs.axis), ["theta", "radius"]);
    assert.equal(p.graphicSpec.objects.radialAxisTitle.properties.text, "count");
    assert.equal(p.graphicSpec.objects.colorLegendLabels.items.length, 4);
    assert.equal(typeof basicChart()[operation], "undefined");
    reject(p, q => q[operation]({ category: "category" }));
  });
  test(`${operation} retains aggregate grain, zero categories, and source identities`, () => {
    const p = base()[operation]({ ...options, radiusScale: { range: [70, 140] } });
    const items = resolveArcItems(p, p.semanticSpec.layers[0], p.semanticSpec.datasets[0]);
    assert.deepEqual(items.map(item => item.members), [[rows[0], rows[1]], [rows[2]], [rows[3]]]);
    assert.deepEqual(p.resolvedScales.theta.domain, ["A", "B", "C", "Z"]);
    assert.deepEqual(p.semanticSpec.datasets[0].values, rows);
    assert.equal(p.graphicSpec.objects.radialAxisTitle.properties.text, "sum(value)");
    const lower = p.trace.children.at(-1).children.map(child => child.op);
    for (const expected of ["createArcMark", "encodeTheta", "encodeR", "encodeColor", "createGuides"]) assert.ok(lower.includes(expected));
  });
  test(`${operation} replays aggregate labels, filtering and highlights through existing consumers`, () => {
    const p = base()[operation]({ ...options })
      .createTextMark({ id: "labels" }).encodeText({ target: "labels", field: "value" });
    const before = JSON.stringify(p);
    assert.deepEqual(p.graphicSpec.objects.labels.items.map(item => item.properties.text), ["2", "3", "4"]);
    const highlighted = p.highlightMarks({ target: id,
      select: { field: "category", op: "eq", value: "A" }, fill: "#123456", bringToFront: false })
      .editScale({ id: "radius", domain: [0, 8] }).editCanvas({ width: 1100 });
    assert.equal(highlighted.graphicSpec.objects[id].items.find(item => item.id === `${id}:0`).properties.fill, "#123456");
    assert.deepEqual(highlighted.graphicSpec.objects.labels.items.map(item => item.properties.text), ["2", "3", "4"]);
    const filtered = p.filterMarks({ target: id, field: "category", op: "oneOf", values: ["A", "B"] });
    assert.deepEqual(filtered.resolvedScales.radius.domain, [0, 3]);
    assert.equal(filtered.resolvedScales.radius.radialMapping, mapping);
    assert.deepEqual(filtered.graphicSpec.objects.labels.items.map(item => item.properties.text), ["2", "3"]);
    assert.deepEqual(filtered.graphicSpec.objects.colorLegendLabels.items.map(item => item.properties.text), ["A", "B"]);
    assert.equal(filtered.graphicSpec.objects[id].items.length, 2);
    assert.equal(JSON.stringify(p), before);
  });
  test(`${operation} retains measured child state in composition and rejects unsupported Arc facets`, () => {
    const p = base()[operation]({ ...options });
    const before = JSON.stringify(p);
    const smaller = p.editScale({ id: "radius", domain: [0, 8] });
    const composed = hconcat({ programs: [{ id: "original", program: p }, { id: "smaller", program: smaller }] });
    const edited = composed.editCompositionLayout({ gap: 32 });
    for (const current of [composed, edited]) {
      assert.equal(current.children.original.resolvedScales.radius.radialMapping, mapping);
      assert.equal(current.children.smaller.resolvedScales.radius.radialMapping, mapping);
      assert.deepEqual(current.children.original.resolvedScales.radius.domain, [0, 4]);
      assert.deepEqual(current.children.smaller.resolvedScales.radius.domain, [0, 8]);
      assert.equal(Object.values(current.graphicSpec.objects).filter(object =>
        object.type === "path" && object.items?.length === 3).length, 2);
    }
    reject(p, q => q.facet({ field: "category" }), /does not support.*arc/);
    assert.equal(JSON.stringify(p), before);
  });
  test(`${operation} validates its closed options and measurement constraints atomically`, () => {
    for (const args of [{}, {category:"category",value:"value"}, {...options,aggregate:"count"},
      {...options,mapping:"area"}, {...options,arc:{padAngle:1}}, {...options,arc:{fill:"red"}},
      {...options,radiusScale:{nice:true}}, {...options,radiusScale:{zero:false}}, {...options,radiusScale:{type:"sqrt"}},
      {...options,radiusScale:{range:[70,140]},arc:{innerRadius:0.2}},
      {...options,category:{field:"category",scale:{paddingInner:0.1}}},
      {...options,guides:{axes:{x:{}}}}, {...options,guides:{grid:{horizontal:{}}}}
    ]) reject(base(), p => p[operation](args));
    const p = base()[operation]({ ...options, color:false, arc:{fill:"purple"}, guides:false });
    assert.deepEqual(p.semanticSpec.guides, {});
    assert.ok(p.graphicSpec.objects[id].items.every(item => item.properties.fill === "purple"));
  });
}

test("measured facades reuse compatible Polar guides and preserve explicit styles", () => {
  const p = base().createRosePlot({ ...options, color:false, guides:{
    axes:{radius:{angle:45,ticksAndLabels:{values:[0,2,4]},title:{text:"Amount",position:"outside"}}},
    grid:{theta:{},radial:{values:[0,2,4],color:"pink"}}, legend:false
  }});
  const expected = p.createRosePlot({ ...options, id:"other", color:false, guides:false });
  const actual = p.createRosePlot({ ...options, id:"other", color:false });
  assert.deepEqual(state(actual),state(expected));
  reject(p, q => q.createRosePlot({ ...options,id:"other",color:false,guides:{axes:{radius:{angle:90}}} }));
  reject(p, q => q.createRosePlot({ ...options,id:"other",color:false,guides:{axes:{radius:{title:{text:"Different"}}}} }), /conflict/);
  reject(p, q => q.createRosePlot({ ...options,id:"other",color:false,guides:{grid:{radial:{color:"gray"}}} }), /conflict/);
});

test("Polar facade scopes validate coordinate and scale ownership", () => {
  const p = base().createRosePlot({ ...options,color:false });
  for (const extra of [
    {coordinate:"foreign"}, {radiusScale:{id:"otherRadius"}},
    {guides:{axes:{radius:{scale:"foreign"}}}}, {guides:{grid:{radial:{coordinate:"foreign"}}}},
    {guides:{legend:{target:"foreign"}}}
  ]) reject(p, q => q.createRosePlot({ ...options,id:"other",color:false,...extra }));
});

test("Polar guide requests preserve disabled branches and nominal theta grid values", () => {
  const p = base().createRadialBarPlot({ ...options, color:false, guides:{axes:false,legend:false,grid:{theta:{values:["A","C"]},radial:false}} });
  assert.equal(p.guideConfigs.axis, undefined);
  assert.equal(p.guideConfigs.grid.radial, undefined);
  assert.deepEqual(p.guideConfigs.grid.theta.values,["A","C"]);
});

test("Polar facade fills missing axis components without changing existing labels", () => {
  const p = base().createRosePlot({ ...options, color:false, guides:false }).createRadialAxisLabels({ values:[0,2,4] });
  const q = p.createRosePlot({ ...options,id:"other",color:false,guides:{grid:false,legend:false} });
  assert.deepEqual(q.guideConfigs.axis.radius.labels,p.guideConfigs.axis.radius.labels);
  assert.deepEqual(q.guideConfigs.axis.radius.ticks.values,[0,2,4]);
  assert.ok(q.guideConfigs.axis.radius.line);
  assert.ok(q.guideConfigs.axis.radius.title);
});
