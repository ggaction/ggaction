import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares typed display maps on supported axis, legend, and facet surfaces", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-display-label-types-"));
  try {
    const file = path.join(directory, "display-labels.mts");
    await writeFile(file, `
import type {
  ChartProgram,
  CreateThetaAxisLabelsOptions,
  DisplayLabelMap,
  EditFacetHeadersOptions,
  ThetaAxisLabelOptions
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
const map: DisplayLabelMap = [{ value: 1, label: "one" }, { value: "1", label: "string one" }];
const thetaCreate: CreateThetaAxisLabelsOptions = { values: [1, "1"], labelMap: map };
const thetaEdit: ThetaAxisLabelOptions = { values: [1, "1"], labelMap: map };
const facet: EditFacetHeadersOptions = { role: "row", side: "left", align: "end", labelMap: "auto" };
program.createXAxisLabels({ values: [1, "1"], labelMap: map });
program.createXAxisTicksAndLabels({ values: [1, "1"], labels: { labelMap: [] } });
program.createThetaAxisLabels(thetaCreate);
program.createThetaAxis({ ticksAndLabels: { values: [1, "1"], labels: { labelMap: map } } });
program.editThetaAxis({ labels: { labelMap: "auto" } });
program.editThetaAxisLabels(thetaEdit);
program.editFacetHeaders(facet);
basic.createXAxisLabels({ values: [1, "1"], labelMap: map });
// @ts-expect-error radial labels do not accept categorical display maps.
program.createRadialAxisLabels({ values: [0, 1], labelMap: map });
// @ts-expect-error labels are strings.
program.editFacetHeaders({ labelMap: [{ value: "A", label: 1 }] });
// @ts-expect-error header roles are closed.
program.editFacetHeaders({ role: "cell", color: "red" });
// @ts-expect-error header sides are closed.
program.editFacetHeaders({ role: "row", side: "inline" });
// @ts-expect-error editFacetHeaders remains Full-only.
basic.editFacetHeaders({ color: "red" });
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
