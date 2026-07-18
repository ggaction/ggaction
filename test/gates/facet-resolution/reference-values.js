import {
  mapLinear as mapValue,
  numericTicks
} from "../../oracles/numeric.js";
import { expectedContinuousFacetUnion } from
  "../../oracles/facet-scales.js";
import { createCarsRegressionScatterplotValues } from
  "../../charts/cars-regression-scatterplot/reference-values.js";

export const CELL_SIZE = Object.freeze({ width: 280, height: 240 });
export const CELL_MARGIN = Object.freeze({
  top: 36,
  right: 18,
  bottom: 50,
  left: 58
});
export const FACET_LAYOUT = Object.freeze({
  columns: 3,
  gap: 20,
  padding: 14,
  titleHeight: 60
});

function validRows(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Gapminder rows must be an array.");
  return rows.filter(row =>
    row !== null &&
    typeof row === "object" &&
    Number.isFinite(row.cluster) &&
    Number.isFinite(row.fertility) &&
    Number.isFinite(row.life_expect) &&
    Number.isFinite(row.pop)
  );
}

function cellRegression(rows, cluster) {
  const clusterRows = rows
    .filter(row => row.cluster === cluster)
    .map(row => ({ ...row, clusterLabel: String(cluster) }));
  const regression = createCarsRegressionScatterplotValues(clusterRows, {
    groups: [String(cluster)],
    filter: { field: "clusterLabel", oneOf: [String(cluster)] },
    xField: "fertility",
    yField: "life_expect",
    groupField: "clusterLabel",
    width: CELL_SIZE.width,
    height: CELL_SIZE.height,
    margin: CELL_MARGIN
  });
  return {
    cluster,
    rows: clusterRows,
    model: regression.models[0],
    regressionRows: regression.regressionRows,
    localDomains: {
      x: regression.scales.x.domain,
      y: regression.scales.y.domain
    }
  };
}

function placements(count) {
  const { columns, gap, padding, titleHeight } = FACET_LAYOUT;
  const rows = Math.ceil(count / columns);
  return {
    width: padding * 2 + columns * CELL_SIZE.width + gap * (columns - 1),
    height: titleHeight + padding * 2 + rows * CELL_SIZE.height + gap * (rows - 1),
    cells: Array.from({ length: count }, (_, index) => ({
      column: index % columns,
      row: Math.floor(index / columns),
      x: padding + (index % columns) * (CELL_SIZE.width + gap),
      y: titleHeight + padding + Math.floor(index / columns) *
        (CELL_SIZE.height + gap),
      width: CELL_SIZE.width,
      height: CELL_SIZE.height
    }))
  };
}

export function createGapminderRegressionFacetValues(rows, {
  xResolution = "shared"
} = {}) {
  if (!["shared", "independent"].includes(xResolution)) {
    throw new Error("Regression facet xResolution must be shared or independent.");
  }
  const source = validRows(rows);
  const clusters = [...new Set(source.map(row => row.cluster))];
  const regressionCells = clusters.map(cluster => cellRegression(source, cluster));
  const shared = {
    x: expectedContinuousFacetUnion(
      regressionCells.map(cell => cell.localDomains.x)
    ),
    y: expectedContinuousFacetUnion(
      regressionCells.map(cell => cell.localDomains.y)
    ),
    color: [
      Math.min(...source.map(row => row.pop)),
      Math.max(...source.map(row => row.pop))
    ]
  };
  const layout = placements(clusters.length);
  const bounds = {
    x: CELL_MARGIN.left,
    y: CELL_MARGIN.top,
    width: CELL_SIZE.width - CELL_MARGIN.left - CELL_MARGIN.right,
    height: CELL_SIZE.height - CELL_MARGIN.top - CELL_MARGIN.bottom
  };
  const cells = regressionCells.map((cell, index) => {
    const domains = {
      x: xResolution === "shared" ? shared.x : cell.localDomains.x,
      y: shared.y,
      color: shared.color
    };
    const ranges = {
      x: [bounds.x, bounds.x + bounds.width],
      y: [bounds.y + bounds.height, bounds.y]
    };
    const regressionRows = cell.regressionRows;
    const lower = regressionRows.map(row => ({
      x: mapValue(row.fertility, domains.x, ranges.x),
      y: mapValue(row.__regression_ci_lower, domains.y, ranges.y)
    }));
    const upper = [...regressionRows].reverse().map(row => ({
      x: mapValue(row.fertility, domains.x, ranges.x),
      y: mapValue(row.__regression_ci_upper, domains.y, ranges.y)
    }));
    return {
      ...cell,
      ...layout.cells[index],
      id: `cell-${index + 1}`,
      domains,
      ranges,
      points: cell.rows.map(row => ({
        x: mapValue(row.fertility, domains.x, ranges.x),
        y: mapValue(row.life_expect, domains.y, ranges.y),
        pop: row.pop
      })),
      band: [...lower, ...upper],
      line: regressionRows.map(row => ({
        x: mapValue(row.fertility, domains.x, ranges.x),
        y: mapValue(row.life_expect, domains.y, ranges.y)
      })),
      ticks: {
        x: numericTicks(domains.x).map(value => ({
          value,
          position: mapValue(value, domains.x, ranges.x)
        })),
        y: numericTicks(domains.y).map(value => ({
          value,
          position: mapValue(value, domains.y, ranges.y)
        }))
      }
    };
  });
  return Object.freeze({
    xResolution,
    clusters,
    shared,
    bounds,
    width: layout.width,
    height: layout.height,
    cells
  });
}

