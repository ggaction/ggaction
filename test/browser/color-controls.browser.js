import { saveBrowserEvidence } from "../support/browser.js";
import { saveBrowserPageEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createColorControls } from "../../examples/color-controls/program.js";
import { createWhitePointComparison } from "../../examples/color-white-point/program.js";
import { assertNoBrowserErrors, closeBrowserWithEvidence, openBrowserPage } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

let browser;
let server;
test.before(async () => {
  server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" });
  browser = await chromium.launch({headless:true});
});
test.after(async () => {
  await closeBrowserWithEvidence(browser);
  await server?.close();
});
for (const [id, factory, name, count] of [
  ["color-controls",createColorControls,"createColorControls",27],
  ["color-white-point",createWhitePointComparison,"createWhitePointComparison",18]
]) {
  test(`${id} browser-safe SVG preserves every concrete rectangle and fill`, async () => {
  try {
    const {page,errors} = await openBrowserPage(browser,new URL(`examples/${id}/`,server.baseUrl).href,{
      waitFor: () => { const text=document.querySelector("#status")?.textContent??""; return text.length>0&&!/^Loading\b/i.test(text); }
    });
    try {
      const result = await page.evaluate(async ({id,name}) => {
        const {renderToSVG} = await import("/src/renderers/svg.js");
        const module = await import(`/examples/${id}/program.js`);
        const svg = renderToSVG(module[name](),{title:id});
        const document = new DOMParser().parseFromString(svg,"image/svg+xml");
        return {svg,rectangles:document.querySelectorAll("rect").length,images:document.querySelectorAll("image").length,errors:document.querySelectorAll("parsererror").length};
      },{id,name});
      assert.equal(result.svg,renderToSVG(factory(),{title:id}));
      assert.equal(result.rectangles,count+1);
      assert.equal(result.images,0);
      assert.equal(result.errors,0);
      assertNoBrowserErrors(errors,id);
    } catch (error) { await saveBrowserPageEvidence(page, error, "browser-assertion"); throw error; } finally { await page.close(); }

  } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
});
}
