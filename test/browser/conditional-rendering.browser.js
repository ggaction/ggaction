import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence,
  saveBrowserContextEvidence } from "../support/browser.js";

let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), `<!doctype html>
    <html lang="en"><meta charset="utf-8"><title>Conditional rendering</title>
    <canvas id="chart" aria-label="Conditional opacity scatterplot"></canvas><div id="svg"></div>
    <p id="status">loading</p><script type="importmap">{"imports":{
      "ggaction":"/node_modules/ggaction/src/index.js",
      "ggaction/basic":"/node_modules/ggaction/src/basic.js",
      "ggaction/svg":"/node_modules/ggaction/src/renderers/svg.js",
      "ggaction/persistence":"/node_modules/ggaction/src/persistence.js",
      "ggaction/scene":"/node_modules/ggaction/src/scene.js"}}</script>
    <script type="module">
      import { render } from "ggaction";
      import { chart } from "ggaction";
      import { renderToSVG } from "ggaction/svg";
      import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
      import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
      const expression=root=>({version:2,registry:"standard@1",root});
      const before=chart().createCanvas({width:200,height:140,margin:20})
        .createData({id:"rows",values:[{x:1,y:1},{x:3,y:3}]})
        .createParameter({id:"hide",value:false})
        .createScatterPlot({id:"points",x:{field:"x",scale:{domain:[0,4],nice:false}},
          y:{field:"y",scale:{domain:[0,4],nice:false}},guides:false})
        .encodeColor({value:"#e63946"}).encodePointRadius({value:6})
        .encodeOpacity({conditions:[{when:expression({type:"binary",op:"and",left:{type:"parameter",id:"hide"},
          right:{type:"binary",op:"gte",left:{type:"field",name:"x"},right:{type:"literal",value:2}}}),value:{value:0}}],otherwise:{value:1}});
      const saved=serializeProgram(before),after=deserializeProgram(saved).editParameter({target:"hide",value:true});
      const graphic=deserializeGraphic(serializeGraphic(after)),ratio=devicePixelRatio;
      const canvas=document.querySelector("#chart"),context=canvas.getContext("2d");
      render(graphic,context,{pixelRatio:ratio});
      const svg=renderToSVG(graphic),svgCanvas=document.createElement("canvas");
      document.querySelector("#svg").innerHTML=svg;
      svgCanvas.width=200*ratio;svgCanvas.height=140*ratio;
      const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
      image.src=url;await image.decode();const svgContext=svgCanvas.getContext("2d");
      svgContext.scale(ratio,ratio);svgContext.drawImage(image,0,0);URL.revokeObjectURL(url);
      const sceneCanvas=document.createElement("canvas"),sceneContext=sceneCanvas.getContext("2d");
      const scene=createTransitionScene(after,{format:"canvas"});renderTransitionScene(scene,sceneContext,{pixelRatio:ratio});
      const native=context.getImageData(0,0,canvas.width,canvas.height).data;
      const scenePixels=sceneContext.getImageData(0,0,canvas.width,canvas.height).data;
      const sample=ctx=>[[60,95],[140,45],[60,80],[140,60]].map(([x,y])=>[...ctx.getImageData(x*ratio,y*ratio,1,1).data]);
      const circles=value=>value.nodes.filter(node=>node.type==="circle");
      window.conditionalRendering={physical:[canvas.width,canvas.height],logical:[canvas.style.width,canvas.style.height],
        canvas:sample(context),svgPixels:sample(svgContext),unchanged:serializeProgram(before)===saved,
        sourceFree:graphic.semanticSpec===undefined,svgExact:svg===renderToSVG(after),
        scenePixelsExact:native.every((value,index)=>value===scenePixels[index]),
        sceneKeysPreserved:JSON.stringify(circles(scene).map(node=>node.key))===JSON.stringify(circles(createTransitionScene(before,{format:"canvas"})).map(node=>node.key)),
        centers:circles(scene).map(node=>[node.properties.x,node.properties.y,node.properties.opacity])};
      document.querySelector("#status").textContent="complete";
    </script></html>`);
  server = await startStaticServer(consumer.directory);
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });

for (const ratio of [1, 2]) test(`installed browser conditional opacity preserves Canvas, SVG, and scene endpoints at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.conditionalRendering !== undefined });
    const actual = await page.evaluate(() => window.conditionalRendering);
    assert.deepEqual(actual.physical, [200 * ratio, 140 * ratio]);
    assert.deepEqual(actual.logical, ["200px", "140px"]);
    assert.deepEqual(actual.centers, [[60, 95, 1], [140, 45, 0]]);
    for (const samples of [actual.canvas, actual.svgPixels]) assert.deepEqual(samples,
      [[230, 57, 70, 255], [255, 255, 255, 255], [255, 255, 255, 255], [255, 255, 255, 255]]);
    for (const key of ["unchanged", "sourceFree", "svgExact", "scenePixelsExact", "sceneKeysPreserved"]) assert.equal(actual[key], true, key);
    assert.equal(await page.locator("#status").textContent(), "complete");
    assert.equal(await page.locator("#chart").getAttribute("aria-label"), "Conditional opacity scatterplot");
    assertNoBrowserErrors(errors, "conditional rendering");
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
