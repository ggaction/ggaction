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

for (const mode of ["multiply", "screen"]) test(`installed browser conditional appearance preserves ${mode} across edit, restore and scene`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.conditionalRendering !== undefined });
    const actual = await page.evaluate(async mode => {
      const { chart, render } = await import("ggaction");
      const { renderToSVG } = await import("ggaction/svg");
      const { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } = await import("ggaction/persistence");
      const { createTransitionScene, renderTransitionScene } = await import("ggaction/scene");
      const original = chart().createCanvas({ width: 300, height: 240, margin: 30, background: "#336699" })
        .createData({ values: [{ category: "a", y: 1 }, { category: "b", y: 2 }] })
        .createParameter({ id: "warm", value: true })
        .createBarPlot({ id: "bars", x: "category", y: { field: "y", aggregate: "sum" }, guides: false })
        .editBarMark({ blend: mode, stroke: false })
        .encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "warm" } },
          value: { value: "#ff0000" } }], otherwise: { value: "#0000ff" } })
        .selectMarks({ id: "chosen", target: "bars", grain: "item", field: "category", op: "eq", value: "a" })
        .encodeOpacity({ conditions: [{ when: { selection: "chosen" }, value: { value: 0.5 } }], otherwise: { value: 1 } });
      const program = deserializeProgram(serializeProgram(original)).editParameter({ target: "warm", value: false })
        .editMarkSelection({ selection: "chosen", field: "category", op: "eq", value: "b" });
      const graphic = deserializeGraphic(serializeGraphic(program));
      const canvas = document.createElement("canvas"), canvasContext = canvas.getContext("2d"); render(graphic, canvasContext, { pixelRatio: 2 });
      const offscreen = new OffscreenCanvas(1, 1), offscreenContext = offscreen.getContext("2d"); render(graphic, offscreenContext, { pixelRatio: 2 });
      const svg = renderToSVG(graphic), image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      image.src = url; await image.decode();
      const svgCanvas = document.createElement("canvas"); svgCanvas.width = 600; svgCanvas.height = 480;
      const svgContext = svgCanvas.getContext("2d"); svgContext.scale(2, 2); svgContext.drawImage(image, 0, 0); URL.revokeObjectURL(url);
      const scene = createTransitionScene(graphic, { format: "canvas" });
      const sceneCanvas = document.createElement("canvas"), sceneContext = sceneCanvas.getContext("2d"); renderTransitionScene(scene, sceneContext, { pixelRatio: 2 });
      const pixels = ctx => ctx.getImageData(0, 0, 600, 480).data, reference = pixels(canvasContext);
      const sample = ctx => program.graphicSpec.objects.bars.items.map(({ properties: p }) => [...ctx.getImageData(Math.floor(p.x + p.width / 2) * 2, Math.floor(p.y + p.height / 2) * 2, 1, 1).data]);
      return { appearance: program.graphicSpec.objects.bars.items.map(item => [item.properties.blend, item.properties.fill, item.properties.opacity]),
        sourceFree: graphic.semanticSpec === undefined, dimensions: [canvas.width, canvas.height],
        canvas: sample(canvasContext), svg: sample(svgContext),
        offscreenExact: pixels(offscreenContext).every((value, index) => value === reference[index]),
        sceneExact: pixels(sceneContext).every((value, index) => value === reference[index]),
        reset: program.editBarMark({ blend: "normal" }).semanticSpec.layers[0].mark.blend === undefined };
    }, mode);
    assert.deepEqual(actual.appearance, [[mode, "#0000ff", 1], [mode, "#0000ff", 0.5]]);
    assert.deepEqual(actual.dimensions, [600, 480]);
    const expected = mode === "multiply" ? [[0, 0, 153, 255], [26, 51, 153, 255]] : [[51, 102, 255, 255], [51, 102, 204, 255]];
    for (const samples of [actual.canvas, actual.svg]) samples.forEach((sample, i) => sample.forEach((value, channel) =>
      assert.ok(Math.abs(value - expected[i][channel]) <= (channel === 3 ? 0 : 1), JSON.stringify({ mode, sample, expected: expected[i] }))));
    for (const key of ["sourceFree", "offscreenExact", "sceneExact", "reset"]) assert.equal(actual[key], true, key);
    assertNoBrowserErrors(errors, `conditional ${mode}`);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
