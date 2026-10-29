import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium, firefox, webkit } from "playwright";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { openBrowserPage, assertNoBrowserErrors, saveBrowserContextEvidence, closeBrowserWithEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

const name = process.env.GGACTION_BROWSER ?? "chromium", engines = { chromium, firefox, webkit };
assert.ok(Object.hasOwn(engines, name));
let browser, consumer, server;
test.before(async () => {
  consumer = await preparePackageConsumer();
  await writeFile(path.join(consumer.directory, "index.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Facet axis gaps</title></head><body><p id="status" role="status">Ready</p></body></html>');
  server = await startStaticServer(consumer.directory, { dependencies: "installed" });
  browser = await engines[name].launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); await consumer?.cleanup(); });

for (const ratio of [1, 2]) {
  test(`${name} preserves exact scalar and equal-pair SVG and PNG in both browser backends at DPR ${ratio}`, async () => {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const { page, errors } = await openBrowserPage(context, server.baseUrl);
      const result = await page.evaluate(async ratio => {
        const { chart, render } = await import("/node_modules/ggaction/src/index.js");
        const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
        const source = chart().createCanvas({ plot: { width: 100, height: 80 }, margin: 60 })
          .createData({ values: ["A", "B", "C", "D"].flatMap(panel => [{ panel, x: 0, y: 0 }, { panel, x: 2, y: 3 }]) })
          .createScatterPlot({ x: "x", y: "y", guides: false }).createAxes({ x: { title: false }, y: { title: false } });
        const records = [];
        for (const spacing of ["canvas", "plot", "content"]) {
          const options = { field: "panel", columns: 2, spacing };
          const programs = [source.facet({ ...options, gap: 82 }), source.facet({ ...options, gap: { x: 82, y: 82 } })];
          const svgs = programs.map(program => renderToSVG(program));
          for (const backend of ["Canvas", "SVG"]) {
            const rendered = [];
            for (let i = 0; i < programs.length; i++) {
              const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
              canvas.setAttribute("aria-label", "Four panels with equal axis gaps");
              const { width, height } = programs[i].graphicSpec.objects.canvas.properties;
              if (backend === "Canvas") render(programs[i], ctx, { pixelRatio: ratio });
              else {
                canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
                const url = URL.createObjectURL(new Blob([svgs[i]], { type: "image/svg+xml" }));
                try { const image = new Image(); image.src = url; await image.decode(); ctx.scale(ratio, ratio); ctx.drawImage(image, 0, 0); }
                finally { URL.revokeObjectURL(url); }
              }
              const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              rendered.push({ png: canvas.toDataURL("image/png"), pixels, width, height, physical: [canvas.width, canvas.height] });
            }
            let differences = 0, ink = 0;
            for (let i = 0; i < rendered[0].pixels.length; i++) {
              if (rendered[0].pixels[i] !== rendered[1].pixels[i]) differences++;
              if (i % 4 !== 3 && rendered[0].pixels[i] !== 255) ink++;
            }
            records.push({ spacing, backend, sameSvg: svgs[0] === svgs[1], samePng: rendered[0].png === rendered[1].png,
              sameLength: rendered[0].pixels.length === rendered[1].pixels.length, differences, ink,
              correctPhysical: rendered.every(item => item.physical[0] === Math.max(1, Math.round(item.width * ratio)) &&
                item.physical[1] === Math.max(1, Math.round(item.height * ratio))) });
          }
        }
        return records;
      }, ratio);
      assert.equal(result.length, 6);
      for (const record of result) {
        assert.equal(record.sameSvg, true, `${record.spacing} ${record.backend}`);
        assert.equal(record.samePng, true, `${record.spacing} ${record.backend}`);
        assert.equal(record.sameLength, true);
        assert.equal(record.differences, 0);
        assert.equal(record.correctPhysical, true);
        assert.ok(record.ink > 0);
      }
      assert.equal(await page.locator("#status").textContent(), "Ready");
      assertNoBrowserErrors(errors, name);
      await page.close();
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
    finally { await context.close(); }
  });

  test(`${name} fits asymmetric plot tracks, headers and outer guides inside the logical frame at DPR ${ratio}`, async () => {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const { page, errors } = await openBrowserPage(context, server.baseUrl);
      const result = await page.evaluate(async ratio => {
        const { chart, render } = await import("/node_modules/ggaction/src/index.js");
        const { renderToSVG } = await import("/node_modules/ggaction/src/renderers/svg.js");
        const { serializeProgram, deserializeProgram } = await import("/node_modules/ggaction/src/persistence.js");
        const { resolveFacetProgramLayout } = await import("/node_modules/ggaction/src/materialization/facets.js");
        const program = chart().createCanvas({ plot: { width: 100, height: 80 }, margin: 60 })
          .createData({ values: ["A", "B", "C", "D"].flatMap(panel => [{ panel, x: 0, y: 0 }, { panel, x: 2, y: 3 }]) })
          .createScatterPlot({ x: { field: "x", scale: { domain: [0, 2] } }, y: { field: "y", scale: { domain: [0, 3] } }, guides: false })
          .createAxes({ x: { title: false, ticksAndLabels: { values: [0, 2] } }, y: { title: false, ticksAndLabels: { values: [0, 3] } } })
          .facet({ field: "panel", columns: 2, spacing: "plot", topLane: "shared", gap: { x: 82, y: 47 },
            guides: { axes: { x: "outer", y: "each" }, legend: false } });
        const { layout, plots } = resolveFacetProgramLayout(program);
        const regions = layout.children.map((child, i) => ({ left: child.x + plots[i].x, top: child.y + plots[i].y,
          right: child.x + plots[i].x + plots[i].width, bottom: child.y + plots[i].y + plots[i].height }));
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-label", "Four panels with independent horizontal and vertical gaps");
        render(program, canvas.getContext("2d"), { pixelRatio: ratio });
        document.body.append(canvas);
        const host = document.createElement("div"); host.innerHTML = renderToSVG(program); document.body.append(host);
        await document.fonts.ready;
        const svg = host.querySelector("svg"), root = svg.getBoundingClientRect();
        const texts = [...svg.querySelectorAll("text")].filter(node => node.textContent.trim()).map(node => {
          const rect = node.getBoundingClientRect();
          return { text: node.textContent, left: rect.left - root.left, right: rect.right - root.left,
            top: rect.top - root.top, bottom: rect.bottom - root.top };
        });
        const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const labels = texts.filter(text => !["A", "B", "C", "D"].includes(text.text));
        const headerAnchors = program.graphicSpec.objects["facet-headers"].items.map(item => [item.properties.x, item.properties.y]);
        return { origins: regions.map(region => [region.left, region.top]), frame: [root.width, root.height],
          physical: [canvas.width, canvas.height], labelCount: labels.length, headerAnchors,
          textCount: texts.length, positiveBounds: texts.every(text => text.right > text.left && text.bottom > text.top),
          allInside: texts.every(text => text.left >= 0 && text.top >= 0 && text.right <= root.width && text.bottom <= root.height),
          noPlotIntrusion: texts.every(text => regions.every(region => !intersects(text, region))),
          labelOverlap: labels.some((text, i) => labels.slice(i + 1).some(other => intersects(text, other))),
          restoredSvg: renderToSVG(deserializeProgram(serializeProgram(program))) === renderToSVG(program) };
      }, ratio);
      assert.deepEqual(result.origins, [[60, 60], [242, 60], [60, 187], [242, 187]]);
      assert.deepEqual(result.frame, [402, 327]);
      assert.deepEqual(result.physical, [402 * ratio, 327 * ratio]);
      assert.deepEqual(result.headerAnchors, [[110, 44], [292, 44], [110, 171], [292, 171]]);
      assert.equal(result.labelCount, 12);
      assert.equal(result.textCount, 16);
      assert.equal(result.positiveBounds, true);
      assert.equal(result.allInside, true);
      assert.equal(result.noPlotIntrusion, true);
      assert.equal(result.labelOverlap, false);
      assert.equal(result.restoredSvg, true);
      assert.equal(await page.locator("canvas").getAttribute("aria-label"), "Four panels with independent horizontal and vertical gaps");
      assert.equal(await page.locator("#status").textContent(), "Ready");
      assertNoBrowserErrors(errors, name);
      await page.close();
    } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
    finally { await context.close(); }
  });
}
