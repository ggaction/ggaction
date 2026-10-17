import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {resolveConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
function base(){return chart().createCanvas({width:1200,height:1000,margin:300})
 .createData({values:[{x:1,y:2,g:'A',v:1},{x:2,y:3,g:'B',v:2}]})
 .createScatterPlot({x:'x',y:'y',color:'g',size:'v',guides:false}).createLegend({position:'right',blockLayout:'column'});}
const positions=['left','right','top','bottom','top-left','top-right','bottom-left','bottom-right'];
function bounds(p){return ['Symbols','Labels','Title'].map(s=>resolveConcreteGraphicBounds(p.graphicSpec,'sizeLegend'+s)).reduce((a,b)=>a?{left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)}:b);}
test('local anchors use full occupied bounds and corners retain eight-pixel plot inset',()=>{
 for(const position of positions){
  // Move color away so the independently local size block has room at each anchor.
  const p=base().editLegendLayout({position:position==='top-right'?'bottom-left':'top-right'});
  const q=p.editLegendBlock({target:'scatterPlot',channel:'size',position});const b=bounds(q);
  if(position.includes('-')){
   assert.equal(position.endsWith('left')?b.left:900-b.right,position.endsWith('left')?308:8);
   assert.equal(position.startsWith('top')?b.top:700-b.bottom,position.startsWith('top')?308:8);
  }
  assert.equal(q.guideConfigs.legend.size.blockOverrides['["size"]'].position,position);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.deepEqual(q.rematerializeLegend().graphicSpec,q.graphicSpec);
 }
});
test('selected whole and focused layout use the same local override and inherit reset',()=>{
 const p=base(),a=p.editLegendBlock({target:'scatterPlot',channel:'size',position:'left'});
 const b=p.editLegend({channel:'size',position:'left'}),c=p.editLegendLayout({channel:'size',position:'left'});
 assert.deepEqual(a.graphicSpec,b.graphicSpec);assert.deepEqual(a.graphicSpec,c.graphicSpec);
 assert.deepEqual(a.editLegendBlock({target:'scatterPlot',channel:'size',position:'inherit'}).graphicSpec,p.graphicSpec);
 assert.deepEqual(b.editLegendLayout({channel:'size',position:'inherit'}).graphicSpec,p.graphicSpec);
 const moved=a.editLegendLayout({position:'bottom-left',blockLayout:'row'});
 assert.equal(moved.guideConfigs.legend.size.blockOverrides['["size"]'].position,'left');
 assert.deepEqual(bounds(moved),bounds(a));
 const styled=a.editLegend({position:'bottom-left',titleStyle:{color:'red'}});
 assert.deepEqual(bounds(styled),bounds(a));
 const offset=a.editLegendLayout({channel:'size',offset:45});
 assert.equal(bounds(offset).right,255);
 assert.deepEqual(bounds(offset.editLegendLayout({position:'top-left'})),bounds(offset));
 assert.deepEqual(a.editCanvas({width:1300}).editCanvas({width:1200}).graphicSpec,a.graphicSpec);
 const changed=a.editScale({id:'size',range:[20,200]});assert.equal(changed.guideConfigs.legend.size.blockOverrides['["size"]'].position,'left');
});
test('local conflicts and malformed/reset values reject atomically',()=>{
 const p=base(),before=JSON.stringify(p);
 assert.throws(()=>p.editLegendBlock({target:'scatterPlot',channel:'size',position:'right'}),/overlap/);
 for(const position of ['auto','diagonal',null,1])assert.throws(()=>p.editLegendBlock({target:'scatterPlot',channel:'size',position}));
 assert.throws(()=>p.editLegendLayout({position:'inherit'}));
 assert.equal(JSON.stringify(p),before);
 const q=p.editLegend({channel:'size',position:'left'}),cfg=structuredClone(q.materializationConfigs);
 cfg.guides.legend.size.blockOverrides['["size"]'].position='auto';
 assert.throws(()=>serializeProgram(q._clone({materializationConfigs:cfg})),/local legend position/);
});

test('all existing legend families retain local positions across replay and ungrouped placement',()=>{
 for(const family of ['shape','color','size','opacity','gradient','strokeGradient','interval','strokeInterval','strokeWidth','symbols']){
  const channel={gradient:'color',strokeGradient:'stroke',interval:'color',strokeInterval:'stroke',symbols:'color'}[family]??family;
  let p=chart().createCanvas({width:1200,height:1000,margin:300})
   .createData({id:'data',values:[{x:1,y:2,g:'A',v:1},{x:2,y:3,g:'B',v:2}]});
  p=family==='strokeWidth'?p.createLineMark({id:'mark'}).encodeGroup({field:'g'}):p.createPointMark({id:'mark'});
  p=p.encodeX({field:'x'}).encodeY({field:'y'});
  const field=['shape','color'].includes(family)?'g':'v';
  p=p['encode'+channel[0].toUpperCase()+channel.slice(1)]({field,
   ...(['color','stroke'].includes(channel)&&field==='v'?{fieldType:'quantitative'}:{}),
   ...(['interval','strokeInterval'].includes(family)?{scale:{type:'quantize',range:['red','blue']}}:{})});
  p=p.createLegend({channels:[channel],...(family==='symbols'?{representation:'symbols'}:{})});
  for(const position of positions){
   const q=p.editLegendBlock({target:'mark',channel,position});
   assert.deepEqual(q.rematerializeLegend().graphicSpec,q.graphicSpec,family+position);
   assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
   assert.deepEqual(q.editLegendBlock({target:'mark',channel,position:'inherit'}).graphicSpec,p.graphicSpec);
  }
 }
});

test('member aliases move one merged block and merging distinct local anchors requires a decision',()=>{
 const seed=chart().createCanvas({width:1200,height:1000,margin:300})
 .createData({values:[{x:1,y:2,g:'A'},{x:2,y:3,g:'B'}]}).createPointMark({id:'p'})
 .encodeX({field:'x'}).encodeY({field:'y'}).encodeColor({field:'g'}).encodeStroke({field:'g'});
 const separate=seed.createLegend({channels:['color']}).createLegend({channels:['stroke']})
 .editLegendBlock({target:'p',channel:'color',position:'left'})
 .editLegendBlock({target:'p',channel:'stroke',position:'bottom'});
 assert.throws(()=>separate.editLegend({channels:['color','stroke']}),/transition.*block override/);
 const merged=separate.editLegend({channels:['color','stroke'],position:'top'});
 assert.equal(merged.guideConfigs.legend.series.blockOverrides,undefined);
 const left=merged.editLegendBlock({target:'p',channel:'color',position:'bottom-left'});
 const right=merged.editLegendBlock({target:'p',channel:'stroke',position:'bottom-left'});
 assert.deepEqual(left.graphicSpec,right.graphicSpec);
 assert.deepEqual(left.editLegendLayout({channel:'stroke',position:'inherit'}).graphicSpec,merged.graphicSpec);
 const cfg=structuredClone(left.materializationConfigs);
 cfg.guides.legend.series.blockOverrides['["wrong"]']=cfg.guides.legend.series.blockOverrides['["color","stroke"]'];
 delete cfg.guides.legend.series.blockOverrides['["color","stroke"]'];
 assert.throws(()=>serializeProgram(left._clone({materializationConfigs:cfg})),/existing block owner/);
});
