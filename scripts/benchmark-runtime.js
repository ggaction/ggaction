import { performance } from "node:perf_hooks";
import { cpus } from "node:os";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chart } from "../src/index.js";
import { ChartProgram } from "../src/core/ChartProgram.js";
import { action } from "../src/core/action.js";
import { withPreviewDatasetValues } from "../src/actions/primitives/semanticAction.js";
import { renderToSVG } from "../src/renderers/svg.js";

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
