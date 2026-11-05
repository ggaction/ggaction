import { annotateError } from "../core/diagnostics.js";
import { findLayer } from "./layers.js";
import { findDataset } from "./datasets.js";

export function namespaceGraphicId(namespace, id) {
  const encode = value => Array.from(value, character =>
    character.codePointAt(0).toString(16).padStart(6, "0")
  ).join("");
  return `g${encode(namespace)}_${id}`;
}

function pointOwners(program, id) {
  const layer = findLayer(program, id);
  const dataset = layer?.mark?.type === "point" ? findDataset(program, layer.data) : undefined;
  const owners = [];
  if (Array.isArray(dataset?.values)) {
    const materialization = Object.hasOwn(program, "materializationConfigs") ? program.materializationConfigs : undefined;
    const configs = materialization != null && Object.hasOwn(materialization, "marks") ? materialization.marks
      : Object.hasOwn(program, "markConfigs") ? program.markConfigs : undefined;
    const config = configs != null && Object.hasOwn(configs, id) ? configs[id] : undefined;
    const maxItems = config != null && Object.hasOwn(config, "maxItems") ? config.maxItems : undefined;
    owners.push({ layer, dataset, maxItems });
  }
  for (const childId of program.compositionSpec?.children ?? []) {
    const prefix = namespaceGraphicId(`${program.compositionSpec.id}-${childId}`, "");
    const child = program.children[childId];
    if (!id.startsWith(prefix) || child === undefined) continue;
    const localId = id.slice(prefix.length);
    if (child.graphicSpec.objects[localId] === undefined) continue;
    owners.push(...pointOwners(child, localId));
  }
  return owners;
}

function graphPlotCapacities(program, id) {
  const layer = findLayer(program, id), capacities = [];
  if (layer?.mark?.type === "graph") {
    const materialization = Object.hasOwn(program, "materializationConfigs") ? program.materializationConfigs : undefined;
    const configs = materialization != null && Object.hasOwn(materialization, "marks") ? materialization.marks
      : Object.hasOwn(program, "markConfigs") ? program.markConfigs : undefined;
    const config = configs != null && Object.hasOwn(configs, id) ? configs[id]?.graphPlot : undefined;
    if (config != null && Object.hasOwn(config, "maxItems")) capacities.push(config.maxItems);
  }
  for (const childId of program.compositionSpec?.children ?? []) {
    const prefix = namespaceGraphicId(`${program.compositionSpec.id}-${childId}`, "");
    const child = program.children[childId];
    if (!id.startsWith(prefix) || child === undefined) continue;
    const localId = id.slice(prefix.length);
    if (child.graphicSpec.objects[localId] !== undefined) capacities.push(...graphPlotCapacities(child, localId));
  }
  return capacities;
}

export function resolveGraphicItemCapacity(program, { id, label, type }) {
  const owners = pointOwners(program, id), graphCapacities = owners.length ? [] : graphPlotCapacities(program, id);
  if (owners.length > 1) throw annotateError(new Error("Point graphic ownership is ambiguous."), {
    code: "ambiguous-resource", resourceId: id, candidates: owners.map(owner => owner.layer.id)
  });
  return {
    pointOwned: owners.length === 1,
    rawCount: owners[0]?.dataset.values.length,
    ...(owners[0]?.maxItems === undefined ? {} : { maxItems: owners[0].maxItems }),
    ...(graphCapacities.length === 1 ? { graphMaxItems: graphCapacities[0] } : {}),
    graphicType: type ?? program.graphicSpec.objects[id]?.type,
    label
  };
}

function geoOwners(program, id) {
  const layer = findLayer(program, id);
  const owners = layer?.mark?.type === "geo" && layer.geoBinding.mode !== "annotation" ? [layer.geoBinding] : [];
  for (const childId of program.compositionSpec?.children ?? []) {
    const prefix = namespaceGraphicId(`${program.compositionSpec.id}-${childId}`, ""), child = program.children[childId];
    if (!id.startsWith(prefix) || child === undefined) continue;
    const localId = id.slice(prefix.length);
    if (child.graphicSpec.objects[localId] !== undefined) owners.push(...geoOwners(child, localId));
  }
  return owners;
}

// Only the exact scoped native owner may supply a geographic declaration.
export function resolveGraphicGeoBinding(program, id) {
  const owners = geoOwners(program, id);
  if (owners.length > 1) throw new TypeError("Geographic path ownership is ambiguous.");
  return owners[0];
}
