import { compileTypeScript } from "../support/typescript.js";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../../",import.meta.url));
test("Basic encoding reassignment retains its existing public editor and Full restoration boundaries",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"ggaction-basic-reassignment-types-"));
 try{
  const file=path.join(directory,"consumer.mts");await writeFile(file,`
import {chart} from ${JSON.stringify(path.join(root,"types/basic.js"))};
import {serializeProgram,deserializeProgram} from ${JSON.stringify(path.join(root,"types/persistence.js"))};
const p=chart().createCanvas().createData({values:[{x:0,y:1,g:"a"},{x:1,y:2,g:"b"}]})
 .createLinePlot({x:"x",y:"y",guides:false})
 .encodeStrokeDash({field:"g"}).encodeStrokeDash({field:"g",scale:{range:["dotted"]}});
p.encodeX({field:"x",scale:{domain:[0,10]}});
p.encodeStrokeDash({field:"g",scale:{domain:["a"],unknown:[]}});
const restored=deserializeProgram(serializeProgram(p));
restored.editScale({id:"strokeDash",range:["solid"]});
// @ts-expect-error Basic still exposes no generic scale editor
p.editScale({id:"strokeDash",range:["solid"]});
// @ts-expect-error Basic still exposes no focused scale editor
p.editStrokeDashScale({range:["solid"]});
// @ts-expect-error Basic still exposes no legend editor
p.editLegend({title:false});
// @ts-expect-error Basic still exposes no general legend remover
p.removeLegend();
`);
  const result=compileTypeScript(["--noEmit","--strict","--exactOptionalPropertyTypes","--skipLibCheck","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{cwd:root,encoding:"utf8"});
  assert.equal(result.status,0,result.stdout+result.stderr);
 }finally{await rm(directory,{recursive:true,force:true});}
});
