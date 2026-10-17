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
  DisplayLabelMap,
  EditLegendBlockOptions,
  LegendBlockSymbolPatch,
  LegendBlockTextPatch,
  LegendChannel
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
program.createLegend({ target: "points", at: { x: -20, y: 10 }, blockLayout: "row" });
program.editLegend({ target: "points", position: "bottom-right", blockLayout: "column" });
program.editLegendLayout({ target: "points", at: { x: 201, y: 79 }, blockLayout: "wrap" });
basic.createLegend({ position: "top-left", blockLayout: "row" });
// @ts-expect-error block layout values are closed.
program.editLegendLayout({ blockLayout: "diagonal" });
// @ts-expect-error free anchors require both coordinates.
program.createLegend({ at: { x: 1 } });
// @ts-expect-error free anchor coordinates are numeric.
basic.createLegend({ at: { x: "1", y: 2 } });
const channel: LegendChannel = "strokeWidth";
const text: LegendBlockTextPatch = { fontSize: 14, fontFamily: "Inter", fontWeight: 600, color: "navy" };
const symbol: LegendBlockSymbolPatch = { size: 64, fill: "white", stroke: "black", strokeWidth: 2, opacity: 0.6 };
const options: EditLegendBlockOptions = { target: "points", channel: "size", values: [10], text: {}, symbol: {} };
const labels: DisplayLabelMap = [{ value: 1, label: "one" }, { value: "1", label: "string one" }];
program.editLegendBlock(options);
program.createLegend({combine:"size-shape",channels:["shape","size"]});
basic.createLegend({combine:"size-shape"});
program.editLegend({combine:"separate"});
// @ts-expect-error combination values are closed
program.createLegend({combine:"shape-color"});
program.editLegendBlock({target:"points",channel:"size",position:"bottom-left"});
program.editLegendLayout({channel:"color",position:"inherit"});
// @ts-expect-error local reset grammar is inherit, not auto
program.editLegendBlock({target:"points",channel:"size",position:"auto"});
program.createLegend({position:"right",direction:"horizontal",titlePosition:"bottom"});
basic.createLegend({position:"top",direction:"vertical",titlePosition:"bottom"});
program.editLegendLayout({channel:"color",direction:"auto",titlePosition:"top"});
// @ts-expect-error auto direction is edit-only
program.createLegend({direction:"auto"});
// @ts-expect-error gradient direction is closed
program.editLegendLayout({direction:"diagonal"});
program.createLegend({border:{strokeDash:[4,2,6,1]}});
program.editLegendBorder({border:{strokeDash:[]}});
// @ts-expect-error dash entries are numeric
program.editLegendBorder({border:{strokeDash:["dash",2]}});
program.editLegendBlock({target:"points",channel:"size",labelMap:[{value:3.14159,label:"zero"}]});
program.editLegendBlock({ target: "points", channel, count: 3, gap: 0, title: "Weight", text, symbol });
program.editLegendBlock({ target: "points", channel: "color", values: "auto", order: [1, "2", true] });
program.editLegendBlock({ target: "points", channel: "color", labelMap: labels });
program.editLegendBlock({ target: "points", channel: "color", labelMap: "auto" });
// @ts-expect-error editLegendBlock is Full-only.
basic.editLegendBlock({ target: "points", channel: "color", title: "Group" });
// @ts-expect-error target is required.
program.editLegendBlock({ channel: "color", title: "Group" });
// @ts-expect-error channel is required.
program.editLegendBlock({ target: "points", title: "Group" });
// @ts-expect-error display labels must be strings.
program.editLegendBlock({ target: "points", channel: "color", labelMap: [{ value: "A", label: 1 }] });
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
