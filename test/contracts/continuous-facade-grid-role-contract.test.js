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
const source = () => chart().createCanvas({ width: 600, height: 420, margin: 80 })
  .createData({ id: "rows", values: [
    { category: "A", x: 1, y: 2, time: "2024-01-01" },
    { category: "B", x: 2, y: 4, time: "2024-01-02" },
    { category: "C", x: 3, y: 3, time: "2024-01-03" }
  ] });

const continuousCases = [
  ...[undefined, "zero", "normalize", null].flatMap(stack => ["vertical", "horizontal"].map(direction => ({
    action: "createHistogram", options: { field: "x", maxBins: 2,
      ...(stack === undefined ? {} : { stack }) }, direction
  }))),
  ...["x", "y"].flatMap(densityChannel => ["vertical", "horizontal"].map(direction => ({
    action: "createDensityPlot", options: { field: "y", bandwidth: 1, steps: 8, densityChannel }, direction
  }))),
  ...["x", "y"].flatMap(channel => ["quantitative", "temporal"].map(fieldType => ({
    action: "createRugPlot", options: { [channel]: { field: fieldType === "temporal" ? "time" : "x", fieldType }, edge: channel === "x" ? "bottom" : "left" },
    direction: channel === "x" ? "vertical" : "horizontal"
  }))),
  ...["quantitative", "temporal"].map(fieldType => ({
    action: "createHorizonPlot", options: { x: { field: fieldType === "temporal" ? "time" : "x", fieldType }, y: "y" }, direction: "vertical"
  }))
];

test("continuous facade grids reject categorical band placement without changing prior state", () => {
  const before = source(), saved = JSON.stringify(before);
  for (const { action, options, direction } of continuousCases) {
    for (const bandPosition of ["center", "boundary"]) {
      const guides = { axes: false, legend: false, grid: {
        vertical: false, horizontal: false, [direction]: { bandPosition }
      } };
      const input = { ...options, guides }, inputSnapshot = JSON.stringify(input);
      assert.throws(() => before[action](input), /Grid bandPosition requires a band scale\./u);
      assert.equal(JSON.stringify(before), saved);
      assert.equal(JSON.stringify(input), inputSnapshot);
    }
  }
});

test("area facade keeps native band grids for both independent-channel orientations", () => {
  for (const valueChannel of ["x", "y"]) {
    const categoryChannel = valueChannel === "x" ? "y" : "x";
    const direction = categoryChannel === "x" ? "vertical" : "horizontal";
    for (const bandPosition of ["center", "boundary"]) {
      const p = source().createAreaPlot({ valueChannel,
        [categoryChannel]: { field: "category", fieldType: "nominal", scale: { type: "band" } },
        [valueChannel]: "y", guides: { axes: false, legend: false, grid: {
          vertical: false, horizontal: false, [direction]: { bandPosition }
        } }
      });
      assert.equal(p.guideConfigs.grid[direction].bandPosition, bandPosition);
      assert.equal(p.resolvedScales[p.guideConfigs.grid[direction].scale].type, "band");
      assert.ok(p.graphicSpec.objects[`${direction}GridLines`].items.length >= 3);
    }
  }
});

test("unrelated band resources cannot replace continuous facade grid ownership", () => {
  const base = source().createCoordinate({ id: "main", type: "cartesian" })
    .createScale({ id: "unrelated", type: "band", domain: ["A", "B", "C"], range: [80, 520] });
  const saved = JSON.stringify(base);
  for (const { action, options, direction } of continuousCases) {
    for (const bandPosition of ["center", "boundary"]) {
      assert.throws(() => base[action]({ ...options, coordinate: "main", guides: {
        axes: false, legend: false, grid: {
          vertical: false, horizontal: false,
          [direction]: { scale: "unrelated", coordinate: "main", bandPosition }
        }
      } }), /Facade guide conflict: (horizontal|vertical) grid does not belong to this facade\./u);
      assert.equal(JSON.stringify(base), saved);
    }
  }
});

test("continuous facade grid declarations prohibit only physically impossible band roles", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-continuous-grid-types-"));
  try {
    const file = path.join(directory, "grids.mts");
    const cases = [
      ...["vertical", "horizontal"].map(direction => `p.createHistogram({field:"x",guides:{grid:{${direction}:{bandPosition:"center"}}}});`),
      ...["vertical", "horizontal"].map(direction => `p.createDensityPlot({field:"y",guides:{grid:{${direction}:{bandPosition:"center"}}}});`),
      ...["vertical", "horizontal"].map(direction => `p.createRugPlot({x:"x",edge:"bottom",guides:{grid:{${direction}:{bandPosition:"center"}}}});`),
      'p.createHorizonPlot({x:"x",y:"y",guides:{grid:{vertical:{bandPosition:"boundary"}}}});'
    ];
    await writeFile(file, `import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
p.createHistogram({field:"x",guides:{grid:{vertical:{count:4,alongOffset:1,zIndex:-1},horizontal:{values:[1,2]}}}});
p.createDensityPlot({field:"y",guides:{grid:{vertical:{count:4,alongOffset:1,zIndex:1}}}});
p.createRugPlot({y:"y",edge:"left",guides:{grid:{horizontal:{values:[1,2],alongOffset:-1}}}});
p.createHorizonPlot({x:"x",y:"y",guides:{grid:{vertical:{count:4,zIndex:-1}}}});
p.createAreaPlot({x:{field:"category",fieldType:"nominal",scale:{type:"band"}},y:"y",guides:{grid:{vertical:{bandPosition:"center"}}}});
p.createAreaPlot({valueChannel:"x",x:"y",y:{field:"category",fieldType:"nominal",scale:{type:"band"}},guides:{grid:{horizontal:{bandPosition:"boundary"}}}});
${cases.map(call => `// @ts-expect-error Continuous scale grids have no band edges.\n${call}`).join("\n")}
const nonfresh = {bandPosition:"center" as const};
// @ts-expect-error Non-fresh values cannot bypass the closed continuous grid role.
p.createDensityPlot({field:"y",guides:{grid:{vertical:nonfresh}}});
// @ts-expect-error Histogram grids also reject non-fresh categorical band placement.
p.createHistogram({field:"x",guides:{grid:{vertical:nonfresh}}});
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("generated option inventory retains real band paths and omits unreachable continuous ones", async () => {
  const cards = JSON.parse(await readFile(path.join(root, "knowledge/action-cards.json"), "utf8"));
  const inventory = await buildPublicOptionInventory(cards);
  const paths = new Map(inventory.optionPaths.map(option => [option.id, option]));
  for (const [action, directions] of [["createHistogram", ["vertical", "horizontal"]], ["createDensityPlot", ["vertical", "horizontal"]], ["createRugPlot", ["vertical", "horizontal"]], ["createHorizonPlot", ["vertical"]]]) {
    for (const direction of directions) assert.equal(paths.has(`option-path:${action}.guides.grid.${direction}.bandPosition`), false);
  }
  for (const action of ["createAreaPlot", "createStripPlot", "createBeeswarmPlot", "createRaincloudPlot"]) {
    for (const direction of ["vertical", "horizontal"]) {
      const id = `option-path:${action}.guides.grid.${direction}.bandPosition`;
      assert.equal(paths.get(id)?.required, true, id);
      assert.deepEqual(paths.get(id)?.values, ["string:boundary", "string:center"], id);
    }
  }
});
