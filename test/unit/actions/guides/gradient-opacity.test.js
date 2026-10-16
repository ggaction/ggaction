import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../../src/index.js";
import { chart as basicChart } from "../../../../src/basic.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { render } from "../../../../src/renderers/canvas/index.js";
import { createMockCanvasContext } from "../../../support/canvas.js";

const values = [{x:1,y:2,v:1,g:"a"},{x:2,y:3,v:4,g:"b"},{x:3,y:4,v:2,g:"a"},{x:4,y:5,v:3,g:"b"}];
function base(channel = "color", factory = chart) {
  const p=factory().createCanvas({width:1000,height:900,margin:250})
    .createData({values}).createScatterPlot({x:"x",y:"y",guides:false,
      ...(channel==='stroke'?{stroke:{field:'v',fieldType:'quantitative'}}:{})});
  return channel==='stroke'?p:p.encodeColor({field:"v",fieldType:"quantitative"});
}
const kind = channel => channel === "color" ? "gradient" : "strokeGradient";
const prefix = channel => `${channel}Gradient`;
const strips = (p,channel) => p.graphicSpec.objects[prefix(channel)+"Strips"].items.map(i=>i.properties);
function withoutBodyOpacity(p,channel) {
  const graphic = structuredClone(p.graphicSpec);
  for (const item of graphic.objects[prefix(channel)+"Strips"].items) delete item.properties.opacity;
  return graphic;
}

test("omission preserves legacy gradient graphics and explicit opacity affects only the body",()=>{
  for(const factory of [chart,basicChart]) for(const channel of ["color","stroke"]) {
    const p=base(channel,factory),old=p.createLegend({channels:[channel]});
    assert.deepEqual(old.guideConfigs.legend[kind(channel)].gradient,{length:120,thickness:12});
    assert.ok(strips(old,channel).every(s=>s.opacity===undefined));
    for(const opacity of [0,0.7,1]) {
      const q=p.createLegend({channels:[channel],gradient:{opacity}});
      assert.equal(strips(q,channel).length,60);
      assert.ok(strips(q,channel).every(s=>s.opacity===opacity));
      assert.deepEqual(withoutBodyOpacity(q,channel),old.graphicSpec);
      assert.deepEqual(q.semanticSpec,old.semanticSpec);
    }
  }
});

test("creation, bundled guides, whole edits and focused edits agree immutably",()=>{
  for(const channel of ["color","stroke"]) {
    const p=base(channel),before=serializeProgram(p),options={opacity:0.4};
    const a=p.createLegend({channels:[channel],gradient:options});
    const b=p.createGuides({axes:false,grid:false,legend:{channels:[channel],gradient:options}});
    const c=p.createLegend({channels:[channel]}).editLegend({gradient:options});
    const d=p.createLegend({channels:[channel]}).editLegendSymbols({gradient:options});
    for(const q of [b,c,d]) assert.deepEqual(q.graphicSpec,a.graphicSpec);
    assert.equal(serializeProgram(p),before);
    assert.deepEqual(options,{opacity:0.4});
    const e=d.editLegendSymbols({gradient:{length:150}});
    assert.equal(e.guideConfigs.legend[kind(channel)].gradient.opacity,0.4);
    assert.equal(d.guideConfigs.legend[kind(channel)].gradient.length,120);
  }
});

test("invalid opacity and unknown keys fail before changing source state",()=>{
  for(const channel of ["color","stroke"]) {
    const p=base(channel),q=p.createLegend({channels:[channel]}),before=serializeProgram(q);
    for(const opacity of [undefined,null,"0.4",NaN,Infinity,-0.1,1.01]) {
      assert.throws(()=>p.createLegend({channels:[channel],gradient:{opacity}}));
      assert.throws(()=>q.editLegendSymbols({gradient:{opacity}}));
      assert.equal(serializeProgram(q),before);
    }
    assert.throws(()=>q.editLegend({gradient:{unexpected:0.5}}),/unsupported|unknown/i);
    assert.equal(serializeProgram(q),before);
  }
});

test("all edges, corners and free placements retain positions at zero opacity",()=>{
  for(const channel of ["color","stroke"]) for(const position of ["left","right","top","bottom","top-left","top-right","bottom-left","bottom-right"]) {
    const p=base(channel).createLegend({channels:[channel],position});
    const q=p.editLegendSymbols({gradient:{opacity:0}});
    assert.deepEqual(withoutBodyOpacity(q,channel),p.graphicSpec);
    assert.ok(renderToSVG(q).includes('<svg'));
  }
  const p=base().createLegend({at:{x:20,y:30},gradient:{opacity:0.2}});
  assert.equal(p.guideConfigs.legend.gradient.gradient.opacity,0.2);
  assert.deepEqual(p.guideConfigs.legendGroups.scatterPlot.placement,{at:{x:20,y:30}});
});

test("mark opacity and scale or Canvas refresh keep independent ramp opacity",()=>{
  for(const channel of ["color","stroke"]) {
    const p=base(channel).editPointMark({opacity:0.2}).createLegend({channels:[channel],gradient:{opacity:0.6}});
    const q=p.editPointMark({opacity:0.8});
    assert.ok(strips(q,channel).every(s=>s.opacity===0.6));
    assert.ok(q.graphicSpec.objects.scatterPlot.items.every(i=>i.properties.opacity===0.8));
    const scaled=q[channel==='color'?'editColorScale':'editStrokeScale']({target:'scatterPlot',range:["red","blue"]});
    assert.ok(strips(scaled,channel).every(s=>s.opacity===0.6));
    assert.notEqual(strips(scaled,channel)[0].stroke,strips(q,channel)[0].stroke);
    const resized=scaled.editCanvas({width:1100});
    assert.ok(strips(resized,channel).every(s=>s.opacity===0.6));
    assert.equal(resized.guideConfigs.legend[kind(channel)].gradient.opacity,0.6);
  }
});

test("targeted gradient edits preserve the other owner's independent ramp",()=>{
  const p=base().createLegend({channels:['color'],gradient:{opacity:0.3}})
    .createPointMark({id:'other'}).encodeX({field:'x'}).encodeY({field:'y'})
    .encodeStroke({field:'v',fieldType:'quantitative'})
    .createLegend({target:'other',channels:['stroke'],position:'left',gradient:{opacity:0.8}});
  const q=p.editLegendSymbols({target:'scatterPlot',gradient:{opacity:0.6}});
  assert.ok(strips(q,'color').every(s=>s.opacity===0.6));
  assert.deepEqual(q.graphicSpec.objects.strokeGradientStrips,p.graphicSpec.objects.strokeGradientStrips);
  const r=q.editLegendSymbols({target:'other',gradient:{opacity:0.2}});
  assert.ok(strips(r,'stroke').every(s=>s.opacity===0.2));
  assert.deepEqual(r.graphicSpec.objects.colorGradientStrips,q.graphicSpec.objects.colorGradientStrips);
});

test("sampled representation rejects ramp options and switching back resets ramp opacity",()=>{
  const p=base().createLegend({gradient:{opacity:0.3}});
  const sampled=p.editLegend({representation:"symbols"});
  assert.equal(sampled.guideConfigs.legend.gradient.gradient,undefined);
  assert.throws(()=>sampled.editLegendSymbols({gradient:{opacity:0.2}}));
  const reset=sampled.editLegend({representation:"gradient"});
  assert.deepEqual(reset.guideConfigs.legend.gradient.gradient,{length:120,thickness:12});
  assert.ok(strips(reset,"color").every(s=>s.opacity===undefined));
  const explicit=sampled.editLegend({representation:"gradient",gradient:{opacity:0.8}});
  assert.ok(strips(explicit,"color").every(s=>s.opacity===0.8));
  assert.throws(()=>p.editLegendBlock({target:"scatterPlot",channel:"color",symbol:{opacity:0.4}}),/unsupported/);
});

test("native opacity permits ordinary family transitions and custom opacity cannot be discarded",()=>{
  for(const channel of ['color','stroke']) {
    const action=channel==='color'?'editColorScale':'editStrokeScale';
    const options={target:'scatterPlot',type:'quantize',range:['red','blue']};
    const p=base(channel).createLegend({channels:[channel],gradient:{opacity:0.7}});
    const before=serializeProgram(p);
    assert.throws(()=>p[action](options),/custom family settings/);
    assert.equal(serializeProgram(p),before);
    const native=base(channel).createLegend({channels:[channel],gradient:{opacity:1}});
    assert.doesNotThrow(()=>native[action](options));
  }
});

test("legacy and new stored ramps round trip, and corrupted closed settings are rejected",()=>{
  for(const channel of ["color","stroke"]) for(const opacity of [undefined,0,0.7,1]) {
    const p=base(channel).createLegend({channels:[channel],gradient:{...(opacity===undefined?{}:{opacity})}});
    const serialized=serializeProgram(p),restored=deserializeProgram(serialized);
    assert.equal(serializeProgram(restored),serialized);
    assert.deepEqual(restored.graphicSpec,p.graphicSpec);
    assert.ok(strips(restored.editLegendSymbols({gradient:{thickness:10}}),channel).every(s=>(s.opacity??1)===(opacity??1)));
    for(const patch of [{opacity:-1},{opacity:2},{opacity:"0.5"},{unexpected:1},{length:0}]) {
      const envelope=JSON.parse(serialized),state=decodeValue(envelope.payload);
      Object.assign(state.materializationConfigs.guides.legend[kind(channel)].gradient,patch);
      envelope.payload=encodeValue(state);
      assert.throws(()=>deserializeProgram(JSON.stringify(envelope)));
    }
  }
});

test("Canvas and SVG receive concrete strip opacity with text, ticks and border unchanged",()=>{
  for(const channel of ["color","stroke"]) {
    const p=base(channel).createLegend({channels:[channel],border:true,gradient:{opacity:0.7}});
    const context=createMockCanvasContext();render(p,context);
    assert.equal(context.calls.filter(c=>c.op==='fillRect'&&c.globalAlpha===0.7).length,60);
    const svg=renderToSVG(p);
    assert.equal((svg.match(/opacity="0\.7"/g)??[]).length,60);
    const zero=p.editLegendSymbols({gradient:{opacity:0}}),c=createMockCanvasContext();render(zero,c);
    assert.equal(c.calls.filter(x=>x.op==='fillRect'&&x.globalAlpha===0).length,60);
    assert.deepEqual(withoutBodyOpacity(zero,channel),withoutBodyOpacity(p,channel));
  }
});

test("concrete alpha paint and body opacity remain separate renderer inputs",()=>{
  const p=base().createLegend({gradient:{opacity:0.7}})
    .editGraphics({target:'colorGradientStrips',property:'fill',value:'rgba(255,0,0,0.5)'});
  const context=createMockCanvasContext();render(p,context);
  const body=context.calls.filter(c=>c.op==='fillRect'&&c.fillStyle==='rgba(255,0,0,0.5)');
  assert.equal(body.length,60);
  assert.ok(body.every(c=>c.globalAlpha===0.7));
  const svg=renderToSVG(p);
  assert.match(svg,/fill="rgba\(255,0,0,0\.5\)"[^>]*opacity="0\.7"/);
});

test("shared facet and repeat replay preserve stored ramp opacity",()=>{
  for(const channel of ["color","stroke"]) {
    const p=base(channel).createLegend({channels:[channel],gradient:{opacity:0.7}});
    for(const q of [p.facet({field:"g",guides:{legend:"shared"}}),p.repeatCharts({channel:"x",fields:["x","y"],guides:{legend:"shared"}})]) {
      assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
      assert.ok(renderToSVG(q).includes('opacity="0.7"'));
    }
  }
});
