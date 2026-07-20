import assert from "node:assert/strict";
import test from "node:test";

import { loadCars } from "../../support/data.js";
import {
  createDensityPaintReference,
  createGroupedDensityProfileReference
} from "../../oracles/gradient.js";

const EXPECTED = Object.freeze({
  categories: Object.freeze(["USA", "Europe", "Japan"]),
  bandwidth: 0.8268955773467528,
  extent: Object.freeze([8, 24.8]),
  maximumIntensity: 0.1894893456244104,
  profiles: Object.freeze([
    Object.freeze({
      category: "USA",
      count: 254,
      center: 15,
      representative: Object.freeze([
        0.009087107672485087,
        0.0943976303695897,
        0.12018239053861969,
        0.018577236716957858,
        0.00003644553626372346
      ])
    }),
    Object.freeze({
      category: "Europe",
      count: 73,
      center: 15.7,
      representative: Object.freeze([
        1.9291555798239385e-8,
        0.029461339184853358,
        0.11504325228475287,
        0.05405622075401532,
        0.017707804704049954
      ])
    }),
    Object.freeze({
      category: "Japan",
      count: 79,
      center: 16.4,
      representative: Object.freeze([
        0.0000013054292001971743,
        0.03074211026623556,
        0.1661813420829527,
        0.0138631461119307,
        1.5849018630961735e-7
      ])
    })
  ])
});

function representative(values) {
  return [0, 16, 32, 48, 63].map(index => values[index]);
}

test("anchors the independent Cars grouped-density oracle to literal values", () => {
  const actual = createGroupedDensityProfileReference(loadCars(), {
    category: "Origin",
    value: "Acceleration",
    steps: 64
  });

  assert.deepEqual(actual.categories, EXPECTED.categories);
  assert.equal(actual.bandwidth, EXPECTED.bandwidth);
  assert.deepEqual(actual.extent, EXPECTED.extent);
  assert.equal(actual.maximumIntensity, EXPECTED.maximumIntensity);
  assert.deepEqual(actual.profiles.map(profile => ({
    category: profile.category,
    count: profile.count,
    center: profile.center,
    representative: representative(profile.intensities)
  })), EXPECTED.profiles);
});

test("preserves profile invariants independently of production code", () => {
  const actual = createGroupedDensityProfileReference(loadCars(), {
    category: "Origin",
    value: "Acceleration",
    steps: 64
  });

  assert.equal(actual.profiles.reduce((sum, profile) => sum + profile.count, 0), 406);
  for (const profile of actual.profiles) {
    assert.equal(profile.values.length, 64);
    assert.equal(profile.intensities.length, 64);
    assert.equal(profile.values[0], actual.extent[0]);
    assert.equal(profile.values.at(-1), actual.extent[1]);
    assert.equal(profile.intensities.every(value => value >= 0 && Number.isFinite(value)), true);
    assert.equal(profile.values.every((value, index) =>
      index === 0 || value > profile.values[index - 1]
    ), true);
  }
});

test("maps the value extent to item-local stops and reverses only direction", () => {
  const density = createGroupedDensityProfileReference(loadCars(), {
    category: "Origin",
    value: "Acceleration",
    steps: 64
  });
  const normal = createDensityPaintReference(density.profiles[0], {
    extent: density.extent,
    maximumIntensity: density.maximumIntensity
  });
  const reversed = createDensityPaintReference(density.profiles[0], {
    extent: density.extent,
    maximumIntensity: density.maximumIntensity,
    reverse: true
  });

  assert.deepEqual([normal.stops[0].offset, normal.stops.at(-1).offset], [0, 1]);
  assert.deepEqual(normal.stops, reversed.stops);
  assert.deepEqual(normal.from, reversed.to);
  assert.deepEqual(normal.to, reversed.from);
  assert.equal(new Set(normal.stops.map(stop => stop.color)).size > 10, true);
});

test("rejects invalid profile inputs instead of producing an empty chart", () => {
  assert.throws(
    () => createGroupedDensityProfileReference([], { category: "group", value: "value" }),
    /requires valid category\/value rows/
  );
  assert.throws(
    () => createGroupedDensityProfileReference([
      { group: "A", value: 1 },
      { group: "A", value: 1 }
    ], { category: "group", value: "value" }),
    /varying finite values/
  );
  assert.throws(
    () => createGroupedDensityProfileReference([
      { group: "A", value: 1 },
      { group: "A", value: 2 }
    ], { category: "group", value: "value", steps: 1 }),
    /at least 2/
  );
});
