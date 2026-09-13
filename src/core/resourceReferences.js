import { freezeOwned, isPlainObject } from "./immutable.js";
import { validateUserId } from "./identifiers.js";

export const RESOURCE_KINDS = Object.freeze([
  "data", "scale", "coordinate", "mark", "selection"
]);

const DATA_VALUE_KEYS = new Set([
  "data", "dataset", "dataId", "filteredData", "originalData",
  "outlierDataId", "profileId", "summaryId"
]);
const DATA_SOURCE_CONFIGS = new Set([
  "boxPlot", "density", "ecdfPlot", "endpointPlot", "errorBand", "errorBar",
  "gradientPlot", "horizon", "intervalPlot", "markFilter", "raincloudPlot",
  "regression", "violinPlot"
]);
const MARK_ID_KEYS = new Set([
  "bandId", "bodyId", "centerId", "connectorId", "intervalId", "lineId",
  "lowerBoundaryId", "lowerCapId", "medianId", "outlierId", "startId",
  "stemId", "upperBoundaryId", "upperCapId", "whiskerId"
]);

function ownedPath(path) {
  return freezeOwned([...path]);
}

function reference(kind, id, ownerKind, ownerId, path, strength = "live") {
  if (typeof id !== "string" || id.length === 0) return undefined;
  return freezeOwned({
    kind,
    id,
    ownerKind,
    ownerId,
    path: ownedPath(path),
    strength
  });
}

function append(references, value) {
  if (value !== undefined) references.push(value);
}

function collectKnownKeys(value, path, visit) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectKnownKeys(item, [...path, index], visit));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child, [...path, key], path);
    collectKnownKeys(child, [...path, key], visit);
  }
}

export function canonicalResourcePath(path) {
  if (!Array.isArray(path)) {
    throw new TypeError("Resource reference path must be an array.");
  }
  return path.map(part => {
    if (Number.isInteger(part) && part >= 0) return `[${part}]`;
    if (typeof part !== "string" || part.length === 0) {
      throw new TypeError("Resource reference path parts must be names or indexes.");
    }
    return `.${part}`;
  }).join("");
}

export function collectSemanticDataReferences(program) {
  const references = [];
  for (const layer of program.semanticSpec.layers) {
    append(references, reference("data", layer.data, "layer", layer.id, ["data"]));
  }
  for (const dataset of program.semanticSpec.datasets) {
    append(references, reference(
      "data", dataset.source, "dataset", dataset.id, ["source"]
    ));
  }
  return freezeOwned(references);
}

export function collectSemanticScaleReferences(program) {
  const references = [];
  for (const layer of program.semanticSpec.layers) {
    for (const [channel, encoding] of Object.entries(layer.encoding ?? {})) {
      append(references, reference(
        "scale", encoding?.scale, "layer", layer.id,
        ["encoding", channel, "scale"]
      ));
      if (channel === "parallel") {
        for (const [index, dimension] of (encoding?.dimensions ?? []).entries()) {
          append(references, reference(
            "scale", dimension.scale, "layer", layer.id,
            ["encoding", "parallel", "dimensions", index, "scale"]
          ));
        }
      }
    }
  }
  collectKnownKeys(program.semanticSpec.guides, [], (key, value, path) => {
    if (key === "scale") {
      append(references, reference(
        "scale", value, "semanticGuide", "guides", path
      ));
    } else if (key === "scales" && Array.isArray(value)) {
      value.forEach((id, index) => append(references, reference(
        "scale", id, "semanticGuide", "guides", [...path, index]
      )));
    }
  });
  return freezeOwned(references);
}

export function collectSemanticCoordinateReferences(program) {
  const references = [];
  for (const layer of program.semanticSpec.layers) {
    append(references, reference(
      "coordinate", layer.coordinate, "layer", layer.id, ["coordinate"]
    ));
  }
  collectKnownKeys(program.semanticSpec.guides, [], (key, value, path) => {
    if (key === "coordinate") {
      append(references, reference(
        "coordinate", value, "semanticGuide", "guides", path
      ));
    }
  });
  return freezeOwned(references);
}

export function collectMarkConfigReferences(program) {
  const references = [];
  for (const layer of program.semanticSpec.layers) {
    append(references, reference(
      "mark", layer.source, "layer", layer.id, ["source"]
    ));
  }
  for (const [ownerId, config] of Object.entries(program.markConfigs)) {
    collectKnownKeys(config, [], (key, value, path, parentPath) => {
      if (DATA_VALUE_KEYS.has(key)) {
        append(references, reference("data", value, "markConfig", ownerId, path));
      }
      const root = parentPath[0];
      if (key === "source" && DATA_SOURCE_CONFIGS.has(root)) {
        append(references, reference("data", value, "markConfig", ownerId, path));
      }
      if (key === "coordinate") {
        append(references, reference(
          "coordinate", value, "markConfig", ownerId, path
        ));
      }
      if ((key === "scale" || key.endsWith("Scale")) && typeof value === "string") {
        append(references, reference("scale", value, "markConfig", ownerId, path));
      } else if (key === "scale" && isPlainObject(value)) {
        append(references, reference(
          "scale", value.id, "markConfig", ownerId, [...path, "id"]
        ));
      }
      if (MARK_ID_KEYS.has(key)) {
        append(references, reference("mark", value, "markConfig", ownerId, path));
      }
      if (
        (root === "errorBandBoundary" && key === "owner") ||
        (parentPath.length === 0 && key === "boxSpanOwner") ||
        (root === "raincloudPlot" && (
          key === "ownerId" || parentPath[1] === "childIds" ||
          parentPath[1] === "ownedChildIds"
        ))
      ) {
        append(references, reference("mark", value, "markConfig", ownerId, path));
      }
    });
    append(references, reference(
      "mark", config.statisticalReference?.source,
      "markConfig", ownerId, ["statisticalReference", "source"]
    ));
    for (const [index, id] of (
      config.raincloudPlot?.ownedChildIds ?? []
    ).entries()) {
      append(references, reference(
        "mark", id, "markConfig", ownerId,
        ["raincloudPlot", "ownedChildIds", index]
      ));
    }
    const selection = config.labelAuthoring?.selection;
    if (selection?.kind === "named") {
      append(references, reference(
        "selection", selection.id, "markConfig", ownerId,
        ["labelAuthoring", "selection", "id"]
      ));
    }
  }
  return freezeOwned(references);
}

export function collectGuideConfigReferences(program) {
  const references = [];
  for (const [family, configs] of Object.entries(program.guideConfigs ?? {})) {
    collectKnownKeys(configs, [], (key, value, path, parentPath) => {
      const ownerId = parentPath.length === 0 ? family : parentPath.join(".");
      const relativePath = parentPath.length === 0
        ? path
        : path.slice(parentPath.length);
      if (key === "scale") {
        append(references, reference(
          "scale", value, family, ownerId, relativePath
        ));
      } else if (key === "scales" && Array.isArray(value)) {
        value.forEach((id, index) => append(references, reference(
          "scale", id, family, ownerId, [...relativePath, index]
        )));
      } else if (key === "coordinate") {
        append(references, reference(
          "coordinate", value, family, ownerId, relativePath
        ));
      } else if (key === "target") {
        append(references, reference(
          "mark", value, family, ownerId, relativePath
        ));
      }
    });
  }
  return freezeOwned(references);
}

export function collectSelectionReferences(program) {
  const references = [];
  for (const [id, config] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    append(references, reference(
      "mark", config.target, "selection", id, ["target"]
    ));
  }
  for (const [id, config] of Object.entries(
    program.materializationConfigs.highlights ?? {}
  )) {
    append(references, reference(
      "mark", config.target, "highlight", id, ["target"]
    ));
    append(references, reference(
      "selection", config.selection, "highlight", id, ["selection"]
    ));
  }
  return freezeOwned(references);
}

export function collectDataOwnerReferences(program) {
  const references = [];
  for (const [family, owners] of Object.entries(
    program.materializationConfigs.data ?? {}
  )) {
    for (const [owner, config] of Object.entries(owners ?? {})) {
      for (const key of ["current", "source", "previous"]) {
        append(references, reference(
          "data", config?.[key], "dataOwner", owner,
          ["data", family, owner, key]
        ));
      }
    }
  }
  return freezeOwned(references);
}

export function collectCompositionReferences(program) {
  const references = [];
  const composition = program.compositionSpec;
  if (composition?.type !== "facet") return freezeOwned(references);
  append(references, reference(
    "data", composition.facet.data, "composition", composition.id,
    ["facet", "data"]
  ));
  append(references, reference(
    "mark", composition.facet.repeat?.target, "composition", composition.id,
    ["facet", "repeat", "target"]
  ));
  return freezeOwned(references);
}

export function collectContextReferences(program) {
  const references = [];
  for (const [key, kind] of Object.entries({
    currentData: "data",
    currentScale: "scale",
    currentCoordinate: "coordinate",
    currentMark: "mark",
    currentSelection: "selection"
  })) {
    append(references, reference(
      kind, program.context[key], "context", "program", [key], "context"
    ));
  }
  return freezeOwned(references);
}

function referenceKey(value) {
  return [
    value.kind, value.id, value.ownerKind, value.ownerId,
    canonicalResourcePath(value.path), value.strength
  ].join("\u0000");
}

function compareReferences(left, right) {
  const leftKey = [
    left.ownerKind, left.ownerId, canonicalResourcePath(left.path),
    left.kind, left.id, left.strength
  ].join("\u0000");
  const rightKey = [
    right.ownerKind, right.ownerId, canonicalResourcePath(right.path),
    right.kind, right.id, right.strength
  ].join("\u0000");
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

export function collectResourceReferences(program, { kind, id }) {
  if (!RESOURCE_KINDS.includes(kind)) {
    throw new Error(`Unknown resource kind "${kind}".`);
  }
  const target = validateUserId(id, "Resource id");
  const combined = [
    ...collectSemanticDataReferences(program),
    ...collectSemanticScaleReferences(program),
    ...collectSemanticCoordinateReferences(program),
    ...collectMarkConfigReferences(program),
    ...collectGuideConfigReferences(program),
    ...collectSelectionReferences(program),
    ...collectDataOwnerReferences(program),
    ...collectCompositionReferences(program),
    ...collectContextReferences(program)
  ].filter(value => value.kind === kind && value.id === target);
  const unique = new Map(combined.map(value => [referenceKey(value), value]));
  return freezeOwned([...unique.values()].sort(compareReferences));
}
