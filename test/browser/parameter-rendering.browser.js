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
    <html lang="en"><meta charset="utf-8"><title>Parameter rendering</title>
    <canvas id="chart" aria-label="Parameter revision scatterplot"></canvas><div id="svg"></div>
    <p id="status">loading</p><script type="importmap">{"imports":{
      "ggaction":"/node_modules/ggaction/src/index.js",
      "ggaction/basic":"/node_modules/ggaction/src/basic.js",
      "ggaction/svg":"/node_modules/ggaction/src/renderers/svg.js",
      "ggaction/persistence":"/node_modules/ggaction/src/persistence.js",
      "ggaction/scene":"/node_modules/ggaction/src/scene.js"}}</script>
    <script type="module">
      import { render } from "ggaction";
      import { chart } from "ggaction/basic";
      import { renderToSVG } from "ggaction/svg";
      import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
      import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
      const before = chart().createCanvas({width:200,height:140,margin:20})
        .createData({id:"rows",values:[{x:1,y:1},{x:3,y:3}]})
        .createParameter({id:"factor",value:2})
        .createComputedData({id:"scaled",as:"value",expression:{version:2,registry:"standard@1",
          root:{type:"binary",op:"multiply",left:{type:"field",name:"y"},right:{type:"parameter",id:"factor"}}}})
        .createScatterPlot({id:"points",x:{field:"x",scale:{domain:[0,4],nice:false}},
          y:{field:"value",scale:{domain:[0,10],nice:false}},guides:false})
        .encodeColor({target:"points",value:"#e63946"}).encodePointRadius({target:"points",value:6});
      const saved=serializeProgram(before),after=deserializeProgram(saved).editParameter({target:"factor",value:3});
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
      const sample=ctx=>[[60,90],[140,30],[60,100],[140,60]].map(([x,y])=>[...ctx.getImageData(x*ratio,y*ratio,1,1).data]);
      const circles=value=>value.nodes.filter(node=>node.type==="circle");
      window.parameterRendering={physical:[canvas.width,canvas.height],logical:[canvas.style.width,canvas.style.height],
        canvas:sample(context),svgPixels:sample(svgContext),unchanged:serializeProgram(before)===saved,
        sourceFree:graphic.semanticSpec===undefined,svgExact:svg===renderToSVG(after),
        scenePixelsExact:native.every((value,index)=>value===scenePixels[index]),
        sceneKeysPreserved:JSON.stringify(circles(scene).map(node=>node.key))===JSON.stringify(circles(createTransitionScene(before,{format:"canvas"})).map(node=>node.key)),
        centers:circles(scene).map(node=>[node.properties.x,node.properties.y])};
      document.querySelector("#status").textContent="complete";
    </script></html>`);
  server = await startStaticServer(consumer.directory, { dependencies: "installed" });
  browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });

for (const ratio of [1, 2]) test(`installed browser parameter edits preserve Canvas, SVG, and scene endpoints at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.parameterRendering !== undefined });
    const actual = await page.evaluate(() => window.parameterRendering);
    assert.deepEqual(actual.physical, [200 * ratio, 140 * ratio]);
    assert.deepEqual(actual.logical, ["200px", "140px"]);
    assert.deepEqual(actual.centers, [[60, 90], [140, 30]]);
    for (const samples of [actual.canvas, actual.svgPixels]) assert.deepEqual(samples,
      [[230, 57, 70, 255], [230, 57, 70, 255], [255, 255, 255, 255], [255, 255, 255, 255]]);
    for (const key of ["unchanged", "sourceFree", "svgExact", "scenePixelsExact", "sceneKeysPreserved"]) assert.equal(actual[key], true, key);
    assert.equal(await page.locator("#status").textContent(), "complete");
    assert.equal(await page.locator("#chart").getAttribute("aria-label"), "Parameter revision scatterplot");
    assertNoBrowserErrors(errors, "parameter rendering");
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
