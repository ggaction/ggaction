import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chart, hconcat } from 'ggaction';
import { chart as basic } from 'ggaction/basic';
import { createInteractionSession } from 'ggaction/interaction';
import { getMarkItems } from 'ggaction/inspection';
import { exportAccessibleData } from 'ggaction/accessibility';
import { serializeProgram } from 'ggaction/persistence';
const source=(factory=chart)=>factory().createCanvas({width:300,height:200}).createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:2},{id:'b',x:2,y:3}]}).createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'});
export const cases=[
 {id:'keyboard-focus/current-paint-and-basic',run(){
  assert.match(import.meta.resolve('ggaction/interaction'),/\/node_modules\/ggaction\//);
  for(const factory of [chart,basic]){
   const p=source(factory),s=createInteractionSession({program:p,bindings:[{type:'keyboard',targets:[{target:'points'}]}]}),key=getMarkItems(p)[0].key;
   s.dispatch({type:'focus',move:'first'});assert.equal(s.getState().focus.itemKey,key);s.dispatch({type:'inspect',point:s.getState().focus.screenPoint,slop:0});assert.ok(s.getState().hit.candidates.some(item=>item.itemKey===key));
   const scene=structuredClone(s.getState().scene);scene.nodes.find(node=>node.type==='circle').properties.opacity=0;s.dispatch({type:'frame',scene,version:1,generation:0});assert.equal(s.getState().focus.itemKey,null);assert.equal(s.getState().program,p);assert.equal(s.getState().history.undoCount,0);s.destroy();
  }
 }},
 {id:'keyboard-focus/nested-native-selection-and-offline-restore',run(){
  const p=source().selectMarks({id:'picked',items:[],empty:'none'}),parent=hconcat({programs:[{id:'a',program:p},{id:'b',program:p}]}),target={childPath:['b'],id:'points'},key=getMarkItems(parent,{target})[0].key;
  const s=createInteractionSession({program:parent,bindings:[{type:'keyboard',targets:[{target,activation:{type:'select',selection:'picked'}}]}]});s.dispatch({type:'focus',target,itemKey:key});s.dispatch({type:'activate'});
  assert.equal(s.getState().program.children.a,p);assert.equal(s.getState().history.undoCount,1);assert.deepEqual(exportAccessibleData(s.getState().program.children.b,{format:'items'}).views[0].items[0].selectedBy,['picked']);
  const code=`import fs from 'node:fs';import{deserializeProgram}from'ggaction/persistence';import{createInteractionSession}from'ggaction/interaction';globalThis.fetch=()=>{throw Error('offline');};const p=deserializeProgram(fs.readFileSync(0,'utf8')),s=createInteractionSession({program:p,bindings:[{type:'keyboard',targets:[{target:{childPath:['b'],id:'points'}}]}]});s.dispatch({type:'focus',move:'first'});process.stdout.write(JSON.stringify(s.getState().focus));s.destroy();`;
  const restored=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{input:serializeProgram(s.getState().program),encoding:'utf8',timeout:30000}));assert.equal(restored.itemKey,key);assert.deepEqual(restored.target,target);s.destroy();
 }},
 {id:'keyboard-focus/native-hierarchy-paths',run(){
  const p=chart().createCanvas().createData({values:[{group:'A',part:'a',v:2},{group:'B',part:'b',v:3}]}).createHierarchyData({id:'hierarchy',groupFields:['group','part'],value:'v'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition'});
  const s=createInteractionSession({program:p,bindings:[{type:'keyboard',targets:[{target:'partition',activation:{type:'focusHierarchy'}}]}]});s.dispatch({type:'focus',move:'first'});s.dispatch({type:'activate'});
  assert.deepEqual(s.getState().program.graphicSpec,p.editPartitionPlot({target:'partition',focus:{path:['A']}}).graphicSpec);assert.equal(s.getState().history.undoCount,1);s.dispatch({type:'undo'});assert.equal(s.getState().program,p);s.destroy();
 }}
];
