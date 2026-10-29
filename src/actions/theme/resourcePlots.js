import { GRAPH_PLOT_DEFAULTS } from "../../grammar/graph/plot.js";
import { HIERARCHY_PLOT_DEFAULTS } from "../../grammar/hierarchy/plot.js";

const OWNERS = Object.freeze({
  graph: { key: "graphPlot", op: "materializeGraphPlot" },
  tree: { key: "hierarchyPlot", op: "materializeTreePlot" },
  treemap: { key: "hierarchyPlot", op: "materializeTreemapPlot" },
  partition: { key: "hierarchyPlot", op: "materializePartitionPlot" }
});

export function resourcePlotThemeOwner(layer) {
  return OWNERS[layer?.mark?.type];
}

// A family default is lower precedence than an active theme; removing the final
// frame restores that family's own value, not a generic mark default.
export function resourcePlotThemeProperty(path) {
  if (path[0] !== "marks" || !["graphPlot", "hierarchyPlot"].includes(path[2])) return undefined;
  if (path.includes("overrides")) return { explicit: true };
  if (path.length !== 5) return undefined;
  const [, , family, role, property] = path;
  const defaults = family === "graphPlot" ? GRAPH_PLOT_DEFAULTS : HIERARCHY_PLOT_DEFAULTS;
  let token;
  if (role === "labels") token = property === "fill" ? "text" : ["fontFamily", "fontSize", "fontWeight"].includes(property) ? property : undefined;
  else if (["nodes", "cells"].includes(role)) token = property === "fill" ? "mark" : property === "stroke" ? "background" : undefined;
  else if (["edges", "links"].includes(role) && property === "stroke") token = "mutedText";
  return token === undefined ? undefined : { token, defaultValue: defaults[role][property] };
}

function change(node) {
  const match = /^(create|edit)(Graph|Tree|Treemap|Partition)Plot$/u.exec(node.op);
  if (match === null) return;
  const family = match[2] === "Graph" ? "graphPlot" : "hierarchyPlot";
  const args = node.args, ids = new Set();
  const materializer = `materialize${match[2]}Plot`;
  const visit = entry => {
    if (entry.op === materializer && typeof entry.args.id === "string") ids.add(entry.args.id);
    entry.children?.forEach(visit);
  };
  visit(node);
  const id = args.target ?? args.id ?? (ids.size === 1 ? [...ids][0] : undefined);
  return typeof id === "string" ? { family, id, args } : undefined;
}

export function clearResourcePlotThemeOverrides(overrides, node) {
  const target = change(node);
  if (target === undefined) return;
  for (const role of ["labels", "links"]) {
    if (target.args[role] !== false) continue;
    const prefix = `c:marks.${target.id}.${target.family}.${role}.`;
    for (const key of overrides) if (key.startsWith(prefix)) overrides.delete(key);
  }
}

export function addResourcePlotThemeOverrides(overrides, node) {
  const target = change(node);
  if (target === undefined) return;
  const { family, id, args } = target;
  for (const role of ["nodes", "cells", "edges", "links", "labels"]) {
    if (args[role] === null || typeof args[role] !== "object") continue;
    for (const property of ["fill", "stroke", "fontFamily", "fontSize", "fontWeight"]) {
      if (Object.hasOwn(args[role], property)) overrides.add(`c:marks.${id}.${family}.${role}.${property}`);
    }
  }
}
