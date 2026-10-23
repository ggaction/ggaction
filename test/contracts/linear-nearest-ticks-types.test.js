import { compileTypeScript } from "../support/typescript.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("Cartesian tick rounding types cover full, focused, Basic and nested facade authoring", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-tick-rounding-types-"));
  try {
    const file = path.join(dir, "rounding.mts");
    await writeFile(file, `
import {chart, type AxisTickRounding} from ${JSON.stringify(path.join(root, "types/index.js"))};
import {chart as basic, type AxisTickRounding as BasicRounding} from ${JSON.stringify(path.join(root, "types/basic.js"))};
const rounding: AxisTickRounding = "nearest";
const reset: BasicRounding = "ceiling";
chart().createXAxis({ticksAndLabels:{rounding}});
chart().createYAxisTicksAndLabels({count:5,rounding});
chart().createYAxisTicks({rounding});
chart().createYAxisLabels({rounding});
chart().editYAxisTicks({rounding:reset});
chart().editYAxisLabels({rounding});
chart().editYAxisTicksAndLabels({rounding});
chart().editYAxis({ticksAndLabels:{rounding}});
basic().createYAxis({ticksAndLabels:{rounding}});
basic().createLinePlot({x:"x",y:"y",guides:{axes:{y:{ticksAndLabels:{rounding}}}}});
// @ts-expect-error closed rounding vocabulary
chart().createXAxis({ticksAndLabels:{rounding:"auto"}});
// @ts-expect-error boolean is not a rounding strategy
chart().editXAxisTicks({rounding:true});
// @ts-expect-error Cartesian selection does not broaden Polar APIs
chart().createThetaAxisTicks({rounding});
// @ts-expect-error Cartesian selection does not broaden Parallel APIs
chart().createParallelAxes({rounding});
// @ts-expect-error grids inherit the policy from ticks rather than accepting it
chart().createHorizontalGrid({rounding});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
