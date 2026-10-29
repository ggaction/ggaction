import { saveBrowserContextEvidence, saveBrowserEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { compatibilityPage } from "../support/backend-compatibility.js";
import { openBrowserPage, assertNoBrowserErrors, saveBrowserPageEvidence, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const browserName = process.env.GGACTION_BROWSER ?? "chromium";
const browsers = { chromium, firefox, webkit };
assert.ok(Object.hasOwn(browsers, browserName), `Unknown browser ${browserName}`);
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"), compatibilityPage());
  await writeFile(path.join(consumer.directory, "clipping-fixture.js"), await readFile(new URL("../support/plot-clipping.js", import.meta.url), "utf8"));
  await writeFile(path.join(consumer.directory,"legend-spacing-public.js"),
    (await readFile(new URL("../../examples/legend-content-spacing/program.js",import.meta.url),"utf8"))
      .replace("'../../src/index.js'","'ggaction'"));
  await writeFile(path.join(consumer.directory,"legend-spacing-primitive.js"),
    (await readFile(new URL("../charts/legend-content-spacing/primitive.program.js",import.meta.url),"utf8"))
      .replace("'../../../src/index.js'","'ggaction'"));
  await writeFile(path.join(consumer.directory, "grapheme-wrapping.js"),
    (await readFile(new URL("../support/text/grapheme-wrapping.js", import.meta.url), "utf8"))
      .replace('"../../../src/index.js"', '"/node_modules/ggaction/src/index.js"'));
  server = await startStaticServer(consumer.directory, { dependencies: "installed" });
  browser = await browsers[browserName].launch({ headless: true });
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
  await consumer?.cleanup();
});

test(`${browserName} preserves occupied legend spacing in installed Canvas and SVG at both densities`,async()=>{
  try {
  for(const ratio of[1,2]){
    const context=await browser.newContext({deviceScaleFactor:ratio});
    try{
      const {page,errors}=await openBrowserPage(context,server.baseUrl,{waitFor:()=>window.compatibility!==undefined});
      const result=await page.evaluate(async ratio=>{
        const {render}=await import('/node_modules/ggaction/src/index.js');
        const {renderToSVG}=await import('/node_modules/ggaction/src/renderers/svg.js');
        const {createLegendContentSpacingProgram}=await import('/legend-spacing-public.js');
        const {createPrimitiveProgram}=await import('/legend-spacing-primitive.js');
        const programs=[createLegendContentSpacingProgram(),createPrimitiveProgram()],svgs=programs.map(p=>renderToSVG(p,{resourceNamespace:"comparison"})),checks=[];
        for(const backend of['Canvas','SVG']){
          const arrays=[];
          for(let index=0;index<programs.length;index++){
            const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
            if(backend==='Canvas')render(programs[index],ctx,{pixelRatio:ratio});
            else{
              canvas.width=320*ratio;canvas.height=240*ratio;
              const url=URL.createObjectURL(new Blob([svgs[index]],{type:'image/svg+xml'})),image=new Image();
              image.src=url;await image.decode();ctx.scale(ratio,ratio);ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
            }
            arrays.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
          }
          let differences=0,ink=0;
          for(let index=0;index<arrays[0].length;index++)if(arrays[0][index]!==arrays[1][index])differences++;
          for(let y=30*ratio;y<190*ratio;y++)for(let x=40*ratio;x<180*ratio;x++){
            const i=(y*320*ratio+x)*4;if(arrays[0][i]+arrays[0][i+1]+arrays[0][i+2]<740&&arrays[0][i+3]>0)ink++;
          }
          checks.push({backend,differences,ink,dimensions:[320*ratio,240*ratio]});
        }
        return{svgExact:svgs[0]===svgs[1],svg:svgs[0],checks,
          sampleCenterY:programs[0].graphicSpec.objects.sizeLegendSymbols.items.map(i=>i.properties.y),
          labelTopY:programs[0].graphicSpec.objects.sizeLegendLabels.items.map(i=>i.properties.y)};
      },ratio);
      assert.equal(result.svgExact,true);assert.deepEqual(result.sampleCenterY,[73,102,143]);assert.deepEqual(result.labelTopY,[68,97,138]);
      for(const check of result.checks){assert.equal(check.differences,0,check.backend);assert.ok(check.ink>100*ratio*ratio);assert.deepEqual(check.dimensions,[320*ratio,240*ratio]);}
      assert.match(result.svg,/cx="231" cy="73" r="8"/);assertNoBrowserErrors(errors,browserName);await page.close();
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }finally{await context.close();}
  }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

for (const ratio of [1, 2]) {
  test(`${browserName} preserves Canvas/SVG clipping, gradient, text, resize, density, and downloads at DPR ${ratio}`, async () => {
  try {
    const context = await browser.newContext({ deviceScaleFactor: ratio, acceptDownloads: true });
    let page;
    try {
      const opened = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.compatibility !== undefined });
      page = opened.page;
      for (const width of [160, 220]) {
        if (width !== 160) await page.evaluate(width => window.drawCompatibility(width), width);
        const actual = await page.evaluate(() => window.compatibility);
        assert.deepEqual(actual.physical, [width * ratio, 100 * ratio]);
        assert.deepEqual(actual.logical, [width, 100]);
        assert.equal(actual.ratio, ratio);
        assert.equal(actual.unchanged, true);
        for (const pixels of [actual.canvas, actual.svgPixels]) {
          assert.deepEqual(pixels.outsideLeft, [255, 255, 255, 255]);
          assert.deepEqual(pixels.outsideRight, [255, 255, 255, 255]);
          assert.ok(pixels.red[0] > 180 && pixels.red[2] < 80);
          assert.ok(pixels.blue[2] > 180 && pixels.blue[0] < 80);
          assert.ok(pixels.text.count > 20);
          assert.ok(Math.abs((pixels.text.left + pixels.text.right) / 2 - 60) < 4, "horizontal text alignment");
          assert.ok(Math.abs((pixels.text.top + pixels.text.bottom) / 2 - 40) < 4, "vertical text alignment");
        }
        assert.match(actual.svg, /<clipPath/);
        assert.match(actual.svg, /<linearGradient/);
        assert.equal(await page.locator("#svg title").textContent(), "Compatibility scene");
        assert.equal(await page.locator("canvas").getAttribute("aria-label"), "Clipped gradient with centered text");
      }
      const downloadEvent = page.waitForEvent("download");
      await page.locator("#download").click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), "compatibility.svg");
      assert.equal(await readFile(await download.path(), "utf8"), await page.evaluate(() => window.compatibility.svg));
      assertNoBrowserErrors(opened.errors, browserName);
      await page.close();
    } catch (error) {
      if (page) await saveBrowserPageEvidence(page, error, `${browserName}-dpr-${ratio}`);
      throw error;
    } finally { await context.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
}

test(`${browserName} keeps vertical and slanted axis labels outside fixed plots in Canvas and SVG`, async () => {
  try {
  const context = await browser.newContext();
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.compatibility !== undefined });
    const records = await page.evaluate(async () => {
      const { chart, render } = await import("/node_modules/ggaction/src/index.js");
      const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
      const output = [];
      for (const angle of [-90, -45, 45, 90]) {
        const program = chart().createCanvas({ width: 640, height: 440, margin: { left: 60, top: 40, right: 80, bottom: 200 } })
          .createData({ values: ["Alpha category", "Beta category", "Gamma category"].map((category, i) => ({ category, value: i + 1 })) })
          .createScatterPlot({ x: { field: "category", fieldType: "nominal" }, y: "value", guides: false })
          .createXAxis({ title: false, ticksAndLabels: { labels: { rotation: { value: angle, unit: "degrees" }, fontSize: 10, color: "black", offset: 7 } } });
        const labels = program.graphicSpec.objects.xAxisLabels;
        const scene = { graphicSpec: { order: ["canvas"], objects: { canvas: { type: "canvas", properties: { width: 640, height: 440, background: "white" }, children: ["xAxisLabels"] }, xAxisLabels: labels } } };
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        render(scene, ctx, { pixelRatio: 1 });
        const pixels = ctx.getImageData(0, 0, 640, 440).data;
        let top = Infinity, bottom = -Infinity, count = 0;
        for (let y = 0; y < 440; y++) for (let x = 0; x < 640; x++) {
          const i = (y * 640 + x) * 4;
          if (pixels[i] < 80 && pixels[i + 1] < 80 && pixels[i + 2] < 80 && pixels[i + 3] > 128) { top = Math.min(top, y); bottom = Math.max(bottom, y); count++; }
        }
        const host = document.createElement("div");host.innerHTML = renderToSVG(scene);document.body.append(host);
        const root = host.querySelector("svg").getBoundingClientRect();
        const bounds = [...host.querySelectorAll("text")].map(n => { const b = n.getBoundingClientRect();return { top: b.top - root.top, bottom: b.bottom - root.top, centerX: (b.left + b.right) / 2 - root.left }; });
        output.push({ angle, canvas: { top, bottom, count }, bounds, anchors: labels.items.map(i => i.properties.x) });host.remove();
      }
      return output;
    });
    for (const record of records) {
      assert.ok(record.canvas.count > 50);
      assert.ok(record.canvas.top >= 243 && record.canvas.bottom < 440, JSON.stringify(record));
      for (const [i, bound] of record.bounds.entries()) {
        assert.ok(bound.top >= 243 && bound.bottom <= 440);
        if (Math.abs(record.angle) === 90) assert.ok(Math.abs(bound.centerX - record.anchors[i]) < 3);
      }
    }
    assertNoBrowserErrors(errors, "rotated axis labels");await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally { await context.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});


test(`${browserName} renders hard title breaks as concrete Canvas and SVG text lines`, async () => {
  try {
  const context = await browser.newContext();
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.compatibility !== undefined });
    const actual = await page.evaluate(async () => {
      const { chart, render } = await import("/node_modules/ggaction/src/index.js");
      const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
      const p = chart().createCanvas({ width: 600, height: 500, margin: 180 })
        .createTitle({ text: "Headline\nDetails", subtitle: "Credit\r\nSource" });
      const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
      render(p, ctx, { pixelRatio: 1 });
      const data = ctx.getImageData(0, 0, 600, 180).data;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 200 && data[i+1] < 200 && data[i+2] < 200 && data[i+3] > 100) ink++;
      const host = document.createElement("div"); host.innerHTML = renderToSVG(p); document.body.append(host);
      const labels = [...host.querySelectorAll("text")].map(n => n.textContent);host.remove();
      return { labels, ink };
    });
    assert.deepEqual(actual.labels, ["Headline", "Details", "Credit", "Source"]);
    assert.ok(actual.ink > 100);
    assertNoBrowserErrors(errors, "hard title breaks");await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally { await context.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

test(`${browserName} composites each bar fill and outline once in Canvas and SVG`, async () => {
  try {
  const context = await browser.newContext();
  try {
    const {page,errors}=await openBrowserPage(context,server.baseUrl,{waitFor:()=>window.compatibility!==undefined});
    const results=await page.evaluate(async()=>{
      const {chart,render}=await import("/node_modules/ggaction/src/index.js");
      const {renderToSVG}=await import("/node_modules/ggaction/src/renderers/svg.js");
      const records=[];
      const different=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]),0);
      for(const background of ["#ffffff","#808080","#336699","none"])
      for(const opacity of [0,.4,.5,1])for(const strokeWidth of [0,8])for(const ratio of [1,2]) {
        const size=200*ratio;
        const program=chart().createCanvas({width:200,height:200,margin:40,background})
          .createData({values:[{category:"a",value:1}]})
          .createBarPlot({x:"category",y:{field:"value",aggregate:"sum"},guides:false})
          .encodeBarWidth({pixels:80})
          .editBarMark({fill:"#f00000",stroke:"#ffff00",strokeWidth})
          .editBarMark({blend:"difference",opacity});
        const actual=document.createElement("canvas"),a=actual.getContext("2d");render(program,a,{pixelRatio:ratio});
        const expected=document.createElement("canvas");expected.width=size;expected.height=size;const e=expected.getContext("2d");
        if(background!=="none"){e.fillStyle=background;e.fillRect(0,0,size,size);}
        const source=document.createElement("canvas");source.width=size;source.height=size;const s=source.getContext("2d");
        s.scale(ratio,ratio);s.fillStyle="#f00000";s.fillRect(60,40,80,120);
        if(strokeWidth){s.strokeStyle="#ffff00";s.lineWidth=strokeWidth;s.strokeRect(60,40,80,120);}
        e.globalAlpha=opacity;e.globalCompositeOperation="difference";e.drawImage(source,0,0);
        async function svgPixels(svg){
          const image=new Image();image.src="data:image/svg+xml;base64,"+btoa(svg);await image.decode();
          const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
          const c=canvas.getContext("2d");c.drawImage(image,0,0,size,size);return c.getImageData(0,0,size,size).data;
        }
        const literal=`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" style="isolation:isolate">${background==="none"?"":`<rect width="200" height="200" fill="${background}"/>`}<rect x="60" y="40" width="80" height="120" fill="#f00000" stroke="#ffff00" stroke-width="${strokeWidth}" opacity="${opacity}" style="mix-blend-mode:difference"/></svg>`;
        records.push({background,opacity,strokeWidth,ratio,
          canvas:different(a.getImageData(0,0,size,size).data,e.getImageData(0,0,size,size).data),
          svg:different(await svgPixels(renderToSVG(program)),await svgPixels(literal))});
      }
      return records;
    });
    assert.equal(results.length,64);
    for(const result of results){assert.equal(result.canvas,0,JSON.stringify(result));assert.equal(result.svg,0,JSON.stringify(result));}
    assertNoBrowserErrors(errors,browserName);await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; } finally {await context.close();}

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

test(`${browserName} clips one Cartesian mark without moving its items or outside guides`, async()=>{
  try {
  const context=await browser.newContext();
  try{
    const {page,errors}=await openBrowserPage(context,server.baseUrl,{waitFor:()=>window.compatibility!==undefined});
    const record=await page.evaluate(async()=>{
      const {chart,render}=await import('/node_modules/ggaction/src/index.js');
      const {renderToSVG}=await import('/node_modules/ggaction/src/renderers/svg.js');
      const {clippingControl,clippingPrimitive,clippingFrame,clippingCenters}=await import('/clipping-fixture.js');
      const control=clippingControl(chart),actual=control.editPointMark({target:'scatterPlot',clip:true}),primitive=clippingPrimitive(chart,control);
      const output=[];
      for(const ratio of [1,2]){
        function canvasPixels(p){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');render(p,ctx,{pixelRatio:ratio});return ctx.getImageData(0,0,canvas.width,canvas.height).data;}
        const a=canvasPixels(actual),b=canvasPixels(primitive);
        output.push({ratio,canvasEqual:a.length===b.length&&a.every((v,i)=>v===b[i])});
      }
      async function svgPixels(p){
        const url=URL.createObjectURL(new Blob([renderToSVG(p)],{type:'image/svg+xml'}));
        try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,320,240).data;}finally{URL.revokeObjectURL(url);}
      }
      const a=await svgPixels(actual),b=await svgPixels(primitive),svg=renderToSVG(actual);
      return {output,svgEqual:a.length===b.length&&a.every((v,i)=>v===b[i]),frame:actual.graphicSpec.objects.scatterPlot.clip,
        centers:actual.graphicSpec.objects.scatterPlot.items.map(i=>[i.properties.x,i.properties.y]),expectedCenters:clippingCenters,
        clipCount:(svg.match(/clip-path=/g)||[]).length,expectedFrame:clippingFrame,
        disabledEqual:renderToSVG(actual.editPointMark({target:'scatterPlot',clip:false}))===renderToSVG(control)};
    });
    for(const result of record.output)assert.equal(result.canvasEqual,true,`DPR ${result.ratio}`);
    assert.equal(record.svgEqual,true);assert.equal(record.clipCount,1);assert.equal(record.disabledEqual,true);
    assert.deepEqual(record.frame,record.expectedFrame);assert.deepEqual(record.centers,record.expectedCenters);
    assertNoBrowserErrors(errors,'Cartesian mark clipping');await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }finally{await context.close();}

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});

test(`${browserName} preserves keyed selection and graphic-only scene identity after a saved revision`, async () => {
  const context = await browser.newContext();
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => window.compatibility !== undefined });
    const result = await page.evaluate(async () => {
      const { chart, render } = await import('/node_modules/ggaction/src/index.js');
      const { getMarkItems } = await import('/node_modules/ggaction/src/inspection.js');
      const { createTransitionScene } = await import('/node_modules/ggaction/src/scene.js');
      const { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } = await import('/node_modules/ggaction/src/persistence.js');
      const { renderToSVG } = await import('/node_modules/ggaction/src/renderers/svg.js');
      const before = chart().createCanvas({ width: 240, height: 180 }).createData({ id: 'rows', keyField: 'id', values: [
        { id: 'a', x: 1, y: 2 }, { id: 'b', x: 2, y: 4 }
      ] }).createScatterPlot({ id: 'points', x: 'x', y: 'y' })
        .highlightMarks({ id: 'picked', target: 'points', select: { rows: { data: 'rows', indices: [1] } }, fill: 'red' });
      const saved = serializeProgram(before);
      const after = deserializeProgram(saved).reviseData({ source: 'rows', id: 'next', values: [
        { id: 'b', x: 3, y: 9 }, { id: 'a', x: 1, y: 2 }
      ] });
      const keys = program => Object.fromEntries(getMarkItems(program, { target: 'points' }).map(item => [item.fields.id, item.key]).sort());
      const graphic = deserializeGraphic(serializeGraphic(after));
      const pixels = program => {
        const canvas = document.createElement('canvas');
        render(program, canvas.getContext('2d'));
        return canvas.toDataURL();
      };
      return {
        before: keys(before), after: keys(after), unchanged: saved === serializeProgram(before),
        selected: getMarkItems(after, { target: 'points' }).filter(item => item.properties.fill === 'red').map(item => item.fields.id),
        svg: renderToSVG(graphic) === renderToSVG(after), canvas: pixels(graphic) === pixels(after),
        scenes: ['svg', 'canvas'].map(format => JSON.stringify(createTransitionScene(graphic, { format })) === JSON.stringify(createTransitionScene(after, { format })))
      };
    });
    assert.deepEqual(result.after, result.before);
    assert.deepEqual(result.selected, ['b']);
    assert.equal(result.unchanged, true);
    assert.equal(result.svg, true); assert.equal(result.canvas, true);
    assert.deepEqual(result.scenes, [true, true]);
    assertNoBrowserErrors(errors, browserName);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});


test(`${browserName} keeps title and axis graphemes intact in installed Canvas and SVG`, async () => {
  const context = await browser.newContext();
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, {
      waitFor: () => window.compatibility !== undefined
    });
    const result = await page.evaluate(async () => {
      const { graphemeProgram, graphemes, labelLines, graphicLines } = await import("/grapheme-wrapping.js");
      const { render } = await import("/node_modules/ggaction/src/index.js");
      const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
      return ["word", "character"].map(mode => {
        const program = graphemeProgram(mode);
        const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
        const drawn = [], fillText = ctx.fillText.bind(ctx);
        ctx.fillText = (text, ...args) => { drawn.push(text); fillText(text, ...args); };
        render(program, ctx, { pixelRatio: 1 });
        const doc = new DOMParser().parseFromString(renderToSVG(program), "image/svg+xml");
        const texts = [...doc.querySelectorAll("text")].map(node => node.textContent);
        return { mode, title: graphicLines(program, "chartTitle"), labels: graphicLines(program, "xAxisLabels"),
          expectedTitle: graphemes, expectedLabels: labelLines,
          canvasCounts: graphemes.map(text => drawn.filter(actual => actual === text).length),
          svgCounts: graphemes.map(text => texts.filter(actual => actual === text).length),
          dimensions: [canvas.width, canvas.height] };
      });
    });
    const expected = ["e\u0301", "\u1112\u1161\u11ab", "👩🏽‍💻", "🇩🇰", "1️⃣"];
    for (const actual of result) {
      assert.deepEqual(actual.title, expected);
      assert.deepEqual(actual.labels, [expected[0], "", ...expected.slice(1)]);
      assert.deepEqual(actual.canvasCounts, [2, 2, 2, 2, 2]);
      assert.deepEqual(actual.svgCounts, [2, 2, 2, 2, 2]);
      assert.deepEqual(actual.dimensions, [700, 700]);
    }
    assertNoBrowserErrors(errors, "grapheme wrapping");
    await page.close();
  } catch (error) {
    await saveBrowserContextEvidence(context, error);
    throw error;
  } finally { await context.close(); }
});
