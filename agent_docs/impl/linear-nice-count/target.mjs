// Concrete target, before the new public option is implemented.
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";

export function createTarget() {
  return chart()
    .createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createGraphics({ id: "linePlot", type: "path", length: 1, parent: "plot-main" })
    .editGraphics({ target: "linePlot", property: "commands", value: [[
      { op: "M", x: 40, y: 140 },
      { op: "L", x: 140, y: 81.0909090909091 },
      { op: "L", x: 240, y: 22.181818181818187 }
    ]] })
    .editGraphics({ target: "linePlot", property: "stroke", value: "#4c78a8" })
    .editGraphics({ target: "linePlot", property: "strokeWidth", value: 2 })
    .editGraphics({ target: "linePlot", property: "strokeDash", value: [[]] });
}

export function createExplicitDomainControl() {
  return chart()
    .createCanvas({ plot: { width: 200, height: 120 }, margin: { left: 40, top: 20, right: 20, bottom: 30 } })
    .createData({ values: [{ x: 0, y: 0 }, { x: 0.5, y: 54 }, { x: 1, y: 108 }] })
    .createLinePlot({ x: { field: "x", scale: { domain: [0, 1] } }, y: { field: "y", scale: { domain: [0, 110] } }, guides: false });
}

export function verifyTarget() {
  const target = createTarget(), control = createExplicitDomainControl();
  assert.deepEqual(target.graphicSpec, control.graphicSpec);
  return target;
}
