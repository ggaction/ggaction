import assert from 'node:assert/strict';
import {chart} from 'ggaction';
import {chart as basicChart} from 'ggaction/basic';
import {serializeProgram,deserializeProgram} from 'ggaction/persistence';
const p=chart().createCanvas({width:400,height:300,margin:60}).createData({values:[{x:0,y:1},{x:10,y:2}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'}).createXAxisLabels({values:[0,10],flush:true});
assert.ok(p.graphicSpec.objects.xAxisLabels.items[0].properties.x>60);assert.ok(p.graphicSpec.objects.xAxisLabels.items[1].properties.x<340);
assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
const rows=['Alpha category label','Beta category label','Gamma category label','Delta category label'].map((x,i)=>({x,y:i+1}));
const wrapped=chart().createCanvas({width:520,height:420,margin:{top:70,right:50,bottom:170,left:90}}).createData({values:rows}).createPointMark().encodeX({field:'x',fieldType:'nominal'}).encodeY({field:'y'}).createXAxisLabels({maxWidth:60,wrap:'word',lineHeight:14});
assert.equal(wrapped.graphicSpec.objects.xAxisLabels.items.length,12);assert.deepEqual(wrapped.editCanvas({width:600}).graphicSpec.objects.xAxisLabels.items.map(i=>i.properties.text),wrapped.graphicSpec.objects.xAxisLabels.items.map(i=>i.properties.text));
assert.equal(wrapped.editXAxisLabels({maxWidth:false,rotation:-Math.PI/3}).graphicSpec.objects.xAxisLabels.items.length,4);
for(const make of [chart,basicChart]){
 const build=width=>make().createCanvas({width,height:600,margin:10,responsive:{minPlotSize:{width:40,height:40}}}).createData({values:Array.from({length:8},(_,i)=>({x:'Long category '+i,y:i+1}))}).createBarPlot({x:'x',y:'y',guides:{axes:{x:{title:false,ticksAndLabels:{labels:{responsive:{maxLines:1},maxWidth:300}}},y:{title:false}},legend:false}});
 const r=build(400);assert.equal(r.guideConfigs.axis.x.labels.responsiveResult.stage,'skip');assert.equal(build(220).guideConfigs.axis.x.labels.responsiveResult.stage,'rotate');assert.equal(r.graphicSpec.objects.xAxisLabels.items.length,4);if(make===chart)assert.equal(r.editCanvas({width:220}).guideConfigs.axis.x.labels.responsiveResult.stage,'rotate');
}
console.log(JSON.stringify(['flush-and-codec','wrapped-rotation-resize','responsive-Full-Basic']));
