import { action, closedAction } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validateOptionObject } from "../../../core/validation.js";
import { DEFAULT_TEXT_MARK } from "../../../grammar/text.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { findGraphicParent } from "../../../grammar/schemas/graphicTree.js";
import { validateConcreteGraphicValue } from
  "../../../grammar/schemas/concreteGraphic.js";
import {
  markLabelPlacementLeaderId,
  normalizeLabelLayoutGeometry,
  resolveLabelLayout,
  resolveLabelLeader
} from "../../../layout/labels.js";
import { resolveTextBounds } from "../../../core/textMetrics.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { canMaterializeText } from "../../../materialization/marks/index.js";
import {
  resolveTextGraphicEntries,
  validateSourceMarkLabelPlacement
} from "../../../materialization/text.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import { editMarkGraphic } from "../shared.js";

export const TEXT_LABEL_LAYOUT_OPTIONS = Object.freeze([
  "target", "axis", "padding", "maxDisplacement", "bounds", "leader"
]);
const REMOVE_OPTIONS = Object.freeze(["target"]);
const MATERIALIZE_OPTIONS = Object.freeze(["id", "rematerializeBase"]);
const MATERIALIZE_PLACEMENT_OPTIONS = Object.freeze(["id"]);
const EDIT_PLACEMENT_OPTIONS = Object.freeze(["target", "placement"]);
const LEADER_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity"
]);

function normalizeLeader(value) {
  if (value === false || value === undefined) return false;
  validateOptionObject(value, LEADER_OPTIONS, "label leader");
  const normalized = {
    stroke: "#94a3b8",
    strokeWidth: 1,
    strokeDash: [],
    opacity: 1,
    ...value
  };
  for (const [property, propertyValue] of Object.entries(normalized)) {
    validateConcreteGraphicValue("line", property, propertyValue);
  }
  return normalized;
}

function normalizePolicy(args) {
  const geometry = normalizeLabelLayoutGeometry(Object.fromEntries(
    Object.entries(args).filter(
      ([key]) => key !== "target" && key !== "leader"
    )
  ));
  return { ...geometry, leader: normalizeLeader(args.leader) };
}

function leaderId(target) {
  return `${target}-label-leaders`;
}

function requireCompleteText(program, requested, operation) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Text mark id");
  if (target !== undefined) {
    const layer = findLayer(program, target);
    if (layer?.mark?.type !== "text") {
      throw new Error(`Unknown ${operation} text mark target "${target}".`);
    }
    if (!canMaterializeText(program, layer)) {
      throw new Error(`${operation} requires a complete text mark.`);
    }
    return layer;
  }
  return resolveEligibleLayer(program, {
    predicate: layer =>
      layer.mark?.type === "text" && canMaterializeText(program, layer),
    label: `${operation} text mark`
  });
}

function requireConfiguredText(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Text mark id");
  return resolveEligibleLayer(program, {
    target,
    predicate: layer =>
      layer.mark?.type === "text" &&
      program.materializationConfigs.labelLayouts?.[layer.id] !== undefined,
    label: "removeLabelLayout text mark"
  });
}

function concreteBounds(program, kind) {
  if (kind === "plot") {
    const plot = resolveGraphicBounds(program);
    return {
      left: plot.x,
      right: plot.x + plot.width,
      top: plot.y,
      bottom: plot.y + plot.height
    };
  }
  const canvas = program.graphicSpec.objects.canvas;
  if (
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error("Canvas label bounds require concrete Canvas dimensions.");
  }
  const x = canvas.properties.x ?? 0;
  const y = canvas.properties.y ?? 0;
  return {
    left: x,
    right: x + canvas.properties.width,
    top: y,
    bottom: y + canvas.properties.height
  };
}

function layoutInputs(program, layer) {
  const entries = resolveTextGraphicEntries(
    program,
    layer,
    program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK
  );
  const graphic = program.graphicSpec.objects[layer.id];
  if (graphic?.type !== "text" || !Array.isArray(graphic.items)) {
    throw new Error(`Text mark "${layer.id}" requires text collection graphics.`);
  }
  if (entries.length !== graphic.items.length) {
    throw new Error(`Text mark "${layer.id}" base materialization is inconsistent.`);
  }
  return entries.map((entry, index) => ({
    id: graphic.items[index].id,
    x: entry.graphic.properties.x,
    y: entry.graphic.properties.y,
    sourceX: entry.anchor.x,
    sourceY: entry.anchor.y,
    text: entry.graphic.properties.text,
    lines: entry.graphic.properties.lines,
    fontFamily: entry.graphic.properties.fontFamily,
    fontWeight: entry.graphic.properties.fontWeight,
    fontSize: entry.graphic.properties.fontSize,
    textAlign: entry.graphic.properties.textAlign,
    textBaseline: entry.graphic.properties.textBaseline,
    rotation: entry.graphic.properties.rotation
  }));
}

function leaderPlacement(program, layer) {
  const targetParent = findGraphicParent(program.graphicSpec, layer.id);
  if (targetParent?.kind !== "parent") {
    throw new Error("Label leaders require the text graphic to have a parent container.");
  }
  const source = layer.source === undefined
    ? undefined
    : program.graphicSpec.objects[layer.source];
  const sourceParent = source === undefined
    ? undefined
    : findGraphicParent(program.graphicSpec, layer.source);
  const before = sourceParent?.kind === "parent" && sourceParent.id === targetParent.id
    ? layer.source
    : layer.id;
  return { parent: targetParent.id, before };
}

function removeLeaderGraphic(program, id) {
  return program.graphicSpec.objects[id] === undefined
    ? program
    : program.editGraphics({ target: id, remove: true });
}

function materializeLeaders(program, layer, config, items) {
  let next = removeLeaderGraphic(program, config.leaderId);
  if (config.leader === false) return { program: next, count: 0 };
  const leaders = items.map(resolveLabelLeader).filter(Boolean);
  if (leaders.length === 0) return { program: next, count: 0 };
  next = next.createGraphics({
      id: config.leaderId,
      type: "line",
      length: leaders.length,
      ...leaderPlacement(next, layer)
    });
  next = editMarkGraphic(next, config.leaderId, {
    x1: leaders.map(line => line.x1),
    y1: leaders.map(line => line.y1),
    x2: leaders.map(line => line.x2),
    y2: leaders.map(line => line.y2),
    stroke: config.leader.stroke,
    strokeWidth: config.leader.strokeWidth,
    strokeDash: leaders.map(() => config.leader.strokeDash),
    opacity: config.leader.opacity
  });
  return { program: next, count: leaders.length };
}

function placementLeaderItems(program, layer) {
  const entries = resolveTextGraphicEntries(
    program,
    layer,
    program.markConfigs[layer.id] ?? DEFAULT_TEXT_MARK
  );
  const graphic = program.graphicSpec.objects[layer.id];
  if (graphic?.type !== "text" || !Array.isArray(graphic.items)) {
    throw new Error(`Text mark "${layer.id}" requires text collection graphics.`);
  }
  if (entries.length !== graphic.items.length) {
    throw new Error(`Text mark "${layer.id}" placement materialization is inconsistent.`);
  }
  return entries.map((entry, index) => {
    const properties = graphic.items[index].properties;
    return {
      id: graphic.items[index].id,
      x: properties.x,
      y: properties.y,
      sourceX: entry.anchor.x,
      sourceY: entry.anchor.y,
      dx: properties.x - entry.anchor.x,
      dy: properties.y - entry.anchor.y,
      bounds: resolveTextBounds(properties, program.materializationConfigs.textMetrics)
    };
  });
}

const materializeMarkLabelPlacement = /* @__PURE__ */ closedAction(
  {
    op: "materializeMarkLabelPlacement",
    description: "Reconcile semantic attached-label placement leaders."
  }, MATERIALIZE_PLACEMENT_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Attached label id");
    const layer = findLayer(this, id);
    if (!isSourceOwnedText(layer)) {
      throw new Error(`Unknown attached label target "${id}".`);
    }
    const leaderId = markLabelPlacementLeaderId(id);
    const placement = this.markConfigs[id]?.labelAuthoring?.placement;
    if (placement?.leader === undefined || placement.leader === false) {
      return this;
    }
    const layout = this.materializationConfigs.labelLayouts?.[id];
    if (layout !== undefined && layout.leader !== false) {
      throw new Error(
        "Semantic label placement leader conflicts with the active collision-layout leader."
      );
    }
    if (!canMaterializeText(this, layer)) {
      return removeLeaderGraphic(this, leaderId);
    }
    return materializeLeaders(this, layer, {
      leaderId,
      leader: {
        ...placement.leader,
        strokeDash: [],
        opacity: 1
      }
    }, placementLeaderItems(this, layer)).program;
  }
);

const materializeLabelLayout = /* @__PURE__ */ closedAction(
  {
    op: "materializeLabelLayout",
    description: "Resolve concrete label positions and optional leader lines."
  }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Text mark id");
    const rematerializeBase = args.rematerializeBase ?? true;
    if (typeof rematerializeBase !== "boolean") {
      throw new TypeError("materializeLabelLayout rematerializeBase must be a boolean.");
    }
    const layer = findLayer(this, id);
    if (layer?.mark?.type !== "text") throw new Error(`Unknown text mark "${id}".`);
    const config = this.materializationConfigs.labelLayouts?.[id];
    if (config === undefined) {
      throw new Error(`Text mark "${id}" has no label layout policy.`);
    }
    let next = rematerializeBase
      ? this.rematerializeTextMark({ id, replayLayout: false })
      : this;
    const resolved = resolveLabelLayout({
      items: canMaterializeText(next, layer) ? layoutInputs(next, layer) : [],
      bounds: concreteBounds(next, config.bounds),
      axis: config.axis,
      padding: config.padding,
      maxDisplacement: config.maxDisplacement
    }, next.materializationConfigs.textMetrics);
    next = editMarkGraphic(next, id, {
      x: resolved.items.map(item => item.x),
      y: resolved.items.map(item => item.y)
    });
    const leaders = materializeLeaders(next, layer, config, resolved.items);
    next = leaders.program;
    next = next._withMaterializationConfig(["labelLayouts", id], {
      axis: config.axis,
      padding: config.padding,
      maxDisplacement: config.maxDisplacement,
      bounds: config.bounds,
      leader: config.leader,
      leaderId: config.leaderId,
      resolution: {
        overlapBefore: resolved.overlapBefore,
        overlapAfter: resolved.overlapAfter,
        displaced: resolved.items.filter(item => item.distance > 0).length,
        leaders: leaders.count,
        maximumDisplacement: resolved.items.reduce(
          (maximum, item) => Math.max(maximum, item.distance),
          0
        ),
        warnings: resolved.warnings
      }
    });
    return layer.source === undefined
      ? next
      : next.materializeMarkLabelPlacement({ id });
  }
);

const layoutLabels = /* @__PURE__ */ closedAction(
  {
    op: "layoutLabels",
    description: "Assign deterministic collision-aware layout to a text mark."
  }, TEXT_LABEL_LAYOUT_OPTIONS,
  function (args = {}) {
    const layer = requireCompleteText(this, args.target, "layoutLabels");
    const policy = normalizePolicy(args);
    const placement = this.markConfigs[layer.id]?.labelAuthoring?.placement;
    if (policy.leader !== false && placement?.leader !== false && placement?.leader !== undefined) {
      throw new Error(
        "Collision-layout leader conflicts with the active semantic label placement leader."
      );
    }
    const generatedId = leaderId(layer.id);
    const existingConfig = this.materializationConfigs.labelLayouts?.[layer.id];
    if (
      this.graphicSpec.objects[generatedId] !== undefined &&
      existingConfig?.leaderId !== generatedId
    ) {
      throw new Error(`Label layout leader graphic "${generatedId}" already exists.`);
    }
    return this
      ._withMaterializationConfig(["labelLayouts", layer.id], {
        ...policy,
        leaderId: generatedId
      })
      .materializeLabelLayout({ id: layer.id });
  }
);

const editMarkLabelPlacement = /* @__PURE__ */ action(
  {
    op: "editMarkLabelPlacement",
    description: "Replace or reset semantic placement for one attached label layer."
  },
  function (args = {}) {
    validateOptionObject(args, EDIT_PLACEMENT_OPTIONS, "editMarkLabelPlacement", {
      allowEmpty: false,
      emptyError: Error
    });
    if (!Object.hasOwn(args, "target") || !Object.hasOwn(args, "placement")) {
      throw new Error("editMarkLabelPlacement requires target and placement.");
    }
    const id = validateUserId(args.target, "Attached label id");
    const layer = findLayer(this, id);
    if (!isSourceOwnedText(layer)) {
      throw new Error(`Unknown attached label target "${id}".`);
    }
    let placement;
    if (args.placement !== "auto") {
      placement = validateSourceMarkLabelPlacement(this, layer.source, args.placement);
      if (
        placement.leader !== false &&
        this.materializationConfigs.labelLayouts?.[id]?.leader !== false &&
        this.materializationConfigs.labelLayouts?.[id]?.leader !== undefined
      ) {
        throw new Error(
          "Semantic label placement leader conflicts with the active collision-layout leader."
        );
      }
      const generatedId = markLabelPlacementLeaderId(id);
      const previous = this.markConfigs[id]?.labelAuthoring?.placement;
      if (
        placement.leader !== false &&
        this.graphicSpec.objects[generatedId] !== undefined &&
        (previous?.leader === undefined || previous.leader === false)
      ) {
        throw new Error(`Mark label placement leader graphic "${generatedId}" already exists.`);
      }
    }
    const config = this.markConfigs[id] ?? DEFAULT_TEXT_MARK;
    const previousPlacement = config.labelAuthoring?.placement;
    let base = this;
    if (
      previousPlacement?.leader !== undefined &&
      previousPlacement.leader !== false &&
      (placement === undefined || placement.leader === false)
    ) {
      base = removeLeaderGraphic(base, markLabelPlacementLeaderId(id));
    }
    const labelAuthoring = { ...config.labelAuthoring };
    if (placement === undefined) delete labelAuthoring.placement;
    else labelAuthoring.placement = placement;
    const next = base._withMarkConfig(id, { ...config, labelAuthoring });
    return canMaterializeText(next, layer)
      ? next.rematerializeTextMark({ id })
      : next.materializeMarkLabelPlacement({ id });
  }
);

const removeLabelLayout = /* @__PURE__ */ closedAction(
  {
    op: "removeLabelLayout",
    description: "Remove label layout and restore semantic base text positions."
  }, REMOVE_OPTIONS,
  function (args = {}) {
    const layer = requireConfiguredText(this, args.target);
    const config = this.materializationConfigs.labelLayouts[layer.id];
    return removeLeaderGraphic(
      this._withoutMaterializationConfig(["labelLayouts", layer.id]),
      config.leaderId
    ).rematerializeTextMark({ id: layer.id });
  }
);

export function registerTextLabelLayoutActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    layoutLabels,
    removeLabelLayout,
    materializeLabelLayout,
    editMarkLabelPlacement,
    materializeMarkLabelPlacement
  });
}
