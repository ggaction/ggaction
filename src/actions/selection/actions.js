import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { transformPointHighlightChild } from "../../materialization/selection/point.js";
import {
  transformPathHighlightProperties,
  transformRuleHighlightProperties
} from "../../materialization/selection/path.js";
import {
  resolveMarkSelection,
  resolveSelectionCreationId,
  resolveStoredSelection
} from "../../materialization/selection/state.js";
import {
  findSelectionPolicy,
  requireSelectionPolicy
} from "../../materialization/selection/policies/index.js";
import { legendGraphicIds } from "../../materialization/guides/resources.js";
import {
  normalizeDimOthers,
  validateUnitInterval
} from "../../materialization/selection/styles.js";

const SELECTOR_KEYS = Object.freeze([
  "grain", "field", "channel", "property", "op", "value", "values", "min", "max",
  "inclusive", "count", "groupBy", "ties"
]);
const SELECT_OPTIONS = Object.freeze(["id", "target", ...SELECTOR_KEYS]);
const EDIT_SELECTION_OPTIONS = Object.freeze(["selection", ...SELECTOR_KEYS]);
const REMOVE_SELECTION_OPTIONS = Object.freeze(["selection"]);
const HIGHLIGHT_OPTIONS = Object.freeze([
  "id", "target", "select", "selection", "color", "opacity", "fill",
  "stroke", "strokeWidth", "strokeDash", "shape", "size", "offset",
  "dimOthers", "bringToFront"
]);
const INTERNAL_SELECTION_OPTIONS = Object.freeze(["selection", "style", "keys"]);
const INTERNAL_DIM_OPTIONS = Object.freeze(["selection", "opacity", "keys"]);
const INTERNAL_ORDER_OPTIONS = Object.freeze(["selection", "keys"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["target", "highlights"]);

function selectorFrom(args) {
  return Object.fromEntries(
    SELECTOR_KEYS.flatMap(key => Object.hasOwn(args, key) ? [[key, args[key]]] : [])
  );
}

function resolveTarget(program, target, label = "mark selection") {
  const requested = target === undefined
    ? undefined
    : validateUserId(target, "Mark id");
  return resolveEligibleLayer(program, {
    target: requested,
    label,
    predicate: layer => findSelectionPolicy(layer.mark?.type) !== undefined
  });
}

function hasLegendSelection(program, target, selection) {
  const legend = program.guideConfigs.legend?.series ??
    program.guideConfigs.legend?.color;
  const selector = program.materializationConfigs.selections?.[selection]?.selector;
  return legend?.target === target &&
    selector?.field !== undefined &&
    selector.field === legend.field;
}

function categoricalLegendKind(program, target) {
  return ["series", "color"].find(
    kind => program.guideConfigs.legend?.[kind]?.target === target
  );
}

function resetCategoricalLegendSymbols(program, target) {
  const kind = categoricalLegendKind(program, target);
  if (kind === undefined) return program;
  let next = program;
  for (const id of legendGraphicIds(kind).filter(id => id.includes("Symbol"))) {
    const graphic = next.graphicSpec.objects[id];
    if (graphic === undefined) continue;
    next = graphic.type === "collection"
      ? next.editGraphics({ target: id, property: "items", value: [] })
      : next.editGraphics({ target: id, property: "length", value: 0 });
  }
  return next.rematerializeLegendSymbols();
}

function targetHighlightEntries(program, target) {
  return Object.entries(program.materializationConfigs.highlights ?? {})
    .filter(([, config]) => config.target === target);
}

function rebuildTargetHighlights(program, target) {
  const layer = resolveTarget(program, target, "highlight mark");
  const highlights = targetHighlightEntries(program, target);
  let baseline = program;
  for (const [id] of highlights) {
    baseline = baseline._withoutMaterializationConfig(["highlights", id]);
  }
  const graphic = baseline.graphicSpec.objects[target];
  baseline = graphic.type === "collection"
    ? baseline.editGraphics({ target, property: "items", value: [] })
    : baseline.editGraphics({ target, property: "length", value: 0 });
  baseline = baseline[requireSelectionPolicy(
    layer.mark.type
  ).rematerializeOp]({ id: target });
  baseline = resetCategoricalLegendSymbols(baseline, target);
  return highlights.length === 0
    ? baseline
    : baseline.rematerializeMarkHighlights({ target, highlights });
}

function selectedKeys(args, resolved) {
  if (args.keys === undefined) return resolved.keys;
  if (!Array.isArray(args.keys) || !args.keys.every(key =>
    typeof key === "string" && key.length > 0
  )) {
    throw new TypeError("Selected mark item keys must be non-empty strings.");
  }
  return args.keys;
}

export const selectMarks = action(
  { op: "selectMarks", description: "Create one reusable selection over final mark items." },
  function (args = {}) {
    validateKeys(args, SELECT_OPTIONS, "selectMarks");
    const layer = resolveTarget(this, args.target);
    const resolved = resolveMarkSelection(this, layer.id, selectorFrom(args));
    const id = resolveSelectionCreationId(this, args.id, layer.id);
    return this
      ._withSelectionConfig(id, { target: layer.id, selector: resolved.selector })
      ._withContext({ currentSelection: id });
  }
);

export const editMarkSelection = action(
  {
    op: "editMarkSelection",
    description: "Replace one stored mark selector while preserving its identity and target."
  },
  function (args = {}) {
    validateKeys(args, EDIT_SELECTION_OPTIONS, "editMarkSelection");
    const current = resolveStoredSelection(this, args.selection);
    const replacement = resolveMarkSelection(
      this,
      current.definition.target,
      selectorFrom(args)
    );
    const next = this
      ._withSelectionConfig(current.id, {
        target: current.definition.target,
        selector: replacement.selector
      })
      ._withContext({ currentSelection: current.id });
    const hasDependentHighlight = Object.values(
      next.materializationConfigs.highlights ?? {}
    ).some(config => config.selection === current.id);
    return hasDependentHighlight
      ? rebuildTargetHighlights(next, current.definition.target)
      : next;
  }
);

export const removeMarkHighlight = action(
  {
    op: "removeMarkHighlight",
    description: "Remove one stored highlight assignment and restore the clean mark baseline."
  },
  function (args = {}) {
    validateKeys(args, REMOVE_SELECTION_OPTIONS, "removeMarkHighlight");
    const current = resolveStoredSelection(this, args.selection);
    const dependent = Object.entries(
      this.materializationConfigs.highlights ?? {}
    ).filter(([, config]) => config.selection === current.id);
    if (dependent.length === 0) {
      throw new Error(
        `Selection "${current.id}" has no highlight assignment.`
      );
    }
    let next = this;
    for (const [id] of dependent) {
      next = next._withoutMaterializationConfig(["highlights", id]);
    }
    return rebuildTargetHighlights(next, current.definition.target);
  }
);

export const removeMarkSelection = action(
  {
    op: "removeMarkSelection",
    description: "Remove one stored selection after removing its dependent highlight."
  },
  function (args = {}) {
    validateKeys(args, REMOVE_SELECTION_OPTIONS, "removeMarkSelection");
    const current = resolveStoredSelection(this, args.selection);
    const hasDependentHighlight = Object.values(
      this.materializationConfigs.highlights ?? {}
    ).some(config => config.selection === current.id);
    let next = hasDependentHighlight
      ? this.removeMarkHighlight({ selection: current.id })
      : this;
    next = next._withoutMaterializationConfig(["selections", current.id]);
    return this.context.currentSelection === current.id
      ? next._withContext({ currentSelection: undefined })
      : next;
  }
);

export const applyPointHighlight = action(
  { op: "applyPointHighlight", description: "Apply selected point appearance and geometry." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyPointHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (resolved.items[0]?.markType !== "point" && resolved.items.length > 0) {
      throw new Error("applyPointHighlight requires a point selection.");
    }
    if (keys.length === 0) return this;
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    const items = graphic.items.map(child =>
      selected.has(keyByGraphic.get(child.id))
        ? transformPointHighlightChild({
            type: child.type ?? graphic.type,
            properties: child.properties
          }, args.style)
        : { type: child.type ?? graphic.type, properties: child.properties }
    );
    return this.editGraphics({
      target: resolved.definition.target,
      property: "items",
      value: items
    });
  }
);

function transformRectangularProperties(properties, style, offset = false) {
  if (!offset || style.offset === undefined) {
    return { ...properties, ...style };
  }
  const { offset: translation, ...appearance } = style;
  return {
    ...properties,
    ...appearance,
    x: properties.x + translation.x,
    y: properties.y + translation.y
  };
}

function applyRectangularHighlight(
  program,
  args,
  operation,
  markType,
  { offset = false } = {}
) {
  validateKeys(args, INTERNAL_SELECTION_OPTIONS, operation);
  const resolved = resolveStoredSelection(program, args.selection);
  const keys = selectedKeys(args, resolved);
  if (resolved.items[0]?.markType !== markType && resolved.items.length > 0) {
    throw new Error(`${operation} requires a ${markType} selection.`);
  }
  if (keys.length === 0) return program;
  const selected = new Set(keys);
  const graphic = program.graphicSpec.objects[resolved.definition.target];
  const keyByGraphic = new Map(resolved.items.flatMap(item =>
    item.graphicIds.map(id => [id, item.key])
  ));
  return program.editGraphics({
    target: resolved.definition.target,
    property: "items",
    value: graphic.items.map(child => ({
      type: child.type ?? graphic.type,
      properties: selected.has(keyByGraphic.get(child.id))
        ? transformRectangularProperties(child.properties, args.style, offset)
        : child.properties
    }))
  });
}

export const applyBarHighlight = action(
  { op: "applyBarHighlight", description: "Apply selected bar appearance." },
  function (args = {}) {
    return applyRectangularHighlight(this, args, "applyBarHighlight", "bar");
  }
);

export const applyRectHighlight = action(
  { op: "applyRectHighlight", description: "Apply selected rect appearance." },
  function (args = {}) {
    return applyRectangularHighlight(
      this,
      args,
      "applyRectHighlight",
      "rect",
      { offset: true }
    );
  }
);

export const applyPathHighlight = action(
  { op: "applyPathHighlight", description: "Apply selected line or area path appearance and offset." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyPathHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    const markType = resolved.items[0]?.markType;
    if (
      resolved.items.length > 0 &&
      requireSelectionPolicy(markType).applyHighlightOp !== "applyPathHighlight"
    ) {
      throw new Error("applyPathHighlight requires a path selection policy.");
    }
    if (keys.length === 0) return this;
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "items",
      value: graphic.items.map(child => ({
        type: child.type ?? graphic.type,
        properties: selected.has(keyByGraphic.get(child.id))
          ? transformPathHighlightProperties(child.properties, args.style)
          : child.properties
      }))
    });
  }
);

export const applyRuleHighlight = action(
  { op: "applyRuleHighlight", description: "Apply selected rule appearance and offset." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyRuleHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (resolved.items[0]?.markType !== "rule" && resolved.items.length > 0) {
      throw new Error("applyRuleHighlight requires a rule selection.");
    }
    if (keys.length === 0) return this;
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "items",
      value: graphic.items.map(child => ({
        type: child.type ?? graphic.type,
        properties: selected.has(keyByGraphic.get(child.id))
          ? transformRuleHighlightProperties(child.properties, args.style)
          : child.properties
      }))
    });
  }
);

export const dimUnselectedMarkItems = action(
  { op: "dimUnselectedMarkItems", description: "Dim the complement of one mark selection." },
  function (args = {}) {
    validateKeys(args, INTERNAL_DIM_OPTIONS, "dimUnselectedMarkItems");
    const opacity = validateUnitInterval(args.opacity, "Dim opacity");
    const resolved = resolveStoredSelection(this, args.selection);
    const selected = new Set(selectedKeys(args, resolved));
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "items",
      value: graphic.items.map(child => ({
        type: child.type ?? graphic.type,
        properties: selected.has(keyByGraphic.get(child.id))
          ? child.properties
          : { ...child.properties, opacity }
      }))
    });
  }
);

export const placeSelectedMarkItemsLast = action(
  { op: "placeSelectedMarkItemsLast", description: "Place selected collection items after their complement." },
  function (args = {}) {
    validateKeys(args, INTERNAL_ORDER_OPTIONS, "placeSelectedMarkItemsLast");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (keys.length === 0 || keys.length === resolved.items.length) {
      return this;
    }
    const selected = new Set(keys);
    const graphic = this.graphicSpec.objects[resolved.definition.target];
    const keyByGraphic = new Map(resolved.items.flatMap(item =>
      item.graphicIds.map(id => [id, item.key])
    ));
    const items = graphic.items.map(child => ({
      key: keyByGraphic.get(child.id),
      child: { type: child.type ?? graphic.type, properties: child.properties }
    }));
    return this.editGraphics({
      target: resolved.definition.target,
      property: "items",
      value: [
        ...items.filter(item => !selected.has(item.key)),
        ...items.filter(item => selected.has(item.key))
      ].map(item => item.child)
    });
  }
);

export const rematerializeMarkHighlights = action(
  { op: "rematerializeMarkHighlights", description: "Reapply stored highlight assignments to one rematerialized mark." },
  function (args = {}) {
    validateKeys(args, REMATERIALIZE_OPTIONS, "rematerializeMarkHighlights");
    validateUserId(args.target, "Highlight target id");
    if (!Array.isArray(args.highlights)) {
      throw new TypeError("rematerializeMarkHighlights requires highlight entries.");
    }
    const prepared = args.highlights.map(([id, config]) => ({
      id,
      config,
      keys: resolveStoredSelection(this, config.selection).keys
    }));
    let next = this;
    for (const { id, config, keys } of prepared) {
      const policy = requireSelectionPolicy(config.markType);
      next = next[policy.applyHighlightOp]({
        selection: config.selection,
        style: config.style,
        keys
      });
      if (config.dimOthers !== false) {
        next = next.dimUnselectedMarkItems({
          selection: config.selection,
          opacity: config.dimOthers.opacity,
          keys
        });
      }
      if (config.bringToFront) {
        next = next.placeSelectedMarkItemsLast({
          selection: config.selection,
          keys
        });
      }
      next = next._withHighlightConfig(id, config);
    }
    return prepared.some(({ config }) =>
      hasLegendSelection(next, config.target, config.selection)
    )
      ? next.rematerializeLegendHighlights()
      : next;
  }
);

export const highlightMarks = action(
  { op: "highlightMarks", description: "Select and emphasize final visual mark items." },
  function (args = {}) {
    validateKeys(args, HIGHLIGHT_OPTIONS, "highlightMarks");
    if (args.select !== undefined && args.selection !== undefined) {
      throw new Error("highlightMarks accepts select or selection, not both.");
    }
    if (args.select !== undefined && !isPlainObject(args.select)) {
      throw new TypeError("highlightMarks select must be a plain object.");
    }
    if (args.id !== undefined && args.select === undefined) {
      throw new Error("highlightMarks id is available only with inline select.");
    }
    const dimOthers = normalizeDimOthers(args.dimOthers);
    const bringToFront = args.bringToFront ?? true;
    if (typeof bringToFront !== "boolean") {
      throw new TypeError("highlightMarks bringToFront must be a boolean.");
    }

    let next = this;
    let resolved;
    let layer;
    if (args.select !== undefined) {
      layer = resolveTarget(this, args.target, "highlight mark");
      resolveMarkSelection(this, layer.id, args.select);
      const style = requireSelectionPolicy(
        layer.mark.type
      ).normalizeHighlightStyle(args);
      next = next.selectMarks({
        ...(args.id === undefined ? {} : { id: args.id }),
        target: layer.id,
        ...args.select
      });
      resolved = resolveStoredSelection(next);
      resolved = { ...resolved, style };
    } else {
      resolved = resolveStoredSelection(next, args.selection);
      if (args.target !== undefined && args.target !== resolved.definition.target) {
        throw new Error("highlightMarks target must match its selection target.");
      }
      layer = resolveTarget(next, resolved.definition.target, "highlight mark");
      resolved = {
        ...resolved,
        style: requireSelectionPolicy(
          layer.mark.type
        ).normalizeHighlightStyle(args)
      };
    }

    const selection = resolved.id;
    const keys = resolved.keys;
    const style = resolved.style;
    const existing = next.materializationConfigs.highlights?.[selection];
    if (existing !== undefined) {
      next = next._withoutMaterializationConfig(["highlights", selection]);
      next = rebuildTargetHighlights(next, resolved.definition.target);
    }
    const policy = requireSelectionPolicy(layer.mark.type);
    next = next[policy.applyHighlightOp]({ selection, style, keys });
    if (dimOthers !== false) {
      next = next.dimUnselectedMarkItems({
        selection,
        opacity: dimOthers.opacity,
        keys
      });
    }
    if (bringToFront) {
      next = next.placeSelectedMarkItemsLast({ selection, keys });
    }
    next = next._withHighlightConfig(selection, {
      target: resolved.definition.target,
      selection,
      markType: layer.mark.type,
      style,
      dimOthers,
      bringToFront
    });
    return hasLegendSelection(next, resolved.definition.target, selection)
      ? next.rematerializeLegendHighlights()
      : next;
  }
);
