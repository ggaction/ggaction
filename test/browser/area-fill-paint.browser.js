import { saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Browser Canvas and SVG consume the same materialized area gradient", async () => {
  const directory = await mkdtemp(path.join(root, ".artifacts/area-paint-"));
  let server, browser;
  try {
    await writeFile(path.join(directory, "index.html"), `<!doctype html><html><body>
      <canvas aria-label="Gradient-filled area"></canvas><p id="status">Loading</p>
      <script type="module">
        import {chart, render} from '/src/index.js';
        import {renderToSVG} from '/src/renderers/svg.js';
        const fill = {type:'linear-gradient', from:{x:0,y:1}, to:{x:0,y:0},
          stops:[{offset:0,color:'white'},{offset:1,color:'orange'}]};
        const program = chart().createCanvas({width:200,height:120,margin:20})
          .createData({values:[{x:0,y:1},{x:1,y:2}]})
          .createAreaPlot({x:'x',y:'y',area:{fill,opacity:.7},guides:false});
        const canvas = document.querySelector('canvas');
        const context = canvas.getContext('2d');
        const gradients = [];
        const nativeGradient = context.createLinearGradient.bind(context);
        context.createLinearGradient = (...coordinates) => {
          const gradient = nativeGradient(...coordinates), stops = [];
          const addStop = gradient.addColorStop.bind(gradient);
          gradient.addColorStop = (offset,color) => {stops.push([offset,color]);addStop(offset,color);};
          gradients.push({coordinates,stops});return gradient;
        };
        render(program, context);
        const documentSVG = new DOMParser().parseFromString(renderToSVG(program),'image/svg+xml');
        const gradient = documentSVG.querySelector('linearGradient');
        window.areaPaint = {width:canvas.width,height:canvas.height,gradients,
          svg:{coordinates:['x1','y1','x2','y2'].map(key=>Number(gradient.getAttribute(key))),
            stops:[...gradient.querySelectorAll('stop')].map(stop=>[
              Number(stop.getAttribute('offset')),stop.getAttribute('stop-color')])}};
        document.querySelector('#status').textContent='Ready';
      </script></body></html>`);
    server = await startStaticServer(root, { dependencies: "repository" });
    browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser,
      server.baseUrl + path.relative(root, directory) + "/",
      { waitFor: () => window.areaPaint !== undefined });
    const result = await opened.page.evaluate(() => window.areaPaint);
    assert.equal(result.width, 200);
    assert.equal(result.height, 120);
    assert.deepEqual(result.gradients, [{ coordinates: [20,100,20,20],
      stops: [[0,"white"],[1,"orange"]] }]);
    assert.deepEqual(result.svg, result.gradients[0]);
    assertNoBrowserErrors(opened.errors, "area fill paint");
    await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; } finally {
    await closeBrowserWithEvidence(browser);
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
