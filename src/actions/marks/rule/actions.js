import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import { validatePositiveFinite } from "../../../core/validation.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  mapOrdinalValues,
  normalizeStrokeDashPattern
} from "../../../grammar/scales/index.js";
import { deriveRuleValues, resolveRuleMode } from "../../../grammar/rules.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  editMarkGraphic,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";

const CREATE_OPTIONS = Object.freeze(["id", "data"]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);
const SPAN_OPTIONS = Object.freeze(["id", "orientation", "size"]);
const DEFAULT_RULE_CONFIG = Object.freeze({
  stroke: DEFAULT_COLORS.mark,
  strokeWidth: 2,
  strokeDash: Object.freeze([]),
  opacity: 1
});

function mapPosition(values, scale) {
  return ["ordinal", "band", "point"].includes(scale.type)
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
}

function requireRule(program, id) {
  const layer = findLayer(program, id);
  if (layer?.mark?.type !== "rule") {
    throw new Error(`Unknown rule mark "${id}".`);
  }
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    throw new Error(`Rule mark "${id}" requires an existing dataset.`);
  }
  const graphic = program.graphicSpec.objects[id];
  if (graphic?.type !== "line" || graphic.items === undefined) {
    throw new Error(`Rule mark "${id}" requires line collection graphics.`);
  }
  return { dataset, graphic, layer };
}

function validateEndpointBindings(layer) {
  if (
    layer.encoding?.x2 !== undefined &&
    layer.encoding.x2.scale !== layer.encoding?.x?.scale
  ) {
    throw new Error(`Rule mark "${layer.id}" requires x and x2 to share one scale.`);
  }
  if (
    layer.encoding?.y2 !== undefined &&
    layer.encoding.y2.scale !== layer.encoding?.y?.scale
  ) {
    throw new Error(`Rule mark "${layer.id}" requires y and y2 to share one scale.`);
  }
}

const createRuleMark = action(
  {
    op: "createRuleMark",
    description: "Create a semantic rule mark and empty line collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createRuleMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "rule",
      label: "Rule mark id",
      markType: "rule",
      operation: "createRuleMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "rule");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    assertMarkAvailable(this, id);

    let created = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "rule" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    created = applyLayeredMarkInheritance(created, id, inherited);
    created = created
      .createGraphics({
        id,
        type: "line",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "rule" })
      })
      ._withMarkConfig(id, {
        ...DEFAULT_RULE_CONFIG,
        ...(inherited === undefined
          ? {}
          : {
              inheritedPosition: {
                source: inherited.source,
                channels: Object.keys(inherited.encoding)
              }
            })
      });
    return materializeInheritedMark(created, id);
  }
);

const rematerializeRuleMark = action(
  {
    op: "rematerializeRuleMark",
    description: "Recompute concrete rule endpoints and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeRuleMark");
    const id = validateUserId(args.id, "Rule mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeRuleMark",
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const { dataset, graphic, layer } = requireRule(this, id);
    validateEndpointBindings(layer);
    const config = this.markConfigs[id] ?? DEFAULT_RULE_CONFIG;
    const fixedSpan = config.fixedSpan;
    const boxSpan = config.boxSpanOwner;
    const mode = boxSpan !== undefined
      ? "box-span"
      : fixedSpan !== undefined &&
      layer.encoding?.x?.scale !== undefined &&
      layer.encoding?.y?.scale !== undefined
      ? "fixed-span"
      : resolveRuleMode(layer);
    if (mode === undefined) {
      return graphic.items.length === 0
        ? this
        : this.editGraphics({ target: id, property: "length", value: 0 });
    }

    const scaleIds = [...new Set(
      ["x", "y", "x2", "y2", "strokeDash", "strokeWidth", "opacity"]
        .map(channel => layer.encoding?.[channel]?.scale)
        .filter(scale => scale !== undefined)
    )];
    let resolved = this;
    for (const scaleId of scaleIds) {
      resolved = resolved.rematerializeScale({ id: scaleId });
    }

    const derived = deriveRuleValues(dataset.values, layer);
    if (derived.values.strokeWidth?.some(value => value < 0)) {
      throw new RangeError(
        `Rule strokeWidth field "${layer.encoding.strokeWidth.field}" cannot contain negative values.`
      );
    }
    const mapped = {};
    for (const channel of ["x", "y", "x2", "y2"]) {
      const encoding = layer.encoding?.[channel];
      if (encoding === undefined) continue;
      mapped[channel] = mapPosition(
        derived.values[channel],
        resolved.resolvedScales[encoding.scale]
      );
    }
    const bounds = resolveGraphicBounds(resolved);
    const x1 = [];
    const y1 = [];
    const x2 = [];
    const y2 = [];
    for (let index = 0; index < derived.length; index += 1) {
      let startX;
      let startY;
      let endX;
      let endY;
      if (mode === "vertical-span") {
        startX = endX = mapped.x[index];
        startY = bounds.y;
        endY = bounds.y + bounds.height;
      } else if (mode === "horizontal-span") {
        startX = bounds.x;
        endX = bounds.x + bounds.width;
        startY = endY = mapped.y[index];
      } else if (mode === "vertical-interval") {
        startX = endX = mapped.x[index];
        startY = mapped.y[index];
        endY = mapped.y2[index];
      } else if (mode === "horizontal-interval") {
        startX = mapped.x[index];
        endX = mapped.x2[index];
        startY = endY = mapped.y[index];
      } else if (mode === "box-span") {
        const owner = resolved.graphicSpec.objects[boxSpan];
        const box = owner?.items?.[index]?.properties;
        if (box === undefined) throw new Error(`Rule mark "${id}" requires box span owner "${boxSpan}".`);
        if (layer.encoding?.x?.fieldType === "quantitative") {
          startX = endX = mapped.x[index];
          startY = box.y;
          endY = box.y + box.height;
        } else {
          startX = box.x;
          endX = box.x + box.width;
          startY = endY = mapped.y[index];
        }
      } else if (mode === "fixed-span") {
        if (fixedSpan.orientation === "horizontal") {
          startX = mapped.x[index] - fixedSpan.size / 2;
          endX = mapped.x[index] + fixedSpan.size / 2;
          startY = endY = mapped.y[index];
        } else {
          startX = endX = mapped.x[index];
          startY = mapped.y[index] - fixedSpan.size / 2;
          endY = mapped.y[index] + fixedSpan.size / 2;
        }
      } else {
        startX = mapped.x[index];
        startY = mapped.y[index];
        endX = mapped.x2[index];
        endY = mapped.y2[index];
      }
      x1.push(startX);
      y1.push(startY);
      x2.push(endX);
      y2.push(endY);
    }

    const resolvedConfig = {
      ...DEFAULT_RULE_CONFIG,
      ...resolved.markConfigs[id]
    };
    const dashEncoding = layer.encoding?.strokeDash;
    const opacityEncoding = layer.encoding?.opacity;
    const strokeWidthEncoding = layer.encoding?.strokeWidth;
    const strokeDash = dashEncoding?.scale === undefined
      ? Array.from(
          { length: derived.length },
          () => normalizeStrokeDashPattern(
            dashEncoding?.datum ?? resolvedConfig.strokeDash
          )
        )
      : mapOrdinalValues(
          derived.values.strokeDash,
          resolved.resolvedScales[dashEncoding.scale].domain,
          resolved.resolvedScales[dashEncoding.scale].range
        );
    const opacity = opacityEncoding?.scale === undefined
      ? resolvedConfig.opacity
      : mapContinuousScaleValues(
          derived.values.opacity,
          resolved.resolvedScales[opacityEncoding.scale]
        );
    const strokeWidth = strokeWidthEncoding?.scale === undefined
      ? resolvedConfig.strokeWidth
      : mapContinuousScaleValues(
          derived.values.strokeWidth,
          resolved.resolvedScales[strokeWidthEncoding.scale]
        );

    return editMarkGraphic(resolved, id, {
      length: derived.length,
      x1,
      y1,
      x2,
      y2,
      stroke: resolvedConfig.stroke,
      strokeWidth,
      strokeDash,
      opacity
    });
  }
);

export const materializeRuleSpan = action(
  {
    op: "materializeRuleSpan",
    description: "Materialize a fixed-pixel span around a rule anchor."
  },
  function (args = {}) {
    validateMarkOptions(args, SPAN_OPTIONS, "materializeRuleSpan");
    const id = validateUserId(args.id, "Rule mark id");
    requireRule(this, id);
    if (!["horizontal", "vertical"].includes(args.orientation)) {
      throw new Error(
        `Unsupported rule span orientation "${args.orientation}".`
      );
    }
    validatePositiveFinite(args.size, "Rule span size");
    return this
      ._withMarkConfig(id, {
        ...this.markConfigs[id],
        fixedSpan: { orientation: args.orientation, size: args.size }
      })
      .rematerializeRuleMark({ id });
  }
);

export function registerRuleMarkActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createRuleMark,
    rematerializeRuleMark,
    materializeRuleSpan
  });
}
