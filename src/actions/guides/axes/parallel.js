import { action } from "../../../core/action.js";
import { validateGeneratedItemLimit, validateOptionObject } from "../../../core/validation.js";
import { resolvePlotGraphicPlacement } from "../../../materialization/graphicHierarchy.js";
import { requireParallelAxisLayer, resolveParallelAxisTarget, resolveStyledParallelAxes } from "./parallel/resolve.js";
import { PARALLEL_AXIS_GRAPHICS, PARALLEL_AXIS_PARTS, hasParallelAxisParts } from "./parallel/policy.js";
import { registerParallelAxisLifecycleActions } from "./parallel/lifecycle.js";

function uniform(values) {
  return values.length > 0 && values.every(value => value === values[0]) ? values[0] : values;
}

function collectionProperties(part, axes, bounds) {
  if (part === "line") return {
    length: axes.length,
    x1: axes.map(axis => axis.x), y1: bounds.y,
    x2: axes.map(axis => axis.x), y2: bounds.y + bounds.height,
    stroke: uniform(axes.map(axis => axis.config.line.color)),
    strokeWidth: uniform(axes.map(axis => axis.config.line.lineWidth))
  };
  if (part === "title") return {
    length: axes.length, x: axes.map(axis => axis.x),
    y: uniform(axes.map(axis => bounds.y - axis.config.title.offset)),
    text: axes.map(axis => axis.title),
    fill: uniform(axes.map(axis => axis.config.title.color)),
    fontSize: uniform(axes.map(axis => axis.config.title.fontSize)),
    fontFamily: uniform(axes.map(axis => axis.config.title.fontFamily)),
    fontWeight: uniform(axes.map(axis => axis.config.title.fontWeight)),
    textAlign: "center", textBaseline: "middle"
  };
  const rows = axes.flatMap(axis => axis[part].values.map((value, index) => ({
    x: axis.x, y: axis[part].y[index], text: axis[part].text?.[index], config: axis.config[part]
  })));
  if (part === "ticks") return {
    length: rows.length, x1: rows.map(row => row.x - row.config.length / 2),
    y1: rows.map(row => row.y), x2: rows.map(row => row.x + row.config.length / 2),
    y2: rows.map(row => row.y), stroke: uniform(rows.map(row => row.config.color)),
    strokeWidth: uniform(rows.map(row => row.config.lineWidth))
  };
  return {
    length: rows.length, x: rows.map(row => row.x - row.config.offset),
    y: rows.map(row => row.y), text: rows.map(row => row.text),
    fill: uniform(rows.map(row => row.config.color)),
    fontSize: uniform(rows.map(row => row.config.fontSize)),
    fontFamily: uniform(rows.map(row => row.config.fontFamily)),
    fontWeight: uniform(rows.map(row => row.config.fontWeight)),
    textAlign: "right", textBaseline: "middle"
  };
}

export const rematerializeParallelAxes = action({
  op: "rematerializeParallelAxes",
  description: "Recompute concrete Parallel dimension axes."
}, function (args = {}) {
  validateOptionObject(args, ["target"], "rematerializeParallelAxes");
  const stored = this.semanticSpec.guides.axis?.parallel;
  if (stored === undefined) throw new Error("rematerializeParallelAxes requires existing Parallel axes.");
  const target = resolveParallelAxisTarget(this, args.target ?? stored.target);
  if (target !== stored.target) throw new Error("Parallel axes belong to another target.");
  const { dimensions } = requireParallelAxisLayer(this, target);
  const { axes, bounds, configs } = resolveStyledParallelAxes(this, dimensions);
  if (!configs.dimensions.some(hasParallelAxisParts)) return this.removeParallelAxes({ target });

  // Preflight every collection before authoring any concrete graphic.
  const properties = Object.fromEntries(PARALLEL_AXIS_PARTS.map(part => {
    const selected = axes.filter(axis => axis.config[part] !== undefined);
    const value = collectionProperties(part, selected, bounds);
    validateGeneratedItemLimit(value.length, "Parallel axis item count");
    return [part, { enabled: selected.length > 0, value }];
  }));
  let next = this;
  const scales = dimensions.map(dimension => dimension.scale);
  if (stored.scales?.length !== scales.length || scales.some((scale, index) => scale !== stored.scales[index])) {
    next = next.editSemantic({ property: "guide.axis.parallel.scales", value: scales });
  }
  const retainedTitles = stored.titles?.filter(title =>
    configs.dimensions.some(config => config.field === title.field && config.title !== undefined));
  if (retainedTitles !== undefined && retainedTitles.length !== stored.titles.length) {
    next = next.editSemantic({ property: "guide.axis.parallel.titles",
      ...(retainedTitles.length === 0 ? { remove: true } : { value: retainedTitles }) });
  }
  for (const [index, part] of PARALLEL_AXIS_PARTS.entries()) {
    const id = PARALLEL_AXIS_GRAPHICS[part];
    const { enabled, value } = properties[part];
    if (!enabled) {
      if (next.graphicSpec.objects[id] !== undefined) next = next.editGraphics({ target: id, remove: true });
      continue;
    }
    if (next.graphicSpec.objects[id] === undefined) {
      const before = PARALLEL_AXIS_PARTS.slice(index + 1).map(key => PARALLEL_AXIS_GRAPHICS[key])
        .find(key => next.graphicSpec.objects[key] !== undefined);
      next = next.createGraphics({ id, type: part === "line" || part === "ticks" ? "line" : "text", length: 0,
        ...resolvePlotGraphicPlacement(next, before === undefined ? {} : { before }) });
    }
    for (const [property, item] of Object.entries(value)) {
      next = next.editGraphics({ target: id, property, value: item });
    }
  }
  return next._withGuideConfig("parallel", "axes", { target, scales, ...configs });
});

export function registerParallelAxisActions(ProgramClass) {
  ProgramClass.prototype.rematerializeParallelAxes = rematerializeParallelAxes;
  registerParallelAxisLifecycleActions(ProgramClass);
}
