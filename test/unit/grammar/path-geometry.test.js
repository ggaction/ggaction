import assert from "node:assert/strict";
import test from "node:test";
import { flattenPathCommands, pathFillContains, pathStrokeDistance, segmentDistance, arcToCubicCommands, resolvePathCommandBounds } from "../../../src/grammar/pathGeometry.js";
import { outerCommands, holeCommands, reversedHoleCommands, islandCommands, cubicCommands } from "../../../examples/compound-path/coordinates.js";
import { resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";

const curvePoint = t => ({x:30*t*t-20*t*t*t,y:30*t*(1-t)});
const distance = (p, points) => Math.min(...points.slice(1).map((b,i)=>segmentDistance(p,points[i],b)));
test("adaptive subdivision bounds cubic error in scene CSS pixels",()=>{
  const coarse=flattenPathCommands(cubicCommands),fine=flattenPathCommands(cubicCommands,{tolerance:0.01});
  assert.deepEqual(coarse.diagnostics,[]);assert.ok(fine.subpaths[0].points.length>coarse.subpaths[0].points.length);
  for(let i=0;i<=1000;i++) assert.ok(distance(curvePoint(i/1000),fine.subpaths[0].points)<=0.01);
  assert.equal(Math.max(...fine.subpaths[0].points.map(p=>p.y)),7.5);
  const transformed=flattenPathCommands(cubicCommands,{transform:[0,10,-10,0,100,20],tolerance:0.1});
  for(let i=0;i<=100;i++){const p=curvePoint(i/100);assert.ok(distance({x:100-10*p.y,y:20+10*p.x},transformed.subpaths[0].points)<=0.1);}
  assert.ok(Object.isFrozen(fine)&&Object.isFrozen(fine.subpaths[0].points[0]));
});
test("subdivision budgets diagnose failure and queries cannot consume incomplete geometry",()=>{
  const result=flattenPathCommands(cubicCommands,{maxDepth:0});
  assert.equal(result.diagnostics[0].code,"path-subdivision-limit");
  assert.throws(()=>pathFillContains(cubicCommands,{x:5,y:2},{maxDepth:0}),/budget/);
  assert.throws(()=>pathStrokeDistance(cubicCommands,{x:5,y:2},{maxDepth:0}),/budget/);
  for(const options of [{tolerance:0},{tolerance:NaN},{maxDepth:21},{maxDepth:-1},{maxDepth:0.5},{transform:[1,0]},{transform:[1e308,0,0,1e308,0,0]}]) assert.throws(()=>flattenPathCommands(cubicCommands,options));
});
test("nonzero and evenodd keep literal holes, islands and implicit open closure",()=>{
  for(const fillRule of ["nonzero","evenodd"]){
    const commands=[...outerCommands,...(fillRule==="nonzero"?reversedHoleCommands:holeCommands),...islandCommands];
    for(const [x,y,expected] of [[1,1,true],[5,5,false],[13,1,true],[11,1,false]]) assert.equal(pathFillContains(commands,{x,y},{fillRule}),expected);
  }
  assert.equal(pathFillContains([...outerCommands,...holeCommands],{x:5,y:5}),true);
  assert.equal(pathFillContains(cubicCommands,{x:5,y:2}),true);
  assert.equal(pathFillContains(cubicCommands,{x:5,y:-1}),false);
  assert.equal(pathFillContains(outerCommands,{x:0,y:5}),true);
  assert.throws(()=>pathFillContains(outerCommands,{x:1,y:1},{fillRule:"other"}),/fillRule/);
  assert.throws(()=>pathFillContains(outerCommands,{x:NaN,y:1}),/finite point/);
});
test("open strokes, close segments, duplicate points and zero-area paths stay distinct",()=>{
  const line=[{op:"M",x:0,y:0},{op:"L",x:10,y:0},{op:"L",x:10,y:10}];
  assert.equal(pathStrokeDistance(line,{x:5,y:5}),5);
  assert.ok(pathStrokeDistance([...line,{op:"Z"}],{x:5,y:5})<1e-12);
  assert.equal(pathStrokeDistance([{op:"M",x:2,y:2},{op:"L",x:2,y:2}],{x:5,y:6}),5);
  assert.equal(pathStrokeDistance([{op:"M",x:2,y:2},{op:"Z"}],{x:2,y:2}),0);
  assert.equal(pathStrokeDistance([{op:"M",x:2,y:2}],{x:2,y:2}),Infinity);
  assert.equal(pathFillContains([{op:"M",x:0,y:0},{op:"L",x:2,y:0},{op:"L",x:0,y:0}],{x:1,y:0}),false);
  assert.throws(()=>segmentDistance({x:0,y:0},{x:-1e308,y:0},{x:1e308,y:0}),/finite/);
});
test("cubic bounds retain interior extrema and every disjoint stroked subpath",()=>{
  assert.deepEqual(resolvePathCommandBounds(cubicCommands),{left:0,right:10,top:0,bottom:7.5});
  const commands=[...outerCommands,{op:"M",x:20,y:20},{op:"L",x:30,y:20}];
  const bounds=resolvePrimitiveGraphicBounds("path",{commands,stroke:"black",strokeWidth:4,lineCap:"square"});
  assert.deepEqual(bounds,{left:-2,right:32,top:-2,bottom:22});
  assert.deepEqual(resolvePathCommandBounds([{op:"M",x:99,y:50},{op:"Z"}]),{left:99,right:99,top:50,bottom:50});
});
test("adaptive arc lowering retains full circles, reversed ellipses and error bounds",()=>{
  for(const direction of [1,-1]){
    const result=arcToCubicCommands({centerX:10,centerY:20,radiusX:30,radiusY:15,startAngle:0,endAngle:direction*2*Math.PI,rotation:Math.PI/2,tolerance:0.1});
    assert.deepEqual(result.diagnostics,[]);assert.ok(result.commands.length>4);
    assert.ok(Math.hypot(result.commands.at(-1).x-result.commands[0].x,result.commands.at(-1).y-result.commands[0].y)<1e-10);
    let p=result.commands[0];
    for(const c of result.commands.slice(1)){
      for(let i=0;i<=20;i++){const t=i/20,u=1-t,x=u**3*p.x+3*u*u*t*c.x1+3*u*t*t*c.x2+t**3*c.x,y=u**3*p.y+3*u*u*t*c.y1+3*u*t*t*c.y2+t**3*c.y;assert.ok(Math.abs(Math.hypot((y-20)/30,(10-x)/15)-1)*30<0.1);}
      p=c;
    }
  }
  const args={centerX:0,centerY:0,radiusX:10,startAngle:0,endAngle:Math.PI/2};
  assert.equal(arcToCubicCommands({...args,endAngle:0}).commands.length,1);
  assert.equal(arcToCubicCommands({...args,maxDepth:0}).diagnostics[0].code,"arc-subdivision-limit");
  for(const change of [{radiusX:0},{radiusY:-1},{endAngle:Infinity},{endAngle:1e10},{centerX:1.7e308,radiusX:1e308},{tolerance:0}]) assert.throws(()=>arcToCubicCommands({...args,...change}));
  assert.ok(arcToCubicCommands({...args,tolerance:0.01}).commands.length>arcToCubicCommands({...args,tolerance:1}).commands.length);
});
