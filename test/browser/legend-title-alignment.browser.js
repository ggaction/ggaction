import { saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {startStaticServer} from "../support/static-server.js";
import {openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence} from "../support/browser.js";
const root=fileURLToPath(new URL("../../",import.meta.url));
test("Browser Canvas and SVG use the same top-title alignment without viewing pixels",async()=>{
  await mkdir(path.join(root,".artifacts"),{recursive:true});const directory=await mkdtemp(path.join(root,".artifacts/legend-align-"));let server,browser;
  try{
    await writeFile(path.join(directory,"index.html"),'<!doctype html><canvas aria-label="Aligned legend title"></canvas><div id="svg"></div><p id="status">Ready</p>');
    server=await startStaticServer(root);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,server.baseUrl+path.relative(root,directory)+"/",{waitFor:()=>document.querySelector("#status")?.textContent==="Ready"});
    const records=await opened.page.evaluate(async()=>{
      const{chart,render}=await import('/src/index.js');const{renderToSVG}=await import('/src/renderers/svg.js');const records=[];
      for(const align of['left','center','right']){
        const p=chart().createCanvas({width:700,height:500,margin:120}).createData({values:[{x:1,y:2,group:'Alpha'},{x:2,y:3,group:'Long category'}]}).createScatterPlot({x:'x',y:'y',guides:false}).encodeColor({field:'group'}).createLegend({position:'top',title:'Heading',titleStyle:{fontSize:13,align}});
        const canvas=document.querySelector('canvas'),context=canvas.getContext('2d'),original=context.fillText;let painted;
        context.fillText=function(text,x,y,...rest){if(text==='Heading'){const point=new DOMPoint(x,y).matrixTransform(this.getTransform());painted={x:point.x,y:point.y,textAlign:this.textAlign};}return original.call(this,text,x,y,...rest);};render(p,context,{pixelRatio:1});context.fillText=original;
        document.querySelector('#svg').innerHTML=renderToSVG(p);await document.fonts.ready;
        const node=[...document.querySelectorAll('#svg text')].find(e=>e.textContent==='Heading');const box=node.getBBox(),matrix=node.getCTM();
        const corners=[[box.x,box.y],[box.x+box.width,box.y+box.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
        records.push({align,anchor:node.getAttribute('text-anchor'),painted,ink:{left:corners[0].x,right:corners[1].x},concrete:p.graphicSpec.objects.colorLegendTitle.properties});
      }return records;
    });
    for(const r of records){assert.equal(r.anchor,{left:'start',center:'middle',right:'end'}[r.align]);assert.equal(r.painted.textAlign,r.align);assert.ok(Math.abs(r.painted.x-r.concrete.x)<1e-4);assert.ok(r.ink.left>=0&&r.ink.right<=700);}
    assertNoBrowserErrors(opened.errors,'legend title alignment');await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});
