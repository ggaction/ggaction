import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
const rows=[{id:1,g:'A',x:1,y:100,z:2},{id:2,g:'A',x:2,y:200,z:2},{id:3,g:'A',x:9,y:300,z:2},{id:4,g:'B',x:7,y:500,z:2}];
const base=()=>chart().createCanvas({plot:{width:300,height:300},margin:100}).createData({id:'data',values:rows});
const make=(summary='mean',normalize=false)=>base().createRadarPlot({id:'radar',data:'data',wide:{fields:['x','y','z'],summary,normalize},groupBy:'g',color:'g'});
const values=p=>p.semanticSpec.datasets.find(d=>d.id===p.semanticSpec.layers[0].data).values;
test('Radar explicit mean/median creates one profile per group and independent color, without mutating source',()=>{
 const p=make(), source=p.semanticSpec.datasets.find(d=>d.id==='data');
 assert.deepEqual(source.values,rows);
 assert.equal(p.graphicSpec.objects.radar.items.length,2);
 assert.deepEqual(values(p).filter(r=>r.g==='A').map(r=>r.radarValue),[4,200,2]);
 const median=p.editRadarPlot({wide:{fields:['z','x','y'],summary:'median'}});
 assert.deepEqual(values(median).filter(r=>r.g==='A').map(r=>r.radarValue),[2,2,200]);
 assert.deepEqual(median.semanticSpec.layers[0].encoding.color,p.semanticSpec.layers[0].encoding.color);
 assert.deepEqual(median.graphicSpec.objects.radar.items.map(i=>i.properties.commands),
  base().createRadarPlot({id:'radar',wide:{fields:['z','x','y'],summary:'median'},groupBy:'g',color:'g'}).graphicSpec.objects.radar.items.map(i=>i.properties.commands));
 const all=base().createRadarPlot({wide:{fields:['x','y','z'],summary:'mean'}});
 assert.equal(all.graphicSpec.objects.radarPlot.items.length,1);
});
test('Radar minmax is explicit, per dimension, row preserving, finite for constants, and reversible',()=>{
 const p=make('mean','minmax');
 assert.deepEqual(p.resolvedScales.radius.domain,[0,1]);
 assert.deepEqual(values(p).map(r=>r.radarValueNormalized),[0,0,0,1,1,0]);
 assert.deepEqual(values(p).map(r=>r.radarValue),[4,200,2,7,500,2]);
 const raw=p.editRadarPlot({wide:{fields:['x','y','z'],normalize:false}});
 assert.deepEqual(raw.graphicSpec.objects.radar,make().graphicSpec.objects.radar);
 assert.deepEqual(deserializeProgram(serializeProgram(p)).graphicSpec,p.graphicSpec);
 assert.match(renderToSVG(p),/<svg/);
});
test('Radar repeat revisions release obsolete owned pipelines and preserve borrowed data',()=>{
 let p=make();
 const original=serializeProgram(p);
 for(let i=0;i<12;i++){
  p=p.editRadarPlot({wide:{fields:i%2?['x','y','z']:['z','y','x'],summary:i%2?'mean':'median',normalize:i%2?false:'minmax'}});
  assert.ok(p.semanticSpec.datasets.length<=4);
  assert.equal(p.graphicSpec.objects.radar.items.length,2);
 }
 assert.deepEqual(serializeProgram(make()),original);
 const borrowed=make().createData({id:'other',values:[{a:1}]});
 assert.deepEqual(borrowed.editRadarPlot({target:'radar',wide:{fields:['x','y'],summary:'median'}}).semanticSpec.datasets.find(d=>d.id==='other').values,[{a:1}]);
});
test('Radar malformed profiles reject atomically rather than silently summarizing or normalizing',()=>{
 const p=base(), before=serializeProgram(p);
 for(const wide of [{fields:['x','y','z'],summary:'sum'},{fields:['x','y','z'],normalize:'zscore'},{fields:['x','y','z']}]) {
  assert.throws(()=>p.createRadarPlot({wide,groupBy:'g'}));
 }
 assert.deepEqual(serializeProgram(p),before);
 const ready=make(), snapshot=serializeProgram(ready);
 assert.throws(()=>ready.editRadarPlot({wide:{fields:['x','y'],summary:false}}),/one row/);
 assert.deepEqual(serializeProgram(ready),snapshot);
});
