import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {resolveConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
import {renderToSVG} from '../../../../src/renderers/svg.js';
function base(channel='color',scale={domain:[0,10],range:['black','white']}){
 let p=chart().createCanvas({width:1200,height:1000,margin:300})
  .createData({values:[{x:0,y:0,v:1},{x:1,y:1,v:10}]}).createPointMark({id:'points'})
  .encodeX({field:'x'}).encodeY({field:'y'});
 return channel==='color'?p.encodeColor({field:'v',fieldType:'quantitative',scale}):
  p.encodeStroke({field:'v',fieldType:'quantitative',scale});
}
function bodyBounds(p,prefix){
 const bs=['Strips','Ticks','Labels'].map(s=>resolveConcreteGraphicBounds(p.graphicSpec,prefix+s));
 return {bottom:Math.max(...bs.map(b=>b.bottom)),left:Math.min(...bs.map(b=>b.left)),right:Math.max(...bs.map(b=>b.right))};
}
const placements=['left','right','top','bottom','top-left','top-right','bottom-left','bottom-right'];
test('gradient direction is independent of every anchor and omitted/default output is preserved',()=>{
 for(const channel of ['color','stroke'])for(const position of placements)for(const direction of ['horizontal','vertical']){
  const p=base(channel).createLegend({channels:[channel],position,direction,gradient:{length:120,thickness:16}}),prefix=channel+'Gradient';
  const strips=p.graphicSpec.objects[prefix+'Strips'].items.map(i=>i.properties);
  const width=Math.max(...strips.map(s=>s.x+s.width))-Math.min(...strips.map(s=>s.x));
  const height=Math.max(...strips.map(s=>s.y+s.height))-Math.min(...strips.map(s=>s.y));
  assert.equal(width,direction==='horizontal'?120:16);assert.equal(height,direction==='horizontal'?16:120);
  assert.equal(p.guideConfigs.legend[channel==='color'?'gradient':'strokeGradient'].position,position);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 }
 for(const position of placements){
  const plain=base().createLegend({position});
  const direction=['left','right','top-left','top-right','bottom-left','bottom-right'].includes(position)?'vertical':'horizontal';
  assert.deepEqual(plain.editLegendLayout({direction}).graphicSpec,plain.graphicSpec);
  assert.deepEqual(plain.editLegendLayout({direction:'horizontal'}).editLegendLayout({direction:'auto'}).graphicSpec,plain.graphicSpec);
 }
});

test('bottom title clears the complete strip/tick/label union by exactly twelve pixels',()=>{
 for(const position of placements)for(const direction of ['horizontal','vertical']){
  const p=base().createLegend({position,direction,titlePosition:'bottom',title:'First\n\nLast',gradient:{length:120,thickness:16}});
  const b=bodyBounds(p,'colorGradient'),t=resolveConcreteGraphicBounds(p.graphicSpec,'colorGradientTitle');
  assert.ok(Math.abs(t.top-b.bottom-12)<1e-10,`${position}/${direction}: ${t.top-b.bottom}`);
  assert.ok(renderToSVG(p).includes('First'));
 }
 const created=base().createLegend({position:'right',direction:'horizontal',titlePosition:'bottom'});
 const edited=base().createLegend({position:'right'}).editLegendLayout({channel:'color',direction:'horizontal',titlePosition:'bottom'});
 assert.deepEqual(edited.graphicSpec,created.graphicSpec);
 const hidden=created.editLegendTitle({title:false});assert.equal(hidden.graphicSpec.objects.colorGradientTitle,undefined);
 assert.deepEqual(hidden.editLegendLayout({titlePosition:'top'}).graphicSpec,hidden.graphicSpec);
});

test('gradient orientation intent survives representation, scale and Canvas replay',()=>{
 const p=base().createLegend({position:'right',direction:'horizontal'});
 const symbols=p.editLegend({representation:'symbols',direction:'vertical'});
 assert.equal(symbols.guideConfigs.legend.gradient.direction,'vertical');
 assert.equal(symbols.guideConfigs.legend.gradient.gradientDirection,'horizontal');
 const restored=deserializeProgram(serializeProgram(symbols)).editLegend({representation:'gradient'});
 assert.deepEqual(restored.graphicSpec,p.graphicSpec);
 assert.equal(p.editCanvas({width:1300}).guideConfigs.legend.gradient.gradientDirection,'horizontal');
 assert.equal(p.editScale({id:'color',reverse:true}).guideConfigs.legend.gradient.gradientDirection,'horizontal');
 const cfg=structuredClone(p.materializationConfigs);cfg.guides.legend.gradient.gradientDirection='diagonal';
 assert.throws(()=>serializeProgram(p._clone({materializationConfigs:cfg})),/horizontal or vertical/);
 assert.throws(()=>base().createLegend({direction:'auto'}),/horizontal or vertical/);
 assert.throws(()=>base().createLegend({direction:'diagonal'}),/horizontal or vertical/);
 const nominal=chart().createCanvas({width:900,height:700,margin:200}).createData({values:[{x:0,y:0,g:'A'}]})
  .createScatterPlot({x:'x',y:'y',color:'g',guides:false}).createLegend();
 assert.throws(()=>nominal.editLegendLayout({direction:'auto'}));
 assert.throws(()=>nominal.editLegendLayout({titlePosition:'bottom'}));
});


test('side lanes preserve horizontal and bottom-title gradient internal alignment',()=>{
 for(const position of ['left','right'])for(const direction of ['horizontal','vertical']){
  const p=base().encodeSize({field:'v'}).createLegend({position})
    .editLegendLayout({channel:'color',direction,titlePosition:'bottom'});
  const body=bodyBounds(p,'colorGradient'),title=resolveConcreteGraphicBounds(p.graphicSpec,'colorGradientTitle');
  assert.ok(Math.abs(title.top-body.bottom-12)<1e-10);
  for(const label of p.graphicSpec.objects.colorGradientLabels.items){
   assert.equal(label.properties.textAlign,direction==='horizontal'?'center':position==='left'?'right':'left');
  }
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 }
});

test('group, shared facet and transformed ramps keep orientation, positions and opacity',()=>{
 for(const type of ['linear','log','sqrt','symlog']){
  const scale={type:type==='linear'?'sequential':type,domain:[1,10],range:['black','white'],reverse:true};
  const p=base('color',scale).createLegend({position:'right',direction:'horizontal',titlePosition:'bottom',gradient:{length:120,thickness:16,opacity:.7}});
  const labels=p.graphicSpec.objects.colorGradientLabels.items.map(i=>i.properties.x);
  assert.ok(labels.every((v,i)=>i===0||v>=labels[i-1]));
  assert.equal(p.graphicSpec.objects.colorGradientStrips.items[0].properties.opacity,.7);
  assert.deepEqual(p.editLegendLayout({direction:'vertical'}).editLegendLayout({direction:'horizontal'}).graphicSpec,p.graphicSpec);
 }
 for(const align of ['left','center','right']){
  const p=base().encodeSize({field:'v'}).createLegend({position:'top-left',blockLayout:'row'})
   .editLegend({channel:'color',direction:'horizontal',titlePosition:'bottom',titleStyle:{align}});
  const t=p.graphicSpec.objects.colorGradientTitle.properties,b=bodyBounds(p,'colorGradient');
  const tb=resolveConcreteGraphicBounds(p.graphicSpec,'colorGradientTitle');
  assert.equal(t.textAlign,align);assert.ok(Math.abs(tb.top-b.bottom-12)<1e-10);
  assert.deepEqual(p.rematerializeLegend().graphicSpec,p.graphicSpec);
  assert.deepEqual(p.editCanvas({width:1250}).editCanvas({width:1200}).graphicSpec,p.graphicSpec);
 }
 const unit=base().createLegend({position:'right',direction:'horizontal',titlePosition:'bottom'});
 const facet=unit.facet({field:'v',guides:{legend:'shared'}});
 assert.deepEqual(deserializeProgram(serializeProgram(facet)).graphicSpec,facet.graphicSpec);
 const before=JSON.stringify(unit);
 assert.throws(()=>unit.editLegendTitle({titleStyle:{fontSize:2000}}));
 assert.equal(JSON.stringify(unit),before);
 assert.throws(()=>unit.editScale({id:'color',type:'quantize',range:['red','blue']}),/custom family settings/);
});
