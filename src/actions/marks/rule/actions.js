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
      ._withMarkConfig(id, DEFAULT_RULE_CONFIG);
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
      ["x", "y", "x2", "y2", "strokeDash", "opacity"]
        .map(channel => layer.encoding?.[channel]?.scale)
        .filter(scale => scale !== undefined)
    )];
    let resolved = this;
    for (const scaleId of scaleIds) {
      resolved = resolved.rematerializeScale({ id: scaleId });
    }

    const derived = deriveRuleValues(dataset.values, layer);
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
      if (mode === "vertical-span") {
        x1.push(mapped.x[index]);
        y1.push(bounds.y);
        x2.push(mapped.x[index]);
        y2.push(bounds.y + bounds.height);
      } else if (mode === "horizontal-span") {
        x1.push(bounds.x);
        y1.push(mapped.y[index]);
        x2.push(bounds.x + bounds.width);
        y2.push(mapped.y[index]);
      } else if (mode === "vertical-interval") {
        x1.push(mapped.x[index]);
        y1.push(mapped.y[index]);
        x2.push(mapped.x[index]);
        y2.push(mapped.y2[index]);
      } else if (mode === "horizontal-interval") {
        x1.push(mapped.x[index]);
        y1.push(mapped.y[index]);
        x2.push(mapped.x2[index]);
        y2.push(mapped.y[index]);
      } else if (mode === "box-span") {
        const owner = resolved.graphicSpec.objects[boxSpan];
        const box = owner?.items?.[index]?.properties;
        if (box === undefined) throw new Error(`Rule mark "${id}" requires box span owner "${boxSpan}".`);
        if (layer.encoding?.x?.fieldType === "quantitative") {
          x1.push(mapped.x[index]);
          y1.push(box.y);
          x2.push(mapped.x[index]);
          y2.push(box.y + box.height);
        } else {
          x1.push(box.x);
          y1.push(mapped.y[index]);
          x2.push(box.x + box.width);
          y2.push(mapped.y[index]);
        }
      } else if (mode === "fixed-span") {
        if (fixedSpan.orientation === "horizontal") {
          x1.push(mapped.x[index] - fixedSpan.size / 2);
          y1.push(mapped.y[index]);
          x2.push(mapped.x[index] + fixedSpan.size / 2);
          y2.push(mapped.y[index]);
        } else {
          x1.push(mapped.x[index]);
          y1.push(mapped.y[index] - fixedSpan.size / 2);
          x2.push(mapped.x[index]);
          y2.push(mapped.y[index] + fixedSpan.size / 2);
        }
      } else {
        x1.push(mapped.x[index]);
        y1.push(mapped.y[index]);
        x2.push(mapped.x2[index]);
        y2.push(mapped.y2[index]);
      }
    }

    const resolvedConfig = resolved.markConfigs[id] ?? DEFAULT_RULE_CONFIG;
    const dashEncoding = layer.encoding?.strokeDash;
    const opacityEncoding = layer.encoding?.opacity;
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

    return resolved
      .editGraphics({ target: id, property: "length", value: derived.length })
      .editGraphics({ target: id, property: "x1", value: x1 })
      .editGraphics({ target: id, property: "y1", value: y1 })
      .editGraphics({ target: id, property: "x2", value: x2 })
      .editGraphics({ target: id, property: "y2", value: y2 })
      .editGraphics({ target: id, property: "stroke", value: resolvedConfig.stroke })
      .editGraphics({
        target: id,
        property: "strokeWidth",
        value: resolvedConfig.strokeWidth
      })
      .editGraphics({ target: id, property: "strokeDash", value: strokeDash })
      .editGraphics({ target: id, property: "opacity", value: opacity });
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
  ProgramClass.prototype.createRuleMark = createRuleMark;
  ProgramClass.prototype.rematerializeRuleMark = rematerializeRuleMark;
  ProgramClass.prototype.materializeRuleSpan = materializeRuleSpan;
}
