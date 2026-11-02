import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = new URL("../../.artifacts/browser/hit-preparation/", import.meta.url);
let browser, server;
test.before(async () => {
  await mkdir(directory, { recursive: true });
  await build({ stdin: { contents: `import {chart,render} from 'ggaction'; import {createInteractionSession} from 'ggaction/interaction'; window.native={chart,render,createInteractionSession}; document.querySelector('#status').textContent='Ready';`,
    resolveDir: process.env.GGACTION_HIT_PACKAGE_ROOT ?? root }, bundle: true, minify: true, platform: "browser", format: "esm", outfile: fileURLToPath(new URL("bundle.js", directory)) });
  await writeFile(new URL("index.html", directory), '<!doctype html><meta charset="utf-8"><title>Native hit preparation</title><canvas width="620" height="620" aria-label="All 100000 native points"></canvas><p id="status">Loading</p><script type="module" src="bundle.js"></script>');
  server = await startStaticServer(root); browser = await chromium.launch({ headless: true });
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });

for (const ratio of [1, 2]) test(`explicit preparation retains all 100000 painted points and nine CSS queries at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 800, height: 800 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL(".artifacts/browser/hit-preparation/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status").textContent === "Ready" });
    const result = await page.evaluate(async ratio => {
      const { chart, render, createInteractionSession } = window.native;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      const count = 100000, side = Math.ceil(Math.sqrt(count));
      const rows = Array.from({ length: count }, (_, id) => ({ id, x: (id % side + 1) / (side + 1), y: (Math.floor(id / side) + 1) / (side + 1) }));
      const original = JSON.stringify(rows), program = chart().createCanvas({ width: 400, height: 400, margin: 20, plotBorder: false })
        .createData({ id: "rows", keyField: "id", values: rows }).createPointMark({ id: "points", maxItems: 100000 })
        .encodeX({ field: "x", scale: { id: "x", domain: [0, 1], nice: false } }).encodeY({ field: "y", scale: { id: "y", domain: [0, 1], nice: false } });
      let rejected = false; try { createInteractionSession({ program, bindings: [] }); } catch (error) { rejected = /item budget/.test(error.message); }
      check(rejected, "Default policy must reject the original full scene");
      const session = createInteractionSession({ program, bindings: [], hitPreparation: { maxSceneNodes: 100001, maxWork: 128000000 } });
      try {
        const canvas = document.querySelector("canvas"); canvas.width = 620 * ratio; canvas.height = 620 * ratio; canvas.style.width = "620px"; canvas.style.height = "620px";
        const ctx = canvas.getContext("2d"); ctx.setTransform(ratio * 1.5, 0, 0, ratio * 1.5, ratio * 7, ratio * 11);
        let arcs = 0;
        const recorder = new Proxy(ctx, { get(target, key) { if (key === "arc") return (...args) => { arcs++; return target.arc(...args); };
          const value = target[key]; return typeof value === "function" ? value.bind(target) : value; }, set(target, key, value) { target[key] = value; return true; } });
        render(program, recorder); check(arcs === count, "Every native point must be painted");
        session.mount(canvas, { rootTransform: [1.5, 0, 0, 1.5, 7, 11] });
        const state = session.getState(), nodes = state.scene.nodes.filter(node => node.type === "circle"), keys = program.semanticSpec.datasets[0].rowKeys;
        check(nodes.length === count && state.scene.nodes.length === count + 1, "No row or background may be dropped");
        nodes.forEach((node, i) => { check(Math.abs(node.properties.x - (20 + 360 * rows[i].x)) < 1e-10 && Math.abs(node.properties.y - (380 - 360 * rows[i].y)) < 1e-10, "Native position differs"); });
        const queries = [];
        for (const id of [0, 1, side - 1, 25000, 50000, 75000, count - side, count - 2, count - 1]) {
          const x = 20 + 360 * rows[id].x, y = 380 - 360 * rows[id].y;
          session.dispatch({ type: "inspect", point: { x: x * 1.5 + 7, y: y * 1.5 + 11 }, slop: 0 });
          const hit = session.getState().hit, expected = rows.flatMap((row, i) => Math.hypot(20 + 360 * row.x - x, 380 - 360 * row.y - y) <= 3 ? [keys[i]] : []).reverse();
          check(JSON.stringify(hit.candidates.map(item => item.rowKeys[0])) === JSON.stringify(expected), "Exact full CSS candidate lineage differs");
          check(hit.candidates.every(item => item.ownerId === "points" && item.role === "point" && item.resourceRefs[0].id === "rows" && item.childPath.length === 0), "Native scope differs");
          check(hit.statistics.work <= 2000000, "Query policy changed"); queries.push({ id, count: expected.length, work: hit.statistics.work });
        }
        check(JSON.stringify(rows) === original && session.getState().program === program, "Caller/program changed");
        const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), v => v.toString(16).padStart(2, "0")).join("");
        return { count, sceneNodes: state.scene.nodes.length, painted: arcs, queries, inputHash: await hash(original), sceneHash: await hash(JSON.stringify(state.scene)) };
      } finally { session.destroy(); }
    }, ratio);
    assert.equal(result.count, 100000); assert.equal(result.painted, 100000); assert.equal(result.sceneNodes, 100001); assert.equal(result.queries.length, 9);
    assert.equal(result.inputHash, "b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f");
    await writeFile(new URL(`dpr-${ratio}.json`, directory), JSON.stringify({ status: "correctness-not-performance-qualification", ratio, ...result }, null, 2));
    assertNoBrowserErrors(errors, "explicit hit preparation"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
