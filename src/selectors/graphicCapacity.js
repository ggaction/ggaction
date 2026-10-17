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
  const owners = Array.isArray(dataset?.values) ? [{ layer, dataset }] : [];
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

export function resolveGraphicItemCapacity(program, { id, label, type }) {
  const owners = pointOwners(program, id);
  if (owners.length > 1) throw annotateError(new Error("Point graphic ownership is ambiguous."), {
    code: "ambiguous-resource", resourceId: id, candidates: owners.map(owner => owner.layer.id)
  });
  return {
    pointOwned: owners.length === 1,
    rawCount: owners[0]?.dataset.values.length,
    graphicType: type ?? program.graphicSpec.objects[id]?.type,
    label
  };
}
