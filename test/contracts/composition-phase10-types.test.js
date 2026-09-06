import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares strict grid, repeat, source, and named-child composition contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-composition-types-"));
  try {
    const file = path.join(directory, "composition.mts");
    await writeFile(file, `
import type {
  ChartProgram, FacetGridOptions, RepeatChartsOptions,
  InsertCompositionChildOptions, ReorderCompositionChildrenOptions
} from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
declare const child: ChartProgram;
const grid: FacetGridOptions = {
  rows: { field: "region", values: ["east", "west"] },
  columns: { field: "year", values: [2024, 2025] },
  combinations: "full", scales: { x: "shared" }, guides: { axes: "outer" }
};
p.facetGrid(grid);
const repeat: RepeatChartsOptions = {
  target: "points", channel: "x", fields: ["sales", "profit"], columns: 2
};
p.repeatCharts(repeat).editFacetSource({ program: child });
p.facet({ field: "region", values: ["west", "east"] });
const insert: InsertCompositionChildOptions = { id: "detail", program: child, after: "overview" };
p.insertCompositionChild(insert).removeCompositionChild({ target: "detail" });
const reorder: ReorderCompositionChildrenOptions = { order: ["detail", "overview"] };
p.reorderCompositionChildren(reorder);
// @ts-expect-error grid requires both rows and columns.
p.facetGrid({ rows: { field: "region" } });
// @ts-expect-error repeat channel is Cartesian x or y.
p.repeatCharts({ channel: "theta", fields: ["sales"] });
// @ts-expect-error repeat fields are non-empty.
p.repeatCharts({ channel: "x", fields: [] });
// @ts-expect-error insert needs a stable child id.
p.insertCompositionChild({ program: child });
// @ts-expect-error reorder requires a non-empty tuple.
p.reorderCompositionChildren({ order: [] });
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
