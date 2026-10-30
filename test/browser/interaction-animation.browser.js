import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { startStaticServer } from "../support/static-server.js";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";

let browser, server, directory;
test.before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "ggaction-current-frame-"));
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const installed = process.env.GGACTION_BROWSER_PACKAGE_DIRECTORY;
  const entries = installed ? ['ggaction', 'ggaction/svg', 'ggaction/animation', 'ggaction/interaction', 'ggaction/accessibility'] : ['./src/index.js', './src/renderers/svg.js', './src/animation.js', './src/interaction.js', './src/accessibility.js'];
  const bundle = await build({ stdin: { contents: `export {chart,render,prepareImageRendering} from '${entries[0]}';export {renderToSVG} from '${entries[1]}';export * from '${entries[2]}';export {createInteractionSession} from '${entries[3]}';export {exportAccessibleData} from '${entries[4]}';`, resolveDir: installed ?? root }, bundle: true, platform: "browser", format: "esm", write: false, metafile: true });
  if (installed) assert.ok(Object.keys(bundle.metafile.inputs).every(name => !name.startsWith('src/') && !name.includes('/ggactionnewbrand/src/')));
  await writeFile(path.join(directory, "public.js"), bundle.outputFiles[0].contents);
  await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><title>Current frame inspection</title><link rel="icon" href="data:,"><main><div id="surface" tabindex="0" aria-label="Interactive measurements" style="width:240px;height:180px"><canvas aria-label="Animated measurements" width="240" height="180" style="width:240px;height:180px"></canvas></div><p id="status">Ready</p></main></html>');
  server = await startStaticServer(directory); browser = await chromium.launch({ headless: true });
});

for (const backend of ["canvas", "svg"]) for (const native of ["before", "after"]) test(`overlapping animated ${backend} candidates commit once against the ${native} native scope`, async () => {
  const context = await browser.newContext();
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
    for (const time of [50, 100]) {
      const keys = await page.evaluate(async ({ backend, native, time }) => {
        window.overlap?.session.destroy();
        const api = await import("/public.js"), rows = ids => ids.map(id => ({ id, x: 5, y: 5 }));
        const from = api.chart().createCanvas({ width: 240, height: 180, margin: 20 })
          .createData({ id: "rows", keyField: "id", values: rows(["a", "b", "c"]) }).createPointMark({ id: "points" })
          .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } }).encodeY({ field: "y", scale: { domain: [0, 10], nice: false } })
          .encodeRadius({ value: 12 }).selectMarks({ id: "picked", items: [], empty: "none" });
        const to = from.reviseData({ source: "rows", id: "next", values: rows(["a", "b", "d"]) }).encodeColor({ value: "red" });
        const itemKeys = program => api.exportAccessibleData(program, { format: "items" }).views[0].items.map(item => item.key);
        const first = itemKeys(from), last = itemKeys(to), keys = { a: first[0], b: first[1], c: first[2], d: last[2] };
        const surface = document.querySelector("#surface");
        surface.innerHTML = '<canvas aria-label="Overlapping animated measurements" width="240" height="180" style="width:240px;height:180px"></canvas>';
        const session = api.createInteractionSession({ program: native === "before" ? from : to, bindings: [{ type: "inspect", slop: 0 },
          { type: "select", target: "points", selection: "picked", mode: "toggle", slop: 0 },
          { type: "keyboard", targets: [{ target: "points", activation: { type: "select", selection: "picked", mode: "toggle" } }] }] });
        const events = [];
        session.subscribe(event => {
          events.push({ type: event.type, phase: event.phase });
          const state = session.getState(), displayed = state.animationFrame ?? state.program;
          if (backend === "canvas") api.render(displayed, surface.querySelector("canvas").getContext("2d"));
          else surface.innerHTML = api.renderToSVG(displayed);
        });
        session.mount(surface);
        const frame = api.sampleTransition(api.planTransition({ from, to, options: { durationMs: 100, easing: "linear" } }), time);
        session.dispatch({ type: "frame", frame, version: session.getState().frameVersion + 1, generation: session.getState().generation });
        window.overlap = { api, session, events }; return keys;
      }, { backend, native, time });
      const box = await page.locator("#surface").boundingBox();
      await page.mouse.move(box.x + 5, box.y + 5); await page.mouse.move(box.x + 120, box.y + 90);
      await page.waitForFunction(() => window.overlap.session.getState().hit?.target != null);
      const candidates = await page.evaluate(() => window.overlap.session.getState().hit.candidates.map(candidate => candidate.itemKey));
      assert.deepEqual(candidates, (time === 50 ? ["c", "d", "b", "a"] : ["d", "b", "a"]).map(name => keys[name]));
      assert.equal(new Set(candidates).size, candidates.length);
      await page.locator("#surface").focus(); await page.keyboard.press("Home");
      assert.deepEqual(await page.evaluate(() => window.overlap.session.getState().focus.screenPoint), { x: 120, y: 90 });
      await page.mouse.click(box.x + 120, box.y + 90); await page.evaluate(() => window.overlap.session.whenSettled());
      const actual = await page.evaluate(() => {
        const { api, session, events } = window.overlap, state = session.getState();
        return { selected: api.exportAccessibleData(state.program, { format: "items" }).views[0].items.filter(item => item.selectedBy.includes("picked")).map(item => item.key),
          phases: events.filter(event => event.type === "select").map(event => event.phase), history: state.history.undoCount, frame: state.animationFrame };
      });
      const selected = native === "before" ? time === 100 ? "b" : "c" : "d";
      assert.deepEqual(actual, { selected: [keys[selected]], phases: ["commit", "settled"], history: 1, frame: null });
    }
    await page.evaluate(() => window.overlap.session.destroy()); assertNoBrowserErrors(errors, `Overlapping ${backend} ${native}`); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

for (const backend of ["canvas", "svg"]) for (const ratio of [1, 2]) test(`authentic player frames share ${backend} pixels, focus and native activation at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio });
  try {
    const { page, errors } = await openBrowserPage(context, server.baseUrl, { waitFor: () => document.querySelector("#status").textContent === "Ready" });
    await page.evaluate(async ({ backend, ratio }) => {
      const api = await import("/public.js");
      const from = api.chart().createCanvas({ width: 240, height: 180, margin: 20 })
        .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 1 }] })
        .createPointMark({ id: "points" }).encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
        .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } }).encodeRadius({ value: 10 })
        .selectMarks({ id: "picked", target: "points", items: [], empty: "none" });
      const to = from.reviseData({ source: "rows", id: "next", values: [{ id: "a", x: 9, y: 9 }] });
      const surface = document.querySelector("#surface"); let version = 0, releases = 0, preparations = 0;
      const session = api.createInteractionSession({ program: from, bindings: [{ type: "inspect", slop: 0 }, { type: "keyboard", targets: [{ target: "points", activation: { type: "select", selection: "picked" } }] }],
        async assetResolver({ program, frame, signal }) {
          const images = await api.prepareImageRendering(frame ?? program, { signal, decode() { throw Error("No image expected"); } }); preparations++;
          return { images, dispose() { releases++; } };
        } });
      const draw = () => {
        const state = session.getState(), value = state.animationFrame ?? state.program, assets = state.frameAssets ?? state.assets;
        if (!assets) return;
        if (backend === "canvas") api.render(value, surface.querySelector("canvas").getContext("2d"), { ...assets, pixelRatio: ratio });
        else surface.innerHTML = api.renderToSVG(value);
        surface.dataset.focus = state.focus?.itemKey ?? "";
      };
      session.subscribe(draw); await session.whenSettled(); session.mount(surface); draw();
      const options = { durationMs: 100, easing: "linear" };
      const player = api.createAnimationPlayer({ plan: api.planTransition({ from, to, options }),
        clock: { now: () => 0, requestFrame: fn => requestAnimationFrame(fn), cancelFrame: id => cancelAnimationFrame(id) },
        render(frame) { version = Math.max(version, session.getState().frameVersion) + 1; session.dispatch({ type: "frame", frame, version, generation: session.getState().generation }); } });
      player.seek(50); await session.whenSettled();
      window.current = { api, from, to, options, session, player, counters: () => ({ releases, preparations }), draw };
      document.querySelector("#status").textContent = "Complete";
    }, { backend, ratio });
    await page.locator("#surface").focus(); await page.keyboard.press("Home");
    assert.deepEqual(await page.evaluate(() => window.current.session.getState().focus.screenPoint), { x: 120, y: 90 });
    const box = await page.locator("#surface").boundingBox(); await page.mouse.move(box.x + 120, box.y + 90);
    assert.equal(await page.evaluate(() => { const s = window.current.session.getState(); return s.hit.target.itemKey === s.focus.itemKey; }), true);
    const pixels = await page.evaluate(async ({ backend, ratio }) => {
      let canvas = document.querySelector("canvas");
      if (backend === "svg") {
        const image = new Image(); image.src = `data:image/svg+xml,${encodeURIComponent(document.querySelector("svg").outerHTML)}`; await image.decode();
        canvas = document.createElement("canvas"); canvas.width = 240 * ratio; canvas.height = 180 * ratio; canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      return { center: [...canvas.getContext("2d").getImageData(120 * ratio, 90 * ratio, 1, 1).data], old: [...canvas.getContext("2d").getImageData(40 * ratio, 146 * ratio, 1, 1).data], size: [canvas.width, canvas.height] };
    }, { backend, ratio });
    assert.deepEqual(pixels, { center: [76, 120, 168, 255], old: [255, 255, 255, 255], size: [240 * ratio, 180 * ratio] });
    await page.keyboard.press("Enter"); await page.evaluate(() => window.current.session.whenSettled());
    assert.deepEqual(await page.evaluate(() => { const s = window.current.session.getState(); return [s.history.undoCount, s.revision, s.animationFrame, s.frameAssets]; }), [1, 1, null, null]);
    const reduced = await page.evaluate(async () => {
      const { api, session, options } = window.current; window.current.player.dispose();
      const current = session.getState().program, target = current.reviseData({ source: "rows", id: "last", values: [{ id: "a", x: 9, y: 9 }] });
      let scheduled = 0, renders = 0, version = session.getState().frameVersion;
      const player = api.createAnimationPlayer({ plan: api.planTransition({ from: current, to: target, options }), reducedMotion: true,
        clock: { now: () => 0, requestFrame() { scheduled++; throw Error("Reduced motion scheduled a frame"); }, cancelFrame() {} },
        render(frame) { renders++; session.dispatch({ type: "frame", frame, version: ++version, generation: session.getState().generation }); } });
      player.play(); await player.finished; await session.whenSettled();
      const point = session.getState().focus.screenPoint; session.dispatch({ type: "inspect", point, slop: 0 });
      const result = { scheduled, renders, point, hit: session.getState().hit.target.itemKey === session.getState().focus.itemKey, history: session.getState().history.undoCount };
      player.dispose(); session.destroy(); result.leases = window.current.counters(); return result;
    });
    assert.deepEqual({ ...reduced, leases: undefined }, { scheduled: 0, renders: 1, point: { x: 200, y: 34 }, hit: true, history: 1, leases: undefined });
    assert.equal(reduced.leases.releases, reduced.leases.preparations);
    assertNoBrowserErrors(errors, `Current frame ${backend} DPR ${ratio}`); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
