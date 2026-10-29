import assert from "node:assert/strict";
import test from "node:test";
import { createFontExample } from "../../../examples/font-assets/program.js";
import { createFontPrimitive } from "./primitive.program.js";
import { fonts } from "../../../examples/font-assets/fonts/manifest.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../../src/persistence.js";

test("fixed Korean, combining and joined emoji keep exact authored lines and concrete primitive equality", () => {
  const program = createFontExample(), primitive = createFontPrimitive();
  assert.deepEqual(program.graphicSpec, primitive.graphicSpec);
  assert.deepEqual(program.graphicSpec.objects.chartTitle.items.map(item => [item.properties.text, item.properties.x, item.properties.y]),
    [["한글 글꼴과 긴", 40, 30], ["이름", 40, 63.6], ["e\u0301 A B", 40, 97.2]]);
  assert.equal(program.graphicSpec.objects.chartSubtitle.properties.text, "👩‍🔬 🙂 🇩🇰");
  const profile = program.materializationConfigs.textMetrics;
  const find = text => profile.measurements.find(measurement => measurement.text === text).width;
  assert.equal(fonts[0].unitsPerEm, 1000); assert.equal(fonts[0].advances["한"], 920);
  assert.ok(Math.abs(find("한글") - 2 * 920 / 1000 * 28) < 0.001);
  assert.equal(fonts[1].unitsPerEm, 2048); assert.equal(fonts[1].advances["🙂"], 2600);
  assert.ok(Math.abs(find("🙂") - 2600 / 2048 * 24) < 0.002);
  assert.ok(Math.abs(find("👩‍🔬") - find("🙂")) < 0.002);
  assert.ok(Math.abs(find("🇩🇰") - find("🙂")) < 0.002);
  assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(program)).graphicSpec, program.graphicSpec);
});
