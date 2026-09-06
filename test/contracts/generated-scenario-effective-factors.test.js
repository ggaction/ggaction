import assert from "node:assert/strict";
import test from "node:test";

import { renderToSVG } from "../../src/renderers/svg.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import {
  categoricalStressRows,
  lineRows,
  scenarioDatasetAvailable
} from "../support/scenarios/data-views.js";
import { scenarioRecipe } from "../support/scenarios/recipes.js";

const DEFAULT_PALETTE = "tableau10";

function verifyProgram(program, label) {
  const graphic = assertGraphicIntegrity(program, label);
  const svg = renderToSVG(program, {
    title: label,
    description: `Effective-factor contract for ${label}.`
  });
  assertSvgIntegrity(svg, label);
  return { graphic, svg };
}

function histogramFactors(overrides = {}) {
  return {
    dataset: "zoo-histogram-boundaries",
    binning: "maxBins",
    stack: "zero",
    nice: false,
    palette: DEFAULT_PALETTE,
    legendPosition: "right",
    ...overrides
  };
}

test("preserves every Unicode label and all 257 long legend categories", () => {
  const unicodeRows = categoricalStressRows("zoo-unicode-labels");
  assert.equal(unicodeRows.length, 12);
  assert.ok(unicodeRows.some(row => row.category === "👨‍👩‍👧‍👦 family emoji"));
  assert.ok(unicodeRows.some(row => row.category === "🏳️‍🌈 variation selector"));
  assert.ok(unicodeRows.some(row => row.category === "é combining accent"));
  assert.ok(unicodeRows.some(row =>
    row.category === "العربية من اليمين إلى اليسار"
  ));
  assert.ok(unicodeRows.some(row =>
    row.category === "A very long category label designed to press against chart margins"
  ));

  const unicode = scenarioRecipe("unicode-label-stress").build({
    dataset: "zoo-unicode-labels",
    palette: DEFAULT_PALETTE,
    radius: 3,
    fontFamily: "sans-serif",
    fontSize: 14
  });
  assert.equal(unicode.semanticSpec.datasets[0].values.length, 12);
  assert.equal(unicode.graphicSpec.objects.unicodeText.items.length, 12);
  assert.equal(unicode.graphicSpec.objects.colorLegendLabels.items.length, 12);
  const unicodeSvg = verifyProgram(unicode, "full-unicode-stress").svg;
  for (const row of unicodeRows) assert.ok(unicodeSvg.includes(row.category));

  const cardinalityRows = categoricalStressRows("zoo-categorical-cardinality");
  assert.equal(cardinalityRows.length, 257);
  assert.equal(new Set(cardinalityRows.map(row => row.category)).size, 257);
  assert.equal(
    cardinalityRows.at(-1).category,
    "Category 256 — deterministic long label"
  );
  const cardinality = scenarioRecipe("categorical-cardinality-stress").build({
    dataset: "zoo-categorical-cardinality",
    palette: DEFAULT_PALETTE,
    radius: 2.5,
    opacity: 0.55
  });
  assert.equal(cardinality.semanticSpec.datasets[0].values.length, 257);
  assert.equal(cardinality.graphicSpec.objects.cardinalityPoints.items.length, 257);
  assert.equal(cardinality.graphicSpec.objects.colorLegendLabels.items.length, 257);
  assert.equal(
    cardinality.graphicSpec.objects.colorLegendLabels.items.at(-1).properties.text,
    cardinalityRows.at(-1).category
  );
  const cardinalitySvg = verifyProgram(cardinality, "257-category-stress").svg;
  assert.ok(cardinalitySvg.includes(cardinalityRows[0].category));
  assert.ok(cardinalitySvg.includes(cardinalityRows.at(-1).category));
});

test("executes monotone temporal lines for every direction and path-order mode", () => {
  const recipe = scenarioRecipe("temporal-lines");
  for (const dataset of recipe.datasets.filter(scenarioDatasetAvailable)) {
    const rows = lineRows(dataset);
    for (const category of new Set(rows.map(row => row.category))) {
      const values = rows
        .filter(row => row.category === category)
        .map(row => row.orderValue);
      assert.equal(new Set(values).size, values.length, `${dataset} ${category}`);
    }
    for (const reverse of [false, true]) {
      for (const pathOrder of ["none", "descending", "remove"]) {
        const label = `${dataset}-${reverse}-${pathOrder}`;
        const program = recipe.build({
          dataset,
          curve: "monotone",
          aggregate: "mean",
          reverse,
          pathOrder,
          palette: DEFAULT_PALETTE,
          legendPosition: "right"
        });
        assert.equal(program.markConfigs.lines.curve, "monotone", label);
        const paths = program.graphicSpec.objects.lines.items;
        assert.ok(paths.length > 0, label);
        assert.ok(paths.every(item =>
          item.properties.commands[0].op === "M" &&
          item.properties.commands.slice(1).every(command => command.op === "C")
        ), label);
        verifyProgram(program, label);
      }
    }
  }
});

test("materializes every requested histogram binning policy without substitution", () => {
  const policyRecipe = scenarioRecipe("histogram-binning");
  const expectedKey = {
    maxBins: "maxBins",
    step: "step",
    boundaries: "boundaries"
  };
  for (const binning of Object.keys(expectedKey)) {
    const program = policyRecipe.build(histogramFactors({ binning }));
    const bin = program.semanticSpec.layers.find(layer => layer.id === "histogram")
      .encoding.x.bin;
    assert.deepEqual(Object.keys(bin), [expectedKey[binning]]);
    assert.ok(program.graphicSpec.objects.histogram.items.length > 0);
    verifyProgram(program, `histogram-policy-${binning}`);
  }

  const extremeRecipe = scenarioRecipe("histogram-extreme-binning");
  for (const dataVariant of ["subnormal", "large-offset"]) {
    for (const binning of Object.keys(expectedKey)) {
      const program = extremeRecipe.build(histogramFactors({
        dataVariant,
        binning
      }));
      const rows = program.semanticSpec.datasets[0].values;
      const bin = program.semanticSpec.layers.find(layer => layer.id === "histogram")
        .encoding.x.bin;
      assert.deepEqual(Object.keys(bin), [expectedKey[binning]]);
      if (binning === "step") {
        assert.ok(Number.isFinite(bin.step) && bin.step > 0);
      }
      if (binning === "boundaries") {
        assert.ok(bin.boundaries.length >= 2);
        assert.ok(bin.boundaries.every((value, index, values) =>
          index === 0 || value > values[index - 1]
        ));
        assert.equal(bin.boundaries[0], Math.min(...rows.map(row => row.value)));
        assert.equal(bin.boundaries.at(-1), Math.max(...rows.map(row => row.value)));
      }
      assert.ok(program.graphicSpec.objects.histogram.items.length > 0);
      verifyProgram(program, `histogram-${dataVariant}-${binning}`);
    }
  }
});

test("keeps error-bar and error-band factors active in separate recipes", () => {
  const barRecipe = scenarioRecipe("explicit-error-bars");
  const bandRecipe = scenarioRecipe("explicit-error-bands");
  assert.deepEqual(Object.keys(barRecipe.factors), ["orientation", "capStyle", "dash"]);
  assert.deepEqual(Object.keys(bandRecipe.factors), ["orientation", "dash", "curve"]);

  for (const orientation of ["vertical", "horizontal"]) {
    const withoutCaps = barRecipe.build({
      dataset: "zoo-asymmetric-intervals",
      orientation,
      capStyle: "none",
      dash: "solid"
    });
    assert.equal(withoutCaps.graphicSpec.objects.intervalLowerCap, undefined);
    assert.equal(withoutCaps.graphicSpec.objects.intervalUpperCap, undefined);
    verifyProgram(withoutCaps, `error-bar-${orientation}-without-caps`);

    for (const [capStyle, capSize] of [["short", 4], ["medium", 8], ["long", 16]]) {
      const program = barRecipe.build({
        dataset: "zoo-asymmetric-intervals",
        orientation,
        capStyle,
        dash: "dashed"
      });
      const cap = program.graphicSpec.objects.intervalLowerCap.items[0].properties;
      const renderedSize = orientation === "vertical"
        ? Math.abs(cap.x2 - cap.x1)
        : Math.abs(cap.y2 - cap.y1);
      assert.equal(renderedSize, capSize);
      assert.deepEqual(cap.strokeDash, [6, 4]);
      verifyProgram(program, `error-bar-${orientation}-${capStyle}`);
    }

    for (const curve of ["linear", "step", "monotone"]) {
      const program = bandRecipe.build({
        dataset: "zoo-asymmetric-intervals",
        orientation,
        dash: [4, 2],
        curve
      });
      assert.equal(program.markConfigs.interval.curve, curve);
      assert.equal(program.markConfigs.intervalLowerBoundary.curve, curve);
      assert.equal(program.markConfigs.intervalUpperBoundary.curve, curve);
      if (curve === "monotone") {
        assert.ok(program.graphicSpec.objects.interval.items.every(item =>
          item.properties.commands.some(command => command.op === "C")
        ));
      }
      verifyProgram(program, `error-band-${orientation}-${curve}`);
    }
  }
});
