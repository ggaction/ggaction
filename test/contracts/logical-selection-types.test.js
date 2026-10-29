import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("logical selection declarations expose stable keys, empty policy, and explicit update modes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-selection-"));
  try {
    const file=path.join(directory,"selection.mts");
    await writeFile(file,`
import {chart} from ${JSON.stringify(path.join(root,"types/index.js"))};
import {chart as basic} from ${JSON.stringify(path.join(root,"types/basic.js"))};
import {getMarkItems} from ${JSON.stringify(path.join(root,"types/inspection.js"))};
const p=chart(), items=getMarkItems(p,{target:'points'}).map(item=>item.key);
p.selectMarks({target:'points',id:'picked',items,empty:'all'});
p.editMarkSelection({selection:'picked',mode:'toggle',items:[]});
p.selectMarks({target:'points',region:{x:{ranges:[{min:0,max:4,minInclusive:false}]},y:{values:[true,'a',1]}}});
p.editMarkSelection({selection:'picked',items,screenPolygon:[{x:0,y:0},{x:10,y:0},{x:5,y:10}]});
// @ts-expect-error region modes cannot mix with expression or items
p.selectMarks({region:{x:{ranges:[]}},items:[]});
// @ts-expect-error screen polygon metadata cannot replace keys
p.selectMarks({screenPolygon:[]});
// @ts-expect-error Cartesian and angular region channels cannot mix
p.selectMarks({region:{x:{ranges:[]},theta:{ranges:[]}}});
// @ts-expect-error raw inline filters retain their own grammar
p.filterMarks({region:{x:{ranges:[]}}});
p.editMarkSelection({selection:'picked',mode:'add',field:'x',op:'gt',value:0});
p.filterMarks({target:'points',items});
p.highlightMarks({target:'points',select:{items},color:'red'});
p.createMarkLabels({source:'points',field:'name',select:{items}});
p.selectMarks({target:{childPath:['left'],id:'points'},items});
p.editMarkSelection({target:{childPath:['left']},selection:'picked',items,mode:'subtract'});
p.selectMarks({field:'x',op:'range',min:0,minInclusive:false});
p.editMarkSelection({field:'x',op:'range',max:4,maxInclusive:true});
p.filterMarks({field:'x',op:'range',min:0,max:4,minInclusive:false,maxInclusive:true});
const where={version:2,registry:'standard@1',root:{type:'binary',op:'gt',left:{type:'field',name:'x'},right:{type:'parameter',id:'threshold'}}} as const;
p.selectMarks({id:'chosen',where});
p.editMarkSelection({selection:'chosen',where,mode:'add'});
p.highlightMarks({id:'chosen',select:{where},color:'red'});
// @ts-expect-error expression and item modes are exclusive
p.selectMarks({where,items:[]});
// @ts-expect-error inline label selectors retain their own closed grammar
p.createMarkLabels({source:'points',field:'name',select:{where}});
// @ts-expect-error mark filters retain their own closed grammar
p.filterMarks({where});
// @ts-expect-error Basic does not author expression selection
basic().selectMarks({where});
// @ts-expect-error shorthand and endpoint closure cannot mix
p.selectMarks({field:'x',op:'range',min:0,max:1,inclusive:true,minInclusive:false});
// @ts-expect-error a range needs at least one endpoint
p.selectMarks({field:'x',op:'range'});
// @ts-expect-error logical keys and value predicates are mutually exclusive
p.selectMarks({items:[],field:"x",op:"gt",value:1});
// @ts-expect-error row indices are not logical keys
p.selectMarks({items:[1]});
// @ts-expect-error empty policy is closed
p.selectMarks({items:[],empty:'some'});
// @ts-expect-error filter composition is not a selection update mode
p.editMarkSelection({selection:'picked',mode:'compose',items:[]});
// @ts-expect-error logical selection is not a Basic authoring action
basic().selectMarks({items:[]});
`);
    const result=compileTypeScript(["--noEmit","--strict","--exactOptionalPropertyTypes","--skipLibCheck","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{cwd:root,encoding:"utf8"});
    assert.equal(result.status,0,result.stdout+result.stderr);
  } finally {await rm(directory,{recursive:true,force:true});}
});
