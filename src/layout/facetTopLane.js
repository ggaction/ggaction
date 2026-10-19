import { DEFAULT_FACET_TOP_LANE, FACET_TOP_LANE_MODES } from "../core/vocabulary.js";
import { textBoundsFitCanvas, textBoundsIntersect } from "../core/textMetrics.js";

export function normalizeFacetTopLane(value, spacing) {
  const mode = value === undefined ? DEFAULT_FACET_TOP_LANE : value;
  if (!FACET_TOP_LANE_MODES.includes(mode)) {
    throw new Error('Facet topLane must be "stacked" or "shared".');
  }
  if (mode !== DEFAULT_FACET_TOP_LANE && spacing !== "plot") {
    throw new Error('Shared facet topLane requires spacing "plot".');
  }
  return mode === DEFAULT_FACET_TOP_LANE ? undefined : mode;
}

export function assertFacetTopLaneBounds({ canvas, titles, headers, retained, plots }) {
  const owned = [...titles, ...headers];
  if (owned.some(bounds => !textBoundsFitCanvas(bounds, canvas))) {
    throw new Error("Shared facet top lane text does not fit the final Canvas.");
  }
  if (titles.some(title => headers.some(header => textBoundsIntersect(title, header)))) {
    throw new Error("Shared facet top lane title overlaps a facet header.");
  }
  if (owned.some(bounds => plots.some(plot => textBoundsIntersect(bounds, plot)))) {
    throw new Error("Shared facet top lane text overlaps a child plot.");
  }
  if (owned.some(bounds => retained.some(other => textBoundsIntersect(bounds, other)))) {
    throw new Error("Shared facet top lane text overlaps retained chart text.");
  }
}
