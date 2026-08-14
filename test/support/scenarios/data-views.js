import { datasetDefinition } from "../datasets/catalog.js";
import { loadTidyTuesdayDataset, tidyTuesdayCached } from "../datasets/tidytuesday.js";
import { loadZooDataset } from "../datasets/zoo.js";

export function scenarioDatasetAvailable(id) {
  const definition = datasetDefinition(id);
  return definition.corpus === "zoo" || tidyTuesdayCached(id);
}

export function loadScenarioDataset(id) {
  const definition = datasetDefinition(id);
  return definition.corpus === "zoo"
    ? loadZooDataset(id)
    : loadTidyTuesdayDataset(id);
}

function orderLineRows(rows) {
  return [...rows].sort((left, right) =>
    left.orderValue - right.orderValue || left.key.localeCompare(right.key)
  );
}

export function scatterRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "tt-penguins") {
    return rows.flatMap((row, index) => [
      row.bill_length_mm,
      row.bill_depth_mm,
      row.body_mass_g
    ].every(Number.isFinite) ? [{
      key: `penguin-${index}`,
      x: row.bill_length_mm,
      y: row.bill_depth_mm,
      category: row.species,
      group: row.island,
      size: row.body_mass_g
    }] : []);
  }
  if (id === "zoo-positive-log-decades") {
    return rows.filter(row => row.exponent >= -3 && row.exponent <= 3).map(row => ({
      key: row.id,
      x: row.value,
      y: Math.abs(row.exponent) + 1,
      category: row.group,
      group: row.group,
      size: Math.abs(row.exponent) + 1
    }));
  }
  if (id === "zoo-quantitative-extremes") {
    return rows.map((row, index) => ({
      key: row.id,
      x: row.positive,
      y: index + 1,
      category: row.group,
      group: row.group,
      size: index + 1
    }));
  }
  if (id === "zoo-multi-encoding-styles") {
    return rows.map(row => ({
      key: row.id,
      x: row.x + 1,
      y: row.y + 1,
      category: row.color,
      group: row.shape,
      size: row.size + 1
    }));
  }
  if (id === "zoo-constant-domain") {
    return rows.map((row, index) => ({
      key: row.id,
      x: row.value,
      y: index + 1,
      category: row.category,
      group: row.category,
      size: index + 1
    }));
  }
  throw new Error(`Dataset "${id}" has no scatter scenario view.`);
}

export function lineRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "tt-global-temperatures") {
    return orderLineRows(rows.flatMap(row => ["Jan", "Apr", "Jul", "Oct"].flatMap(month => {
      const time = row.Year;
      return Number.isFinite(row[month]) ? [{
        key: `${row.Year}-${month}`,
        time,
        value: row[month],
        category: month,
        orderValue: Date.parse(time)
      }] : [];
    })));
  }
  if (id === "tt-london-marathon-winners") {
    return orderLineRows(rows.map((row, index) => ({
      key: `winner-${index}`,
      time: row.Year,
      value: row.Time,
      category: row.Category,
      orderValue: Date.parse(row.Year) + index
    })));
  }
  if (id === "zoo-temporal-irregular") {
    return orderLineRows(rows.map(row => ({
      key: row.id,
      time: row.time,
      value: row.value,
      category: row.series,
      orderValue: Date.parse(row.time)
    })));
  }
  if (id === "zoo-temporal-boundaries") {
    return orderLineRows(rows.map(row => ({
      key: row.id,
      time: row.time,
      value: row.value,
      category: row.group,
      orderValue: Date.parse(row.time)
    })));
  }
  throw new Error(`Dataset "${id}" has no line scenario view.`);
}

export function barRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "tt-penguins") {
    return rows.flatMap((row, index) => Number.isFinite(row.body_mass_g) ? [{
      key: `penguin-${index}`,
      category: row.species,
      group: row.island,
      value: row.body_mass_g
    }] : []);
  }
  if (id === "zoo-unicode-labels") {
    return rows.slice(0, 6).map(row => ({
      key: row.id,
      category: row.label.slice(0, 8),
      group: row.group,
      value: row.value
    }));
  }
  if (id === "zoo-categorical-cardinality") {
    return rows.slice(0, 12).map(row => ({
      key: row.id,
      category: row.category.slice(0, 12),
      group: row.group,
      value: row.value
    }));
  }
  if (id === "zoo-diverging-stacks") {
    return rows.map(row => ({ ...row, group: row.series }));
  }
  if (id === "zoo-numeric-looking-categories") {
    return rows.map((row, index) => ({
      key: row.id,
      category: row.category,
      group: `g${index % 2}`,
      value: row.value
    }));
  }
  throw new Error(`Dataset "${id}" has no bar scenario view.`);
}

export function categoricalStressRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "zoo-unicode-labels") {
    return rows.map((row, index) => ({
      key: row.id,
      category: row.label,
      group: row.group,
      value: row.value,
      order: index
    }));
  }
  if (id === "zoo-categorical-cardinality") {
    return rows.map(row => ({
      key: row.id,
      category: row.category,
      group: row.group,
      value: row.value,
      order: row.order
    }));
  }
  throw new Error(`Dataset "${id}" has no categorical stress scenario view.`);
}

export function histogramRows(id, variant = "all") {
  const rows = loadScenarioDataset(id);
  if (id === "tt-us-tornadoes") {
    return rows.flatMap((row, index) => Number.isFinite(row.len) ? [{
      key: `tornado-${index}`,
      value: row.len,
      category: row.mag === null ? "unknown" : `EF${row.mag}`
    }] : []).slice(0, 512);
  }
  if (id === "tt-himalayan-peaks") {
    return rows.map((row, index) => ({
      key: `peak-${index}`,
      value: row.height_metres,
      category: row.climbing_status
    }));
  }
  if (id === "zoo-histogram-boundaries") {
    const selected = variant === "subnormal"
      ? rows.filter(row => row.value > 0 && row.value < 1e-300)
      : variant === "large-offset"
        ? rows.filter(row => row.value >= 1e15)
        : rows.filter(row => row.value >= 0 && row.value <= 1);
    return selected.map(row => ({ key: row.id, value: row.value, category: row.group }));
  }
  throw new Error(`Dataset "${id}" has no histogram scenario view.`);
}

export function densityRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "tt-penguins") {
    return rows.flatMap((row, index) => Number.isFinite(row.body_mass_g) ? [{
      key: `penguin-${index}`,
      value: row.body_mass_g,
      category: row.species
    }] : []);
  }
  if (id === "zoo-multimodal-density") {
    return rows.map(row => ({ key: row.id, value: row.value, category: row.group }));
  }
  throw new Error(`Dataset "${id}" has no density scenario view.`);
}

export function boxRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "tt-penguins") {
    return rows.flatMap((row, index) => Number.isFinite(row.bill_depth_mm) ? [{
      key: `penguin-${index}`,
      category: row.species,
      value: row.bill_depth_mm
    }] : []);
  }
  if (id === "zoo-boxplot-thresholds") {
    return rows.map(row => ({ key: row.id, category: row.group, value: row.value }));
  }
  throw new Error(`Dataset "${id}" has no box scenario view.`);
}

export function intervalRows() {
  return loadScenarioDataset("zoo-asymmetric-intervals").map((row, index) => ({
    ...row,
    position: index + 1,
    group: index % 2 === 0 ? "even" : "odd"
  }));
}

export function monotoneIntervalRows() {
  return intervalRows().map((row, index) => ({
    ...row,
    center: index * 2,
    lower: index * 2 - (index + 1) * 0.1,
    upper: index * 2 + (index + 1) * 0.2
  }));
}

export function heatmapGridRows() {
  return loadScenarioDataset("zoo-sparse-grid").map(row => ({
    ...row,
    value: Number.isFinite(row.value) ? row.value : 0
  }));
}

export function heatmapBinRows(id) {
  if (id === "tt-us-tornadoes") {
    return loadScenarioDataset(id).flatMap((row, index) =>
      [row.slon, row.slat].every(Number.isFinite) && row.slon !== 0 && row.slat !== 0
        ? [{ key: `tornado-${index}`, x: row.slon, y: row.slat }]
        : []
    ).slice(0, 1024);
  }
  if (id === "zoo-label-collision-cloud") {
    return loadScenarioDataset(id).map(row => ({ key: row.id, x: row.x, y: row.y }));
  }
  throw new Error(`Dataset "${id}" has no binned heatmap scenario view.`);
}

export function polarRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "zoo-polar-wrap") {
    return rows.map(row => ({
      key: row.id,
      theta: row.angle,
      radius: row.radius,
      category: row.group,
      value: row.weight,
      sector: row.sector
    }));
  }
  if (id === "zoo-unicode-labels") {
    return rows.map((row, index) => ({
      key: row.id,
      theta: index,
      radius: row.value,
      category: row.group,
      value: row.weight,
      sector: row.label
    }));
  }
  throw new Error(`Dataset "${id}" has no polar scenario view.`);
}

export function labelRows() {
  return loadScenarioDataset("zoo-label-collision-cloud");
}

export function facetRows(id) {
  const rows = loadScenarioDataset(id);
  if (id === "zoo-facet-imbalance") {
    return rows.map(row => ({
      key: row.id,
      facet: row.facet,
      x: row.x,
      y: row.y,
      category: row.category
    }));
  }
  if (id === "tt-penguins") {
    return rows.flatMap((row, index) =>
      [row.bill_length_mm, row.bill_depth_mm].every(Number.isFinite) ? [{
        key: `penguin-${index}`,
        facet: row.island,
        x: row.bill_length_mm,
        y: row.bill_depth_mm,
        category: row.species
      }] : []
    );
  }
  throw new Error(`Dataset "${id}" has no facet scenario view.`);
}
