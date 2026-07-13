import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { readNominalField, readQuantitativeField } from "../../grammar/scales.js";
import { resolveTarget, validateOptions } from "./shared.js";

const Y2_OPTIONS = Object.freeze(["field", "target", "fieldType", "scale"]);
const Y_RANGE_OPTIONS = Object.freeze([
  "lower", "upper", "target", "fieldType", "coordinate", "scale"
]);
const GROUP_OPTIONS = Object.freeze(["field", "target", "fieldType"]);

const encodeY2 = action(
  {
    op: "encodeY2",
    description: "Encode the upper edge of a ranged area."
  },
  function (args = {}) {
    validateOptions(args, Y2_OPTIONS, "encodeY2");
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["area"],
      "area mark"
    );
    if ((args.fieldType ?? "quantitative") !== "quantitative") {
      throw new Error("encodeY2 requires a quantitative field.");
    }
    readQuantitativeField(dataset.values, args.field);
    const yScaleId = layer.encoding?.y?.scale;
    if (yScaleId === undefined) {
      throw new Error("encodeY2 requires an existing y encoding.");
    }
    if (args.scale !== undefined) {
      if (!isPlainObject(args.scale)) {
        throw new TypeError("Encoding scale must be a plain object.");
      }
      validateOptions(args.scale, ["id"], "scale");
      if (args.scale.id !== undefined && args.scale.id !== yScaleId) {
        throw new Error("Area y and y2 must share one scale.");
      }
    }
    return this
      .editSemantic({
        property: `layer[${target}].encoding.y2.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.y2.fieldType`,
        value: "quantitative"
      })
      .editSemantic({
        property: `layer[${target}].encoding.y2.scale`,
        value: yScaleId
      })
      .rematerializeScale({ id: yScaleId })
      .rematerializeAreaMark({ id: target });
  }
);

const encodeYRange = action(
  {
    op: "encodeYRange",
    description: "Atomically encode lower and upper area bounds."
  },
  function (args = {}) {
    validateOptions(args, Y_RANGE_OPTIONS, "encodeYRange");
    const target = args.target;
    const lower = this.encodeY({
      field: args.lower,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative",
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(args.scale === undefined ? {} : { scale: args.scale })
    });
    return lower.encodeY2({
      field: args.upper,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative"
    });
  }
);

const encodeGroup = action(
  {
    op: "encodeGroup",
    description: "Split path geometry by a nominal field without a scale."
  },
  function (args = {}) {
    validateOptions(args, GROUP_OPTIONS, "encodeGroup");
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["line", "area"],
      "path mark"
    );
    if ((args.fieldType ?? "nominal") !== "nominal") {
      throw new Error("encodeGroup requires a nominal field.");
    }
    const densityTransform = dataset.transform?.length === 1 &&
      dataset.transform[0].type === "density"
      ? dataset.transform[0]
      : undefined;
    if (densityTransform !== undefined && densityTransform.groupBy !== args.field) {
      throw new Error(
        densityTransform.groupBy === undefined
          ? `Ungrouped density area mark "${target}" cannot encode group.`
          : `Density area mark "${target}" must group by "${densityTransform.groupBy}".`
      );
    }
    readNominalField(dataset.values, args.field);
    const next = this
      .editSemantic({
        property: `layer[${target}].encoding.group.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.group.fieldType`,
        value: "nominal"
      });
    if (layer.mark.type === "area") {
      const updated = next.semanticSpec.layers.find(item => item.id === target);
      const updatedDataset = next.semanticSpec.datasets.find(
        item => item.id === updated.data
      );
      const isDensity = updatedDataset?.transform?.length === 1 &&
        updatedDataset.transform[0].type === "density";
      const densityGroup = updatedDataset?.transform?.[0]?.groupBy;
      const isCompleteDensity = isDensity && (
        densityGroup === undefined || updated.encoding?.group?.field === densityGroup
      );
      return (
        updated.encoding?.x?.scale !== undefined &&
        updated.encoding?.y?.scale !== undefined &&
        (isCompleteDensity || updated.encoding?.y2?.scale === updated.encoding.y.scale)
      )
        ? next.rematerializeAreaMark({ id: target })
        : next;
    }
    return layer.encoding?.x !== undefined && layer.encoding?.y !== undefined
      ? next.rematerializeLineMark({ id: target })
      : next;
  }
);

export function registerRangedEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeY2 = encodeY2;
  ProgramClass.prototype.encodeYRange = encodeYRange;
  ProgramClass.prototype.encodeGroup = encodeGroup;
}
