import { saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright";
import {createBlendProgram} from "../support/bar-blend-program.js";
import {createBlendGlyphProgram} from "../../examples/bar-compositing/program.js";
import {startStaticServer} from "../support/static-server.js";
import {openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence} from "../support/browser.js";
const root=fileURLToPath(new URL("../../",import.meta.url));


test("blend modes paint the independently approved fill/outline source in DOM and Offscreen Canvas",async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),"ggaction-blend-browser-"));let server,browser,page;
  try{
    const bundle=await build({stdin:{contents:"export {render} from './src/index.js';export {renderToSVG} from './src/renderers/svg.js';",resolveDir:root},bundle:true,format:"esm",platform:"browser",write:false});
    await writeFile(path.join(directory,"module.js"),bundle.outputFiles[0].contents);
    await writeFile(path.join(directory,"index.html"),'<!doctype html><p id="status">ready</p>');
    server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector("#status").textContent==="ready"});page=opened.page;
    const cases=[];for(const blend of ["difference","multiply","screen"])for(const background of ["#ffffff","#808080","#336699","none"])for(const opacity of [0,.4,.5,1])for(const strokeWidth of [0,8])cases.push({background,opacity,strokeWidth,blend,graphicSpec:createBlendProgram({background,opacity,strokeWidth,blend}).graphicSpec});
    const results=await page.evaluate(async cases=>{
      const {render,renderToSVG}=await import("/module.js");const results=[];
      const pixels=ctx=>ctx.getImageData(0,0,200,200).data;
      const differences=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
      async function svgPixels(svg){const image=new Image();image.src="data:image/svg+xml;base64,"+btoa(svg);await image.decode();const canvas=document.createElement("canvas");canvas.width=200;canvas.height=200;const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);return pixels(ctx);}
      for(const entry of cases){
        const {background,opacity,strokeWidth,blend,graphicSpec}=entry;
        const actual=document.createElement("canvas"),context=actual.getContext("2d");render({graphicSpec},context);
        const offscreen=new OffscreenCanvas(1,1),o=offscreen.getContext("2d");render({graphicSpec},o);
        // Independent native primitive: a full-page source, one fill+outline, one blend.
        const primitive=document.createElement("canvas");primitive.width=200;primitive.height=200;const p=primitive.getContext("2d");
        if(background!=="none"){p.fillStyle=background;p.fillRect(0,0,200,200);}
        const source=document.createElement("canvas");source.width=200;source.height=200;const s=source.getContext("2d");
        s.fillStyle="#f00000";s.fillRect(60,40,80,120);
        if(strokeWidth){s.strokeStyle="#ffff00";s.lineWidth=strokeWidth;s.strokeRect(60,40,80,120);}
        p.globalAlpha=opacity;p.globalCompositeOperation=blend;p.drawImage(source,0,0);
        const independent=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" style="isolation:isolate">${background==="none"?"":`<rect width="200" height="200" fill="${background}"/>`}<rect x="60" y="40" width="80" height="120" fill="#f00000" stroke="#ffff00" stroke-width="${strokeWidth}" opacity="${opacity}" style="mix-blend-mode:${blend}"/></svg>`;
        const actualSvg=await svgPixels(renderToSVG({graphicSpec})),expectedSvg=await svgPixels(independent);
        results.push({background,opacity,strokeWidth,blend,canvasPrimitive:differences(pixels(context),pixels(p)),offscreen:differences(pixels(context),pixels(o)),svgPrimitive:differences(actualSvg,expectedSvg),crossSamples:[[100,100],[100,42],[100,37]].map(([x,y])=>{const i=4*(y*200+x);return {canvas:[...pixels(context).slice(i,i+4)],svg:[...actualSvg.slice(i,i+4)]};})});
      }return results;
    },cases);
    for(const result of results){
      const label=JSON.stringify({background:result.background,opacity:result.opacity,strokeWidth:result.strokeWidth,blend:result.blend});
      assert.equal(result.canvasPrimitive,0,label+" native primitive");assert.equal(result.offscreen,0,label+" Offscreen Canvas");assert.equal(result.svgPrimitive,0,label+" SVG primitive");
      for(const sample of result.crossSamples)assert.deepEqual(sample.canvas,sample.svg,label+" interior/outline");
    }
    assertNoBrowserErrors(opened.errors,"bar blend modes");await page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});


test("filled, stroked and Text public blend glyphs agree with independent browser primitives", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-mark-blend-browser-")); let server, browser;
  try {
    const bundle = await build({ stdin: { contents: "export {render} from './src/index.js'; export {renderToSVG} from './src/renderers/svg.js';", resolveDir: root }, bundle: true, format: "esm", platform: "browser", write: false });
    await writeFile(path.join(directory, "module.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><p id="status">ready</p>');
    server = await startStaticServer(directory); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "ready" });
    const cases = ["point", "rect", "line", "text"].flatMap(type => ["multiply", "screen", "difference"].map(blend => ({ type, blend, graphicSpec: createBlendGlyphProgram({ type, blend }).graphicSpec })));
    const results = await opened.page.evaluate(async cases => {
      const { render, renderToSVG } = await import("/module.js"), results = [];
      const surface = () => { const c = document.createElement("canvas"); c.width = 200; c.height = 160; return c; };
      const pixels = c => c.getContext("2d").getImageData(0, 0, 200, 160).data;
      const differences = (a, b) => a.reduce((sum, v, i) => sum + (v !== b[i]), 0);
      async function svgPixels(svg) { const image = new Image(); image.src = "data:image/svg+xml;base64," + btoa(svg); await image.decode(); const c = surface(); c.getContext("2d").drawImage(image, 0, 0); return pixels(c); }
      for (const { type, blend, graphicSpec } of cases) {
        const actual = surface(), offscreen = new OffscreenCanvas(200, 160);
        render({ graphicSpec }, actual.getContext("2d")); render({ graphicSpec }, offscreen.getContext("2d"));
        const expected = surface(), e = expected.getContext("2d"), source = surface(), s = source.getContext("2d");
        e.fillStyle = "#336699"; e.fillRect(0, 0, 200, 160); s.fillStyle = "red"; s.strokeStyle = "white"; s.lineWidth = 8;
        if (type === "text") { s.font = "36px Arial"; s.textAlign = "center"; s.textBaseline = "middle"; s.strokeText("AB", 100, 80); s.fillText("AB", 100, 80); }
        else if (type === "line") { s.strokeStyle = "red"; s.beginPath(); s.moveTo(50, 80); s.lineTo(150, 80); s.stroke(); }
        else { s.beginPath(); if (type === "point") s.arc(100, 80, 35, 0, Math.PI * 2); else s.rect(60, 40, 80, 80); s.stroke(); s.fill(); }
        e.globalAlpha = .5; e.globalCompositeOperation = blend; e.drawImage(source, 0, 0);
        const paint = `fill="red" stroke="white" stroke-width="8" paint-order="stroke fill" opacity="0.5" style="mix-blend-mode:${blend}"`;
        const glyph = type === "point" ? `<circle cx="100" cy="80" r="35" ${paint}/>`
          : type === "rect" ? `<rect x="60" y="40" width="80" height="80" ${paint}/>`
          : type === "line" ? `<path d="M50 80 L150 80" fill="none" stroke="red" stroke-width="8" opacity="0.5" style="mix-blend-mode:${blend}"/>`
          : `<text x="100" y="80" font-family="Arial" font-size="36" font-weight="normal" text-anchor="middle" dominant-baseline="middle" ${paint}>AB</text>`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160" style="isolation:isolate"><rect width="200" height="160" fill="#336699"/>${glyph}</svg>`;
        results.push({ type, blend, canvas: differences(pixels(actual), pixels(expected)), offscreen: differences(pixels(actual), pixels(offscreen)), svg: differences(await svgPixels(renderToSVG({ graphicSpec })), await svgPixels(svg)) });
      }
      return results;
    }, cases);
    for (const result of results) { assert.equal(result.canvas, 0, JSON.stringify(result)); assert.equal(result.offscreen, 0, JSON.stringify(result)); assert.equal(result.svg, 0, JSON.stringify(result)); }
    assertNoBrowserErrors(opened.errors, "mark blend modes");
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); await rm(directory, { recursive: true, force: true }); }
});
