import test from 'node:test';
import assert from 'node:assert/strict';
import {chart, hconcat} from '../../../../src/index.js';
import {unionConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
const rows=Array.from({length:12},(_,i)=>({x:i+1,y:2*i+3,g:i%2?'A':'B',width:i%2+1}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function unit(channel='color',numeric=false){
 let p=chart().createCanvas({plot:{width:314,height:314},margin:200}).createData({id:'d',values:rows})
  [channel==='strokeWidth'?'createLinePlot':'createScatterPlot']({id:'p',x:'x',y:'y',...(channel==='strokeWidth'?{color:{field:'g',fieldType:'nominal'}}:{})});
 p=p[`encode${channel[0].toUpperCase()+channel.slice(1)}`]({target:'p',field:channel==='strokeWidth'?'width':numeric?'x':'g',fieldType:numeric?'quantitative':'nominal'});
 if (Object.keys(p.guideConfigs.legend ?? {}).length) p=p.removeLegend({target:'p'});
 return p.createLegend({target:'p',channels:[channel]});
}
function bounds(p){return unionConcreteGraphicBounds(p.graphicSpec,Object.keys(p.graphicSpec.objects).filter(id=>
 /(?:Legend|Gradient)(?:Title|Labels|SymbolPoints|SymbolSwatches|SymbolLines|Symbols|Strips|Ticks)$/.test(id)),p.materializationConfigs.textMetrics);}
for(const [channel,numeric] of [['color',false],['color',true],['size',true],['opacity',true],['strokeWidth',true]])
for(const position of ['top','bottom','left','right'])test(`${channel}/${numeric} ${position} supports precise selected offsets and replay`,()=>{
 const p=unit(channel,numeric).editLegend({target:'p',channel,position});
 const before=serializeProgram(p),a=bounds(p);
 const q=p.editLegend({target:'p',channel,alongOffset:13.5}),b=bounds(q);
 const horizontal=['top','bottom'].includes(position);
 close(b.left-a.left,horizontal?13.5:0);close(b.top-a.top,horizontal?0:13.5);
 assert.deepEqual(q.editLegend({target:'p',channel,alongOffset:0}).graphicSpec,p.graphicSpec);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 assert.equal(serializeProgram(p),before);
});
test('whole-group creation/editing and facet/concat owners keep tangential offsets',()=>{
 const p=unit().removeLegend({target:'p'}).createLegend({target:'p',alongOffset:15});
 const ordinary=unit();close(bounds(p).top-bounds(ordinary).top,15);
 for(const source of [p,p.facet({field:'g',columns:2,guides:{legend:'shared'}})]){
  const q=source.editLegend({target:'p',alongOffset:30});close(bounds(q).top-bounds(source).top,15);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 }
 const joined=hconcat({programs:[{id:'a',program:p},{id:'b',program:p}],share:{color:true}});
 const q=joined.editLegend({target:[{childPath:['a'],id:'p'},{childPath:['b'],id:'p'}],channel:'color',alongOffset:30});
 close(bounds(q).top-bounds(joined).top,15);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
test('offset validation is atomic and at remains mutually exclusive',()=>{
 const p=unit(),saved=serializeProgram(p);
 for(const alongOffset of [NaN,Infinity,'10',null])assert.throws(()=>p.editLegend({target:'p',channel:'color',alongOffset}),/finite/);
 assert.throws(()=>p.editLegend({target:'p',at:{x:10,y:10},alongOffset:1}),/conflicts/);
 assert.equal(serializeProgram(p),saved);
 const free=p.editLegend({target:'p',at:{x:100,y:100}});
 assert.throws(()=>free.editLegend({target:'p',alongOffset:1}),/requires position/);
 assert.throws(()=>free.editLegend({target:'p',channel:'color',alongOffset:1}),/requires position/);
 assert.ok(free.editLegend({target:'p',channel:'color',position:'right',alongOffset:10}));
});

test('selected offsets keep sibling guides fixed and inherit rejoins the group',()=>{
 const p=unit().removeLegend({target:'p'}).encodeSize({target:'p',field:'x',fieldType:'quantitative'})
  .createLegend({target:'p',channels:['color','size'],blockLayout:'column'});
 const q=p.editLegendLayout({target:'p',channel:'color',alongOffset:-12});
 for(const [id,graphic] of Object.entries(p.graphicSpec.objects))if(id.startsWith('sizeLegend'))assert.deepEqual(q.graphicSpec.objects[id],graphic);
 const reset=q.editLegend({target:'p',channel:'color',position:'inherit'});
 assert.deepEqual(reset.graphicSpec,p.graphicSpec);
 const restored=deserializeProgram(serializeProgram(q));
 assert.deepEqual(restored.editCanvas({plot:{width:330,height:330}}).guideConfigs.legend,q.guideConfigs.legend);
});

test('corner offsets preserve their inset and reject leaving the plot',()=>{
 const p=unit().editLegend({target:'p',position:'top-right',offset:30});
 const q=p.editLegend({target:'p',channel:'color',position:'top-right',offset:36,alongOffset:2});
 close(bounds(q).left-bounds(p).left,-4);close(bounds(q).top-bounds(p).top,6);
 assert.throws(()=>q.editLegend({target:'p',channel:'color',alongOffset:300}),/fit/);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});

test('fine same-edge edits preserve an explicit legend direction',()=>{
 const p=unit().editLegend({target:'p',channel:'color',position:'bottom',direction:'vertical'});
 const q=p.editLegend({target:'p',channel:'color',position:'bottom',alongOffset:10});
 assert.equal(q.guideConfigs.legend.color.direction,'vertical');
 close(bounds(q).left-bounds(p).left,10); close(bounds(q).top-bounds(p).top,0);
});

test('selected facet legend edits store their shift only in block intent',()=>{
 const p=unit().facet({field:'g',columns:2,guides:{legend:'shared'}});
 const q=p.editLegend({target:'p',channel:'color',position:'right',offset:12,alongOffset:7});
 assert.equal(Object.hasOwn(q.guideConfigs.legend.color,'alongOffset'),false);
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
});
