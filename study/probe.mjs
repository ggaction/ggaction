import assert from 'node:assert/strict';
import {writeFile, mkdir} from 'node:fs/promises';
import {chart, hconcat} from '../ggaction/src/index.js';
import {renderToSVG} from '../ggaction/src/renderers/svg.js';
import {renderToPNGBuffer} from '../ggaction/src/renderers/png.js';
import {serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic} from '../ggaction/src/persistence.js';
import {describeAction, comparePrograms, inspectProgram} from '../ggaction/src/inspection.js';
import {createTransitionScene} from '../ggaction/src/scene.js';
import {searchGgaction} from '../ggaction/knowledge/task-resolver.js';

const out = new URL('./probe-output/', import.meta.url);
await mkdir(out, {recursive:true});
const rows = [
  {x:1,y:2,z:8,group:'A'}, {x:2,y:4,z:6,group:'A'},
  {x:3,y:3,z:4,group:'A'}, {x:4,y:6,z:2,group:'A'},
  {x:1,y:5,z:8,group:'B'}, {x:2,y:6,z:6,group:'B'},
  {x:3,y:8,z:4,group:'B'}, {x:4,y:7,z:2,group:'B'}
];
const base = chart().createCanvas({width:600,height:360,margin:{top:35,right:120,bottom:65,left:65}})
  .createData({id:'study',values:rows})
  .createScatterPlot({id:'points',x:'x',y:'y',color:'group'});
const original = serializeProgram(base);
const storedX = base.semanticSpec.datasets[0].values[0].x;
rows[0].x = 999;
assert.equal(base.semanticSpec.datasets[0].values[0].x, storedX);
const branch = base.editPointMark({target:'points',opacity:0.45,shape:'diamond'})
  .editXScale({target:'points',domain:[0,10],nice:false});
assert.equal(serializeProgram(base),original);
assert.equal(branch.semanticSpec.datasets,base.semanticSpec.datasets);
const restored = deserializeProgram(serializeProgram(branch));
assert.equal(renderToSVG(restored),renderToSVG(branch));
assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(branch))),renderToSVG(branch));
const primitiveOnly = base.editSemantic({property:'layer[points].encoding.x.field',value:'z'});
assert.equal(primitiveOnly.graphicSpec,base.graphicSpec);
assert.equal(renderToSVG(primitiveOnly),renderToSVG(base));
const encoded = base.encodeX({target:'points',field:'z'});
assert.notEqual(renderToSVG(encoded),renderToSVG(base));
const descriptor = describeAction(base,{action:'editPointMark',target:{kind:'mark',id:'points'},options:{opacity:2}});
let rejection;
try {base.editPointMark({target:'points',opacity:2});} catch(error) {rejection=error.message;}
assert.ok(rejection);
assert.equal(serializeProgram(base),original);
const regression = base.createRegression({target:'points',interval:false});
const revised = regression.reviseData({source:'study',id:'study-v2',values:base.semanticSpec.datasets[0].values.map(r=>({...r,y:r.y+2}))});
const facet = base.facet({field:'group',columns:2,gap:50});
const composition = hconcat({programs:[{id:'original',program:base},{id:'edited',program:branch}],gap:30});
const scene = createTransitionScene(base,{format:'canvas'});
assert.equal(scene,createTransitionScene(base,{format:'canvas'}));
assert.deepEqual(structuredClone(scene),scene);
const programs={base,branch,regression,revised,facet,composition};
const outputs={};
for (const [name,program] of Object.entries(programs)) {
  await writeFile(new URL(name+'.svg',out),renderToSVG(program));
  const png=await renderToPNGBuffer(program);
  await writeFile(new URL(name+'.png',out),png.buffer);
  outputs[name]={width:png.width,height:png.height,pngBytes:png.bytes,traceTopLevel:program.trace.children.map(n=>n.op)};
}
function traceTree(node,depth=0) {
  return ['  '.repeat(depth)+node.op,...node.children.flatMap(c=>traceTree(c,depth+1))];
}
const result={
  passed:true,
  checks:['caller input ownership','immutable branch','unchanged dataset sharing','editable SVG round trip','graphic-only SVG round trip','primitive semantic edit does not materialize','domain encoding materializes','atomic rejection','derived regression data revision','facet and concat rendering','scene cache and structured clone'],
  descriptorBoundary:{applicability:descriptor.applicability,execution:descriptor.checks.find(c=>c.name==='execution'),actualRejection:rejection},
  comparison:comparePrograms(base,branch),inspection:inspectProgram(base),
  scene:{version:scene.version,nodes:scene.nodes.length},outputs,
  authoringPacket:searchGgaction('Create a scatter plot of x versus y colored by group')
};
await writeFile(new URL('results.json',out),JSON.stringify(result,null,2)+'\n');
await writeFile(new URL('base-trace.txt',out),traceTree(base.trace).join('\n')+'\n');
console.log(JSON.stringify({passed:result.passed,checks:result.checks,descriptorBoundary:result.descriptorBoundary,scene:result.scene,outputs},null,2));
