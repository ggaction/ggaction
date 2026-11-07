import assert from "node:assert/strict";
import test from "node:test";
import { flattenPathCommands, calculateFlattenedPathCommands, flattenVariableWidthPath, pathFillContains, pathStrokeDistance, segmentDistance, arcToCubicCommands, calculateArcCubicCommands, resolvePathCommandBounds } from "../../../src/grammar/pathGeometry.js";
import { isOwned } from "../../../src/core/immutable.js";
import { outerCommands, holeCommands, reversedHoleCommands, islandCommands, cubicCommands } from "../../../examples/compound-path/coordinates.js";
import { resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";

const curvePoint = t => ({x:30*t*t-20*t*t*t,y:30*t*(1-t)});
const distance = (p, points) => Math.min(...points.slice(1).map((b,i)=>segmentDistance(p,points[i],b)));

function assertOwnedTree(value) {
  if (value === null || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value)); assert.ok(isOwned(value));
  Object.values(value).forEach(assertOwnedTree);
}

test("private path calculations isolate inputs while normal and variable-width results stay deeply owned", () => {
  const commands = [{ op: "M", x: 0, y: -0 }, { op: "L", x: 2, y: 0 }, { op: "L", x: 2, y: 3 }, { op: "Z" }];
  const transform = [2, 0, 0, 3, 5, 7], options = { transform };
  const expected = { subpaths: [{ closed: true, hasSegments: true, points: [{ x: 5, y: 7 }, { x: 9, y: 7 }, { x: 9, y: 16 }, { x: 5, y: 7 }] }], diagnostics: [] };
  const raw = calculateFlattenedPathCommands(commands, options), owned = flattenPathCommands(commands, options);
  assert.deepEqual(raw, expected); assert.deepEqual(owned, expected); assertOwnedTree(owned);
  assert.equal(isOwned(raw), false); assert.equal(isOwned(raw.subpaths[0].points[0]), false);
  const widths = [{ op: "M", x: 0, y: 2 }, { op: "L", x: 2, y: 4 }, { op: "L", x: 2, y: 6 }, { op: "Z" }];
  const variable = flattenVariableWidthPath(commands, widths, options);
  assert.deepEqual(variable.subpaths[0].points.map(point => point.width), [2, 4, 6, 2]); assertOwnedTree(variable);
  commands[0].x = 100; transform[4] = 100; widths[0].y = 100;
  assert.deepEqual(raw, expected); assert.deepEqual(owned, expected);
  assert.equal(variable.subpaths[0].points[0].width, 2);
  raw.subpaths[0].points[0].x = 200;
  assert.deepEqual(owned, expected); assert.equal(variable.subpaths[0].points[0].x, 5);
  assert.throws(() => { owned.subpaths[0].points[0].x = 200; }, TypeError);
});

test("raw and owned path calculations retain exact abort diagnostics and closed numeric guards", () => {
  const line = [{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }];
  const expected = { subpaths: [], diagnostics: [{ code: "path-point-limit", limit: 1, commandIndex: 1 }] };
  assert.deepEqual(calculateFlattenedPathCommands(line, { maxPoints: 1 }), expected);
  const owned = flattenPathCommands(line, { maxPoints: 1 }); assert.deepEqual(owned, expected); assertOwnedTree(owned);
  for (const calculate of [calculateFlattenedPathCommands, flattenPathCommands]) {
    for (const options of [{ tolerance: 0 }, { maxDepth: 21 }, { maxPoints: 0 }, { maxPoints: 1000001 }, { transform: [1, 0] }]) assert.throws(() => calculate(line, options));
    assert.throws(() => calculate([{ op: "L", x: 0, y: 0 }]), /requires M/);
    assert.throws(() => calculate([{ op: "M", x: Infinity, y: 0 }]), /finite/);
  }
  const input = { centerX: 2, centerY: 3, radiusX: 5, startAngle: 0, endAngle: 0 };
  const rawArc = calculateArcCubicCommands(input), arc = arcToCubicCommands(input);
  assert.deepEqual(rawArc, { commands: [{ op: "M", x: 7, y: 3 }], diagnostics: [] });
  assert.deepEqual(rawArc, arc); assertOwnedTree(arc); assert.equal(isOwned(rawArc.commands[0]), false);
  input.centerX = 99; rawArc.commands[0].x = 99; assert.equal(arc.commands[0].x, 7);
  const incomplete = { ...input, endAngle: Math.PI, maxDepth: 0 };
  assert.deepEqual(calculateArcCubicCommands(incomplete), arcToCubicCommands(incomplete)); assertOwnedTree(arcToCubicCommands(incomplete));
  for (const calculate of [calculateArcCubicCommands, arcToCubicCommands]) {
    for (const change of [{ radiusX: 0 }, { radiusY: -1 }, { endAngle: Infinity }, { endAngle: 1e10 }, { tolerance: 0 }]) assert.throws(() => calculate({ ...input, ...change }));
  }
});

test("raw and owned curve calculations retain extreme bounds, exact subdivision and overflow rejection", () => {
  const magnitude = 2 ** 1023;
  const commands = [{ op: "M", x: -magnitude, y: 0 },
    { op: "C", x1: magnitude, y1: 0, x2: magnitude, y2: 0, x: -magnitude, y: 0 }];
  assert.deepEqual(resolvePathCommandBounds(commands), { left: -magnitude, right: magnitude / 2, top: 0, bottom: 0 });
  const expected = { subpaths: [{ closed: false, hasSegments: true,
    points: [{ x: -1, y: 0 }, { x: 0.5, y: 0 }, { x: -1, y: 0 }] }], diagnostics: [] };
  const options = { transform: [2 ** -1023, 0, 0, 1, 0, 0] };
  for (const calculate of [calculateFlattenedPathCommands, flattenPathCommands]) {
    assert.deepEqual(calculate(commands, options), expected);
    const limited = calculate(cubicCommands, { maxDepth: 1 });
    assert.deepEqual(limited.subpaths[0].points, [{ x: 0, y: 0 }, { x: 5, y: 7.5 }, { x: 10, y: 0 }]);
    assert.deepEqual(limited.diagnostics.map(item => item.code), ["path-subdivision-limit", "path-subdivision-limit"]);
    assert.throws(() => calculate(commands, { transform: [2, 0, 0, 1, 0, 0] }), /coordinates must be finite/);
    assert.throws(() => calculate([{ op: "M", x: -Number.MAX_VALUE, y: 0 },
      { op: "C", x1: 0, y1: 1, x2: 0, y2: 1, x: Number.MAX_VALUE, y: 0 }]), /distance is not finite/);
  }
  assertOwnedTree(flattenPathCommands(commands, options));
  for (const calculate of [calculateArcCubicCommands, arcToCubicCommands]) {
    assert.throws(() => calculate({ centerX: 1.7e308, centerY: 0, radiusX: 1e308,
      startAngle: 0, endAngle: Math.PI / 2 }), /coordinates must be finite/);
  }
});

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
test("caller point budgets stop every primitive and subpath without returning partial geometry", () => {
  const line = [{ op: "M", x: 0, y: 0 }, { op: "L", x: 1, y: 1 }];
  assert.equal(flattenPathCommands(line, { maxPoints: 2 }).subpaths[0].points.length, 2);
  for (const [commands, maxPoints] of [[line, 1], [[...line, { op: "Z" }], 2], [[...line, { op: "M", x: 4, y: 5 }], 2], [cubicCommands, 2]]) {
    const result = flattenPathCommands(commands, { maxPoints });
    assert.deepEqual(result.subpaths, []);
    assert.equal(result.diagnostics[0].code, "path-point-limit");
    assert.equal(result.diagnostics[0].limit, maxPoints);
  }
  for (const maxPoints of [0, -1, 1.5, Infinity, 1000001]) assert.throws(() => flattenPathCommands(line, { maxPoints }), /maxPoints/);
  assert.throws(() => pathStrokeDistance(line, { x: 0, y: 0 }, { maxPoints: 1 }), /budget/);
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

test("fill queries retain nonzero area below the squared-number underflow range",()=>{
  for(const size of [1,1e-160,1e-200,1e-300]){
    const commands=[{op:"M",x:0,y:0},{op:"L",x:size,y:0},{op:"L",x:0,y:size},{op:"Z"}];
    for(const fillRule of ["nonzero","evenodd"]){
      assert.equal(pathFillContains(commands,{x:size/4,y:size/4},{fillRule}),true);
      assert.equal(pathFillContains(commands,{x:size,y:size},{fillRule}),false);
    }
  }
});


test("scalar path queries keep public flattening and diagnostic error trees owned", () => {
  const commands = structuredClone(cubicCommands), before = structuredClone(commands);
  const settings = {maxDepth:0,tolerance:1e-12}, expected = flattenPathCommands(commands,settings);
  assertOwnedTree(expected); assert.ok(expected.diagnostics.length > 0);
  for (const query of [pathFillContains,pathStrokeDistance]) {
    assert.throws(()=>query(commands,{x:1,y:2},settings), error => {
      assert.equal(error.name,"RangeError");
      assert.equal(error.message,"Path geometry exceeded its subdivision budget.");
      assert.deepEqual(error.diagnostics,expected.diagnostics);
      assertOwnedTree(error.diagnostics); return true;
    });
  }
  const owned = flattenPathCommands(commands); assertOwnedTree(owned);
  const point = {x:-0,y:-0};
  assert.equal(pathFillContains(commands,point),true);
  assert.equal(pathStrokeDistance(commands,point),0);
  assert.deepEqual(commands,before); assert.deepEqual(point,{x:-0,y:-0});
  assertOwnedTree(owned);
});
