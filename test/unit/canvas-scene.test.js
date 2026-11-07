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
 assert.throws(()=>renderTransitionScene({...scene,nodes:[{...scene.nodes[0],clips:[null]}]},ctx),/clips/);
 assert.equal(canvas.width,100);
 const before=pixels(p,scene);scene.nodes.find(n=>n.type==='circle').properties.fill='#ff0000';
 assert.notDeepEqual(pixels(p,scene),before);
 assert.throws(()=>renderTransitionScene({...scene,version:1},ctx),/version 2/);
});

test('Canvas scenes preserve owner plot clips, multiline text and translated nested compositions',()=>{
 const clipped=base().createScatterPlot({id:'p',data:'d',x:{field:'x',scale:{domain:[1.5,2.5],nice:false}},y:'y',guides:false})
  .editPointMark({clip:true}).encodePointRadius({value:18})
  .createTitle({text:'First line\nSecond line'});
 for(const program of [clipped,hconcat({programs:[clipped,clipped]}),hconcat({programs:[hconcat({programs:[clipped,clipped]}),clipped]})]){
  const scene=createTransitionScene(program,{format:'canvas'});
  for (const ratio of [1,2]) assert.equal(Buffer.compare(Buffer.from(pixels(program,scene,ratio)),Buffer.from(pixels(program,null,ratio))),0,`exact scene pixels at DPR ${ratio}`);
  assert.deepEqual(scene.nodes.map(n=>n.clip),createTransitionScene(program).nodes.map(n=>n.clip));
 }
});

test('scene compiler keeps caller isolation and owned concrete descendants through translation',async()=>{
 const {canvasSceneProgram}=await import('../../src/renderers/canvasScene.js');
 const {cloneAndFreeze,isOwned}=await import('../../src/core/immutable.js');
 const source=createTransitionScene(scatter(),{format:'canvas'});
 const assertOwned=value=>{if(value===null||typeof value!=='object')return;assert.ok(isOwned(value));assert.ok(Object.isFrozen(value));for(const child of Object.values(value))assertOwned(child);};
 for(const translated of[false,true]){
  const mutable=structuredClone(source);if(translated)for(const node of mutable.nodes)node.offset=[node.offset[0]+10,node.offset[1]+20];
  const snapshot=JSON.stringify(mutable),owned=cloneAndFreeze(mutable),program=canvasSceneProgram(owned);
  assertOwned(program);assert.equal(canvasSceneProgram(owned),program);
  assert.deepEqual(program,canvasSceneProgram(mutable));assert.equal(JSON.stringify(mutable),snapshot);
  assert.equal(isOwned(mutable),false);assert.equal(isOwned(mutable.nodes[0].properties),false);assert.equal(Object.isFrozen(mutable.nodes[0].properties),false);
  const old=canvasSceneProgram(mutable);mutable.nodes.find(node=>node.type==='circle').properties.fill='red';
  assert.notEqual(canvasSceneProgram(mutable),old);assert.deepEqual(old,program);
 }
 const partial=structuredClone(source);partial.nodes[0].properties=cloneAndFreeze(partial.nodes[0].properties);assertOwned(canvasSceneProgram(partial));assert.equal(isOwned(partial.nodes[1].properties),false);
});

test('scene compiler preserves accessor rejection and later-node validation before final property copying',async()=>{
 const {canvasSceneProgram}=await import('../../src/renderers/canvasScene.js');
 const make=()=>structuredClone(createTransitionScene(scatter(),{format:'canvas'}));
 let reads=0;const getter=make();Object.defineProperty(getter.nodes[0].properties,'extra',{enumerable:true,get(){reads++;return 1;}});
 for(const input of[getter,Object.freeze(getter)])assert.throws(()=>canvasSceneProgram(input),/accessors are not supported/);assert.equal(reads,0);
 const scene=make();scene.nodes[0].properties.extra=()=>1;scene.nodes[1].type='invalid';
 assert.throws(()=>canvasSceneProgram(scene),/unique keys, concrete properties, offsets and clips/);
 scene.nodes[1].type='circle';assert.throws(()=>canvasSceneProgram(scene),/Cannot store a function at state.graphicSpec.objects.node-\d+.properties.extra/);
});

test('compiled containers own local children while shared borrowed properties retain separate snapshots',async()=>{
 const {canvasSceneProgram}=await import('../../src/renderers/canvasScene.js');
 const {cloneAndFreeze,isOwned}=await import('../../src/core/immutable.js');
 const properties={x:10,y:20,radius:3,fill:'black'},clip={type:'path',commands:[{op:'M',x:0,y:0},{op:'L',x:80,y:0},{op:'L',x:80,y:70},{op:'Z'}]};
 const scene={version:2,width:100,height:80,nodes:['a','b'].map(key=>({key,type:'circle',offset:[0,0],clip:[0,0,100,80],clips:[[0,0,100,80],clip],properties}))};
 const program=canvasSceneProgram(scene),circles=Object.values(program.graphicSpec.objects).filter(object=>object.type==='circle');
 assert.notEqual(circles[0].properties,circles[1].properties);assert.notEqual(circles[0].properties,properties);
 for(const object of Object.values(program.graphicSpec.objects)){
  assert.ok(isOwned(object));if(object.children){assert.ok(isOwned(object.children));assert.ok(object.children.every(id=>typeof id==='string'));assert.throws(()=>object.children.push('bad'),TypeError);}
 }
 assert.ok(isOwned(program));assert.ok(isOwned(program.graphicSpec));assert.ok(isOwned(program.graphicSpec.objects));assert.ok(isOwned(program.graphicSpec.order));
 properties.x=99;clip.commands[0].x=77;assert.equal(circles[0].properties.x,10);assert.equal(isOwned(properties),false);assert.equal(Object.isFrozen(clip.commands[0]),false);
 const owned=cloneAndFreeze(scene),ownedProgram=canvasSceneProgram(owned);assert.ok(Object.values(ownedProgram.graphicSpec.objects).filter(object=>object.type==='circle').every((object,index)=>object.properties===owned.nodes[index].properties));
 const empty=canvasSceneProgram({version:2,width:1,height:1,nodes:[]});assert.ok(isOwned(empty.graphicSpec.objects.canvas.children));assert.deepEqual(empty.graphicSpec.objects.canvas.children,[]);
});
