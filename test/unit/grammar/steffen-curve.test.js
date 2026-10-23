import assert from "node:assert/strict";
import test from "node:test";
import { buildCurvePathCommands as curve, buildAreaCurvePathCommands as area } from "../../../src/grammar/curveCommands.js";
const recipe = "monotone-steffen";
const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1.5 }, { x: 4, y: 5 }];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("Steffen controls match independent nonuniform rational reference values", () => {
  // Secants 1, 1/2, 7/4; interior tangents 3/4, 11/12; endpoints 9/8, 13/6.
  const expected = [[1/3,3/8,2/3,3/4,1,1], [4/3,5/4,5/3,43/36,2,3/2],
    [8/3,19/9,10/3,32/9,4,5]];
  const commands = curve(points, recipe);
  for (let i=0;i<3;i++) {
    assert.equal(commands[i+1].op,"C");
    ["x1","y1","x2","y2","x","y"].forEach((key,j)=>close(commands[i+1][key],expected[i][j]));
  }
  const reversed=curve([...points].reverse(),recipe);
  for(let i=1;i<commands.length;i++){
    const a=commands[i],b=reversed[commands.length-i];
    close(a.x1,b.x2);close(a.y1,b.y2);close(a.x2,b.x1);close(a.y2,b.y1);
  }
  assert.notDeepEqual(curve(points,"monotone"),commands);
});

test("each Steffen segment stays inside its endpoint range through rises, flats and turns", () => {
  for(const ys of [[0,1,1.5,5],[5,2,2,0],[0,4,-2,1],[2,2,2,2]]){
    const input=points.map((p,i)=>({...p,y:ys[i]})),commands=curve(input,recipe);
    for(let i=1;i<commands.length;i++) for(let k=0;k<=100;k++){
      const t=k/100,u=1-t,c=commands[i],start=input[i-1].y;
      const y=u**3*start+3*u*u*t*c.y1+3*u*t*t*c.y2+t**3*c.y;
      assert.ok(y>=Math.min(start,c.y)-1e-12 && y<=Math.max(start,c.y)+1e-12);
    }
  }
});

test("degenerate Steffen segments retain vertical endpoints and reject X reversals", () => {
  for(const input of [[{x:1,y:1},{x:1,y:1},{x:1,y:1}],
    [{x:1,y:1},{x:1,y:1}],
    [{x:0,y:0},{x:0,y:2},{x:1,y:3}],
    [{x:0,y:0},{x:1,y:2},{x:1,y:3}],
    [{x:0,y:0},{x:0,y:2},{x:0,y:3}]]){
    const commands=curve(input,recipe);
    assert.ok(commands.every(c=>Object.values(c).every(v=>typeof v!=="number"||Number.isFinite(v))));
    assert.equal(commands.at(-1).x,input.at(-1).x);assert.equal(commands.at(-1).y,input.at(-1).y);
  }
  assert.throws(()=>curve([{x:0,y:0},{x:2,y:1},{x:1,y:2}],recipe),/monotonic/);
  assert.throws(()=>curve(points,recipe,0.5),/cardinal/);
});

test("area boundaries reverse controls and transpose their independent axis",()=>{
  const upper=points.map(p=>({...p,y:p.y+2}));
  const commands=area(points,upper,recipe),line=curve(upper,recipe);
  assert.equal(commands.at(-1).op,"Z");
  for(let i=1;i<line.length;i++){
    const reversed=commands[commands.length-1-i],original=line[i];
    close(reversed.x1,original.x2);close(reversed.y1,original.y2);
  }
  const transposed=area(points.map(p=>({x:p.y,y:p.x})),upper.map(p=>({x:p.y,y:p.x})),recipe,{independentAxis:"y"});
  for(let i=0;i<commands.length;i++)for(const key of ["x","x1","x2"]){
    if(commands[i][key]!==undefined)close(commands[i][key],transposed[i][key.replace("x","y")]);
  }
});
