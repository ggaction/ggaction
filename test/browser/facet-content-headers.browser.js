import { saveBrowserContextEvidence, saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const name = process.env.GGACTION_BROWSER ?? "chromium", engines = { chromium, firefox, webkit };
assert(Object.hasOwn(engines, name));
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"),
    '<html lang="en"><head><meta charset="utf-8"><title>Content headers</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server = await startStaticServer(consumer.directory);
  browser = await engines[name].launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });

for (const ratio of [1, 2]) test(`${name} matches explicit content-header geometry in Canvas and SVG at DPR ${ratio}`, async () => {
  try {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl);
    const result = await page.evaluate(async ratio => {
      const { chart, render } = await import("/node_modules/ggaction/src/index.js");
      const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
      const { serializeProgram, deserializeProgram } = await import("/node_modules/ggaction/src/persistence.js");
      const base = chart().createCanvas({ plot: { width: 100, height: 100 }, margin: 70 })
        .createData({ values: [{ group: "A", x: 5, y: 5 }, { group: "B", x: 10, y: 10 }] })
        .createScatterPlot({ x: { field: "x", scale: { domain: [0, 10] } },
          y: { field: "y", scale: { domain: [0, 10] } }, guides: false })
        .editPointMark({ stroke: false }).encodePointRadius({ value: 3 })
        .facet({ field: "group", columns: 2, spacing: "plot", gap: 30 })
        .editCompositionLayout({ topLane: "shared" });
      const actual = base.editFacetHeaders({ anchor: "content" });
      // Independent literal: plot top70 - offset10 - half font12 - radius3 =51.
      const primitive = base.editGraphics({ target: "facet-headers:1", property: "y", value: 51 });
      const programs = [actual, primitive], pixels = [];
      for (const p of programs) {
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        render(p, ctx, { pixelRatio: ratio });
        pixels.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
      }
      let differences = 0;
      for (let i = 0; i < pixels[0].length; i++) if (pixels[0][i] !== pixels[1][i]) differences++;
      return { differences, sameLength: pixels[0].length === pixels[1].length,
        sameSvg: renderToSVG(actual) === renderToSVG(primitive),
        savedSvg: renderToSVG(deserializeProgram(serializeProgram(actual))) === renderToSVG(actual),
        headerY: actual.graphicSpec.objects["facet-headers"].items.map(x => x.properties.y) };
    }, ratio);
    assert.deepEqual(result, { differences: 0, sameLength: true, sameSvg: true, savedSvg: true, headerY: [54, 51] });
    assertNoBrowserErrors(errors, name);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally { await context.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

for (const ratio of [1, 2]) test(`${name} independently packed content matches literal plot origins at DPR ${ratio}`, async () => {
  const context = await browser.newContext({deviceScaleFactor: ratio});
  try {
    const {page, errors} = await openBrowserPage(context, server.baseUrl);
    const result = await page.evaluate(async ratio => {
      const {chart, render} = await import('/node_modules/ggaction/src/index.js');
      const {renderToSVG} = await import('/node_modules/ggaction/src/renderers/svg.js');
      const {serializeProgram, deserializeProgram} = await import('/node_modules/ggaction/src/persistence.js');
      const {namespaceGraphicId} = await import('/node_modules/ggaction/src/materialization/compositionSnapshot.js');
      const values = [3,7,11,2].flatMap((r,i) => [{g:String(i),x:0,y:0,s:r*r},{g:String(i),x:100,y:100,s:r*r}]);
      const source = chart().createCanvas({plot:{width:100,height:100},margin:50})
        .createData({values}).createScatterPlot({x:{field:'x',scale:{domain:[0,100]}},y:{field:'y',scale:{domain:[0,100]}},guides:false})
        .encodeSize({field:'s',scale:{type:'linear',domain:[0,121],range:[0,121*Math.PI]}}).editPointMark({stroke:false});
      const actual = source.facet({field:'g',columns:2,spacing:'content',gap:16,
        headers:{labelMap:[0,1,2,3].map(i=>({value:String(i),label:''}))}});
      // Independent circle arithmetic: leading extents 3/7/11/2,
      // column trailing extents 111/107, row trailing extent 107.
      const expected = [[11,7],[145,7],[11,141],[140,132]];
      let primitive = actual;
      for (const [i,id] of actual.compositionSpec.children.entries()) {
        const root = namespaceGraphicId(`${actual.compositionSpec.id}-${id}`,'canvas');
        primitive = primitive.editGraphics({target:root,property:'x',value:expected[i][0]-50})
          .editGraphics({target:root,property:'y',value:expected[i][1]-50});
      }
      const pixels = [actual,primitive,deserializeProgram(serializeProgram(actual))].map(p=>{
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
        render(p,ctx,{pixelRatio:ratio});
        return Array.from(ctx.getImageData(0,0,canvas.width,canvas.height).data);
      });
      return {svg:renderToSVG(actual)===renderToSVG(primitive),
        pixels:pixels.slice(1).every(p=>p.length===pixels[0].length&&p.every((v,i)=>v===pixels[0][i])),
        painted:pixels[0].some((v,i)=>i%4!==3&&v!==255)};
    },ratio);
    assert.deepEqual(result,{svg:true,pixels:true,painted:true});
    assertNoBrowserErrors(errors,name);
    await page.close();
  } catch(error) {await saveBrowserContextEvidence(context,error);throw error;}
  finally {await context.close();}
});
