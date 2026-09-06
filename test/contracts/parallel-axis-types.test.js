import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Parallel field lifecycle with component, tick mode, and Basic boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-parallel-axis-types-"));
  try {
    const file = path.join(directory, "components.mts");
    await writeFile(file, `
import type { ChartProgram, CreateParallelAxisOptions, EditParallelAxisOptions,
  ParallelAxesOptions, RemoveParallelAxisOptions, ParallelAxisTickSelection,
  ParallelAxisTicksOptions, ParallelAxisLabelsOptions, ParallelAxisTitleOptions,
  ParallelAxisComponentsOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const options: CreateParallelAxisOptions = { field: "a", ticksAndLabels: { values: [0, 10] as const } };
p.createParallelAxes().removeParallelAxes({ coordinate: "parallel" }).createParallelAxis(options);
p.editParallelAxis({ field: "a", title: { text: "Amount" }, line: { lineWidth: 2 } });
p.removeParallelAxis({ field: "a", target: "lines" });
p.createParallelAxis({ field: "a", line: false, labels: false, title: false, ticks: { count: 3 } });
p.editParallelAxis({ field: "a", ticks: false, labels: { format: ".1f", offset: 12 } });
// @ts-expect-error field is required
p.createParallelAxis({});
// @ts-expect-error field is required
p.editParallelAxis({ line: {} });
// @ts-expect-error count and values are exclusive
p.editParallelAxis({ field: "a", ticks: { count: 3, values: [0, 1] } });
// @ts-expect-error group and individual selectors are exclusive
p.createParallelAxis({ field: "a", ticksAndLabels: {}, ticks: {} });
// @ts-expect-error group and individual selectors are exclusive
p.editParallelAxis({ field: "a", ticksAndLabels: false, labels: false });
// @ts-expect-error no Cartesian title position
p.editParallelAxis({ field: "a", title: { position: "top" } });
// @ts-expect-error no Polar angle
p.createParallelAxis({ field: "a", angle: 30 });
// @ts-expect-error nested false is unsupported
p.createParallelAxis({ field: "a", ticksAndLabels: { labels: false } });
// @ts-expect-error scale selection belongs to the encoded field
p.removeParallelAxes({ scale: "a" });
// @ts-expect-error Basic has no Parallel guides
basic.createParallelAxes();
// @ts-expect-error Basic has no Parallel guides
basic.createParallelAxis({ field: "a" });
// @ts-expect-error Basic has no Parallel guides
basic.editParallelAxis({ field: "a", line: false });
// @ts-expect-error Basic has no Parallel guides
basic.removeParallelAxis({ field: "a" });
// @ts-expect-error Basic has no Parallel guides
basic.removeParallelAxes();
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
