import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url))); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const ratio of [1, 2, 3]) test(`real Canvas and SVG pointer events share CSS targets at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status")?.textContent === "Canvas and SVG inspection ready" });
    const hits = [];
    for (const [index, selector] of ["#chart", "#vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox();
      await page.mouse.move(box.x + 126, box.y + 182);
      const result = await page.evaluate(index => window.__inspectionSessions[index].getState().hit, index);
      assert.equal(result.candidates.length, 2); assert.equal(result.target.ownerId, "observations");
      assert.deepEqual(result.target.screenPoint, { x: 126, y: 182 }); assert.deepEqual(result.target.localPoint, { x: 126, y: 182 });
      hits.push(result.candidates.map(candidate => candidate.itemKey));
      await page.mouse.click(box.x + 294, box.y + 118);
      assert.equal(await page.evaluate(index => window.__inspectionSessions[index].getState().hit.candidates.length, index), 1);
      await page.mouse.move(box.x + 30, box.y + 270);
      assert.equal(await page.evaluate(index => window.__inspectionSessions[index].getState().hit.target, index), null);
    }
    assert.deepEqual(hits[0], hits[1]);
    const before = await page.evaluate(() => window.__inspectionSessions[0].getState().frameVersion);
    await page.evaluate(async () => {
      const session = window.__inspectionSessions[0], state = session.getState(), scene = structuredClone(state.scene);
      for (const node of scene.nodes) if (node.type === "circle") node.properties.x += 25;
      session.dispatch({ type: "frame", scene, version: state.frameVersion + 1, generation: state.generation });
      const { renderTransitionScene } = await import("/src/scene.js");
      renderTransitionScene(session.getState().scene, document.querySelector("#chart").getContext("2d"), { pixelRatio: window.devicePixelRatio });
    });
    const box = await page.locator("#chart").boundingBox();
    await page.mouse.move(box.x + 126, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.target), null);
    await page.mouse.move(box.x + 151, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.candidates.length), 2);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.frameVersion), before + 1);
    await page.evaluate(() => window.__inspectionSessions.forEach(session => session.destroy()));
    await page.mouse.click(box.x + 151, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit), null);
    assertNoBrowserErrors(errors, "interaction session"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
