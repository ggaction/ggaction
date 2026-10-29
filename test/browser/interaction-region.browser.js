import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url))); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) for (const kind of ["brush", "lasso"]) test(`real ${kind} capture previews and one commit share Canvas and SVG at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 800, height: 600 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async ({ ratio, kind }) => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js");
      document.body.innerHTML = '<canvas id="regionCanvas" aria-label="Region selection chart" style="touch-action:none"></canvas><div id="regionSvg" style="width:300px;height:200px;touch-action:none"></div><p id="status" role="status">Preparing</p>';
      const p = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
        .createPointMark({ id: "points" }).encodePointRadius({ value: 8 }).encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
        .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } }).selectMarks({ id: "picked", items: [] })
        .highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false });
      window.__regionEvents = [[], []]; window.__regionSessions = []; window.__regionSource = p;
      for (const [index, selector] of ["#regionCanvas", "#regionSvg"].entries()) {
        const host = document.querySelector(selector), session = createInteractionSession({ program: p, bindings: [{ type: kind, target: "points", selection: "picked" }] });
        const draw = program => index === 0 ? render(program, host.getContext("2d"), { pixelRatio: ratio }) : host.innerHTML = renderToSVG(program);
        draw(p); session.mount(host);
        session.subscribe(event => {
          if (!event.phase) return;
          window.__regionEvents[index].push({ phase: event.phase, revision: event.revision, baseline: event.previous === p, current: event.current === p });
          if (["preview", "commit", "cancel", "error"].includes(event.phase)) draw(event.state.previewProgram ?? event.current);
        });
        window.__regionSessions.push(session);
      }
      document.querySelector("#status").textContent = "Region selection ready";
    }, { ratio, kind });
    for (const [index, selector] of ["#regionCanvas", "#regionSvg"].entries()) {
      const box = await page.locator(selector).boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
      if (kind === "brush") await page.mouse.move(box.x + 100, box.y + 100, { steps: 20 });
      else { await page.mouse.move(box.x + 100, box.y + 20); await page.mouse.move(box.x + 100, box.y + 100); await page.mouse.move(box.x + 20, box.y + 100); }
      await page.waitForFunction(index => window.__regionSessions[index].getState().previewProgram !== null, index);
      assert.equal(await page.evaluate(index => window.__regionSessions[index].getState().program === window.__regionSource, index), true);
      assert.equal(await page.evaluate(index => window.__regionSessions[index].getState().revision, index), 0);
      if (index === 1) assert.ok(await page.locator("#regionSvg svg path").count() > 0);
      await page.mouse.up();
      assert.deepEqual(await page.evaluate(async index => {
        const { getMarkItems } = await import("/src/inspection.js");
        return getMarkItems(window.__regionSessions[index].getState().program, { target: "points" }).filter(item => item.properties.fill === "red").map(item => item.fields.id);
      }, index), ["a"]);
      const events = await page.evaluate(index => window.__regionEvents[index], index);
      assert.ok(events.some(event => event.phase === "preview")); assert.equal(events.filter(event => event.phase === "commit").length, 1);
      assert.equal(events.filter(event => event.phase === "settled").length, 1); assert.ok(events.every(event => event.baseline));
      assert.equal(await page.evaluate(index => window.__regionSessions[index].getState().previewProgram, index), null);
      const before = await page.evaluate(index => window.__regionSessions[index].getState().revision, index);
      await page.mouse.move(box.x + 150, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 250, box.y + 180);
      await page.keyboard.press("Escape"); await page.mouse.up();
      assert.equal(await page.evaluate(index => window.__regionSessions[index].getState().revision, index), before);
      assert.equal(await page.evaluate(index => window.__regionEvents[index].at(-1).phase, index), "cancel");
      assert.equal(await page.evaluate(index => window.__regionSessions[index].getState().previewProgram, index), null);
    }
    await page.evaluate(() => window.__regionSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, "region interaction"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
