import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares channel-specific scale editors with channel-appropriate options", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-focused-scale-types-"));
  try {
    const file = path.join(directory, "focused-scales.mts");
    await writeFile(file, `
import type { ChartProgram } from ${JSON.stringify(path.join(root, "types/program.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { EditColorScaleOptions, EditRScaleOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const colorOptions: EditColorScaleOptions = { palette: "set2" };
const radiusOptions: EditRScaleOptions = { domain: [0, 10] };
p.editColorScale(colorOptions);
p.editRScale(radiusOptions);
p.editXScale({ target: "points", type: "log", domain: [1, 100], base: 10 });
p.editYScale({ id: "y", type: "band", paddingInner: 0.2 });
p.editThetaScale({ reverse: true, range: [0, 270] });
p.editRScale({ domain: [0, 10], radialMapping: "area" });
p.editColorScale({ range: ["#111", "#eee"] });
p.editColorScale({ type: "sequential", palette: "viridis", midpoint: "auto" });
p.editSizeScale({ range: [20, 200], unknown: 20 });
p.editOpacityScale({ range: [0.2, 0.9], clamp: true });
p.editShapeScale({ range: ["circle", "diamond"], unknown: "square" });
p.editStrokeWidthScale({ type: "sqrt", range: [1, 8] });
p.editStrokeDashScale({ range: [[], [4, 2]] });
// @ts-expect-error focused editors are Full-only
basic.editColorScale({ range: ["red", "blue"] });
// @ts-expect-error color scales do not support nice
p.editColorScale({ nice: true });
// @ts-expect-error size scales do not support reverse
p.editSizeScale({ reverse: true });
// @ts-expect-error theta scales do not support logarithmic parameters
p.editThetaScale({ base: 10 });
// @ts-expect-error graphical radius is separate from radial position scale editing
p.editRScale({ value: 4 });
// @ts-expect-error stroke dash ranges contain dash patterns
p.editStrokeDashScale({ range: [1, 2] });
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
