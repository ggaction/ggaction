import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import { collectResourceReferences } from "../../core/resourceReferences.js";
import { findLayer, resolveEligibleLayer } from "../../selectors/layers.js";
import { isSourceOwnedText } from "../../grammar/text.js";
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
import {
  normalizeThemeState,
  resolveEffectiveThemeTokens
} from "../theme/state.js";

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
  const selector = program.materializationConfigs.selections?.[selection]?.selector;
  const layer = findLayer(program, target);
  const field = selector?.field ?? layer?.encoding?.[selector?.channel]?.field;
  if (field === undefined) return false;
  return ["series", "color", "stroke"].some(kind => {
    const legend = program.guideConfigs.legend?.[kind];
    return legend?.target === target && legend.field === field &&
      (selector?.channel === undefined || legend.channels.includes(selector.channel));
  });
}

function categoricalLegendKinds(program, target) {
  return ["series", "color", "stroke"].filter(
    kind => program.guideConfigs.legend?.[kind]?.target === target
  );
}

function resetCategoricalLegendSymbols(program, target) {
  const kinds = categoricalLegendKinds(program, target);
  if (kinds.length === 0) return program;
  let next = program;
  for (const kind of kinds) {
    for (const id of legendGraphicIds(kind).filter(id => id.includes("Symbol"))) {
      const graphic = next.graphicSpec.objects[id];
      if (graphic === undefined) continue;
      next = graphic.type === "collection"
        ? next.editGraphics({ target: id, property: "items", value: [] })
        : next.editGraphics({ target: id, property: "length", value: 0 });
    }
    next = next.rematerializeLegendSymbols({ kind });
  }
  return next;
}

function targetHighlightEntries(program, target) {
  return Object.entries(program.materializationConfigs.highlights ?? {})
    .filter(([, config]) => config.target === target);
}

function namedLabelDependents(program, selection) {
  const referenced = new Set(collectResourceReferences(program, {
    kind: "selection",
    id: selection
  }).filter(reference =>
    reference.ownerKind === "markConfig" &&
    reference.path.join(".") === "labelAuthoring.selection.id"
  ).map(reference => reference.ownerId));
  return Object.entries(program.markConfigs)
    .filter(([id, config]) => {
      const layer = findLayer(program, id);
      return isSourceOwnedText(layer) &&
        config?.labelAuthoring?.selection?.kind === "named" &&
        referenced.has(id);
    })
    .map(([id]) => id)
    .sort();
}

function rematerializeLabels(program, ids) {
  let next = program;
  for (const id of ids) next = next.rematerializeTextMark({ id });
  return next;
}

function rebuildTargetHighlights(program, target, { labels = [] } = {}) {
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
  baseline = rematerializeLabels(baseline, labels);
  baseline = resetCategoricalLegendSymbols(baseline, target);
  return highlights.length === 0
    ? baseline
    : baseline.rematerializeMarkHighlights({ target, highlights });
}

export function rematerializeLabelsBeforeHighlights(
  program,
  target,
  labels,
  { skipWithoutHighlights = false } = {}
) {
  return targetHighlightEntries(program, target).length === 0
    ? skipWithoutHighlights
      ? program
      : rematerializeLabels(program, labels)
    : rebuildTargetHighlights(program, target, { labels });
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

function selectedGraphicItems(program, resolved, keys) {
  const selected = new Set(keys);
  const graphic = program.graphicSpec.objects[resolved.definition.target];
  const keyByGraphic = new Map(resolved.items.flatMap(item =>
    item.graphicIds.map(id => [id, item.key])
  ));
  return {
    selected,
    target: resolved.definition.target,
    items: graphic.items.map(child => ({
      key: keyByGraphic.get(child.id),
      child: { type: child.type ?? graphic.type, properties: child.properties }
    }))
  };
}

function editSelectedItems(
  program,
  resolved,
  keys,
  transform,
  complement = false
) {
  const { selected, target, items } = selectedGraphicItems(program, resolved, keys);
  return program.editGraphics({
    target,
    property: "items",
    value: items.map(item => selected.has(item.key) !== complement
      ? transform(item.child)
      : item.child)
  });
}

function applyHighlight(program, config, keys) {
  const style = resolveHighlightStyle(program, config);
  let next = program[requireSelectionPolicy(config.markType).applyHighlightOp]({
    selection: config.selection,
    style,
    keys
  });
  if (config.dimOthers !== false) {
    next = next.dimUnselectedMarkItems({
      selection: config.selection,
      opacity: config.dimOthers.opacity,
      keys
    });
  }
  return config.bringToFront
    ? next.placeSelectedMarkItemsLast({ selection: config.selection, keys })
    : next;
}

function highlightPaintProperty(markType) {
  return ["line", "rule", "tick"].includes(markType) ? "stroke" : "fill";
}

function requestedPaintSource(args, markType, style) {
  const property = highlightPaintProperty(markType);
  const explicit = args.color !== undefined || args[property] !== undefined;
  if (explicit) return "explicit";
  return Object.hasOwn(style, property) ? "theme" : "preserve";
}

function tracePaintSource(program, id, config) {
  let source;
  for (const node of program.trace.children) {
    if (node.op !== "highlightMarks") continue;
    const requestedId = node.args.selection ?? node.args.id ??
      `${node.args.target ?? config.target}Selection`;
    if (requestedId !== id) continue;
    const property = highlightPaintProperty(config.markType);
    const explicit = node.args.color !== undefined ||
      node.args[property] !== undefined;
    source = explicit
      ? "explicit"
      : Object.hasOwn(config.style, property) ? "theme" : "preserve";
  }
  return source ?? "explicit";
}

function normalizeStoredHighlightConfig(program, id, config) {
  return config.paintSource === undefined
    ? { ...config, paintSource: tracePaintSource(program, id, config) }
    : config;
}

function resolveHighlightStyle(program, config) {
  if (config.paintSource !== "theme") return config.style;
  const property = highlightPaintProperty(config.markType);
  return {
    ...config.style,
    [property]: resolveEffectiveThemeTokens(normalizeThemeState(
      program.materializationConfigs.theme
    )).highlight
  };
}

export function rematerializeThemeHighlights(program) {
  const targets = [...new Set(Object.values(
    program.materializationConfigs.highlights ?? {}
  ).map(config => config.target))];
  let next = program;
  for (const target of targets) next = rebuildTargetHighlights(next, target);
  return next;
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
    let next = this
      ._withSelectionConfig(current.id, {
        target: current.definition.target,
        selector: replacement.selector
      })
      ._withContext({ currentSelection: current.id });
    const hasDependentHighlight = Object.values(
      next.materializationConfigs.highlights ?? {}
    ).some(config => config.selection === current.id);
    const labels = namedLabelDependents(this, current.id);
    if (hasDependentHighlight) {
      return rematerializeLabelsBeforeHighlights(
        next,
        current.definition.target,
        labels
      );
    }
    return rematerializeLabels(next, labels);
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
    const labelDependents = namedLabelDependents(this, current.id);
    if (labelDependents.length > 0) {
      throw new Error(
        `Selection "${current.id}" is referenced by attached labels: ${labelDependents.join(", ")}.`
      );
    }
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
    return editSelectedItems(this, resolved, keys, item =>
      transformPointHighlightChild(item, args.style)
    );
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

function transformRectangularHighlightChild(item, style, offset) {
  return {
    ...item,
    properties: item.type === "path"
      ? transformPathHighlightProperties(item.properties, style)
      : transformRectangularProperties(item.properties, style, offset)
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
  return editSelectedItems(program, resolved, keys, item =>
    transformRectangularHighlightChild(item, args.style, offset));
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
    return editSelectedItems(this, resolved, keys, item => ({
      ...item,
      properties: transformPathHighlightProperties(item.properties, args.style)
    }));
  }
);

export const applyRuleHighlight = action(
  { op: "applyRuleHighlight", description: "Apply selected rule appearance and offset." },
  function (args = {}) {
    validateKeys(args, INTERNAL_SELECTION_OPTIONS, "applyRuleHighlight");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    if (
      resolved.items.length > 0 &&
      !["rule", "tick"].includes(resolved.items[0]?.markType)
    ) {
      throw new Error("applyRuleHighlight requires a rule or Tick selection.");
    }
    if (keys.length === 0) return this;
    return editSelectedItems(this, resolved, keys, item => ({
      ...item,
      properties: transformRuleHighlightProperties(item.properties, args.style)
    }));
  }
);

export const dimUnselectedMarkItems = action(
  { op: "dimUnselectedMarkItems", description: "Dim the complement of one mark selection." },
  function (args = {}) {
    validateKeys(args, INTERNAL_DIM_OPTIONS, "dimUnselectedMarkItems");
    const opacity = validateUnitInterval(args.opacity, "Dim opacity");
    const resolved = resolveStoredSelection(this, args.selection);
    const keys = selectedKeys(args, resolved);
    return editSelectedItems(this, resolved, keys, item => ({
      ...item,
      properties: { ...item.properties, opacity }
    }), true);
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
    const { selected, target, items } = selectedGraphicItems(this, resolved, keys);
    return this.editGraphics({
      target,
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
      config: normalizeStoredHighlightConfig(this, id, config),
      keys: resolveStoredSelection(this, config.selection).keys
    }));
    let next = this;
    for (const { id, config, keys } of prepared) {
      next = applyHighlight(next, config, keys)._withHighlightConfig(id, config);
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
    const config = {
      target: resolved.definition.target,
      selection,
      markType: layer.mark.type,
      style,
      paintSource: requestedPaintSource(args, layer.mark.type, style),
      dimOthers,
      bringToFront
    };
    next = applyHighlight(next, config, keys)
      ._withHighlightConfig(selection, config);
    return hasLegendSelection(next, resolved.definition.target, selection)
      ? next.rematerializeLegendHighlights()
      : next;
  }
);
