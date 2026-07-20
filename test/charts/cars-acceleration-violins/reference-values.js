import { mapLinear } from "../../oracles/numeric.js";
import { calculateCategoricalDensity } from
  "../../oracles/categorical-density.js";

export const ORIGIN_DOMAIN = Object.freeze(["USA", "Europe", "Japan"]);
export const ORIGIN_COLORS = Object.freeze(["#4c78a8", "#f58518", "#54a24b"]);
export const ERA_DOMAIN = Object.freeze(["1970–1976", "1977–1982"]);
export const ERA_COLORS = Object.freeze(["#4c78a8", "#e45756"]);
export const VALUE_DOMAIN = Object.freeze([8, 25]);
export const VALUE_TICKS = Object.freeze([10, 15, 20, 25]);

export const FULL_LAYOUT = Object.freeze({
  width: 720,
  height: 520,
  margin: Object.freeze({ top: 90, right: 45, bottom: 80, left: 80 })
});

export const SPLIT_LAYOUT = Object.freeze({
  width: 760,
  height: 520,
  margin: Object.freeze({ top: 90, right: 165, bottom: 80, left: 80 })
});

function plotBounds(layout) {
  return Object.freeze({
    left: layout.margin.left,
    right: layout.width - layout.margin.right,
    top: layout.margin.top,
    bottom: layout.height - layout.margin.bottom,
    width: layout.width - layout.margin.left - layout.margin.right,
    height: layout.height - layout.margin.top - layout.margin.bottom
  });
}

function yearOf(row) {
  const value = row.Year;
  const year = typeof value === "number"
    ? value
    : Number.parseInt(String(value).slice(0, 4), 10);
  if (!Number.isInteger(year)) throw new Error(`Invalid Cars year "${value}".`);
  return year;
}

export function prepareViolinCars(cars) {
  if (!Array.isArray(cars)) throw new TypeError("Cars must be an array.");
  return Object.freeze(cars.filter(row =>
    ORIGIN_DOMAIN.includes(row?.Origin) && Number.isFinite(row?.Acceleration)
  ).map(row => Object.freeze({
    ...row,
    era: yearOf(row) <= 1976 ? ERA_DOMAIN[0] : ERA_DOMAIN[1]
  })));
}

function categoryCenters(bounds) {
  const step = bounds.width / ORIGIN_DOMAIN.length;
  return Object.freeze(ORIGIN_DOMAIN.map((category, index) => Object.freeze({
    category,
    x: bounds.left + step * (index + 0.5)
  })));
}

function widthMaximum(density, category, resolve) {
  const profiles = resolve === "shared"
    ? density.profiles
    : density.profiles.filter(profile => Object.is(profile.category, category));
  return Math.max(...profiles.flatMap(profile =>
    profile.samples.map(sample => sample.density)
  ));
}

function fullPath(profile, center, maxHalfWidth, maxDensity, bounds) {
  const boundary = profile.samples.map(sample => ({
    x: center - maxHalfWidth * sample.density / maxDensity,
    y: mapLinear(sample.value, VALUE_DOMAIN, [bounds.bottom, bounds.top])
  }));
  return Object.freeze([
    ...boundary,
    ...[...profile.samples].reverse().map(sample => Object.freeze({
      x: center + maxHalfWidth * sample.density / maxDensity,
      y: mapLinear(sample.value, VALUE_DOMAIN, [bounds.bottom, bounds.top])
    }))
  ].map(point => Object.freeze(point)));
}

function halfPath(profile, center, maxHalfWidth, maxDensity, bounds, side) {
  const lowY = mapLinear(VALUE_DOMAIN[0], VALUE_DOMAIN, [bounds.bottom, bounds.top]);
  const highY = mapLinear(VALUE_DOMAIN[1], VALUE_DOMAIN, [bounds.bottom, bounds.top]);
  const direction = side === "left" ? -1 : 1;
  return Object.freeze([
    Object.freeze({ x: center, y: lowY }),
    ...profile.samples.map(sample => Object.freeze({
      x: center + direction * maxHalfWidth * sample.density / maxDensity,
      y: mapLinear(sample.value, VALUE_DOMAIN, [bounds.bottom, bounds.top])
    })),
    Object.freeze({ x: center, y: highY })
  ]);
}

function legend(layout) {
  const x = layout.width - layout.margin.right + 28;
  const y = layout.margin.top + 44;
  return Object.freeze({
    title: Object.freeze({ x, y: y - 24, text: "Model era" }),
    items: Object.freeze(ERA_DOMAIN.map((label, index) => Object.freeze({
      label,
      fill: ERA_COLORS[index],
      x,
      y: y + index * 42
    })))
  });
}

export function createCarsViolinValues(cars, {
  split = false,
  side = "both",
  bandwidth = 0.65,
  band = 0.8,
  resolve = "shared"
} = {}) {
  if (!Number.isFinite(band) || band <= 0 || band > 1) {
    throw new RangeError("Violin band must be in (0, 1].");
  }
  if (!["shared", "independent"].includes(resolve)) {
    throw new Error(`Unknown violin width resolve "${resolve}".`);
  }
  if (!["both", "left", "right"].includes(side)) {
    throw new Error(`Unknown vertical violin side "${side}".`);
  }
  if (split && side !== "both") {
    throw new Error("Split violin geometry cannot also request one side.");
  }
  const rows = prepareViolinCars(cars);
  const layout = split ? SPLIT_LAYOUT : FULL_LAYOUT;
  const bounds = plotBounds(layout);
  const centers = categoryCenters(bounds);
  const density = calculateCategoricalDensity(rows, {
    valueField: "Acceleration",
    categoryField: "Origin",
    ...(split ? { splitField: "era", splitDomain: ERA_DOMAIN } : {}),
    bandwidth,
    extent: VALUE_DOMAIN,
    steps: 80
  });
  const maximumHalfWidth = bounds.width / ORIGIN_DOMAIN.length * band / 2;
  const paths = [];

  for (const { category, x } of centers) {
    const categoryProfiles = density.profiles.filter(profile =>
      Object.is(profile.category, category)
    );
    const maximum = widthMaximum(density, category, resolve);
    if (split) {
      for (const [index, splitValue] of ERA_DOMAIN.entries()) {
        const profile = categoryProfiles.find(candidate =>
          Object.is(candidate.split, splitValue)
        );
        if (profile === undefined) continue;
        paths.push(Object.freeze({
          category,
          split: splitValue,
          count: profile.count,
          fill: ERA_COLORS[index],
          side: index === 0 ? "left" : "right",
          points: halfPath(
            profile,
            x,
            maximumHalfWidth,
            maximum,
            bounds,
            index === 0 ? "left" : "right"
          )
        }));
      }
    } else {
      const profile = categoryProfiles[0];
      paths.push(Object.freeze({
        category,
        count: profile.count,
        fill: ORIGIN_COLORS[ORIGIN_DOMAIN.indexOf(category)],
        side,
        points: side === "both"
          ? fullPath(profile, x, maximumHalfWidth, maximum, bounds)
          : halfPath(profile, x, maximumHalfWidth, maximum, bounds, side)
      }));
    }
  }

  return Object.freeze({
    band,
    bounds,
    centers,
    density,
    layout,
    legend: split ? legend(layout) : undefined,
    paths: Object.freeze(paths),
    resolve,
    rows,
    split,
    title: Object.freeze({
      x: bounds.left + bounds.width / 2,
      text: "Acceleration Distribution by Origin",
      subtitle: split
        ? "Early models on the left, later models on the right"
        : "Kernel-density profiles for the Cars dataset"
    }),
    yTicks: Object.freeze(VALUE_TICKS.map(value => Object.freeze({
      value,
      y: mapLinear(value, VALUE_DOMAIN, [bounds.bottom, bounds.top])
    })))
  });
}
