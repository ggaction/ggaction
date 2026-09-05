import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
import { calculateHorizon } from "../oracles/horizon.js";
import { loadCars, loadGapminder, loadImdbSelected } from "../support/data.js";

const datasets = [
  { name: "cars", load: loadCars, category: "Origin", value: "Acceleration" },
  { name: "countries", load: loadGapminder, category: "cluster", value: "fertility" },
  { name: "movies", load: loadImdbSelected, category: "Released_Year", value: "IMDB_Rating" }
];
const layout = { width: 1400, height: 1000, margin: 250 };

function inspect(program, values, label) {
  assertGraphicIntegrity(program, label);
  assertAnalyticLayerIntegrity(program, label);
  assertSvgIntegrity(renderToSVG(program), label);
  assert.deepEqual(program.semanticSpec.datasets[0].values, values);
}

for (const dataset of datasets) {
  const values = Object.freeze(dataset.load().filter(row =>
    Number.isFinite(row[dataset.value]) && row[dataset.value] > 0 && row[dataset.category] !== null &&
    row[dataset.category] !== undefined));
  const categories = new Set(values.map(row => row[dataset.category]));
  const observed = values.map(row => row[dataset.value]);
  const minimum = Math.min(...observed);
  const maximum = Math.max(...observed);
  const bandwidth = (maximum - minimum) / 10;
  assert.ok(values.length >= 8 && categories.size >= 2 && bandwidth > 0);
  for (let variant = 0; variant < 5; variant += 1) {
    test(`authors pie variant ${variant + 1} from ${dataset.name} with complete sectors and immutable source`, () => {
      const source = chart().createCanvas(layout).createData({ id: "observations", values });
      const snapshot = structuredClone(source.semanticSpec);
      const sum = [1, 2, 4].includes(variant);
      const program = source.createPiePlot({
        id: "proportions", category: variant === 4
          ? { field: dataset.category, fieldType: "ordinal", scale: { reverse: true } } : dataset.category,
        ...(sum ? { value: dataset.value, aggregate: "sum" } : {}),
        ...(variant === 2 ? { arc: { innerRadius: 0.4, padAngle: 1, opacity: 0.8 } } : {}),
        ...(variant === 3 ? { color: false, arc: { fill: "#446688" }, guides: false } : {})
      });
      inspect(program, values, `${dataset.name} pie ${variant}`);
      assert.equal(program.graphicSpec.objects.proportions.items.length, categories.size);
      assert.equal(program.semanticSpec.datasets.length, 1);
      assert.equal(program.semanticSpec.layers[0].encoding.theta.aggregate, sum ? "sum" : "count");
      assert.deepEqual(source.semanticSpec, snapshot);
    });

    test(`authors density variant ${variant + 1} from ${dataset.name} with complete profiles and revisions`, () => {
      const source = chart().createCanvas(layout).createData({ id: "observations", values });
      const snapshot = structuredClone(source.semanticSpec);
      const grouped = [1, 2, 4].includes(variant);
      let program = source.createDensityPlot({
        id: "profiles", field: dataset.value, bandwidth,
        extent: [minimum - bandwidth * 3, maximum + bandwidth * 3], steps: 51,
        ...(grouped ? { groupBy: dataset.category, color: dataset.category } : {}),
        ...(variant === 2 ? { densityChannel: "x" } : {}),
        ...(variant === 3 ? { kernel: "uniform", normalization: "count", area: { opacity: 0.6, curve: "step" } } : {}),
        ...(variant === 4 ? { kernel: "triangular", guides: { grid: { horizontal: false, vertical: {} } } } : {})
      });
      if (variant === 4) program = program.editDensity({ target: "profiles", bandwidth: bandwidth * 0.75, steps: 61 });
      inspect(program, values, `${dataset.name} density ${variant}`);
      const profiles = grouped ? categories.size : 1;
      assert.equal(program.graphicSpec.objects.profiles.items.length, profiles);
      const derived = program.semanticSpec.datasets.find(data => data.id === program.semanticSpec.layers[0].data);
      assert.equal(derived.source, "observations");
      assert.equal(derived.values.length, profiles * (variant === 4 ? 61 : 51));
      assert.deepEqual(source.semanticSpec, snapshot);
    });

    test(`authors Horizon variant ${variant + 1} from ${dataset.name} against independent signed folds`, () => {
      // The x role is explicit input order, not a fabricated time series.
      let ordered = values.map((row, recordIndex) => ({ ...row, recordIndex,
        ...(variant === 3 && recordIndex % 11 === 5 ? { [dataset.value]: null } : {}) }));
      const grouped = variant === 1 || variant === 2;
      const groupField = dataset.name === "movies" ? "releasePeriod" : dataset.category;
      if (grouped && dataset.name === "movies") {
        const counts = new Map();
        for (const row of ordered) counts.set(row[dataset.category], (counts.get(row[dataset.category]) ?? 0) + 1);
        assert.ok([...counts.values()].some(count => count === 1));
        const allYears = chart().createCanvas(layout).createData({ id: "observations", values: ordered });
        const original = structuredClone({ semantic: allYears.semanticSpec, graphic: allYears.graphicSpec, trace: allYears.trace });
        assert.throws(() => allYears.createHorizonPlot({ x: "recordIndex", y: dataset.value,
          groupBy: dataset.category, baseline: (minimum + maximum) / 2 }), /at least two points/);
        assert.deepEqual({ semantic: allYears.semanticSpec, graphic: allYears.graphicSpec, trace: allYears.trace }, original);
        // The caller explicitly groups release years into two periods; no records are dropped.
        ordered = ordered.map(row => ({ ...row,
          releasePeriod: Number(row.Released_Year) < 1980 ? "before 1980" : "1980 onward" }));
      }
      const source = chart().createCanvas(layout).createData({ id: "observations", values: ordered });
      const snapshot = structuredClone(source.semanticSpec);
      const options = {
        baseline: (minimum + maximum) / 2,
        ...(grouped ? { groupBy: groupField } : {}),
        ...(variant === 2 ? { bands: 4, resolve: "independent" } : {}),
        ...(variant === 4 ? { bands: 2, extent: (maximum - minimum) / 4 } : {})
      };
      let program = source.createHorizonPlot({ id: "folds", x: "recordIndex", y: dataset.value, ...options,
        ...(variant === 2 ? { area: { curve: "monotone" } } : {}),
        ...(variant === 3 ? { area: { opacity: 0.6 }, missing: "break" } : {}) });
      if (variant === 4) {
        options.bands = 4;
        program = program.editHorizon({ target: "folds", bands: options.bands,
          palette: { positive: "greens", negative: "oranges" } });
      }
      inspect(program, ordered, `${dataset.name} Horizon ${variant}`);
      const expected = calculateHorizon(ordered, { xField: "recordIndex", yField: dataset.value, ...options });
      const derived = program.semanticSpec.datasets.find(data => data.id === program.semanticSpec.layers[0].data);
      const transform = derived.transform[0];
      assert.equal(derived.source, "observations");
      assert.equal(program.graphicSpec.objects.folds.items.length, expected.series.length);
      assert.equal(derived.values.length, expected.series.reduce((sum, series) => sum + series.points.length, 0));
      assert.deepEqual(transform.resolved.extents.map(entry => entry.extent), expected.groups.map(entry => entry.extent));
      const referenceBands = new Map();
      for (const series of expected.series) {
        const key = JSON.stringify([series.group, series.sign, series.bandIndex]);
        if (!referenceBands.has(key)) referenceBands.set(key, []);
        referenceBands.get(key).push(...series.points.map(point => [point.x, point.amplitude / series.bandHeight]));
      }
      const actualBands = new Map();
      for (const row of derived.values) {
        const key = JSON.stringify([grouped ? row[groupField] : null, row[transform.as.sign], row[transform.as.band]]);
        if (!actualBands.has(key)) actualBands.set(key, []);
        actualBands.get(key).push([row[transform.as.x], row[transform.as.upper]]);
        assert.equal(row[transform.as.lower], 0);
      }
      assert.deepEqual([...actualBands.keys()].sort(), [...referenceBands.keys()].sort());
      for (const [key, points] of referenceBands) {
        const byPosition = (a, b) => a[0] - b[0] || a[1] - b[1];
        const actual = actualBands.get(key).sort(byPosition);
        points.sort(byPosition);
        assert.equal(actual.length, points.length);
        for (const [index, point] of points.entries()) {
          assert.ok(Math.abs(actual[index][0] - point[0]) < 1e-9);
          assert.ok(Math.abs(actual[index][1] - point[1]) < 1e-10);
        }
      }
      assert.deepEqual(source.semanticSpec, snapshot);
    });
  }
}
