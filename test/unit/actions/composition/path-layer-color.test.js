import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { describeAction } from '../../../../src/inspection.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
import { createTransitionScene } from '../../../../src/scene.js';

const rows=[{x:1,y:2,g:'A',c:3},{x:2,y:4,g:'A',c:4},
  {x:1,y:3,g:'B',c:6},{x:2,y:5,g:'B',c:8}];
const base=(values=rows)=>chart().createCanvas({plot:{width:300,height:260},margin:90})
  .createData({id:'data',values});
const numeric={field:'c',fieldType:'quantitative',scale:{palette:'blues'}};

test('path layers do not inherit a point color that varies within a path',()=>{
  const p=base().createScatterPlot({id:'p',x:'x',y:'y',color:numeric});
  const before=serializeProgram(p);
  for(const action of ['createLinePlot','createAreaPlot']) {
    const args={id:'path',source:'p',plot:{action}};
    assert.equal(describeAction(p,{action:'createLayerPlot',options:args}).applicability,'supported');
    const q=p.createLayerPlot(args),layer=q.semanticSpec.layers.find(layer=>layer.id==='path');
    assert.equal(layer.encoding.color,undefined);
    assert.equal(layer.encoding.group,undefined);
    assert.equal(q.graphicSpec.objects.path.items.length,1);
    assert.deepEqual(q.semanticSpec.layers.find(layer=>layer.id==='p'),p.semanticSpec.layers.find(layer=>layer.id==='p'));
    assert.deepEqual(createTransitionScene(deserializeProgram(serializeProgram(q)),{format:'canvas'}),createTransitionScene(q,{format:'canvas'}));
  }
  assert.equal(serializeProgram(p),before);
});

test('explicit incompatible path color fails in inspection and execution without changing the source',()=>{
  const p=base().createScatterPlot({id:'p',x:'x',y:'y',color:numeric}),before=serializeProgram(p);
  const args={source:'p',plot:{action:'createLinePlot',options:{color:numeric}}};
  const result=describeAction(p,{action:'createLayerPlot',options:args});
  assert.equal(result.applicability,'incompatible');
  assert.match(result.findings[0].message,/one value within each series/);
  assert.throws(()=>p.createLayerPlot(args),/one value within each series/);
  assert.equal(serializeProgram(p),before);
});

test('categorical colors and compatible continuous per-series colors preserve their real grouping',()=>{
  const categorical=base().createScatterPlot({id:'p',x:'x',y:'y',color:{field:'g',fieldType:'nominal'}});
  for(const action of ['createLinePlot','createAreaPlot']) {
    const q=categorical.createLayerPlot({id:'path',source:'p',plot:{action}});
    assert.equal(q.semanticSpec.layers.find(layer=>layer.id==='path').encoding.color.field,'g');
    assert.equal(q.graphicSpec.objects.path.items.length,2);
  }
  const values=rows.map(row=>({...row,c:row.g==='A'?3:6}));
  const line=base(values).createLinePlot({id:'p',x:'x',y:'y',groupBy:'g',color:numeric});
  const inherited=line.createLayerPlot({id:'path',source:'p',plot:{action:'createLinePlot'}});
  const layer=inherited.semanticSpec.layers.find(layer=>layer.id==='path');
  assert.equal(layer.encoding.color.field,'c');
  assert.equal(layer.encoding.group.field,'g');
  assert.equal(inherited.graphicSpec.objects.path.items.length,2);
  const points=base(values).createScatterPlot({id:'p',x:'x',y:'y',color:numeric});
  const explicit=points.createLayerPlot({id:'path',source:'p',plot:{action:'createLinePlot',options:{groupBy:'g',color:{field:'c',fieldType:'quantitative'}}}});
  assert.equal(explicit.graphicSpec.objects.path.items.length,2);
  assert.equal(explicit.semanticSpec.layers.find(layer=>layer.id==='path').encoding.color.field,'c');
});

test('Polar Line uses the same safe color inheritance and explicit categorical alternative',()=>{
  const p=base().createPolarScatterPlot({id:'p',theta:'x',radius:'y',color:numeric});
  const q=p.createLayerPlot({id:'path',source:'p',plot:{action:'createPolarLinePlot'}});
  assert.equal(q.semanticSpec.layers.find(layer=>layer.id==='path').encoding.color,undefined);
  const colored=p.createLayerPlot({id:'path',source:'p',plot:{action:'createPolarLinePlot',options:{color:{field:'g',fieldType:'nominal'}}}});
  assert.equal(colored.graphicSpec.objects.path.items.length,2);
});
