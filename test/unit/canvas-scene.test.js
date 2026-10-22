import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {chart,render,hconcat} from '../../src/index.js';
import {createTransitionScene,renderTransitionScene} from '../../src/scene.js';
const rows=[{x:1,y:3,c:'a'},{x:2,y:5,c:'b'},{x:3,y:2,c:'a'}];
const base=()=>chart().createCanvas({plot:{width:220,height:200},margin:{left:70,right:120,top:40,bottom:70}}).createData({id:'d',values:rows});
const scatter=()=>base().createScatterPlot({id:'p',data:'d',x:{field:'x'},y:{field:'y'},color:{field:'c',fieldType:'nominal'}}).createGuides();
function pixels(program,scene,ratio=1){const canvas=createCanvas(1,1),ctx=canvas.getContext('2d');
 if(scene)renderTransitionScene(scene,ctx,{pixelRatio:ratio});else render(program,ctx,{pixelRatio:ratio});
 return ctx.getImageData(0,0,canvas.width,canvas.height).data;
}
test('Canvas scenes share SVG semantic keys without storing SVG or changing programs',()=>{
 const p=scatter(),snapshot=JSON.stringify(p),scene=createTransitionScene(p,{format:'canvas'});
 assert.equal(scene.version,2);assert.equal(scene,createTransitionScene(p,{format:'canvas'}));
 assert.deepEqual(scene.nodes.map(n=>n.key),createTransitionScene(p).nodes.map(n=>n.key));
 assert.deepEqual(structuredClone(scene),scene);assert.ok(scene.nodes.every(n=>!('svg' in n)&&n.properties));
 assert.equal(JSON.stringify(p),snapshot);assert.throws(()=>scene.nodes[0].properties.x=100);
 assert.throws(()=>createTransitionScene(p,{format:'bitmap'}),/format/);
});
test('Canvas scene output equals native Canvas across marks, composition, alpha and nested clips',()=>{
 const p=scatter();
 const variants=[p,p.encodeOpacity({target:'p',value:.3}).encodeStroke({target:'p',value:'#000'}),
  p.facet({field:'c',data:'d',columns:2}),
  base().createLinePlot({id:'p',data:'d',x:{field:'x'},y:{field:'y'}}).createGuides(),
  base().createBarPlot({id:'p',data:'d',x:{field:'c',fieldType:'nominal'},y:{field:'y',aggregate:'mean'}}).createGuides(),
  base().createPiePlot({id:'p',data:'d',category:{field:'c'},value:'y',aggregate:'sum'}).createGuides()];
 for(const [i,program] of variants.entries())for(const ratio of [1,2]){
  const scene=createTransitionScene(program,{format:'canvas'});
  assert.deepEqual(pixels(program,scene,ratio),pixels(program,null,ratio),`variant ${i}, DPR ${ratio}`);
 }
});
test('Invalid scene never resizes the target and mutable intermediate frames are not stale',()=>{
 const p=scatter(),scene=structuredClone(createTransitionScene(p,{format:'canvas'}));
 const canvas=createCanvas(100,80),ctx=canvas.getContext('2d');
 assert.throws(()=>renderTransitionScene({...scene,nodes:[scene.nodes[0],scene.nodes[0]]},ctx),/unique/);
 assert.equal(canvas.width,100);
 const before=pixels(p,scene);scene.nodes.find(n=>n.type==='circle').properties.fill='#ff0000';
 assert.notDeepEqual(pixels(p,scene),before);
 assert.throws(()=>renderTransitionScene({...scene,version:1},ctx),/version 2/);
});
