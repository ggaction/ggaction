import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
const root=fileURLToPath(new URL("../../",import.meta.url));
test("Browser Canvas and SVG render two separately positioned lines",async()=>{
 const directory=await mkdtemp(path.join(root,".artifacts/multiline-"));
 let server,browser;
 try{
 await writeFile(path.join(directory,"index.html"),`<!doctype html><html><body><canvas id="canvas" aria-label="Two line text"></canvas><p id="status">Loading</p><script type="module">
 import {chart,render} from '/src/index.js';import {renderToSVG} from '/src/renderers/svg.js';
 const p=chart().createCanvas({width:400,height:300,margin:50}).createData({values:[{}]}).createAnnotation({id:'label',text:'A\\nB',space:'plot',x:.5,y:.5,fontSize:10,align:'center',baseline:'middle',lineHeight:13});
 const canvas=document.querySelector('canvas');render(p,canvas.getContext('2d'));
 const svg=renderToSVG(p);const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();
 const c=document.createElement('canvas');c.width=400;c.height=300;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
 function bands(context){const pixels=context.getImageData(185,135,30,45).data;const occupied=[];for(let y=0;y<45;y++){let ink=false;for(let x=0;x<30;x++){const i=(y*30+x)*4;if(pixels[i+3]>0&&pixels[i]<180){ink=true;break;}}if(ink)occupied.push(y);}let n=0,last=-2;for(const y of occupied){if(y>last+1)n++;last=y;}return n;}
 window.multiline={canvas:bands(canvas.getContext('2d')),svg:bands(ctx),tspans:(svg.match(/<tspan/g)||[]).length};document.querySelector('#status').textContent='Ready';
 </script></body></html>`);
 server=await startStaticServer(root);browser=await chromium.launch({headless:true});
 const opened=await openBrowserPage(browser,server.baseUrl+path.relative(root,directory)+"/",{waitFor:()=>window.multiline!==undefined});
 assert.deepEqual(await opened.page.evaluate(()=>window.multiline),{canvas:2,svg:2,tspans:2});
 assertNoBrowserErrors(opened.errors,"multiline text");await opened.page.close();
 }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});
