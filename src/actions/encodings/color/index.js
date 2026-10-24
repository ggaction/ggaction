import { findLayer } from "../../../selectors/layers.js";
import { findRaincloudParent } from "../../../selectors/raincloud.js";
import { APPEARANCE_MARK_TYPES } from "../../../core/vocabulary.js";
import { removeEncoding } from "../remove.js";
import { validateNonEmptyString } from "../../../core/validation.js";
import { inferSeriesGroup } from "../shared.js";
import { action, invokeWrappedActionImplementation } from "../../../core/action.js";
import {
  readNominalField,
  readScaleField,
  resolveTemporalUnit,
  validateCategoricalFieldType
} from "../../../grammar/scales/index.js";
import {
  resolveBarGrain
} from "../../../grammar/bars/policy.js";
import { resolveColorScaleDefinition } from "../../scales/definitions.js";
import {
  applyEncodingScale,
  releaseDetachedEncodingScale,
  resolveTarget,
  validateOptions
} from "../shared.js";
import {
  applyDetachedScaleRematerialization,
  applyMaterializationPlan
} from "../../../materialization/dependencies.js";
import {
  planEncodingRematerialization
} from "../../../materialization/encodings.js";
import { findUpstreamTransform } from
  "../../../materialization/dataProvenance.js";
import { validatePathSeriesAppearance } from "../../../grammar/pathSeries.js";
import { readCategoricalLineColor, validateCategoricalColorConsumer } from "../../../grammar/scales/colorConsumers.js";
import { encodeContinuousColor } from "./continuous.js";
import {
  applyColorLayoutCompanion
} from "./layout.js";
import {
  assertNoConstantColor,
  withoutConstantColor,
  COLOR_ENCODING_OPTIONS,
  resolveColorLayout,
  resolveColorScaleOptions,
  resolveColorReassignmentScaleOptions
} from "./policy.js";

import { applyTemporalUnit } from "../temporal.js";
import { applyRequestedItemMissingPolicy } from
  "../../../grammar/itemMissing.js";

const encodeColor = /* @__PURE__ */ action(
  {
    op: "encodeColor",
    description: "Assign constant or field-driven graphical color."
  },
  function (args = {}) {
    validateOptions(args, COLOR_ENCODING_OPTIONS, "encodeColor");
    const hasValue = Object.hasOwn(args, "value");
    if (hasValue === Object.hasOwn(args, "field")) {
      throw new Error("encodeColor requires exactly one of value or field.");
    }
    const raincloud = findRaincloudParent(this, args.target);
    if (raincloud !== undefined) {
      const { target, ...color } = args;
      return this.editRaincloudPlot({ target, color });
    }
    const overlayTarget = findLayer(this, args.target ?? this.context.currentMark);
    if (overlayTarget?.derivedBindings?.overlay?.inheritColor) {
      const next = this.editSemantic({ property: `layer[${overlayTarget.id}].derivedBindings.overlay`,
        value: { ...overlayTarget.derivedBindings.overlay, inheritColor: false } });
      return invokeWrappedActionImplementation(encodeColor, next, args);
    }
    if (hasValue) {
      if (COLOR_ENCODING_OPTIONS.some(key => !["target", "value"].includes(key) && args[key] !== undefined)) {
        throw new Error("Constant color accepts only value and target.");
      }
      const value = validateNonEmptyString(args.value, "Color value");
      const { id: target, layer } = resolveTarget(this, args.target,
        APPEARANCE_MARK_TYPES.encodeColor, "color mark");
      const next = layer.encoding?.color === undefined ? this
        : removeEncoding.call(this, { target, channel: "color" });
      const method = { point: "editPointMark", line: "editLineMark", bar: "editBarMark",
        area: "editAreaMark", arc: "editArcMark", rect: "editRectMark", text: "editTextMark" }[layer.mark.type];
      return next[method]({ target, [layer.mark.type === "line" ? "stroke" : "fill"]: value });
    }
    const requestedFieldType = args.fieldType ?? "nominal";
    if (!["nominal", "ordinal"].includes(requestedFieldType)) {
      return encodeContinuousColor(this, {
        ...args,
        fieldType: requestedFieldType
      });
    }
    if (args.aggregate !== undefined) {
      throw new Error("Categorical color does not support aggregate.");
    }
    const fieldType = validateCategoricalFieldType(requestedFieldType);
    resolveTemporalUnit(args, fieldType);
    const { id: target, dataset: sourceDataset, layer } = resolveTarget(
      this,
      args.target,
      APPEARANCE_MARK_TYPES.encodeColor,
      "color mark"
    );
    const dataset = applyRequestedItemMissingPolicy(layer, sourceDataset, args.field);
    const baseline = withoutConstantColor(this, layer);
    assertNoConstantColor(baseline, layer);
    const densityTransform = dataset.transform?.length === 1 &&
      dataset.transform[0].type === "density"
      ? dataset.transform[0]
      : undefined;
    const densitySeriesFields = densityTransform?.placement?.type === "category"
      ? [densityTransform.groupBy, densityTransform.placement.split?.field]
          .filter(Boolean)
      : [];
    const horizonTransform = findUpstreamTransform(this, dataset, "horizon");
    const horizonColor = horizonTransform !== undefined &&
      horizonTransform.as?.color === args.field &&
      layer.encoding?.group?.field === horizonTransform.as?.group;
    const barGrain = resolveBarGrain(layer);
    if (layer.mark.type === "bar" && barGrain === undefined) {
      throw new Error(
        "Bar color encoding requires a complete histogram encoding or a complete ordinal aggregate encoding."
      );
    }
    const layout = resolveColorLayout(layer, args.layout, barGrain, args.field);
    const createsCenterGroup = layer.mark.type === "area" &&
      layout === "center" && layer.encoding?.group === undefined;
    const ordinaryGroup = layer.mark.type === "area" && !createsCenterGroup &&
      densityTransform === undefined && horizonTransform === undefined;
    if (
      layer.mark.type === "area" &&
      !createsCenterGroup &&
      !ordinaryGroup &&
      (layer.encoding?.group?.field === undefined ||
        layer.encoding.group.field !== args.field) &&
      !densitySeriesFields.includes(args.field) &&
      !horizonColor
    ) {
      throw new Error(
        "Area color encoding must match an existing group encoding."
      );
    }
    const requestedScale = resolveColorReassignmentScaleOptions(
      this, layer, "color", fieldType,
      resolveColorScaleOptions(args)
    );
    const scale = resolveColorScaleDefinition(this, requestedScale);
    const color = { field: args.field, fieldType, scale: scale.id };
    const lineFallback = validateCategoricalColorConsumer(layer, color, scale);
    if (layer.mark.type === "line" || ordinaryGroup) {
      validatePathSeriesAppearance(dataset.values, {
        ...layer, encoding: { ...layer.encoding, color }
      }, [...this.semanticSpec.scales.filter(item => item.id !== scale.id), scale]);
    }
    if (lineFallback) {
      readCategoricalLineColor(dataset.values, args.field);
    } else if (layer.mark.type === "rect") {
      readScaleField(dataset.values, args.field, fieldType, {
        allowUnknown: true
      });
    } else if (Object.hasOwn(scale, "unknown")) {
      readScaleField(dataset.values, args.field, fieldType, {
        allowUnknown: true
      });
    } else {
      readNominalField(dataset.values, args.field);
    }

    const prepared = baseline === this ? baseline : releaseDetachedEncodingScale(baseline, scale.id);
    let next = layer.mark.type === "bar" || createsCenterGroup
      ? inferSeriesGroup(prepared, layer, args.field, "color")
      : prepared;
    next = applyTemporalUnit(next, target, "color", undefined, layer.encoding?.color).editSemantic({
      property: `layer[${target}].encoding.color.field`,
      value: args.field
    })
      .editSemantic({
        property: `layer[${target}].encoding.color.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.color.scale`,
        value: scale.id
      });
    if (layout !== undefined && (layer.mark.type === "arc" || horizonTransform !== undefined)) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.color.layout`,
        value: layout
      });
    }
    next = applyEncodingScale(next, scale, requestedScale, {
      reassignment: layer.encoding?.color?.scale === scale.id,
      allowTypeChange: true
    });
    next = applyColorLayoutCompanion(next, {
      target,
      layer,
      layout,
      scale,
      field: args.field,
      horizon: horizonTransform !== undefined
    });

    return applyDetachedScaleRematerialization(applyMaterializationPlan(
      next,
      planEncodingRematerialization(next, {
        target,
        channel: "color",
        scale: scale.id
      })
    ), [layer]);
  }
);

export function registerColorEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeColor = encodeColor;
}
