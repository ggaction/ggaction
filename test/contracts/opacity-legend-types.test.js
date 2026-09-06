import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares opacity point recipes across legend creation, edits and guide options", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-opacity-legend-types-"));
  try {
    const file = path.join(directory, "legend.mts");
    await writeFile(file, `
import type { ChartProgram, LegendOptions, EditLegendSymbolsOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
declare const p: ChartProgram;
const options: LegendOptions = { channels: ["opacity"], symbol: { type: "point", radius: 9, fill: "red", stroke: "black", strokeWidth: 2 } };
p.createLegend(options);
p.createLegend({ channels: ["opacity"], symbol: { radius: 9 } });
p.createLegend({ channels: ["opacity"], symbol: { fill: "red" } });
p.createLegend({ channels: ["opacity"], symbol: { type: "point" } });
p.editLegend({ symbol: { radius: 11 } });
const symbols: EditLegendSymbolsOptions = { symbol: { type: "point", radius: 13 } };
p.editLegendSymbols(symbols);
p.createGuides({ legend: options });
p.createGuides({ legend: { channels: ["opacity"], symbol: { radius: 9 } } });
// Existing categorical recipes retain their forms.
p.createLegend({ symbol: { length: 32, lineWidth: 2 } });
p.createLegend({ symbol: { width: 14, height: 12 } });
p.editLegendSymbols({ symbol: { layers: [{ type: "point", size: 9 }, { type: "line", length: 32 }] } });
// @ts-expect-error Opacity recipe uses point, not a concrete circle type.
p.createLegend({ channels: ["opacity"], symbol: { type: "circle", radius: 9 } });
// @ts-expect-error Radius is numeric.
p.editLegend({ symbol: { radius: "9" } });
// @ts-expect-error Fill is a color string.
p.editLegendSymbols({ symbol: { type: "point", fill: 4 } });
// @ts-expect-error Unknown symbol properties remain rejected.
p.createGuides({ legend: { channels: ["opacity"], symbol: { radius: 9, diameter: 18 } } });
// @ts-expect-error Categorical point layers use size, not opacity radius.
p.createLegend({ symbol: { layers: [{ type: "point", radius: 9 }] } });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
