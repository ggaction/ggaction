import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";

test("browser Geo Text expressions follow current camera in Canvas and SVG at both DPRs", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-animation-"));
  let server, browser;
  try {
    const bundle = await build({ stdin: { contents: `export {geoTextExpressionFrame,geoTextExpressionVariants,expectedGeoTextFrame} from './test/support/animation-geotext-expressions.js'; export {render} from './src/renderers/canvas/index.js'; export {renderToSVG} from './src/renderers/svg.js';`, resolveDir: root }, external: ["node:*", "@napi-rs/canvas"], bundle: true, platform: "browser", format: "esm", write: false });
    await writeFile(path.join(directory, "frame.js"), bundle.outputFiles[0].contents);
    await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Sampled geographic Text expressions</title><link rel="icon" href="data:,"><p id="status">Ready</p><canvas aria-label="Geographic Text expressions at the current camera"></canvas></html>');
    server = await startStaticServer(directory);browser = await chromium.launch({ headless: true });
    for (const ratio of [1, 2]) for (const variant of ["labels","layout","annotation"]) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
        const result = await opened.page.evaluate(async ({ratio,variant}) => {
          const {geoTextExpressionFrame,expectedGeoTextFrame,render,renderToSVG}=await import('/frame.js');
          const {frame,nativeFrom,nativeTo}=geoTextExpressionFrame(variant),canvas=document.querySelector('canvas');
          render(frame,canvas.getContext('2d'),{pixelRatio:ratio});
          const svgCanvas=async p=>{const image=new Image();image.src=`data:image/svg+xml,${encodeURIComponent(renderToSVG(p))}`;await image.decode();const c=document.createElement('canvas');c.width=400*ratio;c.height=300*ratio;c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c;};
          const svg=await svgCanvas(frame),expected=await svgCanvas(expectedGeoTextFrame(nativeFrom,nativeTo));
          const data=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          const native=[nativeFrom,nativeTo].map(p=>{const c=document.createElement('canvas');render(p,c.getContext('2d'),{pixelRatio:ratio});return data(c);});
          const actual=data(canvas),vector=data(svg),expectedVector=data(expected);
          let maxNativePair=0;for(let i=0;i<vector.length;i++)maxNativePair=Math.max(maxNativePair,Math.abs(vector[i]-expectedVector[i]));let compared=0,maxCanvas=0;
          for(let i=0;i<actual.length;i+=4)if(native[0][i]===255&&native[0][i+1]===0&&native[0][i+2]===0&&native[1][i]===0&&native[1][i+1]===0&&native[1][i+2]===255){
            if(variant!=='layout')for(const [channel,expected]of[188,0,188,255].entries()){maxCanvas=Math.max(maxCanvas,Math.abs(actual[i+channel]-expected));}compared++;
          }
          document.querySelector('#status').textContent='Complete';return{maxNativePair,compared,maxCanvas,linearRGB:renderToSVG(frame).includes('linearRGB'),size:[canvas.width,canvas.height]};
        },{ratio,variant});
        assert.deepEqual(result.size,[400*ratio,300*ratio]);assert.ok(result.compared>20);assert.equal(result.linearRGB,true);
        assert.equal(result.maxNativePair,0,JSON.stringify(result));
        assert.ok(result.maxCanvas<=1,JSON.stringify(result));
        assert.equal(await opened.page.locator("#status").textContent(), "Complete");assertNoBrowserErrors(opened.errors, "Sampled geographic Text expressions");
        await opened.page.close();
      } finally { await context.close(); }
    }
  } catch (error) { if (browser) await saveBrowserEvidence(browser, error);throw error; }
  finally { await closeBrowserWithEvidence(browser);await server?.close();await rm(directory, { recursive: true, force: true }); }
});
