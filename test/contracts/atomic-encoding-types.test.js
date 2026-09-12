import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares the closed full-only atomic encoding payload", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-atomic-encoding-types-"));
  try {
    const file = path.join(directory, "atomic-encoding.mts");
    await writeFile(file, `
import type { ChartProgram, EncodeChannelsOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const program: ChartProgram;
declare const basic: BasicChartProgram;
const options: EncodeChannelsOptions = {
  target: "points",
  channels: {
    x: { field: "a", scale: { id: "x", domain: [0, 10] } },
    y: { datum: 0 },
    color: { field: "group" },
    stroke: { field: "outline" },
    size: { field: "measure", scale: { type: "sqrt" } },
    angle: { value: 45 }
  }
};
program.encodeChannels(options);
program.encodeChannels({ target: "area", channels: { x2: { datum: 0 }, group: { fields: ["a", "b"] } } });
program.encodeChannels({ target: "polar", channels: { theta: { field: "angle" }, r: { field: "radius", mapping: false } } });
program.encodeChannels({ target: "line", channels: { pathOrder: { field: "order" }, strokeDash: { value: [4, 2] } } });
program.encodeChannels({ target: "bar", channels: { y2: { field: "high" }, xOffset: { field: "series" }, yOffset: { field: "series" } } });
program.encodeChannels({ target: "point", channels: { shape: { field: "kind" }, opacity: { value: 0.5 } } });
program.encodeChannels({ target: "rule", channels: { strokeWidth: { field: "weight" } } });
program.encodeChannels({ target: "text", channels: { text: { value: "hello" } } });
// @ts-expect-error encodeChannels is Full-only
basic.encodeChannels({ target: "points", channels: { x: { field: "a" } } });
// @ts-expect-error target is required for an atomic assignment
program.encodeChannels({ channels: { x: { field: "a" } } });
// @ts-expect-error at least one channel is required
program.encodeChannels({ target: "points", channels: {} });
// @ts-expect-error target belongs only at the batch root
program.encodeChannels({ target: "points", channels: { x: { target: "other", field: "a" } } });
// @ts-expect-error coordinate belongs only to the existing target
program.encodeChannels({ target: "points", channels: { x: { coordinate: "cartesian", field: "a" } } });
// @ts-expect-error radius is not the public batch spelling
program.encodeChannels({ target: "polar", channels: { radius: { field: "radius" } } });
// @ts-expect-error null is not an unencode request
program.encodeChannels({ target: "points", channels: { color: null } });
// @ts-expect-error value and field remain exclusive
program.encodeChannels({ target: "points", channels: { stroke: { value: "red", field: "outline" } } });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
