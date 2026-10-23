import { saveBrowserPageEvidence } from "../support/browser.js";
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createBootstrapMeanCI } from "../../examples/bootstrap-mean-ci/program.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertNoBrowserErrors, closeBrowserWithEvidence, openBrowserPage } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";

test("canonical bootstrap-mean-ci browser Canvas and SVG preserve the independent literal scene", async () => {
  let server, browser;
  try {
    server=await startStaticServer(fileURLToPath(new URL("../../",import.meta.url)));
    browser=await chromium.launch({headless:true});
    const {page,errors}=await openBrowserPage(browser,new URL("examples/bootstrap-mean-ci/",server.baseUrl).href,{
      waitFor:()=>{const text=document.querySelector("#status")?.textContent??"";return text.length>0&&!/^Loading\b/i.test(text);}
    });
    try {
      const result=await page.evaluate(async()=>{
        const {createBootstrapMeanCI}=await import("/examples/bootstrap-mean-ci/program.js");
        const {createBootstrapMeanPrimitive}=await import("/test/charts/bootstrap-mean-ci/primitive.program.js");
        const {render}=await import("/src/index.js");
        const {renderToSVG}=await import("/src/renderers/svg.js");
        const actual=createBootstrapMeanCI(),expected=createBootstrapMeanPrimitive();
        const images=[actual,expected].map(program=>{
          const canvas=document.createElement("canvas");render(program,canvas.getContext("2d"));
          return canvas.getContext("2d").getImageData(0,0,320,220).data;
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
      assert.equal(result.exact,true);assert.equal(result.bytes,320*220*4);assert.equal(result.svgExact,true);
      assert.equal(result.svg,renderToSVG(createBootstrapMeanCI(),{resourceNamespace:"comparison"}));
      assert.equal(result.paths,2);assert.equal(result.images,0);assert.equal(result.parserErrors,0);
      assert.equal(result.width,320);assert.equal(result.height,220);assert.ok(result.accessible?.length>0);
      assert.deepEqual(result.state,{id:"bootstrap-mean-ci",width:320,height:220});
      assertNoBrowserErrors(errors,"bootstrap-mean-ci");
    } catch (error) { await saveBrowserPageEvidence(page, error, "browser-assertion"); throw error; } finally { await page.close(); }
  } finally {await closeBrowserWithEvidence(browser);await server?.close();}
});
