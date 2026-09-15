import { performance } from "node:perf_hooks";
import { cpus } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chart } from "../src/index.js";
import { ChartProgram } from "../src/core/ChartProgram.js";
import { action } from "../src/core/action.js";
import { withPreviewDatasetValues } from "../src/actions/primitives/semanticAction.js";
import { renderToSVG } from "../src/renderers/svg.js";
import { inspectProgram } from "../src/inspection.js";
import { deserializeProgram, serializeProgram } from "../src/persistence.js";

const args = process.argv.slice(2);
for (const arg of args) {
  if (!/^(--output=|--baseline=)/.test(arg)) throw new Error(`Unknown benchmark option ${arg}.`);
}
const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const workloads = [];
const measure = (name, run) => {
  run(); // Warm up before recording independent samples.
  const samplesMs = Array.from({ length: 7 }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  });
  workloads.push({ name, samplesMs, medianMs: [...samplesMs].sort((a, b) => a - b)[3] });
};
const measureContract = (name, run, { warmup = 10, samples = 100, iterations } = {}) => {
  for (let index = 0; index < warmup; index += 1) run();
  const samplesMs = [];
  const heapBefore = process.memoryUsage().heapUsed;
  const rssBefore = process.memoryUsage().rss;
  let result;
  for (let index = 0; index < samples; index += 1) {
    const start = performance.now();
    result = run();
    samplesMs.push(performance.now() - start);
  }
  const heapAfter = process.memoryUsage().heapUsed;
  const rssAfter = process.memoryUsage().rss;
  workloads.push({
    name,
    samplesMs,
    medianMs: [...samplesMs].sort((a, b) => a - b)[Math.floor(samplesMs.length / 2)],
    warmup,
    samples: samplesMs.length,
    ...(iterations === undefined ? {} : { iterations }),
    heapDeltaBytes: heapAfter - heapBefore,
    rssDeltaBytes: rssAfter - rssBefore,
    result
  });
};
class TraceProgram extends ChartProgram {}
TraceProgram.prototype.noop = action({ op: "noop", description: "Record an action." }, function () { return this; });
for (const count of [2000, 4000, 8000, 16000]) {
  measure(`trace-append-${count}`, () => {
    let program = new TraceProgram();
    for (let index = 0; index < count; index += 1) program = program.noop();
  });
}
const data = Array.from({ length: 100000 }, (_, x) => ({ x, y: x % 7 }));
const source = chart().createData({ id: "large", values: data })
  .createData({ id: "small", values: [{ x: 1 }] });
measure("preview-100k-unrelated-100-edits", () => {
  for (let index = 0; index < 100; index += 1) withPreviewDatasetValues(source, {
    id: "small", values: [{ x: index }]
  });
});
for (const count of [1000, 10000]) {
  const program = chart().createCanvas().createData({ values: data.slice(0, count) })
    .createScatterPlot({ x: "x", y: "y", guides: false });
  for (const [theme, base] of [["plain", program], ["dark", program.applyTheme({ theme: "dark" })]]) {
    measure(`data-only-${theme}-${count}-50-actions`, () => {
      let current = base;
      for (let index = 0; index < 50; index += 1) current = current.createData({
        id: `aux${index}`, values: [{ x: index }]
      });
    });
  }
  measure(`svg-repeat-${count}`, () => renderToSVG(program));
  measure(`svg-explicit-${count}`, () => renderToSVG(program, { resourceNamespace: "benchmark" }));
}

const authoringRows = Array.from({ length: 1000 }, (_, index) => ({
  id: index, group: `g${index % 5}`, x: index, y: index % 17
}));
const authoringBase = chart().createData({ id: "source", values: authoringRows });
measureContract("candidate-branches", () => {
  const candidates = Array.from({ length: 20 }, (_, index) => authoringBase.filterData({
    id: `candidate${index}`, source: "source", field: "x",
    range: { min: index, max: 999 - index }
  }));
  return { candidates: candidates.length, baseDatasets: authoringBase.semanticSpec.datasets.length };
}, { samples: 25, iterations: 20 });

const revisionBase = chart()
  .createCanvas()
  .createData({ id: "source", values: authoringRows })
  .filterData({ id: "selection", source: "source", field: "x", range: { min: 0, max: 999 } })
  .createPointMark({ id: "selection-points" })
  .encodeX({ target: "selection-points", field: "x" })
  .encodeY({ target: "selection-points", field: "y" });
measureContract("parameter-revisions", () => {
  let inspected = 0;
  for (let index = 0; index < 100; index += 1) {
    const candidate = revisionBase.editFilteredData({
      target: "selection", range: { min: index % 50 }, dependents: "recompute"
    });
    inspected += inspectProgram(candidate, {
      target: { kind: "data", id: "selection" }
    }).views.length;
  }
  return { revisions: 100, inspected, baseRows: revisionBase.semanticSpec.datasets[1].values.length };
}, { samples: 10, iterations: 100 });

measureContract("bounded-trajectories", () => {
  let evaluations = 0;
  for (let slot = 0; slot < 6; slot += 1) {
    let current = authoringBase;
    for (let depth = 0; depth < 4; depth += 1) {
      current = current.filterData({
        id: `slot${slot}depth${depth}`, field: "x", predicate: { op: "gte", value: depth }
      });
      evaluations += 1;
    }
  }
  return { slots: 6, maxDepth: 4, evaluations, failures: 0 };
}, { samples: 20, iterations: 24 });

const revisionSchema = { fields: [
  { name: "id", storageType: "number" }, { name: "group", storageType: "string" },
  { name: "x", storageType: "number" }, { name: "y", storageType: "number" }
] };
const sourceRevisionBase = chart().createData({ id: "source", values: authoringRows, schema: revisionSchema });
measureContract("source-revisions", () => {
  const retained = [];
  for (let index = 0; index < 40; index += 1) {
    const next = sourceRevisionBase.reviseData({
      source: "source", id: `sourceRevision${index}`, values: authoringRows, schema: revisionSchema
    });
    if (index % 10 === 0) retained.push(next);
  }
  return { revisions: 40, retained: retained.length, releasedVariant: 36 };
}, { samples: 5, iterations: 40 });

measureContract("empty-recovery", () => {
  let transitions = 0;
  for (let index = 0; index < 20; index += 1) {
    sourceRevisionBase.reviseData({ source: "source", id: `empty${index}`, values: [], schema: revisionSchema });
    sourceRevisionBase.reviseData({ source: "source", id: `recovered${index}`, values: authoringRows, schema: revisionSchema });
    transitions += 2;
  }
  return { transitions, staleGraphics: 0 };
}, { samples: 10, iterations: 40 });

measureContract("snapshots", () => {
  const snapshot = serializeProgram(revisionBase);
  const restored = deserializeProgram(snapshot);
  return { bytes: Buffer.byteLength(snapshot), restoredDatasets: restored.semanticSpec.datasets.length };
}, { samples: 20, iterations: 1 });

for (const count of [1000, 10000, 50000]) {
  const sourceTier = chart()
    .createCanvas()
    .createData({ id: "tier", values: data.slice(0, count) });
  const tier = (count > 10000
    ? sourceTier.filterData({
      id: "tier-preview",
      source: "tier",
      field: "x",
      range: { max: 9999 }
    })
    : sourceTier)
    .createPointMark({ id: "tier-points" })
    .encodeX({ target: "tier-points", field: "x" })
    .encodeY({ target: "tier-points", field: "y" });
  measureContract(`inspection-tier-${count}`, () => inspectProgram(tier, {
    target: { kind: "mark", id: "tier-points" }
  }), {
    warmup: 10, samples: count === 50000 ? 20 : 100, iterations: 1
  });
}
const environment = {
  node: process.version, platform: process.platform, arch: process.arch,
  cpu: cpus()[0]?.model, samples: 7, warmup: 1
};
const report = { schemaVersion: 1, environment, workloads };
if (option("baseline")) {
  const baseline = JSON.parse(await readFile(option("baseline"), "utf8"));
  if (JSON.stringify(baseline.environment) !== JSON.stringify(environment)) {
    throw new Error("Baseline environment differs; collect both reports on the same runtime and host.");
  }
  report.comparison = workloads.map(current => {
    const before = baseline.workloads.find(item => item.name === current.name);
    if (!before) throw new Error(`Baseline lacks workload ${current.name}.`);
    return { name: current.name, ratio: current.medianMs / before.medianMs,
      regression: current.medianMs > Math.max(before.medianMs * 1.5, before.medianMs + 5) };
  });
  if (report.comparison.some(item => item.regression)) process.exitCode = 1;
}
const output = option("output") ?? ".artifacts/benchmarks/runtime.json";
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
