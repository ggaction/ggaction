import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart } from "../../src/index.js";
import { buildPublicOptionInventory } from "../support/scenarios/coverage-inventory.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const rows = Object.freeze([
  Object.freeze({ category: "A", x: 1, y: 2, time: "2024-01-01" }),
  Object.freeze({ category: "B", x: 2, y: 3, time: "2024-01-02" }),
  Object.freeze({ category: "C", x: 3, y: 4, time: "2024-01-03" })
]);

function source() {
  return chart()
    .createCanvas({ width: 480, height: 320, margin: 55 })
    .createData({ id: "rows", values: rows });
}

test("line horizontal grids reject band positioning for every supported y role atomically", () => {
  const base = source();
  const before = JSON.stringify(base);
  const input = JSON.stringify(rows);
  for (const bandPosition of ["center", "boundary"]) {
    for (const y of ["y", { field: "time", fieldType: "temporal" }]) {
      assert.throws(() => base.createLinePlot({
        x: "x", y,
        guides: {
          axes: false, legend: false,
          grid: { horizontal: { bandPosition }, vertical: false }
        }
      }), /Grid bandPosition requires a band scale\./u);
      assert.equal(JSON.stringify(base), before);
      assert.equal(JSON.stringify(rows), input);
    }
  }
});

test("line vertical grids retain both band positioning values on categorical x", () => {
  const base = source();
  const before = JSON.stringify(base);
  for (const bandPosition of ["center", "boundary"]) {
    const program = base.createLinePlot({
      x: { field: "category", fieldType: "nominal", scale: { type: "band" } },
      y: "y",
      guides: {
        axes: false, legend: false,
        grid: { vertical: { bandPosition }, horizontal: false }
      }
    });
    assert.equal(program.resolvedScales.x.type, "band");
    assert.equal(program.guideConfigs.grid.vertical.bandPosition, bandPosition);
    assert.equal(program.guideConfigs.grid.vertical.scale, "x");
    assert.ok(program.graphicSpec.objects.verticalGridLines.items.length >= rows.length);
    assert.equal(JSON.stringify(base), before);
  }
  const scatter = base.createScatterPlot({
    x: "x",
    y: { field: "category", fieldType: "nominal", scale: { type: "band" } },
    guides: {
      axes: false, legend: false,
      grid: { horizontal: { bandPosition: "boundary" }, vertical: false }
    }
  });
  assert.equal(scatter.guideConfigs.grid.horizontal.bandPosition, "boundary");
  assert.equal(scatter.resolvedScales.y.type, "band");
});

test("an auxiliary band scale cannot replace the line facade's horizontal grid owner", () => {
  const base = source()
    .createCoordinate({ id: "main", type: "cartesian" })
    .createScale({ id: "aux", type: "band", domain: ["A", "B"], range: [210, 0] });
  const before = JSON.stringify(base);
  for (const bandPosition of ["center", "boundary"]) {
    assert.throws(() => base.createLinePlot({
      coordinate: "main", x: "x", y: "y",
      guides: {
        axes: false, legend: false,
        grid: {
          horizontal: { scale: "aux", coordinate: "main", bandPosition },
          vertical: false
        }
      }
    }), /Facade guide conflict: horizontal grid does not belong to this facade\./u);
    assert.equal(JSON.stringify(base), before);
  }
});

test("line grid declarations prohibit only the impossible horizontal band role", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-line-grid-role-types-"));
  try {
    const file = path.join(directory, "line-grid.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
p.createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:true,vertical:false}}});
p.createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:{count:4,alongOffset:2}}}});
p.createLinePlot({x:{field:"category",fieldType:"nominal",scale:{type:"band"}},y:"y",guides:{grid:{vertical:{bandPosition:"center"}}}});
p.createLinePlot({x:{field:"category",fieldType:"nominal",scale:{type:"band"}},y:"y",guides:{grid:{vertical:{bandPosition:"boundary"}}}});
basic().createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:{count:4}}}});
p.createScatterPlot({x:"x",y:{field:"category",fieldType:"nominal",scale:{type:"band"}},guides:{grid:{horizontal:{bandPosition:"boundary"}}}});
p.createGrid({horizontal:{bandPosition:"center"}});
// @ts-expect-error Quantitative line y cannot provide a horizontal band grid.
p.createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:{bandPosition:"center"}}}});
// @ts-expect-error Quantitative line y cannot provide band boundaries.
p.createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:{bandPosition:"boundary"}}}});
// @ts-expect-error Temporal line y cannot provide a horizontal band grid.
p.createLinePlot({x:"x",y:{field:"time",fieldType:"temporal"},guides:{grid:{horizontal:{bandPosition:"center"}}}});
// @ts-expect-error Temporal line y cannot provide band boundaries.
p.createLinePlot({x:"x",y:{field:"time",fieldType:"temporal"},guides:{grid:{horizontal:{bandPosition:"boundary"}}}});
// @ts-expect-error Basic shares the same line role constraint.
basic().createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:{bandPosition:"center"}}}});
const invalidHorizontal = {bandPosition:"boundary" as const};
// @ts-expect-error Non-fresh objects must not bypass the prohibited property.
p.createLinePlot({x:"x",y:"y",guides:{grid:{horizontal:invalidHorizontal}}});
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the option inventory follows the corrected line role without excluding valid grid options", async () => {
  const cards = JSON.parse(await readFile(path.join(root, "knowledge/action-cards.json"), "utf8"));
  const inventory = await buildPublicOptionInventory(cards);
  const paths = new Map(inventory.optionPaths.map(option => [option.id, option]));
  const impossible = "option-path:createLinePlot.guides.grid.horizontal.bandPosition";
  assert.equal(paths.has(impossible), false);
  assert.equal(inventory.pathLiteralRequirements.some(requirement =>
    requirement.optionPath === impossible
  ), false);
  for (const id of [
    "option-path:createLinePlot.guides.grid.vertical.bandPosition",
    "option-path:createScatterPlot.guides.grid.horizontal.bandPosition",
    "option-path:createScatterPlot.guides.grid.vertical.bandPosition",
    "option-path:createGrid.horizontal.bandPosition",
    "option-path:createGrid.vertical.bandPosition"
  ]) {
    assert.equal(paths.get(id)?.required, true, id);
    assert.deepEqual(paths.get(id)?.values, ["string:boundary", "string:center"], id);
  }
});
