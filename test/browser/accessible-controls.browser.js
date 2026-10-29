import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { documentationPrograms } from "../../scripts/doc-snippets.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser, server, snippets;
test.before(async () => {
  server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" });
  browser = await chromium.launch({ headless: true });
  snippets = await documentationPrograms();
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

async function host(id, sessionName, disposeName, run) {
  const example = snippets.find(example => example.id === id);
  assert.ok(example, id);
  const context = await browser.newContext({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2, hasTouch: true });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async ({ example, sessionName, disposeName }) => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<main><h1>Chart controls</h1>' + (example.html ?? '<canvas id="chart" aria-label="Editable chart"></canvas>') + '<div id="vector" aria-hidden="true"></div></main>';
      let source = example.code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/interaction", "interaction"], ["ggaction/inspection", "inspection"], ["ggaction/accessibility", "accessibility"]]) {
        source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      }
      const url = URL.createObjectURL(new Blob([source + `\nwindow.__controls=${sessionName};window.__disposeControls=${disposeName};`], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js");
      window.__controlEvents = [];
      const draw = () => { document.querySelector("#vector").innerHTML = renderToSVG(window.__controls.getState().program); };
      window.__controls.subscribe(event => { if (event.phase) window.__controlEvents.push([event.type, event.phase]); if (event.phase === "commit") draw(); });
      draw();
    }, { example, sessionName, disposeName });
    await run(page);
    assert.deepEqual((await new AxeBuilder({ page }).include("main").analyze()).violations, []);
    await page.evaluate(() => window.__disposeControls());
    assert.equal(await page.evaluate(() => window.__controls.getState().destroyed), true);
    assertNoBrowserErrors(errors, id);
    await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
}

async function activate(page, id, input, index = 0) {
  const button = page.locator(`#${id}`);
  if (input === "touch") await button.tap();
  else { await button.focus(); await page.keyboard.press(index % 2 ? "Space" : "Enter"); }
  assert.equal(await page.evaluate(() => document.activeElement.id), id);
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const { exportAccessibleData } = await import("/src/accessibility.js");
    const state = window.__controls.getState();
    return { items: exportAccessibleData(state.program, { format: "items", target: "bars" }).views[0].items.map(item => [item.fields.category, item.fields.value, item.selectedBy]),
      order: state.program.resolvedScales.x.domain, history: state.history.undoCount };
  });
}
for (const input of ["keyboard", "touch"]) test(`native category and history controls support ${input} with matching visible and selected descriptions`, async () => {
  await host("interaction-native-controls", "controlSession", "disposeNativeControls", async page => {
    if (input === "keyboard") {
      await page.evaluate(() => { const button = document.createElement("button"); button.id = "after-controls"; button.textContent = "After chart"; document.querySelector("main").append(button); });
      for (const id of ["choose-a", "choose-b", "clear-picked", "hide-a", "show-a", "hide-b", "show-b", "only-b", "clear-filter", "reverse-categories", "clear-order", "reset-control", "after-controls"]) {
        await page.keyboard.press("Tab"); assert.equal(await page.evaluate(() => document.activeElement.id), id);
      }
    }
    let index = 0;
    const press = id => activate(page, id, input, index++);
    assert.deepEqual(await snapshot(page), { items: [["A", 2, []], ["B", 5, []]], order: ["A", "B"], history: 0 });
    assert.equal(await page.locator("#undo-control").isDisabled(), true);
    await press("choose-a");
    assert.equal(await page.locator("#control-summary").textContent(), "A: 2, selected; B: 5");
    await press("hide-a");
    assert.deepEqual((await snapshot(page)).items, [["B", 5, []]]);
    assert.equal(await page.locator("#choose-a").isDisabled(), true);
    await press("only-b");
    await press("show-a"); // Visibility does not remove the independently owned native filter.
    assert.deepEqual((await snapshot(page)).items, [["B", 5, []]]);
    await press("clear-filter");
    assert.deepEqual((await snapshot(page)).items, [["A", 2, ["picked"]], ["B", 5, []]]);
    await press("reverse-categories");
    assert.deepEqual((await snapshot(page)).order, ["B", "A"]);
    await press("undo-control"); assert.deepEqual((await snapshot(page)).order, ["A", "B"]);
    await press("redo-control"); assert.deepEqual((await snapshot(page)).order, ["B", "A"]);
    await press("clear-order"); assert.deepEqual((await snapshot(page)).order, ["A", "B"]);
    await press("clear-picked"); assert.deepEqual((await snapshot(page)).items, [["A", 2, []], ["B", 5, []]]);
    await press("choose-a"); await press("reset-control");
    assert.deepEqual((await snapshot(page)).items, [["A", 2, []], ["B", 5, []]]);
    await press("choose-b"); await press("hide-b");
    assert.deepEqual((await snapshot(page)).items, [["A", 2, []]]);
    await press("show-b"); assert.deepEqual((await snapshot(page)).items, [["A", 2, []], ["B", 5, ["picked"]]]);
    const events = await page.evaluate(() => window.__controlEvents);
    assert.deepEqual(events, ["select", "setVisibility", "filter", "setVisibility", "filter", "reorder", "undo", "redo", "reorder", "clearSelection", "select", "reset", "select", "setVisibility", "setVisibility"].flatMap(type => [[type, "commit"], [type, "settled"]]));
    assert.equal(await page.locator("#vector svg").count(), 1);
    assert.equal(await page.locator("canvas").evaluate(canvas => [...canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data].some((value, i, rgba) => i % 4 !== 3 && value < 150 && rgba[i - i % 4 + 3] > 0)), true);
  });
});

for (const input of ["keyboard", "touch"]) test(`native parameter and context action controls support ${input} without hover`, async () => {
  await host("interaction-parameter-context", "parameterSession", "disposeControls", async page => {
    const range = page.getByRole("slider", { name: "Multiplier" });
    if (input === "keyboard") { await range.focus(); await page.keyboard.press("ArrowRight"); }
    else { const box = await range.boundingBox(); await page.touchscreen.tap(box.x + box.width - 4, box.y + box.height / 2); }
    const multiplier = input === "keyboard" ? 2 : 4;
    assert.equal(await range.inputValue(), String(multiplier));
    assert.deepEqual(await page.evaluate(async () => { const { getMarkItems } = await import("/src/inspection.js"); return getMarkItems(window.__controls.getState().program, { target: "points" }).map(item => item.fields.height); }), [3 * multiplier, 6 * multiplier]);
    const open = page.locator("#open-context");
    if (input === "keyboard") { await open.focus(); await page.keyboard.press("Enter"); } else await open.tap();
    assert.equal(await page.evaluate(() => document.activeElement.id), "select-context");
    assert.equal(await page.locator("#select-context").isVisible(), true);
    if (input === "keyboard") await page.keyboard.press("Space"); else await page.locator("#select-context").tap();
    assert.equal(await page.evaluate(() => document.activeElement.id), "multiplier");
    assert.deepEqual(await page.evaluate(async () => {
      const { exportAccessibleData } = await import("/src/accessibility.js");
      return exportAccessibleData(window.__controls.getState().program, { format: "items", target: "points" }).views[0].items.filter(item => item.selectedBy.includes("chosen")).map(item => item.fields.id);
    }), ["a"]);
    assert.deepEqual(await page.evaluate(() => window.__controlEvents), [["setParameter", "commit"], ["setParameter", "settled"], ["select", "commit"], ["select", "settled"]]);
  });
});

test("partition host buttons offer actual touch focus and root restoration", async () => {
  await host("interaction-hierarchy-focus", "focusSession", "disposeFocus", async page => {
    await activate(page, "focus-a", "touch"); assert.equal(await page.locator("output").textContent(), "root / A");
    await activate(page, "focus-root", "touch"); assert.equal(await page.locator("output").textContent(), "root");
    assert.deepEqual(await page.evaluate(() => window.__controlEvents), [["focusHierarchy", "commit"], ["focusHierarchy", "settled"], ["focusHierarchy", "commit"], ["focusHierarchy", "settled"]]);
  });
});
test("projection host buttons offer actual touch pan zoom and explicit reset", async () => {
  await host("interaction-viewport", "viewportSession", "disposeViewport", async page => {
    await activate(page, "map-right", "touch"); assert.equal(await page.locator("output").textContent(), "Scale 1; translation 20, 0");
    await activate(page, "map-zoom", "touch"); assert.equal(await page.locator("output").textContent(), "Scale 2; translation -40, -70");
    await activate(page, "map-home", "touch"); assert.equal(await page.locator("output").textContent(), "Scale 1; translation 0, 0");
    assert.deepEqual(await page.evaluate(() => window.__controlEvents), Array.from({ length: 3 }, () => [["setViewport", "commit"], ["setViewport", "settled"]]).flat());
  });
});

test("each native graph node has a keyboard and touch button alternative to dragging", async () => {
  await host("interaction-node-movement", "nodeSession", "disposeNodeControls", async page => {
    await activate(page, "node-second-right", "keyboard");
    assert.equal(await page.locator("#node-second-right").textContent(), "Move second node right (230, 160)");
    await activate(page, "node-second-right", "touch");
    assert.equal(await page.locator("#node-second-right").textContent(), "Move second node right (250, 160)");
    assert.deepEqual(await page.evaluate(() => window.__controlEvents), [["moveNode", "commit"], ["moveNode", "settled"], ["moveNode", "commit"], ["moveNode", "settled"]]);
  });
});
