import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
test('declares Canvas scenes separately from the unchanged SVG contract',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'canvas-scene-types-'));
 try{const file=path.join(dir,'scene.mts');await writeFile(file,`
 import {chart} from ${JSON.stringify(path.join(root,'types/index.js'))};
 import {createTransitionScene,renderTransitionScene} from ${JSON.stringify(path.join(root,'types/scene.js'))};
 const program=chart();declare const ctx:CanvasRenderingContext2D;
 const svg=createTransitionScene(program);const literal:1=svg.version;svg.nodes[0].svg;
 const scene=createTransitionScene(program,{format:'canvas'});const canvas:2=scene.version;
 renderTransitionScene(scene,ctx,{pixelRatio:2});scene.nodes[0].properties;
 // @ts-expect-error SVG scenes cannot be passed to the Canvas adapter
 renderTransitionScene(svg,ctx);
 // @ts-expect-error unknown formats are rejected
 createTransitionScene(program,{format:'png'});
 // @ts-expect-error concrete scene properties are readonly
 scene.nodes[0].properties.x=0;
 `);const result=spawnSync(path.join(root,'node_modules/.bin/tsc'),['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
 }finally{await rm(dir,{recursive:true,force:true});}
});
