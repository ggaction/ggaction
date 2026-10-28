import { chart } from "../../../src/index.js";

export const graphemes = Object.freeze(["e\u0301", "\u1112\u1161\u11ab", "👩🏽‍💻", "🇩🇰", "1️⃣"]);
export const labelLines = Object.freeze([graphemes[0], "", ...graphemes.slice(1)]);
export const sourceLabel = `${graphemes[0]}\r\n\r${graphemes.slice(1).join("")}`;
export function graphemeProgram(mode = "character") {
  return chart().createCanvas({ width: 700, height: 700, margin: 200 })
    .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] })
    .createScatterPlot({ x: "x", y: "y", guides: false })
    .createTitle({ text: graphemes.join(""), titleStyle: { fontSize: 12 }, maxWidth: 1, wrap: mode })
    .createXAxis({ title: false, ticksAndLabels: { values: [0], labels: {
      fontSize: 12, maxWidth: 1, wrap: mode, lineHeight: 16,
      labelMap: [{ value: 0, label: sourceLabel }]
    } } });
}
export const graphicLines = (program, id) => {
  const object = program.graphicSpec.objects[id];
  return (object.items ?? [object]).map(item => item.properties.text);
};
