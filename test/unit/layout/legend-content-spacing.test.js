import test from "node:test";
import assert from "node:assert/strict";
import {resolveLegendContentSpacing} from "../../../src/layout/legendSpacing.js";
import {normalizeLegendSpacing,patchLegendSpacing,validateLegendSpacing} from "../../../src/grammar/legendSpacing.js";

const box=(left,top,right,bottom)=>({left,top,right,bottom});
const config={position:"right",align:"center",titlePosition:"top"};
const items=[
  {row:0,x:231,y:90,bounds:[box(222,81,240,99),box(264,85,270,95)]},
  {row:1,x:231,y:132,bounds:[box(218,119,244,145),box(264,127,276,137)]},
  {row:2,x:231,y:174,bounds:[box(210,153,252,195),box(264,169,282,179)]}
];
const title=box(210,43,218,57);

test("spacing omission leaves the existing layout path untouched",()=>{
  assert.equal(resolveLegendContentSpacing(config,items,title),undefined);
  assert.deepEqual(normalizeLegendSpacing({}),{});
  assert.deepEqual(patchLegendSpacing({itemGap:18},{}),{itemGap:18});
});

test("variable occupied rows retain their first anchor and leave exact seven-pixel gaps",()=>{
  const frozen=JSON.stringify(items),p=resolveLegendContentSpacing({...config,rowPadding:7},items,title);
  assert.deepEqual(p.offsets,[{dx:0,dy:0},{dx:0,dy:-13},{dx:0,dy:-14}]);
  assert.deepEqual(p.titleOffset,{dx:0,dy:0});
  assert.deepEqual(items.map((item,i)=>item.y+p.offsets[i].dy),[90,119,160]);
  assert.equal(119-13-(90+9),7);assert.equal(160-21-(119+13),7);
  assert.equal(JSON.stringify(items),frozen);
});

test("title gap and occupied row gap compose without changing shapes or horizontal columns",()=>{
  const p=resolveLegendContentSpacing({...config,rowPadding:7,titlePadding:20},items,title);
  assert.deepEqual(p.offsets,[{dx:0,dy:-4},{dx:0,dy:-17},{dx:0,dy:-18}]);
  assert.deepEqual(p.titleOffset,{dx:0,dy:0});
  // The existing side-lane top translation is -13: title37 and samples73/102/143.
  assert.deepEqual(items.map((item,i)=>item.y+p.offsets[i].dy-13),[73,102,143]);
  assert.equal(90+p.offsets[0].dy-9-title.bottom,20);
});

test("text taller than a sample defines its row; all cells in a row share one translation",()=>{
  const grid=[
    {row:0,x:0,y:10,bounds:[box(0,8,4,12),box(8,0,20,20)]},
    {row:1,x:0,y:50,bounds:[box(0,48,4,52)]},
    {row:0,x:40,y:10,bounds:[box(40,5,50,15)]},
    {row:1,x:40,y:50,bounds:[box(40,40,60,60)]}
  ];
  const p=resolveLegendContentSpacing({...config,rowPadding:3},grid);
  assert.deepEqual(p.offsets,[{dx:0,dy:0},{dx:0,dy:-17},{dx:0,dy:0},{dx:0,dy:-17}]);
  assert.equal(40-17-20,3);
});

test("zero padding touches occupied bounds, and a text-only row adds no phantom sample",()=>{
  const rows=[{row:0,x:0,y:0,bounds:[box(0,-20,40,20)]},
    {row:1,x:0,y:60,bounds:[box(40,55,70,65)]}];
  const p=resolveLegendContentSpacing({...config,rowPadding:0},rows);
  assert.deepEqual(p.offsets,[{dx:0,dy:0},{dx:0,dy:-35}]);
  assert.equal(p.bounds[1].top,p.bounds[0].bottom);
});

test("hidden titles reserve no gap, while top edges preserve their existing lower anchor",()=>{
  const row=resolveLegendContentSpacing({...config,rowPadding:7},items);
  const hidden=resolveLegendContentSpacing({...config,rowPadding:7,titlePadding:100},items);
  assert.deepEqual(hidden,row);
  const top=resolveLegendContentSpacing({...config,position:"top",rowPadding:7,titlePadding:20},items,title);
  assert.equal(Math.max(...top.bounds.map(b=>b.bottom)),195);
  assert.equal(Math.max(...top.bounds.map(b=>b.right)),282);
  assert.equal(Math.min(...top.bounds.map(b=>b.left)),210);
});

test("inline-left title spacing and bottom title spacing use their actual respective edges",()=>{
  const p=resolveLegendContentSpacing({...config,position:"bottom",align:"left",titlePosition:"left",titlePadding:5},items,title);
  assert.equal(p.bounds[5].right,282+p.offsets[2].dx);
  const bodyLeft=Math.min(...p.bounds.slice(0,-1).map(b=>b.left)),t=p.bounds.at(-1);
  assert.equal(bodyLeft-t.right,5);
  const bottom=resolveLegendContentSpacing({...config,titlePosition:"bottom",titlePadding:6},items,box(210,205,218,219));
  const b=bottom.bounds.at(-1);
  assert.equal(b.top-Math.max(...bottom.bounds.slice(0,-1).map(x=>x.bottom)),6);
});

test("normalization and resets retain legacy pitch and never mutate prior intent",()=>{
  const old={rowPadding:7,titlePadding:20,itemGap:18};
  assert.deepEqual(normalizeLegendSpacing(old),{rowPadding:7,titlePadding:20});
  assert.deepEqual(patchLegendSpacing(old,{rowPadding:"auto",titlePadding:0}),{titlePadding:0,itemGap:18});
  assert.deepEqual(old,{rowPadding:7,titlePadding:20,itemGap:18});
  assert.deepEqual(patchLegendSpacing(old,{rowPadding:undefined}),old);
  for(const key of ["rowPadding","titlePadding"])for(const value of [-1,NaN,Infinity,-Infinity,null,false,"7","auto"]){
    assert.throws(()=>normalizeLegendSpacing({[key]:value}),/non-negative finite/);
  }
  assert.throws(()=>validateLegendSpacing("gradient",{rowPadding:0}),/item-based/);
  assert.doesNotThrow(()=>validateLegendSpacing("gradient",{representation:"symbols",rowPadding:0}));
  assert.throws(()=>validateLegendSpacing("size",{layout:"legacy-bottom",titlePadding:0}),/edge/);
});

test("finite authoring values cannot overflow into invalid layout coordinates",()=>{
  assert.throws(()=>resolveLegendContentSpacing({...config,rowPadding:Number.MAX_VALUE},items,title),/finite/);
  assert.throws(()=>resolveLegendContentSpacing({...config,rowPadding:0},[]),/body item/);
});
