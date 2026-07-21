import { calculateParallelCoordinates } from
  "../../oracles/parallel-coordinates.js";

export const PARALLEL_LAYOUT = Object.freeze({
  width: 860,
  height: 500,
  margin: Object.freeze({ top: 110, right: 160, bottom: 65, left: 78 })
});

export const PARALLEL_COLORS = Object.freeze({
  USA: "#4c78a8",
  Europe: "#f58518",
  Japan: "#e45756"
});

export const PARALLEL_DIMENSIONS = Object.freeze([
  Object.freeze({
    field: "Miles_per_Gallon",
    title: "MPG",
    scale: Object.freeze({ nice: true, zero: false })
  }),
  Object.freeze({
    field: "Horsepower",
    title: "Horsepower",
    scale: Object.freeze({ nice: true, zero: false })
  }),
  Object.freeze({
    field: "Weight_in_lbs",
    title: "Weight (lb)",
    scale: Object.freeze({ nice: true, zero: false })
  }),
  Object.freeze({
    field: "Acceleration",
    title: "Acceleration",
    scale: Object.freeze({ nice: true, zero: false })
  })
]);

function plotBounds(layout) {
  return Object.freeze({
    left: layout.margin.left,
    right: layout.width - layout.margin.right,
    top: layout.margin.top,
    bottom: layout.height - layout.margin.bottom
  });
}

export function prepareCars1970(cars) {
  if (!Array.isArray(cars)) throw new TypeError("Cars must be an array.");
  const rows = cars.filter(row => row?.Year === "1970-01-01");
  if (rows.length !== 35) {
    throw new Error(`Expected 35 Cars rows for 1970, received ${rows.length}.`);
  }
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

function formatTick(field, value) {
  if (field === "Weight_in_lbs") return `${value / 1000}k`;
  return String(value);
}

export function createCarsParallelValues(cars) {
  const layout = PARALLEL_LAYOUT;
  const bounds = plotBounds(layout);
  const rows = prepareCars1970(cars);
  const parallel = calculateParallelCoordinates(rows, {
    dimensions: PARALLEL_DIMENSIONS,
    bounds,
    key: "Name",
    missing: "break"
  });
  const axes = parallel.axes.map(axis => Object.freeze({
    ...axis,
    labels: Object.freeze(axis.ticks.map(value => Object.freeze({
      value,
      text: formatTick(axis.field, value),
      y: axis.fieldType === "quantitative"
        ? axis.yRange[0] + (value - axis.domain[0]) /
          (axis.domain[1] - axis.domain[0]) *
          (axis.yRange[1] - axis.yRange[0])
        : axis.yRange[0]
    })))
  }));
  const paths = parallel.items.map(item => Object.freeze({
    ...item,
    stroke: PARALLEL_COLORS[rows[item.sourceRowIndex].Origin]
  }));
  return Object.freeze({
    axes: Object.freeze(axes),
    bounds,
    layout,
    parallel,
    paths: Object.freeze(paths),
    rows,
    title: Object.freeze({
      x: bounds.left + (bounds.right - bounds.left) / 2,
      text: "Cars of 1970",
      subtitle: "Each path connects one car across four measurements"
    })
  });
}
