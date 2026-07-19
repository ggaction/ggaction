import assert from "node:assert/strict";
import test from "node:test";

import {
  loadCars,
  loadGapminder,
  loadNightingaleRose
} from "../../support/data.js";
import {
  CAUSE_ORDER,
  GAPMINDER_RADIAL_TARGET,
  MONTH_ORDER,
  NIGHTINGALE_TARGET,
  ORIGIN_ORDER,
  RADIAL_COUNTRY_ORDER,
  buildReferenceAnnularSectorCommands,
  createCarsDonutReference,
  createGapminderWeightedDonutReference,
  createGapminderRadialBarReference,
  createNightingaleRoseReference,
  referenceRadialAxisTitle
} from "./reference-values.js";

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ~= ${expected}`);
}

function assertFiniteClosedSectors(sectors) {
  for (const sector of sectors) {
    assert.deepEqual(sector.commands.at(-1), { op: "Z" });
    assert.equal(sector.commands.filter(command => command.op === "Z").length, 1);
    for (const command of sector.commands) {
      for (const value of Object.values(command)) {
        if (typeof value === "number") assert.equal(Number.isFinite(value), true);
      }
    }
  }
}

test("anchors clockwise quarter sectors and full annuli to literal commands", () => {
  const frame = { centerX: 100, centerY: 80, availableRadius: 60 };
  const quarter = buildReferenceAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 90,
    innerRadius: 20,
    outerRadius: 40
  });

  assert.deepEqual(quarter[0], { op: "M", x: 100, y: 40 });
  close(quarter[1].x, 140);
  close(quarter[1].y, 80);
  assert.deepEqual(quarter[2], { op: "L", x: 120, y: 80 });
  close(quarter[3].x, 100);
  close(quarter[3].y, 60);
  assert.deepEqual(quarter[4], { op: "Z" });

  const annulus = buildReferenceAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 360,
    innerRadius: 20,
    outerRadius: 40
  });
  assert.equal(annulus.filter(command => command.op === "C").length, 8);
  assert.equal(annulus.length, 11);
  assert.deepEqual(annulus.at(-1), { op: "Z" });
});

test("applies symmetric padding and supports reverse sweeps", () => {
  const frame = { centerX: 0, centerY: 0, availableRadius: 100 };
  const padded = buildReferenceAnnularSectorCommands({
    frame,
    startTheta: 0,
    endTheta: 60,
    outerRadius: 80,
    padAngle: 4
  });
  const expectedStart = 2 * Math.PI / 180;
  close(padded[0].x, 80 * Math.sin(expectedStart));
  close(padded[0].y, -80 * Math.cos(expectedStart));

  const reverse = buildReferenceAnnularSectorCommands({
    frame,
    startTheta: 90,
    endTheta: 0,
    innerRadius: 20,
    outerRadius: 80
  });
  close(reverse[1].x, 0);
  close(reverse[1].y, -80);
  assert.deepEqual(reverse.at(-1), { op: "Z" });
});

test("keeps radial titles inside by default and supports explicit outside placement", () => {
  const frame = { centerX: 100, centerY: 80, availableRadius: 60 };
  assert.deepEqual(referenceRadialAxisTitle({ frame, text: "Value" }), {
    x: 130,
    y: 88,
    text: "Value",
    textAlign: "center",
    textBaseline: "top"
  });
  assert.deepEqual(referenceRadialAxisTitle({
    frame,
    text: "Value",
    position: "outside",
    offset: 12
  }), {
    x: 172,
    y: 80,
    text: "Value",
    textAlign: "left",
    textBaseline: "middle"
  });
});

test("partitions all Cars rows into one normalized donut revolution", () => {
  const values = createCarsDonutReference(loadCars());

  assert.equal(values.total, 406);
  assert.deepEqual(values.sectors.map(sector => sector.key), ORIGIN_ORDER);
  assert.deepEqual(values.sectors.map(sector => sector.count), [254, 73, 79]);
  close(values.sectors.reduce(
    (sum, sector) => sum + sector.endTheta - sector.startTheta,
    0
  ), 360);
  close(values.sectors[0].startTheta, 0);
  close(values.sectors.at(-1).endTheta, 360);
  assertFiniteClosedSectors(values.sectors);
});

test("sums Gapminder population by cluster into one weighted revolution", () => {
  const values = createGapminderWeightedDonutReference(loadGapminder());

  assert.equal(values.rows.length, 62);
  assert.equal(values.sectors.length, 6);
  assert.equal(values.sectors.every(sector => sector.population > 0), true);
  close(values.sectors.reduce(
    (sum, sector) => sum + sector.endTheta - sector.startTheta,
    0
  ), 360);
  close(values.sectors.at(-1).endTheta, 360);
  assertFiniteClosedSectors(values.sectors);
});

test("builds deterministic larger-first Nightingale overlays in equal month bands", () => {
  const rows = loadNightingaleRose();
  const values = createNightingaleRoseReference(rows);
  const reversed = createNightingaleRoseReference(rows.toReversed());

  assert.equal(rows.length, 36);
  assert.equal(values.sectors.length, 32);
  assert.deepEqual(values.sectors, reversed.sectors);
  assert.deepEqual(values.thetaLabels.map(label => label.text), MONTH_ORDER);
  assert.equal(values.radialGridCommands.length, NIGHTINGALE_TARGET.radiusTicks.length);
  for (const month of MONTH_ORDER) {
    const sectors = values.sectors.filter(sector => sector.month === month);
    for (let index = 1; index < sectors.length; index += 1) {
      assert.ok(sectors[index - 1].outerRadius >= sectors[index].outerRadius);
    }
    for (const sector of sectors) {
      close(sector.endTheta - sector.startTheta, 30);
      assert.ok(CAUSE_ORDER.includes(sector.cause));
    }
  }
  const january = values.sectors.filter(sector => sector.month === "January");
  assert.deepEqual(january.map(sector => sector.cause), CAUSE_ORDER);
  assertFiniteClosedSectors(values.sectors);
});

test("maps one selected Gapminder row to each equal-band radial bar", () => {
  const rows = loadGapminder();
  const values = createGapminderRadialBarReference(rows);
  const shuffled = createGapminderRadialBarReference(rows.toReversed());

  assert.deepEqual(values.sectors, shuffled.sectors);
  assert.deepEqual(values.sectors.map(sector => sector.country), RADIAL_COUNTRY_ORDER);
  assert.equal(values.sectors.length, 12);
  assert.deepEqual(values.sectors.map(sector => sector.cluster), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.deepEqual(values.thetaLabels.map(label => label.text), RADIAL_COUNTRY_ORDER);
  assert.equal(values.radialGridCommands.length, GAPMINDER_RADIAL_TARGET.radiusTicks.length);
  for (const sector of values.sectors) {
    close(sector.endTheta - sector.startTheta, 30);
    assert.ok(sector.outerRadius > sector.innerRadius);
  }
  assertFiniteClosedSectors(values.sectors);
});

test("rejects invalid reference sector geometry instead of creating partial paths", () => {
  const frame = { centerX: 0, centerY: 0, availableRadius: 10 };
  assert.throws(
    () => buildReferenceAnnularSectorCommands({
      frame,
      startTheta: 0,
      endTheta: 0,
      outerRadius: 5
    }),
    /outside its valid range/
  );
  assert.throws(
    () => buildReferenceAnnularSectorCommands({
      frame,
      startTheta: 0,
      endTheta: 30,
      innerRadius: 6,
      outerRadius: 5
    }),
    /outside its valid range/
  );
});
