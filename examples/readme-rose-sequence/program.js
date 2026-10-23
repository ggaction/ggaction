import { chart } from "../../src/index.js";

// The paper teaser's seven authoring steps, preceded by its canvas setup.
export const README_ACTION_LINES = Object.freeze([
  { id: "canvas", code: ".createCanvas(...)" },
  { id: "data", code: ".createData(...)" },
  { id: "rose", code: '.createRosePlot({category:"month"})' },
  { id: "radius", code: '.encodeR({field:"value", ...})' },
  { id: "color", code: '.encodeColor({field:"cause", ...})' },
  { id: "spacing", code: '.editArcMark({padAngle:2})' },
  { id: "title", code: ".createTitle(...)" },
  { id: "palette", code: '.editColorScale({palette:"dark2"})' }
].map(Object.freeze));

export function createReadmeAuthoringDemo(nightingale) {
  const actions = [
    program => program.createCanvas({
      width: 540, height: 430,
      margin: { top: 90, right: 170, bottom: 65, left: 55 }
    }),
    program => program.createData({ values: nightingale }),
    program => program.createRosePlot({ category: "month" }),
    // Clear the constructor's count mapping before encoding mortality values.
    program => program.encodeR({ field: "value", mapping: false }),
    program => program.encodeColor({ field: "cause", layout: "overlay" }),
    program => program.editArcMark({ padAngle: 2 }),
    program => program.createTitle({
      text: "Causes of Mortality in the Army in the East",
      titleStyle: { fontSize: 14 }
    }),
    program => program.editColorScale({ palette: "dark2" })
  ];
  const delays = [500, 700, 1800, 1800, 2200, 1800, 2000, 4200];
  let program = chart();
  const stages = actions.map((apply, index) => {
    program = apply(program);
    return Object.freeze({
      id: README_ACTION_LINES[index].id,
      actionIndex: index,
      program,
      renderable: true,
      delayMs: delays[index]
    });
  });
  return { stages, finalProgram: program };
}
