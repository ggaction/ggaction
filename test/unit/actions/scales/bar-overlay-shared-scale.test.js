import assert from'node:assert/strict';import test from'node:test';
import{chart}from'../../../../src/index.js';import{renderToSVG}from'../../../../src/renderers/svg.js';import{serializeProgram,deserializeProgram}from'../../../../src/persistence.js';
function base(horizontal=true,explicit=true,layout='overlay'){
 const measure={field:'v',...(explicit?{scale:{domain:[0,30],nice:false}}:{})},category={field:'c',fieldType:'nominal'};
 return chart().createCanvas({width:600,height:400,margin:{left:50,right:50,top:50,bottom:50}})
  .createData({id:'raw',values:[{v:10,c:'A',color:'red'},{v:20,c:'B',color:'blue'}]})
  .createBarPlot({x:horizontal?measure:category,y:horizontal?category:measure,guides:false})
  .encodeColor({field:'color',scale:{domain:['red','blue'],range:['red','blue']},layout});
}
function rule(p,horizontal=true,value=15){return p.createData({id:'summary',values:[{mean:value}]}).createRuleMark({id:'mean',data:'summary',stroke:'black'})[horizontal?'encodeX':'encodeY']({target:'mean',field:'mean',fieldType:'quantitative'});}
const props=(p,id)=>p.graphicSpec.objects[id].items.map(i=>i.properties);
for(const horizontal of[true,false])test(`overlay ${horizontal?'horizontal':'vertical'} bars share exact explicit measure scale with independent field rule`,()=>{
 const p=base(horizontal),before=JSON.stringify(p),q=rule(p,horizontal),channel=horizontal?'x':'y';
 assert.equal(JSON.stringify(p),before);assert.deepEqual(q.resolvedScales[channel].domain,[0,30]);assert.deepEqual(props(q,'barPlot'),props(p,'barPlot'));
 const line=props(q,'mean')[0];assert.equal(line[channel+'1'],horizontal?300:200);assert.match(renderToSVG(q),/<svg/);
 const edited=q.editScale({id:channel,domain:[0,60]}).editCanvas({width:700,height:500});
 assert.equal(props(edited,'mean')[0][channel+'1'],horizontal?200:350);assert.match(renderToSVG(edited),/<svg/);
 const restored=deserializeProgram(serializeProgram(q));assert.deepEqual(restored.graphicSpec,q.graphicSpec);assert.match(renderToSVG(restored),/<svg/);
});
for(const horizontal of[true,false])test(`automatic overlay ${horizontal?'x':'y'} domain includes ordinary direct consumer values`,()=>{
 const q=rule(base(horizontal,false),horizontal,50),scale=q.resolvedScales[horizontal?'x':'y'];assert(scale.domain[0]<=0&&scale.domain[1]>=50);assert.match(renderToSVG(q),/<svg/);
});
test('adding overlay layout after the independent rule preserves shared-domain meaning',()=>{
 const p=chart().createCanvas({width:600,height:400,margin:{left:50,right:50,top:50,bottom:50}}).createData({id:'raw',values:[{v:10,c:'A',color:'red'},{v:20,c:'B',color:'blue'}]}).createBarPlot({x:{field:'v',scale:{domain:[0,30],nice:false}},y:{field:'c',fieldType:'nominal'},guides:false});
 const q=rule(p).encodeColor({target:'barPlot',field:'color',layout:'overlay'});assert.equal(props(q,'mean')[0].x1,300);assert.equal(props(q,'barPlot').length,2);assert.match(renderToSVG(q),/<svg/);
});
test('non-overlay series layout still rejects independent incompatible measure fields atomically',()=>{
 for(const layout of['group','stack','fill','diverging']){const p=base(true,true,layout),before=JSON.stringify(p);assert.throws(()=>rule(p),/cannot be shared with another policy/);assert.equal(JSON.stringify(p),before);}
 const p=base(),before=JSON.stringify(p);assert.throws(()=>p.editScale({id:'x',domain:[1,30]}),/containing zero/);assert.equal(JSON.stringify(p),before);
});

test('overlay count bars retain final counts while sharing a distinct rule field',()=>{
 const p=chart().createCanvas({width:500,height:400,margin:{left:50,right:50,top:50,bottom:50}}).createData({id:'raw',values:[{c:'A',v:8,color:'red'},{c:'A',v:9,color:'red'},{c:'B',v:10,color:'blue'}]}).createBarPlot({x:{field:'c',fieldType:'nominal'},y:{field:'v',fieldType:'quantitative',aggregate:'count',scale:{domain:[0,3],nice:false}},guides:false}).encodeColor({field:'color',layout:'overlay'});
 const before=props(p,'barPlot'),q=rule(p,false,1.5);assert.deepEqual(props(q,'barPlot'),before);assert.deepEqual(before.map(p=>p.height),[200,100]);assert.equal(props(q,'mean')[0].y1,200);assert.match(renderToSVG(q),/<svg/);
});
test('incompatible layout reassignment after overlay sharing leaves the earlier program intact',()=>{
 const p=rule(base()),before=serializeProgram(p);assert.throws(()=>p.encodeColor({target:'barPlot',field:'color',layout:'stack'}),/cannot be shared with another policy/);assert.equal(serializeProgram(p),before);assert.match(renderToSVG(p),/<svg/);
});
