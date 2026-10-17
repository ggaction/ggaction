import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { resolveFacetProgramLayout } from "../../src/materialization/facets.js";
import { resolveConcreteGraphicBounds } from "../../src/grammar/schemas/graphicBounds.js";
import { realisticRecordView } from "../support/scenarios/realistic-data.js";
import { exerciseCartesianAxisOwners } from "../support/scenarios/cartesian-axis-owner-witness.js";

for (const dataset of ["tt-tour-de-france-winners", "tt-london-marathon-winners", "tt-penguins"]) {
  test(`named axis and parent legend lifecycle preserve actual rows from ${dataset}`, async () => {
    const view = realisticRecordView(dataset, { rowLimit: 24 });
    const native = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
      .createData({ id: "rows", values: view.rows }).createPointMark({ id: "points" })
      .encodeX({ field: "orderNumeric" }).encodeY({ field: "value" });
    const original = serializeProgram(native);
    for (let repetition = 0; repetition < 5; repetition++) {
      let owners = 0;
      const exercised = exerciseCartesianAxisOwners(native, { observe(program, { baseline, align }) {
        owners++;
        assert.equal(program.semanticSpec.guides.axis.sourceQuantity.scale, "y");
        assert.equal(program.semanticSpec.guides.axis.sourceShare.scale, "axisSecondary");
        assert.equal(program.guideConfigs.axis.sourceHorizontal.title.baseline, baseline);
        assert.equal(program.guideConfigs.axis.sourceHorizontal.labels.align, align);
        assert.equal(program.graphicSpec.objects.axis_sourceHorizontal__Line.properties.y1, 2204);
        assert.equal(program.graphicSpec.objects.axis_sourceQuantity__Line.properties.x1, 996);
        assert.equal(program.graphicSpec.objects.axis_sourceShare__Line.properties.x1, 3402);
        assert.deepEqual(program.graphicSpec.objects.axis_sourceHorizontal__Ticks.items[0].properties.strokeDash, []);
        assert.deepEqual(deserializeProgram(serializeProgram(program)).graphicSpec, program.graphicSpec);
      } });
      assert.equal(owners, 6);
      assert.deepEqual(exercised.graphicSpec, native.graphicSpec);
      assert.equal(serializeProgram(native), original);
      const arrays = exercised.trace.children.filter(entry => entry.op === "createAxes");
      assert.equal(arrays.length, 6);
      assert.ok(arrays.every(entry => entry.args.xCount === 1 && entry.args.yCount === 2));
      assert.deepEqual(exercised.semanticSpec.datasets, native.semanticSpec.datasets);
      const arrayFacade = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
        .createData({ values: view.rows })
        .createScatterPlot({ id: "namedScatter", x: "orderNumeric", y: "value", guides: {
          axes: { coordinate: { id: "main", type: "cartesian" },
            x: [{ id: "index", ticksAndLabels: false, title: false }],
            y: [{ id: "quantity", position: "left", ticksAndLabels: false, title: false },
              { id: "rightQuantity", position: "right", ticksAndLabels: false, title: false }] },
          grid: false, legend: false } });
      assert.deepEqual(Object.keys(arrayFacade.guideConfigs.axis), ["index", "quantity", "rightQuantity"]);
      assert.equal(arrayFacade.trace.children.at(-1).args.guides.axes.xCount, 1);
      assert.equal(arrayFacade.trace.children.at(-1).args.guides.axes.yCount, 2);
      assert.deepEqual(deserializeProgram(serializeProgram(arrayFacade)).graphicSpec, arrayFacade.graphicSpec);
      const binned = chart().createCanvas({ width: 4400, height: 3200, margin: 1000 })
        .createData({ id: "rows", values: view.rows }).createHeatmap({ id: "binned",
          x: "orderNumeric", y: "value", bin: { bins: 3 }, guides: { axes: {
            x: [{ id: "heatmapX", title: false }],
            y: [{ id: "heatmapY", title: false },
              { id: "heatmapRight", position: "right", title: { text: "Source intervals" } }]
          }, legend: false } });
      assert.equal(binned.graphicSpec.objects.axis_heatmapX__Title, undefined);
      assert.equal(binned.graphicSpec.objects.axis_heatmapY__Title, undefined);
      assert.ok(binned.graphicSpec.objects.axis_heatmapX__Line);
      assert.ok(binned.graphicSpec.objects.axis_heatmapY__Ticks);
      assert.equal(binned.graphicSpec.objects.axis_heatmapRight__Title.properties.text, "Source intervals");
      assert.equal(binned.trace.children.at(-1).args.guides.axes.yCount, 2);
      assert.deepEqual(binned.semanticSpec.datasets.find(data => data.id === "rows").values, view.rows);
      assert.deepEqual(deserializeProgram(serializeProgram(binned)).graphicSpec, binned.graphicSpec);
      const parent = chart().createCanvas({ plot: { width: 60, height: 275 },
        margin: { top: 35, right: 45, bottom: 60, left: 45 } })
        .createData({ id: "rows", values: view.rows })
        .createScatterPlot({ id: "points", x: "orderNumeric", y: "value", color: "category", guides: false })
        .facet({ field: "category", columns: 4, spacing: "plot", gap: 100,
          guides: { axes: "outer", legend: { target: "points", channels: ["color"], position: "bottom", direction: "horizontal", columns: 2 } } })
        .editLegendTitle({ title: "Source groups", fontSize: 12 })
        .editLegendLabels({ channel: "color", fontSize: 11 })
        .editLegendBorder({ border: { strokeDash: [4, 2] } })
        .editLegendBlock({ target: "points", channel: "color", text: { color: "#334155" } })
        .editLegendLayout({ channel: "color", position: "top-right", direction: "vertical", columns: 1 });
      const changed = parent.editCompositionLayout({ gap: 110 });
      const { plot } = resolveFacetProgramLayout(changed);
      const bounds = resolveConcreteGraphicBounds(changed.graphicSpec, "facet-shared-legend", changed.materializationConfigs.textMetrics);
      assert.equal(bounds.right, plot.x + plot.width - 8);
      assert.equal(bounds.top, plot.y + 8);
      assert.ok(bounds.right - bounds.left > 60);
      for (const child of Object.values(changed.children)) assert.equal(child.materializationConfigs.canvas.plot.width, 60);
      assert.deepEqual(deserializeProgram(serializeProgram(changed)).graphicSpec, changed.graphicSpec);
      assert.deepEqual(changed.semanticSpec.datasets, parent.semanticSpec.datasets);
      const removed = changed.removeLegend({ channels: ["color"] });
      assert.equal(removed.compositionSpec.facet.guides.legend, false);
      assert.equal(removed.editCompositionLayout({ gap: 115 }).guideConfigs.legend, undefined);
      if (repetition === 0) assert.ok((await renderToPNGBuffer(changed)).buffer.length > 100);
    }
  });
}

// Parent declarations must execute their own authoring contract on real rows;
// unit legend trace evidence cannot stand in for a composition-owned guide.
test("parent legend options and literals have actual public 5/3 witnesses", { timeout: 600_000 }, async () => {
  const { readFileSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { buildPublicOptionInventory } = await import("../support/scenarios/coverage-inventory.js");
  const { literalValueKey } = await import("../support/scenarios/coverage-ledger.js");
  const { PARENT_LEGEND_WITNESS_PROFILES, parentLegendWitnessSource,
    parentLegendWitnessOptions, createParentLegendWitness } = await import("../support/scenarios/facet-legend-owner-witness.js");
  const inventory = await buildPublicOptionInventory(JSON.parse(readFileSync(
    new URL("../../knowledge/action-cards.json", import.meta.url), "utf8")));
  const actions = new Set(["facet", "facetGrid", "repeatCharts", "editFacetGuides"]);
  const options = inventory.optionPaths.filter(option => option.required && actions.has(option.action) &&
    /^(guides\.)?legend(?:\.|$)/u.test(option.path));
  const optionIds = new Set(options.map(option => option.id));
  const literals = inventory.pathLiteralRequirements.filter(requirement => optionIds.has(requirement.optionPath));
  const diversity = inventory.pathDiversityRequirements.filter(requirement => optionIds.has(requirement.optionPath));
  assert.equal(options.length, 248);
  assert.equal(literals.length, 168);
  assert.equal(diversity.length, 4);
  const optionById = new Map(options.map(option => [option.id, option]));
  const stats = new Map([...options, ...literals].map(requirement => [requirement.id, { occurrences: 0, datasets: new Set() }]));
  const distinct = new Map(diversity.map(requirement => [requirement.id, new Map()]));
  const layoutEffects = new Map();
  const at = (args, path) => {
    let values = [args];
    for (const name of path.split(".")) values = values.flatMap(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      if (Object.hasOwn(value, name) && value[name] !== undefined) return [value[name]];
      return Number.isInteger(value[`${name}Count`]) && value[`${name}Count`] > 0 ? [{ summarizedArray: true }] : [];
    });
    return values;
  };
  let builds = 0;
  for (let repetition = 0; repetition < 5; repetition++) {
    const dataset = ["tt-tour-de-france-winners", "tt-london-marathon-winners", "tt-penguins"][repetition % 3];
    const view = realisticRecordView(dataset, { rowLimit: 24, groupLimit: 4, deriveSubgroup: true });
    for (const profile of PARENT_LEGEND_WITNESS_PROFILES) {
      const source = parentLegendWitnessSource(view, profile), original = serializeProgram(source);
      const legend = parentLegendWitnessOptions(view, profile);
      for (const host of ["facet", "facetGrid", "repeatCharts"]) {
        let program;
        try {
          program = createParentLegendWitness(source, host, legend, profile).editFacetGuides({ legend });
        } catch (error) { error.message = `${dataset}/${host}/${profile.id}: ${error.message}`; throw error; }
        assert.equal(serializeProgram(source), original);
        assert.deepEqual(program.semanticSpec.datasets.find(data => data.id === "rows").values, view.rows);
        const snapshot = serializeProgram(program), restored = deserializeProgram(snapshot);
        assert.deepEqual(restored.graphicSpec, program.graphicSpec);
        if (repetition === 0) {
          const reflowed = program.editCompositionLayout({ gap: 48 });
          assert.deepEqual(restored.editCompositionLayout({ gap: 48 }).graphicSpec, reflowed.graphicSpec);
          assert.equal(serializeProgram(program), snapshot);
          if (legend !== "shared") assert.deepEqual(reflowed.compositionSpec.facet.guides.legend,
            program.compositionSpec.facet.guides.legend);
        }
        const plot = resolveFacetProgramLayout(program).plot;
        assert.ok(plot.width >= 600 && plot.height >= 450);
        const ownerIds = [`${program.compositionSpec.id}-shared-legend`, `${program.compositionSpec.id}-legend`];
        const ownerId = ownerIds.find(id => program.graphicSpec.objects[id] !== undefined);
        const bounds = ownerId === undefined ? undefined : resolveConcreteGraphicBounds(program.graphicSpec,
          ownerId, program.materializationConfigs.textMetrics);
        if (legend === false) assert.equal(bounds, undefined);
        else assert.ok(bounds && bounds.right > bounds.left && bounds.bottom > bounds.top);
        const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8,
          `${profile.id}: ${actual} != ${expected}`);
        if (legend && typeof legend === "object") {
          assert.equal(program.compositionSpec.facet.guides.legend.type, "authored-legend");
          if (legend.at !== undefined) { near(bounds.left, plot.x + legend.at.x); near(bounds.top, plot.y + legend.at.y); }
          if (profile.id.startsWith("anchor-")) {
            const { position, offset } = legend;
            if (position.includes("-")) {
              near(position.endsWith("left") ? bounds.left : bounds.right,
                position.endsWith("left") ? plot.x + offset : plot.x + plot.width - offset);
              near(position.startsWith("top") ? bounds.top : bounds.bottom,
                position.startsWith("top") ? plot.y + offset : plot.y + plot.height - offset);
            } else if (["left", "right"].includes(position)) {
              near(bounds.top, plot.y);
              near(position === "left" ? bounds.right : bounds.left,
                position === "left" ? plot.x - offset : plot.x + plot.width + offset);
            } else {
              near(position === "top" ? bounds.bottom : bounds.top,
                position === "top" ? plot.y - offset : plot.y + plot.height + offset);
              if (legend.align === "left") near(bounds.left, plot.x);
              else if (legend.align === "right") near(bounds.right, plot.x + plot.width);
              else near((bounds.left + bounds.right) / 2, plot.x + plot.width / 2);
            }
          }
          const configs = Object.values(program.guideConfigs.legend);
          if (legend.clipHeight !== undefined) {
            assert.ok(configs.every(config => config.clipHeight === legend.clipHeight));
            assert.ok(Object.values(program.graphicSpec.objects).some(object => object.type === "canvas" &&
              object.properties.height === legend.clipHeight), `${profile.id}: actual sample window`);
          }
          if (profile.sampledValues) assert.deepEqual(configs[0].sampling.values, legend.values);
          if (profile.id === "color-gradient") {
            const config = program.guideConfigs.legend.gradient;
            assert.deepEqual(config.gradient, legend.gradient);
            assert.equal(config.gradientDirection, "horizontal");
            assert.equal(config.titlePosition, "bottom");
            assert.ok(program.graphicSpec.objects.colorGradientStrips.items.every(item => item.properties.opacity === 0.7));
          }
          if (profile.family === "size-shape") {
            assert.equal(program.guideConfigs.legend.series.combine, "size-shape");
            assert.equal(program.guideConfigs.legend.series.sizeAreas.length, new Set(view.rows.map(row => row.category)).size);
          }
          if (profile.family === "color-size") {
            assert.deepEqual(Object.keys(program.guideConfigs.legend), ["colorSize"]);
            const config = program.guideConfigs.legend.colorSize;
            assert.equal(config.colorScale, "color"); assert.equal(config.sizeScale, "size");
            assert.deepEqual(config.domain, program.resolvedScales.color.domain);
            assert.deepEqual(config.domain, program.resolvedScales.size.domain);
            assert.equal(config.symbol.opacity, 0.65);
            assert.equal(program.semanticSpec.guides.legend.colorSize.colorScale, config.colorScale);
            assert.equal(program.semanticSpec.guides.legend.colorSize.sizeScale, config.sizeScale);
          }
          if (profile.id.startsWith("blocks-")) layoutEffects.set(`${dataset}/${host}/${profile.id}`,
            { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top });
        }
        for (const child of Object.values(program.children)) {
          assert.ok(child.graphicSpec.objects.points?.items?.length > 0, `${dataset}/${profile.id}: nonempty source marks`);
          assert.equal(child.materializationConfigs.canvas.plot.width, 600);
          assert.equal(child.materializationConfigs.canvas.plot.height, 450);
        }
        for (const entry of program.trace.children.filter(entry => actions.has(entry.op))) {
          const observed = [
            ...options.filter(option => option.action === entry.op && at(entry.args, option.path).length > 0),
            ...literals.filter(requirement => {
              const option = optionById.get(requirement.optionPath);
              return option.action === entry.op && at(entry.args, option.path).some(value => literalValueKey(value) === requirement.valueKey);
            })
          ];
          for (const requirement of diversity) {
            const option = optionById.get(requirement.optionPath);
            if (option.action !== entry.op) continue;
            for (const value of at(entry.args, option.path)) {
              const key = literalValueKey(value), values = distinct.get(requirement.id);
              if (!values.has(key)) values.set(key, { occurrences: 0, datasets: new Set() });
              const record = values.get(key); record.occurrences++; record.datasets.add(dataset);
            }
          }
          for (const requirement of observed) {
            const record = stats.get(requirement.id); record.occurrences++; record.datasets.add(dataset);
          }
        }
        builds++;
      }
    }
  }
  const missing = [...stats].filter(([, stats]) => stats.occurrences < 5 || stats.datasets.size < 3)
    .map(([id, stats]) => ({ id, occurrences: stats.occurrences, datasetCount: stats.datasets.size }));
  const missingDiversity = diversity.filter(requirement => [...distinct.get(requirement.id).values()]
    .filter(stats => stats.occurrences >= 5 && stats.datasets.size >= 3).length < requirement.minimumDistinctValues)
    .map(requirement => requirement.id);
  const report = { counts: { options: options.length, literals: literals.length, diversity: diversity.length, builds }, missing, missingDiversity,
    witnesses: Object.fromEntries([...stats].map(([id, value]) => [id,
      { occurrences: value.occurrences, datasets: [...value.datasets].sort() }])),
    distinct: Object.fromEntries([...distinct].map(([id, values]) => [id,
      Object.fromEntries([...values].map(([key, value]) => [key,
        { occurrences: value.occurrences, datasets: [...value.datasets].sort() }]))])) };
  const directory = new URL("../../.artifacts/test/realistic/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL("parent-legend-coverage.json", directory), JSON.stringify(report, null, 2) + "\n");
  assert.deepEqual(missing, []);
  assert.deepEqual(missingDiversity, []);
  for (const dataset of ["tt-tour-de-france-winners", "tt-london-marathon-winners", "tt-penguins"]) {
    const row = layoutEffects.get(`${dataset}/repeatCharts/blocks-row`);
    const column = layoutEffects.get(`${dataset}/repeatCharts/blocks-column`);
    const wrap = layoutEffects.get(`${dataset}/repeatCharts/blocks-wrap`);
    assert.ok(column.height > row.height, `${dataset}: column stacks complete blocks`);
    assert.ok(wrap.width < row.width && wrap.height > row.height, `${dataset}: wrap creates another row`);
  }
});
