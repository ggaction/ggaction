import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { resolveConcreteGraphicBounds } from '../../../../src/grammar/schemas/graphicBounds.js';
const rows=[{x:1,y:2,g:'A'},{x:2,y:3,g:'Long\nlabel'},{x:3,y:5,g:'B'}];
const base=()=>chart().createCanvas({plot:{width:360,height:320},margin:220}).createData({id:'d',values:rows});
const scatter=()=>base().createScatterPlot({id:'p',data:'d',x:'x',y:'y',color:{field:'g',fieldType:'nominal'}}).createGuides({legend:{target:'p',channels:['color']}});
const items=(p,id)=>p.graphicSpec.objects[id].items??[p.graphicSpec.objects[id]];
const bounds=(p,id)=>resolveConcreteGraphicBounds(p.graphicSpec,id,p.materializationConfigs.textMetrics);
const replay=p=>deserializeProgram(serializeProgram(p));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('title and subtitle align independently inside their block, on all four edges',()=>{
 for(const position of ['top','bottom','left','right']){
  const p=scatter().createTitle({text:'The widest line\nShort',subtitle:'Sub',position,align:'center'}),snapshot=serializeProgram(p);
  for(const align of ['left','center','right']){
   const q=p.editTitle({titleStyle:{align},subtitleStyle:{align:'right'}});
   assert.ok(items(q,'chartTitle').every(t=>t.properties.textAlign===align));
   assert.ok(items(q,'chartSubtitle').every(t=>t.properties.textAlign==='right'));
   assert.equal(q.titleConfig.align,'center');assert.equal(serializeProgram(p),snapshot);
   assert.deepEqual(replay(q).graphicSpec,q.graphicSpec);
   assert.equal(q.editCanvas({plot:{width:400,height:320}}).titleConfig.titleStyle.align,align);
  }
  assert.throws(()=>p.editTitle({subtitleStyle:{align:'justify'}}),/align/);
  assert.equal(serializeProgram(p),snapshot);
 }
});

test('legend labels align in their measured columns without moving symbols or titles',()=>{
 for(const position of ['right','left','top','bottom','top-right']){
  const p=scatter().editLegend({target:'p',position,...(['top','bottom'].includes(position)?{columns:1}:{})});
  const names=Object.keys(p.graphicSpec.objects),symbol=names.find(id=>id.endsWith('LegendSymbols'));
  const title=names.find(id=>id.endsWith('LegendTitle')),labels=names.find(id=>id.endsWith('LegendLabels'));
  for(const align of ['left','center','right']){
   const q=p.editLegend({target:'p',labels:{align}});
   assert.deepEqual(q.graphicSpec.objects[symbol],p.graphicSpec.objects[symbol]);
   assert.deepEqual(q.graphicSpec.objects[title],p.graphicSpec.objects[title]);
   const b=bounds(p,labels),a=bounds(q,labels);close(a.left,b.left);close(a.right,b.right);
   assert.ok(items(q,labels).every(t=>t.properties.textAlign===align));
   assert.deepEqual(replay(q).graphicSpec,q.graphicSpec);
  }
 }
});

test('continuous legend families retain alignment through scale and canvas replay',()=>{
 for(const channel of ['color','size','opacity','strokeWidth']){
  const p=base()[channel==='strokeWidth'?'createLinePlot':'createScatterPlot']({id:'p',x:'x',y:'y',...(channel==='strokeWidth'?{groupBy:'g'}:{})})[`encode${channel[0].toUpperCase()+channel.slice(1)}`]({target:'p',field:'x',fieldType:'quantitative'}).createGuides({legend:{target:'p',channels:[channel]}});
  const q=p.editLegend({target:'p',channel,labels:{align:'right'}});
  for(const value of [q,replay(q),q.editCanvas({plot:{width:400,height:320}})]){
   const labels=Object.entries(value.graphicSpec.objects).filter(([id])=>id.endsWith('Labels')&&/Legend|Gradient/.test(id));
   assert.ok(labels.length);assert.ok(labels.every(([,g])=>g.items.every(t=>t.properties.textAlign==='right')));
  }
 }
});

test('polar and parallel labels and titles preserve their anchors and accept create and edit styles',()=>{
 const polar=base().createRosePlot({id:'p',category:'g',value:'y'}).createGuides();
 for(const prefix of ['Theta','Radial'])for(const part of ['Labels','Title']){
  const method=`edit${prefix}Axis${part}`,id=`${prefix==='Theta'?'theta':'radial'}Axis${part}`;
  for(const align of ['left','center','right']){
   const q=polar[method]({align});
   assert.ok(items(q,id).every((t,i)=>t.properties.textAlign===align&&t.properties.x===items(polar,id)[i].properties.x&&t.properties.y===items(polar,id)[i].properties.y));
   assert.deepEqual(replay(q).graphicSpec,q.graphicSpec);
  }
  assert.throws(()=>polar[method]({align:'justify'}),/align/);
 }
 const p=base().createParallelCoordinates({id:'p',dimensions:['g','x','y']});
 const q=p.editParallelAxis({target:'p',field:'g',labels:{align:'left'},title:{align:'right'}});
 assert.equal(items(q,'parallelAxisTitles')[0].properties.textAlign,'right');
 assert.ok(items(q,'parallelAxisLabels').slice(0,3).every(t=>t.properties.textAlign==='left'));
 assert.equal(items(q,'parallelAxisTitles')[1].properties.textAlign,'center');
 assert.deepEqual(replay(q).graphicSpec,q.graphicSpec);
 assert.throws(()=>p.editParallelAxis({field:'g',labels:{align:undefined}}),/align/);
});

test('focused legend label alignment matches creation for categorical, discretized and continuous owners',()=>{
 for(const kind of ['color','shape','stroke','size','colorInterval','strokeInterval']){
  let p=base().createScatterPlot({id:'p',x:'x',y:'y',guides:false});
  const interval=kind.endsWith('Interval'),channel=interval?kind.replace('Interval',''):kind;
  p=p[`encode${channel[0].toUpperCase()+channel.slice(1)}`]({target:'p',field:interval?'x':'g',fieldType:interval?'quantitative':channel==='size'?'ordinal':'nominal',...(interval?{scale:{type:'quantize',range:['red','blue']}}:{})});
  const options={target:'p',channels:[channel]};
  const q=p.createLegend({...options,labels:{align:'right'}}),r=p.createLegend(options).editLegendLabels({target:'p',channel,align:'right'});
  assert.deepEqual(r.graphicSpec,q.graphicSpec,kind);
  assert.deepEqual(replay(q).graphicSpec,q.graphicSpec);
  const before=serializeProgram(q);
  for(const align of [undefined,null,'start','justify'])assert.throws(()=>q.editLegendLabels({target:'p',channel,align}),/align/);
  assert.equal(serializeProgram(q),before);
 }
});
