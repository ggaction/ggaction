import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../../src/index.js";
import { chart as basicChart } from "../../../src/basic.js";
import { measureTextWidth, resolveTextBounds } from "../../../src/core/textMetrics.js";
import { normalizeTextMetricProfile } from "../../../src/core/textMetricProfile.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { buildActionRelationshipPrograms } from "../../../scripts/action-relationship-source.js";

const empty = { schemaVersion: 1, id: "host", measurements: [] };
const measurement = (text, width, overrides = {}) => ({ text, width,
  fontFamily: "sans-serif", fontSize: 20, fontWeight: 400, ...overrides });
const profile = { ...empty, measurements: [measurement("Alpha Beta", 180), measurement("Alpha", 80), measurement("Beta", 80)] };
function titled() {
  return chart().createCanvas({ width: 500, height: 350, margin: 80 })
    .createTitle({ text: "Alpha Beta", maxWidth: 100, titleStyle: { fontSize: 20, fontWeight: 400 } });
}
function svg(program) { return renderToSVG(program, { resourceNamespace: "metrics" }); }

test("text metrics match exact normalized font and text combinations and keep deterministic fallback", () => {
  const p = normalizeTextMetricProfile({ ...empty, measurements: [measurement("label", 0), measurement("bold", 73, { fontWeight: 700 }), measurement("한글 👩‍🔬", 97)] });
  assert.equal(measureTextWidth("label", { fontSize: 20 }, p), 0);
  assert.equal(measureTextWidth("한글 👩‍🔬", { fontSize: 20 }, p), 97);
  assert.equal(measureTextWidth("bold", { fontSize: 20, fontWeight: "bold" }, p), 73);
  assert.equal(measureTextWidth("bold", { fontSize: 20, fontWeight: 680 }, p), 73);
  assert.equal(measureTextWidth("bold", { fontSize: 20, fontWeight: "700" }, p), 73);
  for (const style of [{fontSize: 21}, {fontSize:20,fontFamily:"serif"}, {fontSize:20,fontWeight:500}, {fontSize:20,fontWeight:"bolder"}]) {
    assert.equal(measureTextWidth("label", style, p), measureTextWidth("label", style));
  }
  assert.equal(resolveTextBounds({x:0,y:0,text:"bold",fontSize:20,fontWeight:700},p).right,73);
});

test("apply and remove metrics rewrap title text, preserve typography, and own the host profile", () => {
  const p=titled(); const before=serializeProgram(p);
  const input=structuredClone(profile); const q=p.applyTextMetrics({profile:input});
  assert.equal((p.graphicSpec.objects.chartTitle.items?.length ?? 1),1);
  assert.equal(q.graphicSpec.objects.chartTitle.items.length,2);
  assert.deepEqual(q.titleConfig,p.titleConfig);
  input.measurements[0].width=1;
  assert.equal(q.materializationConfigs.textMetrics.measurements[0].width,180);
  assert.ok(Object.isFrozen(q.materializationConfigs.textMetrics.measurements[0]));
  assert.equal(serializeProgram(p),before);
  assert.equal(svg(q.removeTextMetrics()),svg(p));
  assert.equal(q.trace.children.at(-1).op,"applyTextMetrics");
  assert.ok(q.trace.children.at(-1).children.some(n=>n.op==="rematerializeTitle"));
  assert.deepEqual(q.actionStack,[]);
  const restored=deserializeProgram(serializeProgram(q));
  assert.equal(svg(restored),svg(q));
  assert.equal(svg(restored.removeTextMetrics()),svg(p));
});

test("profiles applied before authoring persist through title edits and Canvas rematerialization", () => {
  const p=chart().applyTextMetrics({profile}).createCanvas({width:500,height:350,margin:80})
    .createTitle({text:"Alpha Beta",maxWidth:100,titleStyle:{fontSize:20,fontWeight:400}});
  assert.equal(p.graphicSpec.objects.chartTitle.items.length,2);
  const q=p.editCanvas({width:520}).editTitle({text:"Alpha"});
  assert.equal((q.graphicSpec.objects.chartTitle.items?.length ?? 1),1);
  assert.equal(q.materializationConfigs.textMetrics.id,"host");
  assert.equal(basicChart().applyTextMetrics,undefined);
});

test("composition metrics propagate to nested children and newly replaced children", () => {
  const p=hconcat({programs:[{id:"left",program:titled()},{id:"right",program:titled()}]});
  const q=p.applyTextMetrics({profile});
  for(const child of Object.values(q.children)) {
    assert.equal(child.graphicSpec.objects.chartTitle.items.length,2);
    assert.deepEqual(child.actionStack,[]);
  }
  const replaced=q.replaceCompositionChild({target:"left",program:titled()});
  assert.equal(replaced.children.left.graphicSpec.objects.chartTitle.items.length,2);
  assert.equal(svg(q.removeTextMetrics()),svg(p));
});

test("invalid profiles and incompatible measured layout fail atomically", () => {
  const p=titled(); const before=serializeProgram(p);
  const invalid=[null,[],{}, {...empty,schemaVersion:2},{...empty,id:""}, {...empty,extra:true}, {...empty,measurements:{}}, {...empty,measurements:[,]},
    ...[undefined,null,NaN,Infinity,-1].map(width=>({...empty,measurements:[measurement("x",width)]})),
    ...[0,50,150,1000,"400"].map(fontWeight=>({...empty,measurements:[measurement("x",1,{fontWeight})]})),
    {...empty,measurements:[measurement("x",1),measurement("x",2)]},
    {...empty,measurements:[measurement("x",1,{fontFamily:""})]},
    {...empty,measurements:[measurement(null,1)]},
    {...empty,measurements:[measurement("x",1,{fontSize:0})]},
    {...empty,measurements:[measurement("x",1,{unknown:2})]}];
  for(const profile of invalid) assert.throws(()=>p.applyTextMetrics({profile}));
  assert.throws(()=>p.removeTextMetrics(),/active profile/);
  const unwrapped=chart().createCanvas({width:500,height:350,margin:80}).createTitle({text:"Alpha Beta",titleStyle:{fontSize:20,fontWeight:400}});
  assert.throws(()=>unwrapped.applyTextMetrics({profile:{...empty,measurements:[measurement("Alpha Beta",10000)]}}));
  assert.equal(serializeProgram(p),before);
});

test("an empty metrics profile preserves the entire action corpus and retained facet recipes", () => {
  for(const [index,p] of buildActionRelationshipPrograms().entries()) {
    const before=serializeProgram(p);
    let original;
    try { original=svg(p); } catch {}
    const q=p.applyTextMetrics({profile:empty});
    if(original!==undefined) assert.equal(svg(q),original,`corpus ${index}`);
    assert.equal(serializeProgram(p),before,`source ${index}`);
    assert.deepEqual(q.actionStack,[]);
    if(q.compositionSpec!==undefined) {
      for(const child of Object.values(q.children)) assert.equal(child.materializationConfigs.textMetrics.id,"host");
    }
  }
});

test("measured axis wrapping and categorical legend bounds follow the same profile", () => {
  const base=chart().createCanvas({width:700,height:420,margin:{top:80,right:80,bottom:140,left:80}})
    .createData({values:[{x:1,y:2,name:"Alpha Beta"},{x:2,y:3,name:"Beta"}]})
    .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"}).encodeColor({field:"name"});
  const axis=base.encodeX({field:"name",fieldType:"nominal",scale:{id:"categories",type:"band"}}).createXAxisLabels({scale:"categories",values:["Alpha Beta"],fontSize:20,fontWeight:400,maxWidth:100});
  const wrapped=axis.applyTextMetrics({profile});
  assert.deepEqual(wrapped.graphicSpec.objects.xAxisLabels.items.map(i=>i.properties.text),["Alpha","Beta"]);
  assert.equal(svg(wrapped.removeTextMetrics()),svg(axis));
  const legend=base.createLegend({position:"bottom",columns:2,border:true,labels:{fontSize:20,fontWeight:400}});
  const measured=legend.applyTextMetrics({profile});
  assert.ok(measured.graphicSpec.objects.colorLegendBackground.properties.width > legend.graphicSpec.objects.colorLegendBackground.properties.width);
  assert.equal(svg(measured.removeTextMetrics()),svg(legend));
});

test("measured profiles survive facet source edits and validate persisted state", () => {
  const base=chart().createCanvas({width:400,height:300,margin:80})
    .createData({id:"source",values:[{x:1,y:2,g:"A"},{x:2,y:3,g:"B"}]})
    .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"});
  const facet=base.facet({field:"g"}).applyTextMetrics({profile});
  const next=facet.editFacetScales({y:"independent"}).reviseData({source:"source",id:"updated",values:[{x:1,y:4,g:"A"},{x:2,y:2,g:"B"}]});
  for(const child of Object.values(next.children)) assert.deepEqual(child.materializationConfigs.textMetrics,profile);
  const invalid=new base.constructor({...base,materializationConfigs:{...base.materializationConfigs,textMetrics:{...empty,schemaVersion:9}}});
  assert.throws(()=>serializeProgram(invalid),/schemaVersion/);
});

test("Full compositions adopt Basic children for measured layout without changing the input", () => {
  const basic=basicChart().createCanvas({width:300,height:200,margin:40})
    .createData({values:[{x:1,y:2}]}).createScatterPlot({x:"x",y:"y",guides:false});
  const parent=hconcat({programs:[{id:"basic",program:basic},{id:"full",program:chart().createCanvas({width:300,height:200})}]});
  const next=parent.applyTextMetrics({profile});
  assert.equal(typeof next.children.basic.removeTextMetrics,"function");
  assert.equal(basic.applyTextMetrics,undefined);
  assert.equal(svg(next.children.basic),svg(basic));
  assert.equal(svg(next.removeTextMetrics()),svg(parent));
  assert.equal(next.insertCompositionChild({id:"inserted",program:basic}).children.inserted.materializationConfigs.textMetrics.id,"host");
});

test("theme font changes reuse the active metrics policy and restore matching widths", () => {
  const measured=titled().applyTextMetrics({profile});
  const themed=measured.applyTheme({theme:{base:"light",tokens:{fontFamily:"serif"}}});
  assert.equal(themed.graphicSpec.objects.chartTitle.items?.length ?? 1,1);
  assert.equal(themed.materializationConfigs.textMetrics.id,"host");
  assert.equal(svg(themed.removeTheme()),svg(measured));
});
