import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { assertAnalyticLayerIntegrity } from "../oracles/analytic-layer-integrity.js";
import { assertGraphicIntegrity } from "../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../oracles/svg-integrity.js";
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
  }
}
