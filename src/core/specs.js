import { cloneAndFreeze } from "./immutable.js";

export function createEmptySemanticSpec() {
  return cloneAndFreeze({
    datasets: [],
    layers: [],
    scales: [],
    coordinates: [],
    guides: {}
  });
}

export function createEmptyGraphicSpec() {
  return cloneAndFreeze({
    objects: {},
    order: []
  });
}

export function createTraceRoot() {
  return cloneAndFreeze({
    id: "program",
    op: "program",
    description: "Program action trace root.",
    args: {},
    children: []
  });
}
