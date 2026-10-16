import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { mapSequentialColors } from "../../../../src/grammar/scales/color.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";

const range = ["#000000", "#ffffff"];
const rows = (values = [0, 25, 100]) => values.map((value, i) => ({ x:i + 1, y:i + 2, value, group:i < 2 ? "A" : "B" }));
const fills = (p, id = "points", prop = "fill") => p.graphicSpec.objects[id].items.map(item => item.properties[prop]);
const scale = extra => ({ type:"sqrt", range, ...extra });
function plot(values = [0, 25, 100], options = {}, guides = false, factory = chart) {
  return factory().createCanvas({ width:640, height:440, margin:100 }).createData({ values:rows(values) })
    .createScatterPlot({ id:"points", x:"x", y:"y", color:{ field:"value", fieldType:"quantitative", scale:scale(options) }, guides });
}
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`);

test("square-root color stores raw data and domains while mapping signed square roots", () => {
  const p = plot();
  assert.deepEqual(fills(p), ["#000000", "#808080", "#ffffff"]);
  assert.deepEqual(p.resolvedScales.color.domain, [0,100]);
  assert.equal(p.semanticSpec.scales.find(s=>s.id==="color").exponent, undefined);
  assert.deepEqual(p.semanticSpec.datasets[0].values, rows());
  assert.deepEqual(fills(plot([-100,-25,0])), ["#000000","#808080","#ffffff"]);
  assert.deepEqual(fills(plot([-100,0,100])), ["#000000","#808080","#ffffff"]);
  assert.deepEqual(fills(plot([0,25,100], {domain:[100,0]})), ["#ffffff","#808080","#000000"]);
  assert.deepEqual(fills(plot([0,25,100], {reverse:true})), ["#ffffff","#808080","#000000"]);
});

test("square-root mapper clamps proportions, preserves unknown, and is monotone", () => {
  const values = [-25,0,25,100,225];
  assert.deepEqual(mapSequentialColors(values,[0,100],range,{type:"sqrt",clamp:true}), ["#000000","#000000","#808080","#ffffff","#ffffff"]);
  const colors = mapSequentialColors(Array.from({length:101},(_,i)=>i),[0,100],range,{type:"sqrt"});
  const bytes = colors.map(c=>parseInt(c.slice(1,3),16));
  assert.ok(bytes.every((b,i)=>i===0 || b >= bytes[i-1]));
  assert.deepEqual(mapSequentialColors([NaN,25],[0,100],range,{type:"sqrt",unknown:"red"}), ["red","#808080"]);
  for (const domain of [[0,0],[0,Infinity],[NaN,1]]) assert.throws(()=>mapSequentialColors([0],domain,range,{type:"sqrt"}));
});

test("square-root color reuses every existing interpolation and palette", () => {
  for (const interpolate of ["rgb","hsl","hsl-long","lab","hcl","hcl-long","cubehelix","cubehelix-long"]) {
    const actual = plot([0,25,100],{interpolate});
    const sequential = plot([0,.5,1],{type:"sequential",interpolate});
    assert.deepEqual(fills(actual),fills(sequential));
  }
  assert.deepEqual(fills(plot([0,25,100],{range:undefined,palette:"viridis"})), fills(plot([0,.5,1],{type:"sequential",range:undefined,palette:"viridis"})));
});

test("square-root gradient tick positions and sampled symbols use the same mapping", () => {
  const p = plot([0,25,100], {}, {legend:{count:5}});
  const labels = p.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties);
  const low = labels.find(l=>l.text==="0"), high = labels.find(l=>l.text==="100"), middle = labels.find(l=>l.text==="20");
  close((low.y-middle.y)/(low.y-high.y), Math.sqrt(.2));
  const symbols = p.editLegend({representation:"symbols",values:[0,25,100]});
  assert.deepEqual(fills(symbols,"colorGradientSymbols"),fills(p));
  const changed = symbols.editColorScale({domain:[0,400]});
  assert.notDeepEqual(fills(changed),fills(symbols));
  assert.deepEqual(fills(changed,"colorGradientSymbols"),["#000000","#404040","#808080"]);
  const gradient = changed.editLegend({representation:"gradient"});
  assert.equal(gradient.graphicSpec.objects.colorGradientSymbols,undefined);
  assert.equal(gradient.graphicSpec.objects.colorGradientStrips.items.length,60);
  assert.deepEqual(deserializeProgram(serializeProgram(gradient)).graphicSpec,gradient.graphicSpec);
  assert.match(renderToSVG(symbols),/#808080/);
});

test("square-root color works for text, rect, aggregate bar and stroke", () => {
  const base = () => chart().createCanvas({width:640,height:440,margin:100}).createData({values:rows()});
  const color = {field:"value",fieldType:"quantitative",scale:scale()};
  const rect = base().createRectMark({id:"cells"}).encodeX({field:"x",fieldType:"ordinal"}).encodeY({field:"y",fieldType:"ordinal"}).encodeColor(color);
  const text = base().createTextMark({id:"labels"}).encodeChannels({target:"labels",channels:{x:{field:"x"},y:{field:"y"},text:{field:"value"}}}).encodeColor(color);
  const bar = base().createBarPlot({id:"bars",x:{field:"x",fieldType:"ordinal"},y:"value",color,guides:false});
  for (const [p,id] of [[rect,"cells"],[text,"labels"]]) assert.deepEqual(fills(p,id),fills(plot()));
  assert.deepEqual(fills(bar,"bars"),["#808080","#ffffff"]); // Zero-height aggregate has no painted rect.
  const stroke = base().createScatterPlot({id:"points",x:"x",y:"y",guides:false}).encodeStroke(color).createLegend({channels:["stroke"]});
  assert.deepEqual(fills(stroke,"points","stroke"),fills(plot()));
  assert.ok(stroke.graphicSpec.objects.strokeGradientStrips.items.length>0);
  const edited = stroke.editStrokeScale({target:"points",domain:[0,400]});
  assert.deepEqual(fills(edited,"points","stroke"),["#000000","#404040","#808080"]);
});

test("square-root type transitions clean parameters and preserve source programs", () => {
  const p = plot([1,25,100],{type:"log"},{legend:{count:3}}), before = JSON.stringify(p);
  const q = p.editColorScale({type:"sqrt"});
  assert.equal(q.resolvedScales.color.base,undefined);
  assert.equal(q.semanticSpec.scales.find(s=>s.id==="color").exponent,undefined);
  assert.equal(JSON.stringify(p),before);
  assert.equal(q.editColorScale({type:"symlog"}).resolvedScales.color.constant,1);
  assert.equal(q.editColorScale({type:"sequential"}).resolvedScales.color.type,"sequential");
  assert.throws(()=>q.editColorScale({type:"quantize",range:["red","blue"]}),/custom family settings/);
  assert.equal(q.removeLegend({}).editColorScale({type:"quantize",range:["red","blue"]}).resolvedScales.color.type,"quantize");
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});

test("square-root invalid parameters and temporal consumers reject atomically", () => {
  const p = plot(), before = JSON.stringify(p);
  for (const patch of [{exponent:.5},{base:10},{constant:1},{midpoint:25},{domain:[0,0]},{domain:[0,Infinity]}]) {
    assert.throws(()=>p.editColorScale(patch)); assert.equal(JSON.stringify(p),before);
  }
  for (const extra of [{exponent:.5},{base:10},{constant:1},{midpoint:25}]) assert.throws(()=>plot([0,25,100],extra));
  assert.throws(()=>p.encodeColor({field:"value",fieldType:"temporal",scale:scale()}),/quantitative/);
  assert.throws(()=>p.encodeStroke({field:"value",fieldType:"temporal",scale:scale()}),/quantitative/);
  assert.equal(JSON.stringify(p),before);
});

test("square-root direct numeric and color scales retain distinct range contracts", () => {
  const color = chart().createScale({id:"c",type:"sqrt",domain:[0,100],range});
  assert.equal(color.semanticSpec.scales[0].interpolate,"rgb");
  assert.equal(color.editScale({id:"c",interpolate:"hcl"}).semanticSpec.scales[0].interpolate,"hcl");
  const numeric = chart().createScale({id:"x",type:"sqrt",domain:[0,100],range:[0,300]});
  assert.equal(numeric.semanticSpec.scales[0].interpolate,undefined);
  assert.throws(()=>numeric.editScale({id:"x",interpolate:"hcl"}),/interpolate/);
});

test("square-root creation is consistent in Basic and Full with explicit transition limits", () => {
  assert.deepEqual(fills(plot()), fills(plot([0,25,100],{},false,basicChart)));
  const basic = plot([0,25,100],{},false,basicChart);
  assert.throws(()=>basic.encodeColor({field:"value",fieldType:"quantitative",scale:{type:"sequential"}}),/Full/);
});

test("square-root facet shared legend and child colors survive persistence", () => {
  const p = plot([0,25,100],{domain:[0,100]},false).facet({field:"group",guides:{legend:"shared"}});
  assert.match(renderToSVG(p),/#808080/);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
});


test("square-root legend removal, restoration and repeat preserve shared scale policy", () => {
  const p = plot([0,25,100],{domain:[0,100]},{legend:{representation:"symbols",values:[0,25,100]}});
  const removed = p.removeLegend({});
  assert.equal(removed.graphicSpec.objects.colorGradientSymbols,undefined);
  const restored = deserializeProgram(serializeProgram(removed)).createLegend({representation:"symbols",values:[0,25,100]});
  assert.deepEqual(fills(restored,"colorGradientSymbols"),fills(p));
  const repeated = restored.repeatCharts({channel:"x",fields:["x","y"],guides:{legend:"shared"}});
  assert.match(renderToSVG(repeated),/#808080/);
  assert.deepEqual(deserializeProgram(serializeProgram(repeated)).graphicSpec,repeated.graphicSpec);
});
