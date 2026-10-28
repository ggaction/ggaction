import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
import { patternInk } from "../oracles/patterns.js";
import { radialOffset } from "../oracles/radial-gradient.js";
import { variants } from "../../examples/structured-paints/data.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
function samples(variant) {
  if (variant.fill.type === "pattern") {
    const result = [];
    for (let y = 31; y < 155; y += 7) for (let x = 31; x < 235; x += 7) {
      const coverage = [0, .5, 1].flatMap(dx => [0, .5, 1].map(dy =>
        patternInk(variant.fill.style, (x + dx - 23) / 16, (y + dy - 25) / 16, 3 / 16)));
      if (coverage.every(value => value === coverage[0])) result.push({ x, y,
        expected: coverage[0] ? [133, 164, 234, 255] : [253, 235, 204, 255] });
    }
    return result;
  }
  const colors = variant.id === "radial-ellipse" ? [[37, 99, 235, .8], [245, 158, 11, .3]]
    : [[37, 99, 235, 1], [96, 165, 250, 1], [245, 158, 11, 1], [254, 243, 199, 1]];
  return [[130, 90], [90, 90], [170, 90], [130, 45], [130, 135], [235, 90]].map(([x, y]) => {
    const t = Math.max(0, Math.min(1, radialOffset(variant.fill, { x: (x + .5 - 20) / 220, y: (y + .5 - 20) / 140 })));
    let left = 0, right = colors.length - 1;
    for (let i = 0; i < colors.length; i++) if (variant.fill.stops[i].offset <= t) left = i;
    for (let i = 0; i < colors.length; i++) if (variant.fill.stops[i].offset > t) { right = i; break; }
    const span = variant.fill.stops[right].offset - variant.fill.stops[left].offset;
    const ratio = span === 0 ? 1 : (t - variant.fill.stops[left].offset) / span;
    const alpha = (colors[left][3] + (colors[right][3] - colors[left][3]) * ratio) * .7;
    return { x, y, expected: [...colors[left].slice(0, 3).map((c, i) => Math.round(
      (c + (colors[right][i] - c) * ratio) * alpha + 255 * (1 - alpha))), 255] };
  });
}

test("public structured fills match independent samples in Browser Canvas and SVG", async () => {
  let server, browser;
  try {
    server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}examples/structured-paints/`, {
      waitFor: () => document.querySelector("#status").textContent !== "Loading"
    });
    const inputs = variants.map(variant => ({ id: variant.id, samples: samples(variant) }));
    const result = await opened.page.evaluate(async inputs => {
      const { createStructuredPaintExample } = await import("/examples/structured-paints/program.js");
      const { variants } = await import("/examples/structured-paints/data.js");
      const { render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const results = [];
      for (const input of inputs) {
        const program = createStructuredPaintExample(variants.find(variant => variant.id === input.id));
        const canvas = document.createElement("canvas"), context = canvas.getContext("2d"); render(program, context);
        const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(program))}`; await image.decode();
        const svg = document.createElement("canvas"); svg.width = canvas.width; svg.height = canvas.height;
        const svgContext = svg.getContext("2d"); svgContext.drawImage(image, 0, 0);
        results.push({ id: input.id, canvas: input.samples.map(s => [...context.getImageData(s.x, s.y, 1, 1).data]),
          svg: input.samples.map(s => [...svgContext.getImageData(s.x, s.y, 1, 1).data]) });
      }
      return results;
    }, inputs);
    for (const [index, variant] of result.entries()) for (const backend of ["canvas", "svg"]) {
      assert.ok(inputs[index].samples.length >= 6);
      for (const [i, actual] of variant[backend].entries()) assert.ok(actual.every((value, channel) =>
        Math.abs(value - inputs[index].samples[i].expected[channel]) <= 3),
      JSON.stringify({ variant: variant.id, backend, sample: inputs[index].samples[i], actual }));
    }
    assertNoBrowserErrors(opened.errors, "structured paints"); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});

test("Browser structured Text paints retain rotated multiline glyph alpha", async () => {
  let server, browser;
  try {
    server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}examples/structured-paints/`, {
      waitFor: () => document.querySelector("#status").textContent !== "Loading"
    });
    const results = await opened.page.evaluate(async () => {
      const { chart, render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const { variants } = await import("/examples/structured-paints/data.js");
      const results = [];
      async function pixels(program, backend) {
        const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
        if (backend === "canvas") render(program, context);
        else {
          canvas.width = 260; canvas.height = 180;
          const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(program))}`;
          await image.decode(); context.drawImage(image, 0, 0);
        }
        return context.getImageData(0, 0, 260, 180).data;
      }
      for (const id of ["cross", "radial-ellipse"]) {
        const fill = variants.find(v => v.id === id).fill;
        const program = chart().createCanvas({ width: 260, height: 180, margin: 30 }).createData({ values: [{ x: 1, y: 1 }] })
          .createTextMark({ fill, fontSize: 28, align: "center", rotation: { value: 20, unit: "degrees" } })
          .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "AB\nCD" });
        for (const backend of ["canvas", "svg"]) {
          const actual = await pixels(program, backend), plain = await pixels(program.editTextMark({ fill: "black" }), backend);
          let whitespace = 0, interior = 0, painted = 0, spill = 0;
          for (let i = 0; i < actual.length; i += 4) {
            if (plain[i] === 255 && plain[i + 1] === 255 && plain[i + 2] === 255) {
              whitespace++; if (actual[i] !== 255 || actual[i + 1] !== 255 || actual[i + 2] !== 255) spill++;
            } else if (plain[i] === 0 && plain[i + 1] === 0 && plain[i + 2] === 0) {
              interior++; if (actual[i] < 250 || actual[i + 1] < 250 || actual[i + 2] < 250) painted++;
            }
          }
          results.push({ id, backend, whitespace, interior, painted, spill });
        }
      }
      return results;
    });
    for (const result of results) {
      assert.ok(result.whitespace > 40000, JSON.stringify(result));
      assert.ok(result.interior > 100, JSON.stringify(result));
      assert.equal(result.painted, result.interior, JSON.stringify(result));
      assert.equal(result.spill, 0, JSON.stringify(result));
    }
    assertNoBrowserErrors(opened.errors, "structured Text"); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});

test("Text pattern phase stays periodic beyond estimated glyph bounds", async () => {
  let server, browser;
  try {
    server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser, `${server.baseUrl}examples/structured-paints/`, {
      waitFor: () => document.querySelector("#status").textContent !== "Loading"
    });
    const results = await opened.page.evaluate(async () => {
      const { chart, render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const fill = { type: "pattern", style: "cross", pitch: 16, strokeWidth: 4, phase: [3, 5], foreground: "blue", background: "orange" };
      const p = chart().createCanvas({ width: 360, height: 200, margin: 30 }).createData({ values: [{ x: 1, y: 1 }] })
        .createTextMark({ fill, fontSize: 50, align: "left", fontFamily: "Arial" })
        .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "WW" });
      async function pixels(program, backend) {
        const canvas = document.createElement("canvas"), context = canvas.getContext("2d");
        if (backend === "canvas") render(program, context);
        else {
          canvas.width = 360; canvas.height = 200;
          const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(program))}`;
          await image.decode(); context.drawImage(image, 0, 0);
        }
        return context.getImageData(0, 0, 360, 200).data;
      }
      const results = [];
      for (const backend of ["canvas", "svg"]) {
        const actual = await pixels(p, backend), plain = await pixels(p.editTextMark({ fill: "black" }), backend), samples = [];
        for (let y = 0; y < 200; y++) for (let x = 0; x < 360; x++) {
          const i = (y * 360 + x) * 4;
          if (plain[i] === 0 && plain[i + 1] === 0 && plain[i + 2] === 0) samples.push({ x, y, actual: [...actual.slice(i, i + 4)] });
        }
        results.push({ backend, properties: p.graphicSpec.objects.text.items[0].properties, samples });
      }
      return results;
    });
    for (const result of results) {
      const { origin, pitch, strokeWidth } = result.properties.fill; let checked = 0, outside = 0;
      for (const sample of result.samples) {
        const footprint = [0, .5, 1].flatMap(dx => [0, .5, 1].map(dy => patternInk("cross",
          (sample.x + dx - origin.x) / pitch, (sample.y + dy - origin.y) / pitch, strokeWidth / pitch)));
        if (!footprint.every(value => value === footprint[0])) continue;
        const expected = footprint[0] ? [0, 0, 255, 255] : [255, 165, 0, 255];
        assert.ok(sample.actual.every((value, i) => Math.abs(value - expected[i]) <= 1), JSON.stringify({ backend: result.backend, sample, expected }));
        checked++; if (sample.x > result.properties.fillBounds.right) outside++;
      }
      assert.ok(checked > 100); assert.ok(outside > 10, "actual glyph overhang is exercised");
    }
    assertNoBrowserErrors(opened.errors, "Text pattern overhang"); await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally { await closeBrowserWithEvidence(browser); await server?.close(); }
});
