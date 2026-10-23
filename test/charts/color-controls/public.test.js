import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "../../../src/index.js";
import { summarizeArgs } from "../../../src/core/action.js";
import { referenceLabColor, referenceCubehelixColor, referenceSignedPower } from "../../oracles/color-interpolation.js";
import { assertChartProgramsEquivalent } from "../../support/chart-equivalence.js";
import { assertDisplayedProgram, displayedActionCalls } from "../../support/visual-variants.js";
import { visualVariants } from "./manifest.js";
import { literalColors, rowGeometry } from "./fixtures.js";

for (const variant of visualVariants) {
  test(`${variant.variant} public edits preserve exact primitive structure, calls and all pixels`, () => {
    const program = variant.userFacing();
    const primitive = variant.primitive();
    assertDisplayedProgram(variant, program);
    assert.deepEqual(program.trace.children.map(({op,args}) => ({op,args})),
      displayedActionCalls(variant.callChain).map(({op,args}) => ({op,args:summarizeArgs(args)})));
    assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: primitive, compareSemanticSpec: false });
    for (const region of variant.regions) {
      assert.deepEqual(program.graphicSpec.objects[region.name].items.map(item => item.properties.fill), region.colors.map(color => color.value));
    }
    const rendered = [program, primitive].map(value => {
      const context = createCanvas(480, 270).getContext("2d");
      render(value, context);
      return context.getImageData(0, 0, 480, 270).data;
    });
    assert.deepEqual(rendered[0], rendered[1]);
    assert.equal(rendered[0].length, 480 * 270 * 4);
    for (const region of variant.regions) {
      const {x, y, width, height} = rowGeometry[region.name];
      program.graphicSpec.objects[region.name].items.forEach((item, i) => {
        assert.deepEqual({x:item.properties.x,y:item.properties.y,width:item.properties.width,height:item.properties.height}, {x:x+i*width,y,width,height});
      });
    }
  });
}

test("all 18 Lab, 18 gamma and 9 signed-power literal colors match independent formulas", () => {
  const positions = Array.from({length:9}, (_,i) => i / 8);
  for (const whitePoint of ["d65", "d50"]) {
    assert.deepEqual(positions.map(t => referenceLabColor([1,0,0],[0,0,1],t,whitePoint)), literalColors[whitePoint]);
  }
  for (const [name, gamma] of [["gamma1",1],["gamma22",2.2]]) {
    assert.deepEqual(positions.map(t => referenceCubehelixColor([117,25,11],[144,242,164],t,gamma)), literalColors[name]);
  }
  assert.deepEqual(positions.map(t => {
    const value = -2 + 4 * t;
    const position = referenceSignedPower(value, [-2,2], 3);
    return "#" + [255*position,0,255*(1-position)].map(channel => Math.round(channel).toString(16).padStart(2,"0")).join("");
  }), literalColors.power);
});

test("zero and negative gamma literals match independently solved public RGB endpoints", () => {
  const positions = Array.from({length:9}, (_,i) => i / 8);
  for (const [name, gamma] of [["gamma0", 0], ["gammaNegative", -.1]]) {
    assert.deepEqual(positions.map(t => referenceCubehelixColor([117,25,11],[144,242,164],t,gamma)), literalColors[name]);
  }
});
