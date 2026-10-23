import { cartesianAxisOwners } from "../selectors/axes.js";
import { facetAxisMode } from "../core/facetAxisPolicy.js";
import { resolvePrimitiveGraphicBounds, resolveGraphicParentOffset, resolveGraphicClipBounds } from "../grammar/schemas/graphicBounds.js";
import { intersectClipBounds } from "../grammar/schemas/graphicClip.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { resolveTextBounds, requireFiniteBounds } from "../core/textMetrics.js";
import { axisGraphicIds, allLegendGraphicIds } from "./guides/resources.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { prepareSharedFacetLegend } from "./facetGuides/index.js";
import { prepareFacetGuideOwnership } from "./facetGuides/placement.js";

function includeBounds(union, bounds) {
  if (bounds === undefined) return union;
  if (union === undefined) return { ...bounds };
  return { left: Math.min(union.left, bounds.left), right: Math.max(union.right, bounds.right),
    top: Math.min(union.top, bounds.top), bottom: Math.max(union.bottom, bounds.bottom) };
}

// Header entries are concrete child-local text, never caller-supplied bounds.
export function measureFacetContentChildren(program, { headerItems = [] } = {}) {
  if (program?.compositionSpec?.type !== "facet") {
    throw new Error("Facet content measurement requires a facet composition.");
  }
  const spec = program.compositionSpec, grid = new Map((spec.facet.grid?.cells ?? []).map(cell => [cell.id, cell]));
  const placements = spec.children.map((id, index) => ({ id,
    row: grid.get(id)?.row ?? Math.floor(index / spec.columns),
    column: grid.get(id)?.column ?? index % spec.columns }));
  const prepared = prepareSharedFacetLegend(program);
  const ownership = prepareFacetGuideOwnership(program, placements, prepared);
  const childIds = new Set(spec.children), headersByOwner = new Map();
  if (!Array.isArray(headerItems) || headerItems.some(item =>
    !childIds.has(item?.ownerId) || item.type !== "text" || !isPlainObject(item.properties))) {
    throw new TypeError("Facet content headers require concrete text with one observed child owner.");
  }
  for (const header of headerItems) {
    if (!headersByOwner.has(header.ownerId)) headersByOwner.set(header.ownerId, []);
    headersByOwner.get(header.ownerId).push(header);
  }
  const components = ["line", "ticks", "labels", "title"];
  return cloneAndFreeze(placements.map(cell => {
    const child = program.children[cell.id], graphic = child.graphicSpec;
    const profile = child.materializationConfigs.textMetrics;
    const plot = resolveGraphicBounds(child);
    const plan = ownership.children[cell.id], roles = new Map();
    for (const owner of cartesianAxisOwners(child)) {
      const roots = axisGraphicIds(owner.channel, owner.id);
      for (const [index, component] of components.entries()) {
        const removed = plan.removeAxes.includes(owner.id) || plan.removeAxisComponents?.[owner.id]?.includes(component);
        if (removed) roles.set(roots[index], "removed");
        else if (facetAxisMode(spec.facet.guides.axes, owner.channel) === "outer" && owner.channel === "x" && owner.config?.[component]?.position === "bottom") {
          roles.set(roots[index], "footer");
        }
      }
    }
    for (const id of allLegendGraphicIds(plan.removeLegends)) roles.set(id, "removed");
    const groups = new Map(), stack = [], frames = new Map();
    const include = entry => {
      const role = stack.at(-1);
      if (role === "removed") return;
      const type = entry.object.type ?? entry.owner?.type, p = entry.object.properties;
      if (!p || type === "canvas" || p.opacity === 0 || type === "text" && (p.text === "" || p.fill === "none" || p.fill === "transparent")) return;
      const ownerId = entry.ownerId ?? entry.id;
      if (!frames.has(ownerId)) frames.set(ownerId, {
        offset: resolveGraphicParentOffset(graphic, ownerId),
        clip: resolveGraphicClipBounds(graphic, ownerId, { rootViewport: true })
      });
      const { offset: [x, y], clip } = frames.get(ownerId);
      let bounds = resolvePrimitiveGraphicBounds(type, p, profile);
      if (bounds === undefined) return;
      bounds = requireFiniteBounds({ left: bounds.left + x, right: bounds.right + x,
        top: bounds.top + y, bottom: bounds.bottom + y });
      if (clip !== undefined) bounds = intersectClipBounds(bounds, clip);
      if (bounds.left > bounds.right || bounds.top > bounds.bottom) return;
      const key = role ?? "body";
      groups.set(key, includeBounds(groups.get(key), bounds));
    };
    walkGraphicTreeEvents(graphic, {
      enter(entry) {
        stack.push(stack.at(-1) === "removed" ? "removed" : roles.get(entry.id) ?? stack.at(-1));
        if (entry.object.items === undefined && !(entry.object.children?.length)) include(entry);
      },
      item: include,
      exit() { stack.pop(); }
    });
    let body = includeBounds({ left: plot.x, right: plot.x + plot.width, top: plot.y, bottom: plot.y + plot.height }, groups.get("body"));
    for (const header of headersByOwner.get(cell.id) ?? []) {
      const p = header.properties;
      if (p.text !== "" && p.opacity !== 0 && p.fill !== "none" && p.fill !== "transparent") body = includeBounds(body, resolveTextBounds(p, profile));
    }
    const relative = bounds => bounds === undefined ? undefined : ({ left: bounds.left - plot.x, right: bounds.right - plot.x,
      top: bounds.top - plot.y, bottom: bounds.bottom - plot.y });
    return { ...cell, plot, bounds: relative(body),
      ...(groups.has("footer") ? { footerBounds: relative(groups.get("footer")) } : {}) };
  }));
}

