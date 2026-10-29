import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareHitShape, prepareHitShapeUnion, hitShape, hitShapeAnchor } from '../../../src/grammar/hitShapes.js';
const identity = [1,0,0,1,0,0];
const rect = (x,y,width,height) => ({type:'rect',rect:{x,y,width,height}});
const clip = geometry => ({geometry,transform:identity});
const shape = (geometry, options={}) => prepareHitShape({geometry,paint:{fill:true,stroke:null,opacity:1,...options.paint},transform:options.transform??identity,clips:options.clips??[]});
const anchor = value => { const point=hitShapeAnchor(value); assert.ok(point); assert.equal(hitShape(value,point,{slop:0}).hit,true); return point; };
test('focus anchor lies in actual paint after wholly contained and intersecting clips',()=>{
  const large=rect(0,0,100,100);
  for(const clips of [[clip(rect(90,90,2,2))],[clip(rect(30,0,3,90)),clip(rect(0,80,90,3))]]) {
    const value=shape(large,{clips}), point=anchor(value);
    for(const c of clips) assert.equal(hitShape(shape(c.geometry),point,{slop:0}).hit,true);
  }
  assert.equal(hitShapeAnchor(shape(large,{clips:[clip(rect(110,0,1,1))]})),null);
});
test('focus anchor preserves transformed and analytic circle paint including sub-tolerance slivers',()=>{
  const circle={type:'circle',x:0,y:0,radius:10};
  const p=anchor(shape(circle,{clips:[clip(rect(9.999,-0.001,1,0.002))]}));
  assert.ok(p.x>=9.999 && Math.hypot(p.x,p.y)<=10);
  const rotated=shape(rect(0,0,10,20),{transform:[0,-2,-3,0,80,40],clips:[clip(rect(21,21,2,2))]});
  const q=anchor(rotated);assert.ok(q.x>=21&&q.x<=23&&q.y>=21&&q.y<=23);
});
test('focus anchor respects evenodd holes and painted dash gaps',()=>{
  const commands=[{op:'M',x:0,y:0},{op:'L',x:30,y:0},{op:'L',x:30,y:30},{op:'L',x:0,y:30},{op:'Z'},
    {op:'M',x:10,y:10},{op:'L',x:20,y:10},{op:'L',x:20,y:20},{op:'L',x:10,y:20},{op:'Z'}];
  assert.equal(hitShapeAnchor(shape({type:'path',commands,fillRule:'evenodd'},{clips:[clip(rect(12,12,2,2))]})),null);
  const stroke={width:2,lineCap:'butt',lineJoin:'miter',miterLimit:10,dash:[4,6]};
  const line={type:'line',from:{x:0,y:0},to:{x:30,y:0}};
  anchor(shape(line,{paint:{fill:false,stroke},clips:[clip(rect(11,-1,1,2))]}));
  assert.equal(hitShapeAnchor(shape(line,{paint:{fill:false,stroke},clips:[clip(rect(5,-1,1,2))]})),null);
});
test('focus anchors reject invisible, singular and absent paint; authentic immutable state and work limits remain',()=>{
  const source={geometry:rect(0,0,10,10),paint:{fill:true,stroke:null,opacity:1},transform:identity,clips:[]};
  const original=structuredClone(source),prepared=prepareHitShape(source);anchor(prepared);assert.deepEqual(source,original);
  assert.ok(Object.isFrozen(hitShapeAnchor(prepared)));
  for(const value of [shape(rect(0,0,10,10),{paint:{opacity:0}}),shape(rect(0,0,10,10),{transform:[0,0,0,1,0,0]}),shape(rect(0,0,0,10)),shape(rect(0,0,10,10),{paint:{fill:false}})]) assert.equal(hitShapeAnchor(value),null);
  assert.throws(()=>hitShapeAnchor({...prepared}),/prepared geometry/);
  assert.throws(()=>hitShapeAnchor(prepared,()=>{throw new RangeError('focus budget');}),/focus budget/);
});
test('analytic circle admission finds paint outside the flattened chord approximation',()=>{
 const theta=0.123,x=9.99999*Math.cos(theta),y=9.99999*Math.sin(theta);
 const prepared=shape({type:'circle',x:0,y:0,radius:10},{clips:[clip(rect(x-0.000002,y-0.000002,0.000004,0.000004))]});
 const point=anchor(prepared);assert.ok(Math.abs(point.x-x)<=0.0000021);assert.ok(Math.abs(point.y-y)<=0.0000021);
 assert.ok(Math.hypot(point.x,point.y)<=10);
});
test('weighted focus uses the first admitted source and shares cumulative work across invisible and clipped parts',()=>{
 const circle=x=>({type:'circle',x,y:10,radius:2});
 const hidden=shape(circle(10),{paint:{opacity:0}}),clipped=shape(circle(20),{clips:[clip(rect(0,0,2,2))]});
 const singular=shape(circle(30),{transform:[0,0,0,1,0,0]}),visible=shape(circle(40)),other=shape(circle(50));
 assert.deepEqual(anchor(prepareHitShapeUnion([hidden,clipped,singular,visible,other])),{x:40,y:10});
 assert.deepEqual(anchor(prepareHitShapeUnion([other,visible])),{x:50,y:10});
 assert.equal(hitShapeAnchor(prepareHitShapeUnion([hidden,clipped,singular])),null);
 const union=prepareHitShapeUnion([hidden,clipped,visible]);let spent=0;
 assert.throws(()=>hitShapeAnchor(union,count=>{spent+=count;if(spent>2)throw new RangeError('shared anchor work');}),/shared anchor work/);
 const overlap=prepareHitShapeUnion([visible,shape(circle(40))]);
 assert.equal(hitShape(overlap,{x:40,y:10},{slop:0}).hit,true);
 assert.equal(hitShape(overlap,{x:100,y:10},{slop:0}).hit,false);
});
