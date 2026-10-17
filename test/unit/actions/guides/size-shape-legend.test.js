import assert from 'node:assert/strict';
import test from 'node:test';
import {chart}from'../../../../src/index.js';
import {serializeProgram,deserializeProgram}from'../../../../src/persistence.js';
function source(color=false){let p=chart().createCanvas({width:1200,height:1000,margin:300})
 .createData({values:[{x:1,y:1,g:'A',other:'red'},{x:2,y:2,g:'B',other:'blue'},{x:3,y:3,g:'C',other:'red'}]})
 .createPointMark({id:'p'}).encodeX({field:'x'}).encodeY({field:'y'})
 .encodeShape({field:'g',scale:{domain:['A','B','C'],range:['circle','square','triangle-up']}})
 .encodeSize({field:'g',fieldType:'ordinal',scale:{domain:['A','B','C'],range:[25,100,225]}});
 return color?p.encodeColor({field:'other'}):p;}
function items(p){return p.graphicSpec.objects.seriesLegendSymbolPoints.items;}
function area(commands){const points=commands.filter(c=>c.op!=='Z');return Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a.x*b.y-b.x*a.y;},0))/2;}
test('mapped size-shape samples preserve independent physical areas and categorical assignments',()=>{
 const seed=source(true),p=seed.createLegend({combine:'size-shape'}),[circle,square,triangle]=items(p);
 assert.equal(circle.type,'circle');assert.equal(circle.properties.radius,Math.sqrt(25/Math.PI));
 assert.equal(square.type,'rect');assert.equal(square.properties.width,10);assert.equal(square.properties.height,10);
 assert.equal(triangle.type,'path');assert.ok(Math.abs(area(triangle.properties.commands)-225)<1e-9);
 assert.equal(Object.keys(p.guideConfigs.legend).length,2);assert.ok(p.guideConfigs.legend.color);
 assert.equal(p.guideConfigs.legend.size,undefined);assert.deepEqual(p.guideConfigs.legend.series.channels,['shape','size']);
 assert.deepEqual(p.semanticSpec.datasets,seed.semanticSpec.datasets);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 assert.deepEqual(p.rematerializeLegend().graphicSpec,p.graphicSpec);
 const reordered=p.editLegendBlock({target:'p',channel:'size',order:['C','B','A']});
 assert.deepEqual(reordered.guideConfigs.legend.series.sizeAreas,[225,100,25]);assert.equal(items(reordered)[0].type,'path');
});
test('combined aliases edit/remove together and separate splits shared styles and native defaults',()=>{
 const p=source(true).createLegend({combine:'size-shape',labels:{fontSize:15},title:'Combined'});
 const a=p.editLegendBlock({target:'p',channel:'shape',text:{color:'red'}}),b=p.editLegendBlock({target:'p',channel:'size',text:{color:'red'}});
 assert.deepEqual(a.graphicSpec,b.graphicSpec);
 assert.equal(p.removeLegend({channels:['size']}).guideConfigs.legend.series,undefined);
 assert.ok(p.removeLegend({channels:['shape']}).guideConfigs.legend.color);
 const split=p.editLegend({combine:'separate'});
 assert.deepEqual(Object.keys(split.guideConfigs.legend).sort(),['color','series','size']);
 assert.equal(split.guideConfigs.legend.series.labels.fontSize,15);assert.equal(split.guideConfigs.legend.size.labels.fontSize,15);
 assert.equal(split.guideConfigs.legend.series.title,'Combined');assert.equal(split.guideConfigs.legend.size.title,'Combined');
 const remerged=split.editLegend({combine:'size-shape'});
 assert.equal(remerged.guideConfigs.legend.series.combine,'size-shape');
 assert.equal(remerged.guideConfigs.legend.series.labels.fontSize,12);
 const styled=remerged.editLegend({title:'Kept'}).editLegendLabels({channel:'size',color:'navy'});
 assert.equal(styled.guideConfigs.legend.series.combine,'size-shape');
 assert.throws(()=>styled.editLegend({channels:['size']}),/explicitly choose separate/);
 assert.throws(()=>styled.editLegend({channel:'size',combine:'separate'}),/Selected legend edits/);
});
test('eligibility, mapped overrides and malformed stored state reject atomically',()=>{
 const seed=source(),p=seed.createLegend({combine:'size-shape'}),before=JSON.stringify(p);
 for(const channels of [['size'],['shape'],['shape','size','color']])assert.throws(()=>seed.createLegend({combine:'size-shape',channels}));
 for(const symbol of [{layers:[{type:'point',size:5}]},{layers:[{type:'point',shape:'circle'}]}]){
  assert.throws(()=>seed.createLegend({combine:'size-shape',symbol}),/cannot override mapped/);
  assert.throws(()=>p.editLegendSymbols({channel:'shape',symbol}),/cannot override mapped/);
 }
 assert.throws(()=>p.editLegendBlock({target:'p',channel:'size',symbol:{size:20}}),/mapped size/);
 assert.throws(()=>p.editScale({id:'size',domain:['C','B','A']}),/identical ordered domains/);
 assert.equal(JSON.stringify(p),before);
 const cfg=structuredClone(p.materializationConfigs);cfg.guides.legend.series.sizeAreas[1]=99;
 assert.throws(()=>serializeProgram(p._clone({materializationConfigs:cfg})),/Stale combined/);
 const ordinary=source().createLegend();assert.deepEqual(source().createLegend({combine:'separate'}).graphicSpec,ordinary.graphicSpec);
 const updated=p.editScale({id:'size',range:[0,36,400]});assert.deepEqual(updated.guideConfigs.legend.series.sizeAreas,[0,36,400]);
 assert.deepEqual(updated.editCanvas({width:1300}).editCanvas({width:1200}).graphicSpec,updated.graphicSpec);
});

test('combined eligibility rejects different fields, continuous size and ambiguous owners',()=>{
 const mismatch=source().encodeSize({field:'other',fieldType:'ordinal',scale:{domain:['red','blue'],range:[25,100]}});
 assert.throws(()=>mismatch.createLegend({combine:'size-shape'}),/one categorical field/);
 const continuous=source().encodeSize({field:'x',scale:{id:'continuousSize',type:'linear',domain:[1,3],range:[25,100]}});
 assert.throws(()=>continuous.createLegend({combine:'size-shape'}),/categorical field/);
 const multiple=source().createPointMark({id:'q'}).encodeShape({field:'g'}).encodeSize({field:'g',fieldType:'ordinal'});
 assert.throws(()=>multiple.createLegend({combine:'size-shape'}),/one point owner/);
 const targeted=multiple.createLegend({target:'p',combine:'size-shape'});
 assert.equal(targeted.guideConfigs.legend.series.target,'p');
 const before=JSON.stringify(targeted);
 assert.throws(()=>targeted.editLegend({combine:'unknown'}),/combine/);
 assert.equal(JSON.stringify(targeted),before);
});
