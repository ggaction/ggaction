import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) for (const kind of ["brush", "lasso", "angular"]) test(`real ${kind} capture previews and one commit share Canvas and SVG at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 800, height: 600 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async ({ ratio, kind }) => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js");
      document.body.innerHTML = '<canvas id="regionCanvas" aria-label="Region selection chart" style="touch-action:none"></canvas><div id="regionSvg" style="width:300px;height:200px;touch-action:none"></div><p id="status" role="status">Preparing</p>';
      const { createAngularSelectionChart } = await import("/examples/polar-points/program.js");
      const p = kind === "angular" ? createAngularSelectionChart([{ id:"a",angle:355,radius:1 },{ id:"b",angle:180,radius:1 }]) : chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
        .createPointMark({ id: "points" }).encodePointRadius({ value: 8 }).encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
        .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } }).selectMarks({ id: "picked", items: [] })
        .highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false });
      window.__regionEvents = [[], []]; window.__regionSessions = []; window.__regionSource = p;
      for (const [index, selector] of ["#regionCanvas", "#regionSvg"].entries()) {
        const host = document.querySelector(selector), session = createInteractionSession({ program: p, bindings: [{ type: kind === "angular" ? "brush" : kind, ...(kind === "angular" ? {axis:"theta"} : {}), target: "points", selection: "picked" }] });
        const draw = program => index === 0 ? render(program, host.getContext("2d"), { pixelRatio: ratio }) : host.innerHTML = renderToSVG(program);
        if (kind === "angular" && index === 1) host.style.width = host.style.height = "200px";
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
      const angularPoint = angle => ({ x: box.x + 100 + 80 * Math.sin(angle * Math.PI / 180), y: box.y + 100 - 80 * Math.cos(angle * Math.PI / 180) });
      const start = kind === "angular" ? angularPoint(350) : { x: box.x + 20, y: box.y + 20 };
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      if (kind === "angular") { const end = angularPoint(10); await page.mouse.move(end.x,end.y,{steps:20}); }
      else if (kind === "brush") await page.mouse.move(box.x + 100, box.y + 100, { steps: 20 });
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
      const cancelStart = kind === "angular" ? angularPoint(270) : { x: box.x + 150, y: box.y + 100 };
      await page.mouse.move(cancelStart.x, cancelStart.y); await page.mouse.down(); await page.mouse.move(box.x + 190, box.y + 120);
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

test("a browser brush publishes linked filtered views atomically for Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1000, height: 700 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, hconcat, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js"), { getMarkItems } = await import("/src/inspection.js");
      document.body.innerHTML = '<canvas id="filterCanvas" aria-label="Linked filter chart" style="touch-action:none"></canvas><div id="filterSvg" style="width:640px;height:200px;touch-action:none"></div><p id="status" role="status">Preparing</p>';
      const child = chart().createCanvas({ width: 300, height: 200, margin: 0 }).createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
        .createPointMark({ id: "points" }).encodePointRadius({ value: 8 }).encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
        .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } }).selectMarks({ id: "picked", items: [] });
      const program = hconcat({ programs: [{ id: "source", program: child }, { id: "target", program: child }] });
      const source = { childPath: ["source"], id: "points" }, target = { childPath: ["target"], id: "points" };
      window.__filterSessions = []; window.__filterEvents = [[], []]; window.__filterSource = program;
      window.__filterIds = program => getMarkItems(program.children.target, { target: "points" }).map(item => item.fields.id);
      for (const [index, id] of ["filterCanvas", "filterSvg"].entries()) {
        const host = document.getElementById(id), session = createInteractionSession({ program, bindings: [
          { type: "brush", target: source, selection: "picked" },
          { type: "linkFilter", id: "linked", target, selection: "picked", resolve: "global", sources: [{ target: source, selection: "picked", projection: { type: "rows", sourceData: "rows", targetData: "rows" } }] }
        ] });
        const draw = p => index === 0 ? render(p, host.getContext("2d"), { pixelRatio: 2 }) : host.innerHTML = renderToSVG(p);
        draw(program); host.tabIndex = 0; session.mount(host);
        session.subscribe(event => {
          if (!event.phase) return;
          window.__filterEvents[index].push({ phase: event.phase, revision: event.revision, baseline: event.previous === program,
            visible: window.__filterIds(event.state.previewProgram ?? event.current) });
          if (["preview", "commit", "cancel", "error"].includes(event.phase)) draw(event.state.previewProgram ?? event.current);
        });
        window.__filterSessions.push(session);
      }
      document.querySelector("#status").textContent = "Linked filters ready";
    });
    for (const [index, selector] of ["#filterCanvas", "#filterSvg"].entries()) {
      await page.locator(selector).focus();
      const box = await page.locator(selector).boundingBox();
      for (const cancel of [true, false]) {
        await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.mouse.move(box.x + 100, box.y + 100, { steps: 15 });
        await page.waitForFunction(index => window.__filterSessions[index].getState().previewProgram !== null, index);
        assert.deepEqual(await page.evaluate(index => window.__filterIds(window.__filterSessions[index].getState().previewProgram), index), ["a"]);
        assert.equal(await page.evaluate(index => window.__filterSessions[index].getState().program === window.__filterSource, index), true);
        if (cancel) await page.keyboard.press("Escape");
        await page.mouse.up();
      }
      const result = await page.evaluate(index => ({ ids: window.__filterIds(window.__filterSessions[index].getState().program), events: window.__filterEvents[index], revision: window.__filterSessions[index].getState().revision }), index);
      assert.deepEqual(result.ids, ["a"]); assert.equal(result.revision, 1);
      assert.equal(await page.evaluate(() => document.activeElement.id), selector.slice(1));
      assert.equal(result.events.filter(e => e.phase === "commit").length, 1); assert.equal(result.events.filter(e => e.phase === "cancel").length, 1);
      assert.deepEqual(result.events.filter(e => e.phase === "commit")[0].visible, ["a"]); assert.ok(result.events.every(e => e.baseline));
    }
    await page.evaluate(() => window.__filterSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, "linked filter interaction"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
