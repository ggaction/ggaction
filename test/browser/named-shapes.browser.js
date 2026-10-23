import { saveBrowserPageEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createNamedShapes } from "../../examples/named-shapes/program.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertNoBrowserErrors, closeBrowserWithEvidence, openBrowserPage } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

test("canonical named-shapes browser Canvas and SVG preserve the independent literal scene", async () => {
  let server, browser;
  try {
    server=await startStaticServer(fileURLToPath(new URL("../../",import.meta.url)));
    browser=await chromium.launch({headless:true});
    const {page,errors}=await openBrowserPage(browser,new URL("examples/named-shapes/",server.baseUrl).href,{
      waitFor:()=>{const text=document.querySelector("#status")?.textContent??"";return text.length>0&&!/^Loading\b/i.test(text);}
    });
    try {
      const result=await page.evaluate(async()=>{
        const {createNamedShapes}=await import("/examples/named-shapes/program.js");
        const {createNamedShapesPrimitive}=await import("/test/charts/named-shapes/primitive.program.js");
        const {render}=await import("/src/index.js");
        const {renderToSVG}=await import("/src/renderers/svg.js");
        const actual=createNamedShapes(),expected=createNamedShapesPrimitive();
        const images=[actual,expected].map(program=>{
          const canvas=document.createElement("canvas");render(program,canvas.getContext("2d"));
          return canvas.getContext("2d").getImageData(0,0,480,270).data;
        });
        const svg=renderToSVG(actual,{resourceNamespace:"comparison"});
        const primitiveSvg=renderToSVG(expected,{resourceNamespace:"comparison"});
        const parsed=new DOMParser().parseFromString(svg,"image/svg+xml");
        const canvas=document.querySelector("#chart");
        return {exact:images[0].every((v,i)=>v===images[1][i]),bytes:images[0].length,svg,svgExact:svg===primitiveSvg,
          paths:parsed.querySelectorAll("path").length,images:parsed.querySelectorAll("image").length,
          parserErrors:parsed.querySelectorAll("parsererror").length,
          width:canvas.width,height:canvas.height,accessible:canvas.getAttribute("aria-label"),state:window.__ggactionExample};
      });
      assert.equal(result.exact,true);assert.equal(result.bytes,480*270*4);assert.equal(result.svgExact,true);
      assert.equal(result.svg,renderToSVG(createNamedShapes(),{resourceNamespace:"comparison"}));
      assert.equal(result.paths,4);assert.equal(result.images,0);assert.equal(result.parserErrors,0);
      assert.equal(result.width,480);assert.equal(result.height,270);assert.ok(result.accessible?.length>0);
      assert.deepEqual(result.state,{id:"named-shapes",width:480,height:270});
      assertNoBrowserErrors(errors,"named-shapes");
    } catch (error) { await saveBrowserPageEvidence(page, error, "browser-assertion"); throw error; } finally { await page.close(); }
  } finally {await closeBrowserWithEvidence(browser);await server?.close();}
});
