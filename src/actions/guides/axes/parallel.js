import { resolveParallelGuideGeometry } from "../../../grammar/parallelGuides.js";
import { materializeHardTextLines } from "../../../materialization/textLines.js";
import { closedAction } from "../../../core/action.js";
import { validateGeneratedItemLimit } from "../../../core/validation.js";
import { resolvePlotGraphicPlacement } from "../../../materialization/graphicHierarchy.js";
import { requireParallelAxisLayer, resolveParallelAxisTarget, resolveStyledParallelAxes } from "./parallel/resolve.js";
import { PARALLEL_AXIS_GRAPHICS, PARALLEL_AXIS_PARTS, hasParallelAxisParts } from "./parallel/policy.js";
import { registerParallelAxisLifecycleActions } from "./parallel/lifecycle.js";
import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";

function uniform(values) {
  return values.length > 0 && values.every(value => value === values[0]) ? values[0] : values;
}

function collectionProperties(part, axes, bounds) {
  const { textAlign, textBaseline, ...geometry } = resolveParallelGuideGeometry(part, axes, bounds);
  const configs = part === "line" || part === "title" ? axes.map(axis => axis.config[part])
    : axes.flatMap(axis => axis[part].values.map(() => axis.config[part]));
  return part === "line" || part === "ticks" ? {
    ...geometry,
    stroke: uniform(configs.map(config => config.color)),
    strokeWidth: uniform(configs.map(config => config.lineWidth))
  } : {
    ...geometry,
    fill: uniform(configs.map(config => config.color)),
    fontSize: uniform(configs.map(config => config.fontSize)),
    fontFamily: uniform(configs.map(config => config.fontFamily)),
    fontWeight: uniform(configs.map(config => config.fontWeight)),
    textAlign, textBaseline
  };
}

export const rematerializeParallelAxes = /* @__PURE__ */ closedAction({
  op: "rematerializeParallelAxes",
  description: "Recompute concrete Parallel dimension axes."
}, ["target"], withGuideLayoutValidation(function (args = {}) {

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
    if (selected.some(axis => axis.config.visibility !== undefined)) value.opacity = selected.flatMap(axis => Array.from({ length: ["line", "title"].includes(part) ? 1 : axis[part].values.length },
      () => axis.config.visibility?.all === false || axis.config.visibility?.[part] === false ? 0 : 1));
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
    if (["title", "labels"].includes(part)) next = materializeHardTextLines(next, id);
  }
  return next._withGuideConfig("parallel", "axes", { target, scales, ...configs });
}));

export function registerParallelAxisActions(ProgramClass) {
  ProgramClass.prototype.rematerializeParallelAxes = rematerializeParallelAxes;
  registerParallelAxisLifecycleActions(ProgramClass);
}
