import assert from "node:assert/strict";
import test from "node:test";
import { render } from "../../../../src/renderers/canvas/index.js";
import { renderToSVG } from "../../../../src/renderers/svg.js";
import { serializeProgram, deserializeProgram } from "../../../../src/persistence.js";
import { createMockCanvasContext } from "../../../support/canvas.js";
import { graphemeProgram, graphemes, labelLines, graphicLines } from "../../../support/text/grapheme-wrapping.js";

for (const mode of ["word", "character"]) {
  test(`${mode} wrapping stores complete title and axis graphemes through replay and persistence`, () => {
    const program = graphemeProgram(mode), before = serializeProgram(program);
    assert.deepEqual(graphicLines(program, "chartTitle"), graphemes);
    assert.deepEqual(graphicLines(program, "xAxisLabels"), labelLines);
    const labels = program.graphicSpec.objects.xAxisLabels.items;
    for (let index = 1; index < labels.length; index++) {
      assert.equal(labels[index].properties.y - labels[index - 1].properties.y, 16);
    }
    const replayed = program.editCanvas({ width: 720 });
    assert.deepEqual(graphicLines(replayed, "chartTitle"), graphemes);
    assert.deepEqual(graphicLines(replayed, "xAxisLabels"), labelLines);
    assert.deepEqual(deserializeProgram(serializeProgram(replayed)).graphicSpec, replayed.graphicSpec);
    assert.equal(serializeProgram(program), before);
    const canvas = createMockCanvasContext();
    render(replayed, canvas);
    const painted = canvas.calls.filter(call => call.op === "fillText").map(call => call.args[0]);
    const svg = renderToSVG(replayed);
    for (const cluster of graphemes) {
      assert.equal(painted.filter(text => text === cluster).length, 2);
      assert.equal(svg.split(`>${cluster}</text>`).length - 1, 2);
    }
  });
}
test("axis hard CR breaks survive removal of a wrap policy", () => {
  const program = graphemeProgram().editXAxisLabels({ maxWidth: false,
    labelMap: [{ value: 0, label: "A\r\rB\r" }] });
  assert.deepEqual(graphicLines(program, "xAxisLabels"), ["A", "", "B", ""]);
});
