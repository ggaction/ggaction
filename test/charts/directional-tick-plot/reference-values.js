import {
  centeredDirectionalSegment,
  directionalEqualAreaTriangleCommands
} from "../../oracles/directional-glyph.js";
import {
  ANCHORS,
  COMPASS_RING,
  DIRECTIONS,
  DIRECTIONAL_TRIANGLE_AREA,
  DIRECTION_LAYOUT,
  DIRECTION_ROWS,
  LABELS,
  RUG_LAYOUT,
  prepareHorsepowerRug
} from "../../../examples/directional-tick-plot/fixture.js";

export {
  ANCHORS,
  COMPASS_RING,
  DIRECTIONAL_TRIANGLE_AREA,
  DIRECTION_LAYOUT,
  DIRECTION_ROWS,
  LABELS,
  RUG_LAYOUT
};

export const BASELINE_TICKS = Object.freeze(ANCHORS.map(anchor =>
  centeredDirectionalSegment(anchor, 0, DIRECTION_LAYOUT.tickLength)
));

export const DIRECTIONAL_TICKS = Object.freeze(ANCHORS.map((anchor, index) =>
  centeredDirectionalSegment(
    anchor,
    DIRECTIONS[index].direction,
    DIRECTION_LAYOUT.tickLength
  )
));

export const DIRECTIONAL_TRIANGLES = Object.freeze(ANCHORS.map((anchor, index) =>
  directionalEqualAreaTriangleCommands(
    anchor,
    DIRECTIONS[index].direction,
    DIRECTIONAL_TRIANGLE_AREA
  )
));

function mapHorsepower(horsepower) {
  const [domainStart, domainEnd] = RUG_LAYOUT.domain;
  return RUG_LAYOUT.left +
    (horsepower - domainStart) / (domainEnd - domainStart) *
    (RUG_LAYOUT.right - RUG_LAYOUT.left);
}

export function createHorsepowerRugReference(cars) {
  const { rows, axisX, labels } = prepareHorsepowerRug(cars);
  const x = rows.map(row => mapHorsepower(row.Horsepower));
  const half = RUG_LAYOUT.tickLength / 2;
  return Object.freeze({
    rows: Object.freeze(rows),
    x: Object.freeze(x),
    y1: RUG_LAYOUT.rugY + half,
    y2: RUG_LAYOUT.rugY - half,
    axisX,
    labels
  });
}
