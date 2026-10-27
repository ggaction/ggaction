import { assertEquivalentMeaning } from "../../../support/identity-equivalence.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
const rows=[{series:'A',x:1,y:2,z:3,w:10},{series:'B',x:2,y:3,z:4,w:12}];
const base=()=>chart().createCanvas({width:800,height:650,margin:120}).createData({id:'data',values:rows});
const radar=(fields=['x','y','z'])=>base().createRadarPlot({id:'radar',wide:{fields},groupBy:'series',color:'series'});

test('Radar dimension revisions preserve grouping, current appearance, guide style and path closure',()=>{
 const before=radar().editLineMark({target:'radar',strokeWidth:4,opacity:.45})
   .editThetaAxis({labels:{fontSize:15}}).editLegend({target:'radar',position:'bottom'});
 const snapshot=serializeProgram(before), input={target:'radar',wide:{fields:['w','y','x','z']}};
 const inputSnapshot=JSON.stringify(input), after=before.editRadarPlot(input);
 assert.deepEqual(serializeProgram(before),snapshot);assert.equal(JSON.stringify(input),inputSnapshot);
 assert.deepEqual(after.resolvedScales.theta.domain,input.wide.fields);
 assert.deepEqual(after.resolvedScales.radius.domain,[1,12]);
 assert.deepEqual(after.semanticSpec.layers[0].encoding.group,before.semanticSpec.layers[0].encoding.group);
 assert.deepEqual(after.semanticSpec.layers[0].encoding.color,before.semanticSpec.layers[0].encoding.color);
 assert.equal(after.markConfigs.radar.strokeWidth,4);assert.equal(after.markConfigs.radar.opacity,.45);
 assert.equal(after.guideConfigs.axis.theta.labels.fontSize,15);
 assert.equal(Object.values(after.guideConfigs.legend)[0].position,'bottom');
 assert.ok(after.graphicSpec.objects.radar.items.every(item=>item.properties.commands.at(-1).op==='Z'));
 assert.match(renderToSVG(after),/<svg/);
 assert.equal(after.trace.children.length,before.trace.children.length+1);assert.equal(after.trace.children.at(-1).op,'editRadarPlot');
 assert.deepEqual(deserializeProgram(serializeProgram(after)).graphicSpec,after.graphicSpec);
});

test('Radar dimension edit matches direct final construction geometry and supports two-axis comparison',()=>{
 const after=radar().editRadarPlot({wide:{fields:['w','y','x','z']}}), direct=radar(['w','y','x','z']);
 assertEquivalentMeaning(after.graphicSpec.objects.radar,direct.graphicSpec.objects.radar);
 const two=after.editRadarPlot({wide:{fields:['y','w']}});
 assert.deepEqual(two.resolvedScales.theta.domain,['y','w']);assert.deepEqual(two.resolvedScales.radius.domain,[2,12]);
 assert.equal(two.semanticSpec.datasets.find(d=>d.id===two.semanticSpec.layers[0].data).values.length,4);
 assert.ok(two.graphicSpec.objects.radar.items.every(item=>item.properties.commands.at(-1).op==='Z'));
 assert.match(renderToSVG(two),/<svg/);
});

test('Radar invalid dimensions and non-wide targets reject atomically',()=>{
 const p=radar(), snapshot=serializeProgram(p);
 for(const wide of [{fields:['x']},{fields:['x','x']},{fields:['x','unknown']},{fields:['x','series']},{fields:['x','y'],as:{key:'k'}}])assert.throws(()=>p.editRadarPlot({target:'radar',wide}));
 assert.throws(()=>p.editRadarPlot({target:'unknown',wide:{fields:['x','y']}}));
 assert.throws(()=>p.editRadarPlot({}));
 assert.deepEqual(serializeProgram(p),snapshot);
 const long=base().createPolarLinePlot({id:'other',theta:'x',radius:'y',guides:false});
 assert.throws(()=>long.editRadarPlot({target:'other',wide:{fields:['x','y']}}));
});
