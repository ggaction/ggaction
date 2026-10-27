import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {resolveConcreteGraphicBounds} from '../../../../src/grammar/schemas/graphicBounds.js';
import {renderToSVG} from '../../../../src/renderers/svg.js';

function base(){return chart().createCanvas({width:1100,height:900,margin:260})
 .createData({values:[{x:0,y:0,g:'A',v:1},{x:1,y:1,g:'B',v:10}]})
 .createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'});}
const families={
 shape:p=>p.encodeShape({field:'g'}),
 sizeOrdinal:p=>p.encodeSize({field:'g',fieldType:'ordinal',scale:{range:[20,80]}}),
 colorSymbols:p=>p.encodeColor({field:'v',fieldType:'quantitative'}),
 strokeWidth:p=>p.createLineMark({id:'lines'}).encodeX({field:'x'}).encodeY({field:'y'}).encodeGroup({field:'g'}).encodeStrokeWidth({field:'v'}),
 categorical:p=>p.encodeColor({field:'g'}),size:p=>p.encodeSize({field:'v'}),
 opacity:p=>p.encodeOpacity({field:'v'}),gradient:p=>p.encodeColor({field:'v',fieldType:'quantitative'}),
 interval:p=>p.encodeColor({field:'v',fieldType:'quantitative',scale:{type:'quantize',range:['red','blue']}}),
 stroke:p=>p.encodeStroke({field:'v',fieldType:'quantitative'}),
 strokeInterval:p=>p.encodeStroke({field:'v',fieldType:'quantitative',scale:{type:'quantize',range:['red','blue']}})
};
function created(family,position,border){
 const channel={shape:'shape',sizeOrdinal:'size',colorSymbols:'color',strokeWidth:'strokeWidth',categorical:'color',gradient:'color',interval:'color',stroke:'stroke',strokeInterval:'stroke',size:'size',opacity:'opacity'}[family];
 return families[family](base()).createLegend({channels:[channel],position,border,...(family==='colorSymbols'?{representation:'symbols'}:{})});
}
const bg=p=>Object.entries(p.graphicSpec.objects).find(([id])=>id.endsWith('Background'));
const border={color:'#263238',background:'transparent',lineWidth:5,padding:8};
const dash=Object.freeze([4,2,6,1]);

test('dashed border uses one continuous closed path and exact solid occupied bounds across families',()=>{
 for(const family of Object.keys(families))for(const position of ['left','right','top','bottom']){
  const solid=created(family,position,border),[id,g]=bg(solid),p=created(family,position,{...border,strokeDash:dash}),actual=p.graphicSpec.objects[id];
  assert.equal(actual.type,'path',family);assertEquivalentMeaning(created(family,position,{...border,strokeDash:[]}).graphicSpec,solid.graphicSpec);const {x,y,width:w,height:h}=g.properties;
  assert.deepEqual(actual.properties.commands,[{op:'M',x,y},{op:'L',x:x+w,y},{op:'L',x:x+w,y:y+h},{op:'L',x,y:y+h},{op:'Z'}]);
  assert.deepEqual(actual.properties.strokeDash,dash);assert.deepEqual(resolveConcreteGraphicBounds(p.graphicSpec,id),resolveConcreteGraphicBounds(solid.graphicSpec,id));
  assert.deepEqual(p.graphicSpec.order,solid.graphicSpec.order);assert.match(renderToSVG(p),/stroke-dasharray="4 2 6 1"/);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 }
});

test('dash edits preserve frame identity and order, and [] restores unchanged solid graphics',()=>{
 const solid=created('categorical','right',border),[id]=bg(solid),snapshot=JSON.stringify(solid);
 const p=solid.editLegendBorder({border:{strokeDash:dash}});
 assert.equal(p.graphicSpec.objects[id].type,'path');assert.equal(JSON.stringify(solid),snapshot);
 const reset=p.editLegendBorder({border:{strokeDash:[]}});assert.deepEqual(reset.graphicSpec,solid.graphicSpec);
 assert.deepEqual(reset.graphicSpec.objects.canvas.children,solid.graphicSpec.objects.canvas.children);
 assert.deepEqual(p.editCanvas({width:1200}).graphicSpec,p.editCanvas({width:1200}).rematerializeLegend().graphicSpec);
 assert.equal(p.editLegendBorder({border:false}).graphicSpec.objects[id],undefined);
 assert.equal(p.editLegendLabels({fontSize:11}).graphicSpec.objects[id].type,'path');
});

test('dash grammar rejects malformed arrays atomically on creation, edit and saved-state validation',()=>{
 const p=created('size','right',border),before=JSON.stringify(p);
 for(const strokeDash of [[1],[1,2,3],[-1,2],[NaN,2],[Infinity,2],Array(2),'dashed',null]){
  assert.throws(()=>created('size','right',{...border,strokeDash}),/even-length/);
  assert.throws(()=>p.editLegendBorder({border:{strokeDash}}),/even-length/);assert.equal(JSON.stringify(p),before);
 }
 assert.throws(()=>p.editLegendBorder({border:{strokeDash:[4,2],extra:true}}),/Unknown/);
 const caller=[4,2],edited=p.editLegendBorder({border:{strokeDash:caller}});caller[0]=99;
 assert.deepEqual(bg(edited)[1].properties.strokeDash,[4,2]);assert.ok(Object.isFrozen(bg(edited)[1].properties.strokeDash));
 const allZero=created('size','right',{...border,strokeDash:[0,0]});assert.equal(bg(allZero)[1].type,'path');
 const cfg=structuredClone(p.materializationConfigs);cfg.guides.legend.size.border.strokeDash=[1];
 assert.throws(()=>serializeProgram(p._clone({materializationConfigs:cfg})),/even-length/);
});


test('dashed frames preserve grouped and shared-facet ownership through replay',()=>{
 const p=base().encodeColor({field:'g'}).encodeSize({field:'v'})
  .createLegend({channels:['color','size'],border:{...border,strokeDash:dash}})
  .editLegendLayout({position:'bottom',blockLayout:'row'});
 const paths=Object.values(p.graphicSpec.objects).filter(g=>g.type==='path'&&g.properties?.strokeDash);
 assert.ok(paths.length>0);assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 const f=p.facet({field:'g',guides:{legend:'shared'}});
 assert.deepEqual(deserializeProgram(serializeProgram(f)).graphicSpec,f.graphicSpec);
 assert.ok(renderToSVG(f).includes('stroke-dasharray="4 2 6 1"'));
});
