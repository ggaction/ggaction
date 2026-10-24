import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, saveBrowserEvidence,
  closeBrowserWithEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Browser Canvas and SVG keep a subtitle-only ten-pixel line interval", async () => {
  await mkdir(path.join(root, ".artifacts"), { recursive: true });
  const directory = await mkdtemp(path.join(root, ".artifacts/subtitle-spacing-"));
  let server, browser;
  try {
    await writeFile(path.join(directory, "index.html"), '<!doctype html><canvas aria-label="Independent subtitle spacing"></canvas><div id="svg"></div><p id="status">Ready</p>');
    server = await startStaticServer(root);
    browser = await chromium.launch({ headless: true });
    const opened = await openBrowserPage(browser,
      server.baseUrl + path.relative(root, directory) + "/", {
        waitFor: () => document.querySelector("#status")?.textContent === "Ready"
      });
    const result = await opened.page.evaluate(async () => {
      const { chart, render } = await import("/src/index.js");
      const { renderToSVG } = await import("/src/renderers/svg.js");
      const p = chart().createCanvas({ width: 360, height: 240,
        margin: { top: 80, right: 50, bottom: 30, left: 50 } })
        .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
        .createScatterPlot({ x: "x", y: "y", guides: false })
        .createTitle({ text: "Main heading", subtitle: "First credit\nSecond credit",
          titleStyle: { fontSize: 13 }, subtitleStyle: { fontSize: 8 },
          subtitleLineHeight: 10 });
      const canvas = document.querySelector("canvas"), context = canvas.getContext("2d");
      const original = context.fillText, painted = [];
      context.fillText = function (text, x, y, ...rest) {
        if (text.endsWith("credit")) {
          const point = new DOMPoint(x, y).matrixTransform(this.getTransform());
          painted.push({ text, x: point.x, y: point.y, font: this.font });
        }
        return original.call(this, text, x, y, ...rest);
      };
      render(p, context, { pixelRatio: 1 });
      context.fillText = original;
      document.querySelector("#svg").innerHTML = renderToSVG(p);
      await document.fonts.ready;
      const glyphs = [...document.querySelectorAll("#svg text")]
        .filter(node => node.textContent.endsWith("credit")).map(node => {
          const point = new DOMPoint(+node.getAttribute("x"), +node.getAttribute("y"))
            .matrixTransform(node.getCTM());
          return { text: node.textContent, x: point.x, y: point.y };
        });
      return { painted, glyphs, concrete: p.graphicSpec.objects.chartSubtitle.items.map(i => i.properties) };
    });
    assert.equal(result.painted.length, 2);
    assert.equal(result.glyphs.length, 2);
    for (const rows of [result.painted, result.glyphs, result.concrete]) {
      assert(Math.abs(rows[1].y - rows[0].y - 10) <= 0.0001);
    }
    for (const [i, row] of result.painted.entries()) {
      assert(Math.abs(row.y - result.concrete[i].y) <= 0.0001);
      assert.match(row.font, /8px/);
    }
    assertNoBrowserErrors(opened.errors, "independent subtitle spacing");
    await opened.page.close();
  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
  finally {
    await closeBrowserWithEvidence(browser);
    await server?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
