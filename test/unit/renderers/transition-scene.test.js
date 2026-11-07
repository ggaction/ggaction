import test from "node:test";
import assert from "node:assert/strict";
import { collectTransitionGraphics } from "../../../src/renderers/transitionScene.js";

test("concrete collection admission preserves empty slots nested anonymous content and clips",()=>{
  const graphicSpec={objects:{
    canvas:{type:"canvas",properties:{width:100,height:80},children:["left","right"]},
    left:{type:"collection",items:[],clip:{x:2,y:3,width:90,height:60}},
    right:{type:"collection",items:[{type:"collection",items:[{id:"literal",type:"rect",properties:{x:4,y:5,width:6,height:7,fill:"red"}}]}],clip:{x:10,y:0,width:80,height:70}}
  },order:["canvas"]},before=JSON.stringify(graphicSpec),slots=[];
  const scene=collectTransitionGraphics(graphicSpec,new Map(),{onCollection:(id,frame,index)=>slots.push({id,frame,index})});
  assert.equal(scene.nodes.length,1);assert.deepEqual(scene.nodes[0].properties,{x:4,y:5,width:6,height:7,fill:"red"});
  assert.equal(scene.nodes[0].key.startsWith("graphic:"),true);assert.deepEqual(scene.nodes[0].clip,[10,0,80,70]);
  assert.deepEqual(slots.map(({id,index})=>({id,index})),[{id:"left",index:0},{id:"right",index:0}]);
  assert.deepEqual(slots[0].frame.clip,[2,3,90,60]);assert.deepEqual(slots[1].frame.clips,[[10,0,80,70]]);
  assert.deepEqual(collectTransitionGraphics(graphicSpec,new Map()),scene);assert.equal(JSON.stringify(graphicSpec),before);
});
