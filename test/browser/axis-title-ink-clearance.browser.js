import assert from "node:assert/strict";
import {mkdtemp, mkdir, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {startStaticServer} from "../support/static-server.js";
import {openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence} from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
let directory, server, browser;
test.before(async () => {
  await mkdir(path.join(root, ".artifacts"), {recursive:true});
  directory = await mkdtemp(path.join(root, ".artifacts/axis-title-ink-"));
  await writeFile(path.join(directory, "index.html"), '<!doctype html><canvas aria-label="Axis title ink bounds"></canvas><div id="svg"></div><p id="status">Ready</p>');
  server = await startStaticServer(root);
  browser = await chromium.launch({headless:true});
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await rm(directory, {recursive:true, force:true});
});
test("edge-clamped vertical title ink stays inside SVG and Canvas at small, default and large fonts", async () => {
  const context = await browser.newContext();
  let page;
  try {
    const opened = await openBrowserPage(context, server.baseUrl + path.relative(root, directory) + "/", {
      waitFor: () => document.querySelector("#status")?.textContent === "Ready"
    });
    page = opened.page;
    const records = await page.evaluate(async () => {
      const {chart, render} = await import("/src/index.js");
      const {renderToSVG} = await import("/src/renderers/svg.js");
      const records = [];
      for (const fontSize of [11,13,14,18]) for (const position of ["left","right"]) {
        const p = chart().createCanvas({width:451,height:300,margin:{left:51,right:51,top:20,bottom:80}})
          .createData({values:[{x:0,y:0},{x:100,y:140}]})
          .createScatterPlot({x:"x",y:"y",guides:false})
          .createAxes({x:{title:false},y:{position,title:{text:"Vertical total",fontSize,fontWeight:700}}});
        const canvas = document.querySelector("canvas");
        const context = canvas.getContext("2d"), original = context.fillText;
        let canvasInk;
        context.fillText = function(text,x,y,...rest) {
          if (text === "Vertical total") {
            const metrics = this.measureText(text), transform = this.getTransform();
            const points = [[x-metrics.actualBoundingBoxLeft,y-metrics.actualBoundingBoxAscent],
              [x+metrics.actualBoundingBoxRight,y-metrics.actualBoundingBoxAscent],
              [x-metrics.actualBoundingBoxLeft,y+metrics.actualBoundingBoxDescent],
              [x+metrics.actualBoundingBoxRight,y+metrics.actualBoundingBoxDescent]]
              .map(([x,y]) => new DOMPoint(x,y).matrixTransform(transform));
            canvasInk = {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),
              top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
          }
          return original.call(this,text,x,y,...rest);
        };
        render(p, context, {pixelRatio:1});
        context.fillText = original;
        document.querySelector("#svg").innerHTML = renderToSVG(p);
        await document.fonts.ready;
        const text = [...document.querySelectorAll("#svg text")].find(e => e.textContent === "Vertical total");
        const box = text.getBBox(), matrix = text.getCTM();
        const points = [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]
          .map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
        records.push({fontSize,position,left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),
          top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y)),canvasInk,width:canvas.width,height:canvas.height});
      }
      return records;
    });
    for (const r of records) {
      assert.ok(r.left >= 0 && r.right <= r.width && r.top >= 0 && r.bottom <= r.height, JSON.stringify(r));
      assert.ok(r.canvasInk && r.canvasInk.left >= 0 && r.canvasInk.right <= r.width &&
        r.canvasInk.top >= 0 && r.canvasInk.bottom <= r.height, JSON.stringify(r));
    }
    assertNoBrowserErrors(opened.errors, "axis title ink clearance");
  } finally {
    await page?.close();
    await context.close();
  }
});
