import { compileTypeScript } from "../support/typescript.js";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Box and Gradient facades expose ordinary field and fixed color encodings", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-distribution-color-types-"));
  try {
    const file = path.join(directory, "color.mts");
    await writeFile(file, `
import type { ChartProgram, BoxPlotOptions, GradientPlotOptions } from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
const box: BoxPlotOptions = { color: "group" };
const gradient: GradientPlotOptions = { color: { field: "group", fieldType: "nominal", scale: { palette: "tableau10" } } };
p.createBoxPlot(box);
p.createGradientPlot(gradient);
p.createBoxPlot({ color: { value: "#123456" }, guides: {} });
p.createGradientPlot({ color: { value: "#123456" }, guides: false });
// @ts-expect-error a numeric literal is not a color encoding
p.createBoxPlot({ color: 42 });
// @ts-expect-error ranged box bodies do not aggregate continuous color
p.createBoxPlot({ color: { field: "value", fieldType: "quantitative", scale: { type: "sequential" } } });
// @ts-expect-error fill belongs to mark styles, not color encoding
p.createGradientPlot({ color: { fill: "blue" } });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
