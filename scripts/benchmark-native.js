import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { preparePackageConsumer } from "./package-consumer.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const sha = value => createHash("sha256").update(value).digest("hex");
const args = new Map();
for (const argument of process.argv.slice(2)) {
  const match = /^(--archive|--output|--workload)=(.+)$/.exec(argument);
  const key = match?.[1] ?? argument;
  if ((!match && key !== "--diagnostic") || args.has(key)) throw new Error(`Invalid or duplicate benchmark argument: ${argument}`);
  args.set(key, match?.[2] ?? true);
}
if (!args.has("--archive") || !args.has("--output")) throw new Error("Native benchmark requires --archive=<local.tgz> and --output=<directory>.");
const workload = args.get("--workload") ?? "all";
if (!["all", "routes", "memory"].includes(workload)) throw new Error("Native benchmark workload must be all, routes or memory.");
const diagnostic = args.has("--diagnostic");
const archive = path.resolve(args.get("--archive")), out = path.resolve(args.get("--output"));
const bytes = await readFile(archive);
if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error("Native benchmark archive must be a local gzip tarball.");
await mkdir(out, { recursive: true });
const report = {
  kind: diagnostic ? "diagnostic-not-qualification" : "native-route-and-lifecycle-measurement",
  archive: { path: archive, sha256: sha(bytes) },
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  profile: { seed: 0, dpr: [1, 2], warmups: diagnostic ? 0 : 5, measured: diagnostic ? 1 : 30, cycles: diagnostic ? 4 : 100 },
  environment: { cpu: os.cpus()[0].model, cores: os.cpus().length, ramBytes: os.totalmem(),
    os: `${os.type()} ${os.release()} ${os.arch()}`, node: process.version, start: new Date().toISOString(), loadStart: os.loadavg() },
  scope: "Unchanged full native route fixtures; real DOM inspect mount, Blob route worker, alternating completion and abort. Memory fixture has no editing gesture, ResizeObserver or asset decoder; their combined heap obligation remains separate.",
  font: "No Text, labels or guides in measured graphics; host status text is outside measurement.",
  network: "Local bootstrap only, then offline; zero post-bootstrap HTTP requests required.",
  stages: { sourcePreparationMs: "one-time diagnostic, outside P95", computeMs: "worker public computation",
    prepareComputeValidateMs: "public preparation including worker startup, clone, computation and validation", applyMs: "native prepared commit",
    bundlingMs: "preparation plus apply", materializeMs: "native GraphPlot", canvasRenderMs: "synchronous commands",
    svgSerializeDomMs: "serialization and DOM insertion, excludes compositor paint" },
  inputs: {}, cases: [], lifecycle: []
};
const files = ["scripts/benchmark-native.js", "scripts/benchmarks/routes.browser.js", "scripts/benchmarks/routes.worker.js"];
for (const file of files) report.inputs[file] = sha(await readFile(path.join(root, file)));
const persist = () => writeFile(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
let consumer, browser, server;
try {
  consumer = await preparePackageConsumer({ packageSpec: archive });
  const assets = new Map();
  for (const [file, output] of [["routes.browser.js", "app.js"], ["routes.worker.js", "worker.js"]]) {
    const result = await build({ stdin: { contents: await readFile(new URL(`benchmarks/${file}`, import.meta.url), "utf8"),
      resolveDir: consumer.directory, sourcefile: file }, absWorkingDir: consumer.directory,
      bundle: true, minify: true, format: "esm", platform: "browser", target: "es2022", write: false, metafile: true });
    const sources = Object.keys(result.metafile.inputs).filter(name => name !== file);
    assert.ok(sources.every(name => path.resolve(consumer.directory, name).startsWith(consumer.directory + path.sep)), "source checkout entered installed bundle");
    const data = result.outputFiles[0].contents;
    assets.set("/" + output, { data, mime: "text/javascript" });
    report.inputs[output] = { sha256: sha(data), bytes: data.length };
    await writeFile(path.join(out, output), data);
  }
  assets.set("/", { data: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Native measurement</title><link rel="icon" href="data:,"></head><body><p id="status">Loading</p><canvas aria-label="Measured graph" style="width:400px;height:400px"></canvas><div id="svg"></div><script type="module" src="app.js"></script></body></html>', mime: "text/html" });
  server = createServer((request, response) => {
    const asset = assets.get(request.url);
    response.writeHead(asset ? 200 : 404, { "Content-Type": asset?.mime ?? "text/plain" }); response.end(asset?.data ?? "Not found");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ["--js-flags=--expose-gc", "--enable-precise-memory-info"] });
  report.environment.browser = browser.version();
  for (const ratio of report.profile.dpr) {
    const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 900, height: 600 } });
    try {
      const open = async () => {
        await context.setOffline(false);
        const page = await context.newPage(), errors = [], progress = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") errors.push(message.text());
          if (message.text().startsWith("ROUTE_PROGRESS ")) progress.push(JSON.parse(message.text().slice(15)));
        });
        await page.goto(url); await page.waitForFunction(() => document.querySelector("#status")?.textContent === "Ready");
        await context.setOffline(true);
        const requests = [];
        page.on("request", request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
        return { page, errors, requests, progress };
      };
      if (workload !== "memory") {
        const { page, errors, requests, progress } = await open();
        for (const count of diagnostic ? [100] : [100, 1000, 10000]) for (const method of ["hierarchical", "force-directed", "density", "edge-path"]) {
          const start = progress.length;
          let value;
          try {
            value = await page.evaluate(async input => nativeBenchmark.benchmarkCase(input.count, input.method, input.ratio, input.measured, input.warmups), { count, method, ratio, ...report.profile });
          } catch (error) {
            value = { edgeCount: count, method, ratio, status: "failed", successSLO: "failed-this-fixture", error: error.stack,
              progress: progress.slice(start), counters: await page.evaluate(() => ({ ...nativeBenchmark.counters })) };
          }
          assert.ok(Object.values(value.counters).every(value => value === 0), JSON.stringify(value));
          if (diagnostic) value.successSLO = "not-qualified-diagnostic";
          report.cases.push(value); await persist();
          process.stdout.write(JSON.stringify({ ratio, count, method, status: value.status, p95: value.p95 }) + "\n");
        }
        assert.deepEqual(errors, []); assert.deepEqual(requests, []); await page.close();
      }
      if (workload !== "routes") {
        const { page, errors, requests } = await open(), cdp = await context.newCDPSession(page);
        await page.evaluate(() => nativeBenchmark.resetLifecycle());
        for (let i = 0; i < (diagnostic ? 0 : 5); i++) await page.evaluate(input => nativeBenchmark.lifecycle(input.i, input.ratio), { i, ratio });
        const samples = [], results = [];
        for (let i = 0; i <= report.profile.cycles; i++) {
          if (i) {
            const result = await page.evaluate(input => nativeBenchmark.lifecycle(input.i, input.ratio), { i, ratio });
            assert.ok(Object.values(result.counters).every(value => value === 0), JSON.stringify(result)); results.push(result);
          }
          await cdp.send("HeapProfiler.collectGarbage");
          samples.push({ cycle: i, ...await cdp.send("Runtime.getHeapUsage") });
        }
        const n = samples.length, meanX = (n - 1) / 2, meanY = samples.reduce((sum, x) => sum + x.usedSize, 0) / n;
        const slope = samples.reduce((sum, x) => sum + (x.cycle - meanX) * (x.usedSize - meanY), 0) / samples.reduce((sum, x) => sum + (x.cycle - meanX) ** 2, 0);
        const growth = samples.at(-1).usedSize - samples[0].usedSize;
        const abort = results.filter(x => x.status === "aborted").map(x => x.abortAcknowledgementMs).sort((a, b) => a - b);
        report.lifecycle.push({ ratio, cycles: report.profile.cycles, samples, results, gc: "CDP collectGarbage before every sample",
          slopeBytesPerCycle: slope, growthBytes: growth, thresholds: { slopeBytesPerCycle: 10240, growthBytes: 2097152 },
          heapStatus: diagnostic ? "not-qualified-diagnostic" : slope <= 10240 && growth <= 2097152 ? "passed-this-fixture" : "failed-this-fixture",
          abortAcknowledgementP95Ms: abort[Math.ceil(abort.length * .95) - 1] });
        assert.deepEqual(errors, []); assert.deepEqual(requests, []); await cdp.detach(); await page.close(); await persist();
      }
    } finally { await context.close(); }
  }
  report.status = diagnostic ? "diagnostic-completed-not-qualification" : "measurement-completed";
} catch (error) {
  report.status = "harness-failed"; report.error = error.stack; throw error;
} finally {
  report.environment.end = new Date().toISOString(); report.environment.loadEnd = os.loadavg(); await persist();
  await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); await consumer?.cleanup();
}
if (!diagnostic && (report.cases.some(value => value.successSLO !== "passed-this-fixture") || report.lifecycle.some(value => value.heapStatus !== "passed-this-fixture"))) process.exitCode = 1;
