import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { chart } from "../../../src/index.js";
import { renderToPNG } from "../../../src/renderers/png.js";

const temporaryDirectories = [];

test.afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory =>
    rm(directory, { recursive: true, force: true })
  ));
});

function pngProgram() {
  return chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: 12 })
    .editGraphics({ target: "canvas", property: "height", value: 8 })
    .editGraphics({ target: "canvas", property: "background", value: "white" });
}

async function outputPath() {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-png-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "nested", "chart.png");
}

test("writes a PNG and reports physical dimensions", async () => {
  const output = await outputPath();
  const result = await renderToPNG(pngProgram(), { output, pixelRatio: 2 });
  const bytes = await readFile(output);

  assert.equal(result.output, path.resolve(output));
  assert.equal(result.width, 24);
  assert.equal(result.height, 16);
  assert.equal(result.pixelRatio, 2);
  assert.equal(result.bytes, bytes.length);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("uses a 1x default and replaces an existing output deterministically", async () => {
  const output = await outputPath();
  const first = await renderToPNG(pngProgram(), { output });
  const firstBytes = await readFile(output);
  const second = await renderToPNG(pngProgram(), { output });
  const secondBytes = await readFile(output);

  assert.equal(first.width, 12);
  assert.equal(first.height, 8);
  assert.equal(first.pixelRatio, 1);
  assert.equal(second.bytes, first.bytes);
  assert.deepEqual(secondBytes, firstBytes);
});

test("writes an item-local linear gradient through the Node Canvas adapter", async () => {
  const output = await outputPath();
  const program = pngProgram()
    .createGraphics({ id: "strip", type: "rect" })
    .editGraphics({ target: "strip", property: "x", value: 2 })
    .editGraphics({ target: "strip", property: "y", value: 1 })
    .editGraphics({ target: "strip", property: "width", value: 8 })
    .editGraphics({ target: "strip", property: "height", value: 6 })
    .editGraphics({
      target: "strip",
      property: "fill",
      value: {
        type: "linear-gradient",
        from: { x: 0, y: 0.5 },
        to: { x: 1, y: 0.5 },
        stops: [
          { offset: 0, color: "rgba(207, 225, 242, 0)" },
          { offset: 1, color: "rgba(10, 74, 144, 1)" }
        ]
      }
    })
    .editGraphics({ target: "strip", property: "stroke", value: "#0a4a90" })
    .editGraphics({ target: "strip", property: "strokeWidth", value: 0 });

  const result = await renderToPNG(program, { output, pixelRatio: 2 });

  assert.equal(result.width, 24);
  assert.equal(result.height, 16);
  assert.ok(result.bytes > 80);
});

test("rejects a missing or empty output path", async () => {
  await assert.rejects(() => renderToPNG(pngProgram()), /non-empty output path/);
  await assert.rejects(
    () => renderToPNG(pngProgram(), { output: "" }),
    /non-empty output path/
  );
});

test("rejects unsafe physical dimensions before replacing output", async () => {
  const output = await outputPath();
  await renderToPNG(pngProgram(), { output });
  await writeFile(output, "existing");
  const program = chart().createCanvas({
    width: Number.MAX_VALUE,
    height: 1,
    margin: 0
  });

  await assert.rejects(
    renderToPNG(program, { output, pixelRatio: 2 }),
    /physical Canvas dimensions must be finite safe integers/
  );
  assert.equal(await readFile(output, "utf8"), "existing");
});

test("rejects unsafe native geometry before replacing output", async () => {
  const output = await outputPath();
  await renderToPNG(pngProgram(), { output });
  await writeFile(output, "existing");
  const program = {
    graphicSpec: {
      objects: {
        canvas: {
          type: "canvas",
          properties: { width: 12, height: 8 }
        },
        unsafe: {
          type: "circle",
          properties: { x: 16_777_217, y: 0, radius: 1, fill: "red" }
        }
      },
      order: ["canvas", "unsafe"]
    }
  };

  await assert.rejects(
    renderToPNG(program, { output }),
    /Canvas native geometry.*16777216/
  );
  assert.equal(await readFile(output, "utf8"), "existing");
});
