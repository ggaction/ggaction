import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat, vconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { createTransitionScene } from '../../../../src/scene.js';
import { compositionPlotBounds } from '../../../../src/materialization/composition.js';
const rows = Array.from({length:24}, (_,i)=>({sex:i%2?'Male':'Female',day:['Sun','Sat','Thur','Fri'][i%4],tip:1+i%7,total_bill:6+i}));
const base=()=>chart().createCanvas({plot:{width:220,height:220},margin:{left:65,right:160,top:45,bottom:70}}).createData({id:'d',values:rows});
function points({shape=false,polar=false,facet=false,size=false,reverse=false}={}) {
 let p=polar?base().createPolarScatterPlot({id:'p',theta:'tip',radius:'total_bill',guides:false})
  :base().createScatterPlot({id:'p',x:'tip',y:'total_bill',guides:false});
 p=p.encodeColor({target:'p',field:'sex',fieldType:'nominal',scale:{palette:'dark2'}});
 if(shape)p=p.encodeShape({target:'p',field:'sex',scale:{domain:['Female','Male'],range:reverse?['square','circle']:['circle','square']}});
 if(size)p=p.encodeSize({target:'p',field:'total_bill'});
 p=p.createGuides({legend:{target:'p',channels:['color',...(shape?['shape']:[]),...(size?['size']:[])]}});
 return facet?p.facet({field:'day',columns:2,guides:{legend:'shared'}}):p;
}
const titles=p=>Object.entries(p.graphicSpec.objects).filter(([id])=>id.endsWith('LegendTitle')).map(([id,o])=>({id,text:o.properties.text}));
const join=(a,b,fn=hconcat)=>fn({programs:[{id:'a',program:a},{id:'b',program:b}],share:{color:true},gap:8});

for(const fn of [hconcat,vconcat]) test(`${fn.name}: color-only plus faceted Polar color/shape collects one explanation without dropping size`,()=>{
 const a=points(),b=points({polar:true,shape:true,facet:true,size:true}),before=serializeProgram(b);
 const p=join(a,b,fn), sex=titles(p).filter(t=>t.text==='sex');
 assert.equal(sex.length,1);assert.ok(sex[0].id.endsWith('seriesLegendTitle'));
 assert.equal(titles(p).filter(t=>t.text==='total_bill').length,1);
 const symbols=Object.entries(p.graphicSpec.objects).find(([id])=>id.endsWith('seriesLegendSymbolPoints'))[1];
 assert.equal(symbols.items.length,2);
 assert.notDeepEqual(symbols.items[0],symbols.items[1]);
 const bounds=p.graphicSpec.objects['composition-shared-color-legend'].properties;
 const plot=compositionPlotBounds(p);assert.ok(bounds.x>=plot.x+plot.width);
 assert.equal(serializeProgram(b),before);
 assert.equal(titles(p.editCompositionScales({share:{color:false}})).filter(t=>t.text==='sex').length,2);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 const scene=createTransitionScene(p,{format:'canvas'});
 const title=scene.nodes.find(n=>n.type==='text'&&n.properties.text==='sex'&&n.offset[0]>=plot.x+plot.width);
 assert.ok(title,'shared title is present in the outer lane');
 assert.ok(title.properties.x+title.offset[0]>=title.clip[0]);
 assert.ok(title.properties.y+title.offset[1]>=title.clip[1]);
 assert.ok(title.properties.x+title.offset[0]<title.clip[0]+title.clip[2]);
});

test('same-field compatible combined legends merge across reverse child order and nested concat',()=>{
 const combined=points({shape:true}),simple=points();
 for(const p of [join(combined,simple),join(simple,combined),join(join(simple,combined),combined),join(combined,join(simple,combined))]){
  assert.equal(titles(p).filter(t=>t.text==='sex').length,1);
  assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 }
});

test('different shape mappings are not erased by shared color or nested collection',()=>{
 const a=points({shape:true}),b=points({shape:true,reverse:true}),simple=points();
 assert.equal(titles(join(a,b)).filter(t=>t.text==='sex').length,2);
 const nested=join(join(simple,a),b);
 assert.equal(titles(nested).filter(t=>t.text==='sex').length,2);
 const third=join(nested,simple);
 assert.equal(titles(third).filter(t=>t.text==='sex').length,3);
});

test('shape and color on different fields retain separate explanations',()=>{
 const a=points(),b=points().removeLegend({target:'p',channels:['color']}).encodeShape({target:'p',field:'day'}).createGuides({legend:{target:'p',channels:['color','shape']}});
 const p=join(a,b);
 assert.equal(titles(p).filter(t=>t.text==='sex').length,1);
 assert.equal(titles(p).filter(t=>t.text==='day').length,1);
});
