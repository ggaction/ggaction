import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserEvidence } from "../support/browser.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
let server, browser;
test.before(async () => { server = await startStaticServer(root, { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
for (const id of ["dag", "vertical", "cyclic", "cyclic-vertical"]) test(`flow ${id} matches primitive Canvas and SVG at both device densities`, async () => {
  for (const ratio of [1, 2]) {
    const context = await browser.newContext({ deviceScaleFactor: ratio });
    try {
      const opened = await openBrowserPage(context, `${server.baseUrl}examples/flow-layouts/`, { waitFor: () => window.__ggactionExample !== undefined });
      const result = await opened.page.evaluate(async ({ id, ratio }) => {
        const { createFlow } = await import("/examples/flow-layouts/program.js");
        const { createFlowPrimitive } = await import("/test/charts/flow-layouts/primitive.program.js");
        const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
        const programs = [createFlowPrimitive(id), createFlow(id)], result = [];
        for (const backend of ["Canvas", "SVG"]) {
          const outputs = [];
          for (const p of programs) {
            const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
            if (backend === "Canvas") render(p, ctx, { pixelRatio: ratio });
            else {
              canvas.width = 640 * ratio; canvas.height = 500 * ratio;
              const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderToSVG(p))}`;
              await image.decode(); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            }
            outputs.push({ pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height });
          }
          let mismatches = 0, ink = 0;
          for (let i = 0; i < outputs[0].pixels.length; i++) if (outputs[0].pixels[i] !== outputs[1].pixels[i]) mismatches++;
          for (let y = 80 * ratio; y < 460 * ratio; y++) for (let x = 40 * ratio; x < 600 * ratio; x++) {
            const i = (y * outputs[1].width + x) * 4, p = outputs[1].pixels;
            if (Math.min(p[i], p[i + 1], p[i + 2]) < 220) ink++;
          }
          result.push({ backend, mismatches, ink, width: outputs[1].width, height: outputs[1].height });
        }
        return result;
      }, { id, ratio });
      for (const value of result) {
        assert.equal(value.mismatches, 0, JSON.stringify({ id, ratio, ...value }));
        assert.ok(value.ink > 1000 * ratio * ratio);
        assert.equal(value.width, 640 * ratio); assert.equal(value.height, 500 * ratio);
      }
      assertNoBrowserErrors(opened.errors, `Flow ${id}`); await opened.page.close();
    } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
    finally { await context.close(); }
  }
});

for (const method of ["dag", "cyclic"]) for (const backend of ["canvas", "svg"]) {
  test(`flow ${method} ${backend} tooltip follows actual node and ribbon hits at both device densities`, async () => {
    for (const ratio of [1, 2]) {
      const context = await browser.newContext({ deviceScaleFactor: ratio });
      try {
        const { page, errors } = await openBrowserPage(context, `${server.baseUrl}examples/flow-layouts/`, { waitFor: () => window.__ggactionExample !== undefined });
        await page.evaluate(async ({ method, backend }) => {
          const { render } = await import("/src/index.js");
          const { renderToSVG } = await import("/src/renderers/svg.js");
          const { createInteractionSession } = await import("/src/interaction.js");
          const { createFlowInspection, readFlowInspection, describeFlowInspection } = await import("/test/support/flow-inspection.js");
          document.body.innerHTML = '<main style="width:240px"><h1>Flow inspection</h1><div id="flow-surface" tabindex="0" role="region" aria-label="Flow chart" style="width:240px;height:200px"></div><div style="height:120px"><p id="flow-tooltip" role="tooltip" hidden></p></div><p id="status">Loading</p></main>';
          const surface = document.querySelector("#flow-surface"), tooltip = document.querySelector("#flow-tooltip");
          const program = createFlowInspection(method), session = createInteractionSession({ program, bindings: [{ type: "inspect", slop: 0 }] });
          let canvas;
          if (backend === "canvas") {
            canvas = document.createElement("canvas"); canvas.setAttribute("aria-label", "Flow nodes and ribbons");
            canvas.style.width = "240px"; canvas.style.height = "200px"; canvas.style.border = "0";
            surface.append(canvas); render(program, canvas.getContext("2d"), { pixelRatio: devicePixelRatio });
          } else surface.innerHTML = renderToSVG(program);
          let observations = 0;
          const unsubscribe = session.subscribe(({ state }) => {
            observations++;
            const value = readFlowInspection(state); tooltip.textContent = describeFlowInspection(value);
            tooltip.hidden = value === null || state.destroyed;
            if (tooltip.hidden) surface.removeAttribute("aria-describedby");
            else surface.setAttribute("aria-describedby", tooltip.id);
          });
          const unmount = session.mount(surface);
          window.__flowInspection = {
            session, snapshot: () => readFlowInspection(session.getState()), count: () => observations,
            dispose() { unmount(); unsubscribe(); session.destroy(); tooltip.hidden = true; tooltip.textContent = ""; surface.removeAttribute("aria-describedby"); },
            async pixel(point) {
              let output = canvas;
              if (!output) {
                const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(surface.innerHTML)}`; await image.decode();
                output = document.createElement("canvas"); output.width = 240 * devicePixelRatio; output.height = 200 * devicePixelRatio;
                output.getContext("2d").drawImage(image, 0, 0, output.width, output.height);
              }
              return { width: output.width, height: output.height,
                rgba: [...output.getContext("2d").getImageData(point.x * devicePixelRatio, point.y * devicePixelRatio, 1, 1).data] };
            }
          };
          document.querySelector("#status").textContent = "Complete";
        }, { method, backend });
        const surface = page.locator("#flow-surface"), box = await surface.boundingBox();
        const probes = [
          { point: method === "dag" ? { x: 30, y: 100 } : { x: 92, y: 95 }, owner: "flowNodes", role: "node", id: 1,
            value: 4, row: { id: 1, name: "Input" }, adjacency: { incoming: method === "dag" ? [] : ["ba"], outgoing: ["ab", "ac"], neighbors: ["1", "end"] },
            text: `Input: flow 4; incoming ${method === "dag" ? 0 : 2}; outgoing 4; neighbors ["1","end"].` },
          { point: method === "dag" ? { x: 120, y: 78 } : { x: 120, y: 35 }, owner: "flowLinks", role: "link", id: "ab",
            value: 3, row: { id: "ab", s: 1, t: "1", amount: 3, note: "primary" }, adjacency: { source: 1, target: "1" }, text: 'ab: 1 to "1"; flow 3.' },
          ...(method === "cyclic" ? [{ point: { x: 92, y: 169 }, owner: "flowLinks", role: "link", id: "ba",
            value: 2, row: { id: "ba", s: "1", t: 1, amount: 2, note: "return" }, adjacency: { source: "1", target: 1 }, text: 'ba: "1" to 1; flow 2.' }] : [])
        ];
        for (const probe of probes) {
          await page.mouse.move(box.x + probe.point.x, box.y + probe.point.y);
          const value = await page.evaluate(() => window.__flowInspection.snapshot());
          assert.equal(value.hit.ownerId, probe.owner); assert.equal(value.hit.role, probe.role);
          assert.equal(value.hit.itemKey, value.item.key); assert.equal(value.item.key, value.accessible.key);
          assert.equal(value.accessible.fields.id, probe.id); assert.equal(value.accessible.fields.value, probe.value);
          assert.deepEqual(value.originalRows, [probe.row]); assert.deepEqual(value.adjacency, probe.adjacency);
          assert.deepEqual(value.hit.resourceRefs, [{ kind: "layout", id: "layout", revision: 0 }]);
          assert.equal(value.item.rows[0].data, probe.role === "node" ? "nodes" : "edges");
          assert.equal(value.item.rows[0].index, probe.id === "ba" ? 2 : 0); assert.equal(value.item.rows[0].revision, 0);
          assert.equal(await page.locator("#flow-tooltip").textContent(), probe.text);
          assert.equal(await page.locator("#flow-tooltip").isVisible(), true);
          assert.equal(await surface.getAttribute("aria-describedby"), "flow-tooltip");
          const pixel = await page.evaluate(point => window.__flowInspection.pixel(point), probe.point);
          assert.deepEqual([pixel.width, pixel.height], [240 * ratio, 200 * ratio]);
          assert.ok(pixel.rgba[3] > 0 && Math.min(...pixel.rgba.slice(0, 3)) < 220, JSON.stringify(pixel));
        }
        await page.mouse.move(box.x + 5, box.y + 5);
        assert.equal(await page.evaluate(() => window.__flowInspection.snapshot()), null);
        assert.equal(await page.locator("#flow-tooltip").isVisible(), false);
        assert.equal(await surface.getAttribute("aria-describedby"), null);
        await page.evaluate(() => window.__flowInspection.dispose());
        const count = await page.evaluate(() => window.__flowInspection.count());
        await page.mouse.move(box.x + probes[0].point.x, box.y + probes[0].point.y);
        assert.equal(await page.evaluate(() => window.__flowInspection.count()), count);
        assert.equal(await page.evaluate(() => window.__flowInspection.session.getState().destroyed), true);
        assertNoBrowserErrors(errors, `Flow tooltip ${method} ${backend} ${ratio}`); await page.close();
      } catch (error) { await saveBrowserEvidence(browser, error); throw error; }
      finally { await context.close(); }
    }
  });
}
