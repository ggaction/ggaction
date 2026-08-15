import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(
  new URL("../../../data/corpus/manifest.json", import.meta.url),
  "utf8"
));

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const FIELD_TYPES = new Set([
  "boolean",
  "duration-hms",
  "nominal",
  "ordinal",
  "quantitative",
  "temporal-date",
  "temporal-datetime",
  "temporal-year"
]);
const FIELD_ROLES = Object.freeze([
  "temporal",
  "measure",
  "dimension",
  "label",
  "geography",
  "id",
  "order",
  "weight"
]);
const MAPPING_FIELDS = Object.freeze([
  "x", "y", "color", "label", "time", "facet", "size", "weight", "order"
]);

function validateStringList(value, label, { allowEmpty = false } = {}) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    !value.every(item => typeof item === "string" && item.length > 0)
  ) {
    throw new TypeError(`${label} must contain non-empty strings.`);
  }
}

function validateSelection(dataset) {
  const { selection } = dataset;
  if (selection?.mode === "all") {
    if (dataset.selectedRows !== dataset.rows) {
      throw new Error(`${dataset.id} all-selection row count must match its source.`);
    }
    return;
  }
  if (
    selection?.mode !== "stable-sample" ||
    !Number.isInteger(selection.count) || selection.count <= 0 ||
    selection.count >= dataset.rows ||
    dataset.selectedRows !== selection.count ||
    typeof selection.seed !== "string" || selection.seed.length === 0
  ) {
    throw new TypeError(`${dataset.id} has an invalid stable selection.`);
  }
  validateStringList(
    selection.witnessFields,
    `${dataset.id} numeric witnesses`,
    { allowEmpty: true }
  );
  validateStringList(
    selection.witnessDimensions,
    `${dataset.id} dimension witnesses`,
    { allowEmpty: true }
  );
}

function validateRealDataset(dataset, manifest) {
  if (
    typeof dataset.path !== "string" ||
    !/^[a-zA-Z0-9_./-]+$/u.test(dataset.path) ||
    dataset.path.includes("..") ||
    dataset.blobUrl !== `${manifest.tidyTuesday.repository.replace(
      "https://github.com/",
      "https://raw.githubusercontent.com/"
    )}/${manifest.tidyTuesday.commit}/${dataset.path}` ||
    !/^[a-f0-9]{64}$/u.test(dataset.sha256) ||
    !Number.isInteger(dataset.bytes) || dataset.bytes <= 0 ||
    !Number.isInteger(dataset.rows) || dataset.rows <= 0 ||
    !Number.isInteger(dataset.selectedRows) || dataset.selectedRows <= 0 ||
    dataset.fields === null || typeof dataset.fields !== "object" ||
    Object.keys(dataset.fields).length === 0
  ) {
    throw new TypeError(`${dataset.id} has an invalid pinned source contract.`);
  }
  validateSelection(dataset);
  const fieldNames = new Set(Object.keys(dataset.fields));
  for (const [field, schema] of Object.entries(dataset.fields)) {
    if (
      schema === null || typeof schema !== "object" ||
      !FIELD_TYPES.has(schema.type) ||
      typeof schema.label !== "string" || schema.label.length === 0 ||
      typeof schema.description !== "string" || schema.description.length === 0 ||
      (schema.unit !== undefined &&
        (typeof schema.unit !== "string" || schema.unit.length === 0)) ||
      !Number.isInteger(schema.profile?.missing) || schema.profile.missing < 0 ||
      !Number.isInteger(schema.profile?.distinct) || schema.profile.distinct < 0 ||
      (schema.nullable === true) !== (schema.profile.missing > 0)
    ) {
      throw new TypeError(`${dataset.id} field "${field}" has invalid metadata.`);
    }
  }
  if (
    dataset.fieldRoles === null || typeof dataset.fieldRoles !== "object" ||
    !FIELD_ROLES.every(role => Object.hasOwn(dataset.fieldRoles, role)) ||
    Object.keys(dataset.fieldRoles).some(role => !FIELD_ROLES.includes(role))
  ) {
    throw new TypeError(`${dataset.id} must declare every supported field role.`);
  }
  for (const role of FIELD_ROLES) {
    const fields = dataset.fieldRoles[role];
    validateStringList(fields, `${dataset.id} ${role} fields`, { allowEmpty: true });
    if (new Set(fields).size !== fields.length || fields.some(field => !fieldNames.has(field))) {
      throw new Error(`${dataset.id} ${role} roles must name unique source fields.`);
    }
  }
  if (
    dataset.fieldRoles.measure.length === 0 ||
    dataset.fieldRoles.dimension.length === 0
  ) {
    throw new Error(`${dataset.id} needs a real measure and dimension.`);
  }
  if (dataset.fieldRoles.measure.some(field =>
    !["quantitative", "duration-hms"].includes(dataset.fields[field].type)
  )) {
    throw new Error(`${dataset.id} measure roles must be finite numeric fields.`);
  }
  if (dataset.fieldRoles.dimension.some(field =>
    dataset.fields[field].profile.distinct < 2
  )) {
    throw new Error(`${dataset.id} dimension roles must vary in the source data.`);
  }
  if (dataset.fieldRoles.temporal.some(field =>
    !dataset.fields[field].type.startsWith("temporal-")
  )) {
    throw new Error(`${dataset.id} temporal roles must use explicit temporal schemas.`);
  }
  if (dataset.fieldRoles.weight.some(field =>
    !["quantitative", "duration-hms"].includes(dataset.fields[field].type)
  )) {
    throw new Error(`${dataset.id} weight roles must be finite numeric fields.`);
  }
  if (!Array.isArray(dataset.chartMappings) || dataset.chartMappings.length === 0) {
    throw new Error(`${dataset.id} needs at least one realistic chart mapping.`);
  }
  const mappingIds = new Set();
  for (const mapping of dataset.chartMappings) {
    if (
      typeof mapping?.id !== "string" || mapping.id.length === 0 ||
      typeof mapping.description !== "string" || mapping.description.length === 0 ||
      typeof mapping.x !== "string" || typeof mapping.y !== "string"
    ) {
      throw new TypeError(`${dataset.id} has an invalid chart mapping.`);
    }
    if (mappingIds.has(mapping.id)) {
      throw new Error(`${dataset.id} repeats chart mapping id "${mapping.id}".`);
    }
    mappingIds.add(mapping.id);
    for (const key of MAPPING_FIELDS) {
      if (mapping[key] !== undefined && !fieldNames.has(mapping[key])) {
        throw new Error(`${dataset.id} chart mapping refers to unknown field "${mapping[key]}".`);
      }
    }
    const expectedRoles = {
      y: "measure",
      color: "dimension",
      label: "label",
      time: "temporal",
      facet: "dimension",
      size: "measure",
      weight: "weight",
      order: "order"
    };
    for (const [key, role] of Object.entries(expectedRoles)) {
      if (mapping[key] !== undefined && !dataset.fieldRoles[role].includes(mapping[key])) {
        throw new Error(
          `${dataset.id} chart mapping ${key} must use a ${role} field.`
        );
      }
    }
  }
  if (
    dataset.provenance === null || typeof dataset.provenance !== "object" ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(dataset.provenance.week) ||
    typeof dataset.provenance.title !== "string" ||
    typeof dataset.provenance.sourceName !== "string" ||
    !dataset.provenance.readmeUrl.includes(manifest.tidyTuesday.commit) ||
    !/^https?:\/\//u.test(dataset.provenance.upstreamUrl) ||
    typeof dataset.provenance.sourceLicense?.status !== "string" ||
    typeof dataset.provenance.sourceLicense?.name !== "string"
  ) {
    throw new TypeError(`${dataset.id} has incomplete source provenance.`);
  }
  if (
    dataset.sourceProfile?.fieldCount !== fieldNames.size ||
    !Number.isInteger(dataset.sourceProfile?.missingCells) ||
    typeof dataset.sourceProfile?.missingRate !== "number"
  ) {
    throw new TypeError(`${dataset.id} has an invalid measured source profile.`);
  }
}

function validateManifest(value) {
  if (value?.version !== 2 || !Array.isArray(value.datasets)) {
    throw new Error("Dataset corpus manifest must use version 2.");
  }
  const ids = new Set();
  for (const dataset of value.datasets) {
    if (
      dataset === null ||
      typeof dataset !== "object" ||
      typeof dataset.id !== "string" ||
      dataset.id.length === 0 ||
      !["tidytuesday", "zoo"].includes(dataset.corpus)
    ) {
      throw new TypeError("Dataset corpus entries require an id and corpus.");
    }
    if (ids.has(dataset.id)) {
      throw new Error(`Dataset corpus repeats id "${dataset.id}".`);
    }
    ids.add(dataset.id);
    validateStringList(dataset.profiles, `${dataset.id} profiles`);
    validateStringList(dataset.chartFamilies, `${dataset.id} chartFamilies`);
    if (dataset.corpus === "zoo") {
      if (typeof dataset.generator !== "string" || dataset.generator.length === 0) {
        throw new TypeError(`${dataset.id} requires a zoo generator.`);
      }
      continue;
    }
    validateRealDataset(dataset, value);
  }
  const real = value.datasets.filter(dataset => dataset.corpus === "tidytuesday");
  if (
    real.length !== 50 || value.tidyTuesday?.datasetCount !== real.length ||
    value.tidyTuesday.totalBytes !== real.reduce((sum, dataset) => sum + dataset.bytes, 0) ||
    value.tidyTuesday.totalRows !== real.reduce((sum, dataset) => sum + dataset.rows, 0) ||
    value.tidyTuesday.selectedRows !==
      real.reduce((sum, dataset) => sum + dataset.selectedRows, 0)
  ) {
    throw new Error("TidyTuesday corpus totals must match exactly 50 source tables.");
  }
  if (
    new Set(real.map(dataset => dataset.path)).size !== real.length ||
    new Set(real.map(dataset => dataset.provenance.week)).size !== real.length ||
    new Set(real.map(dataset => dataset.provenance.upstreamUrl)).size !== real.length ||
    new Set(real.map(dataset =>
      `${dataset.provenance.sourceName}\0${dataset.provenance.upstreamUrl}`
    )).size !== real.length
  ) {
    throw new Error(
      "TidyTuesday entries must represent distinct source tables and upstream datasets."
    );
  }
  return value;
}

export const DATASET_CORPUS = deepFreeze(validateManifest(manifest));

const byId = new Map(DATASET_CORPUS.datasets.map(dataset => [dataset.id, dataset]));

export function datasetDefinition(id) {
  const dataset = byId.get(id);
  if (dataset === undefined) throw new Error(`Unknown corpus dataset "${id}".`);
  return dataset;
}

export function corpusDatasetIds(corpus) {
  if (corpus !== undefined && !["tidytuesday", "zoo"].includes(corpus)) {
    throw new Error(`Unknown dataset corpus "${corpus}".`);
  }
  return Object.freeze(DATASET_CORPUS.datasets
    .filter(dataset => corpus === undefined || dataset.corpus === corpus)
    .map(dataset => dataset.id));
}
