import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("legend block declarations expose the closed Full-only contract", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-legend-block-types-"));
  try {
    const file = path.join(directory, "legend-block.mts");
    await writeFile(file, `
import type {
  ChartProgram,
  EditLegendBlockOptions,
  LegendBlockSymbolPatch,
  LegendBlockTextPatch,
  LegendChannel
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
const channel: LegendChannel = "strokeWidth";
const text: LegendBlockTextPatch = { fontSize: 14, fontFamily: "Inter", fontWeight: 600, color: "navy" };
const symbol: LegendBlockSymbolPatch = { size: 64, fill: "white", stroke: "black", strokeWidth: 2, opacity: 0.6 };
const options: EditLegendBlockOptions = { target: "points", channel: "size", values: [10], text: {}, symbol: {} };
program.editLegendBlock(options);
program.editLegendBlock({ target: "points", channel, count: 3, gap: 0, title: "Weight", text, symbol });
program.editLegendBlock({ target: "points", channel: "color", values: "auto", order: [1, "2", true] });
// @ts-expect-error editLegendBlock is Full-only.
basic.editLegendBlock({ target: "points", channel: "color", title: "Group" });
// @ts-expect-error target is required.
program.editLegendBlock({ channel: "color", title: "Group" });
// @ts-expect-error channel is required.
program.editLegendBlock({ target: "points", title: "Group" });
// @ts-expect-error R39 owns labelMap.
program.editLegendBlock({ target: "points", channel: "color", labelMap: [] });
// @ts-expect-error symbol keys are closed.
program.editLegendBlock({ target: "points", channel: "color", symbol: { radius: 4 } });
// @ts-expect-error text keys are closed.
program.editLegendBlock({ target: "points", channel: "color", text: { format: ".2f" } });
// @ts-expect-error explicit values require at least one number.
program.editLegendBlock({ target: "points", channel: "size", values: [] });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
