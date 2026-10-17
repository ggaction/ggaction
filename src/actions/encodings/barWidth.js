import { action } from "../../core/action.js";
import { resolveTarget, validateOptions } from "./shared.js";
import {
  BAR_GRAINS,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarChannels,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeBarWidth } from "../../grammar/bars/geometry.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import {
  getScaleConsumerMarkSteps,
  getSourceDependentMarkSteps
} from "../../materialization/marks/index.js";

function rematerializeWidth(program, target, layer, width) {
  const next = program._withMarkConfig(target, {
    ...program.markConfigs[target], barWidth: width
  }).rematerializeBarMark({ id: target });
  const category = resolveBarChannels(layer)?.category;
  const encoding = layer.encoding?.[category];
  if (encoding?.fieldType !== "temporal") return next;
  const marks = getScaleConsumerMarkSteps(next, [encoding.scale])
    .filter(step => step.args.id !== target);
  return applyMaterializationPlan(next, [
    ...marks,
    ...[target, ...marks.map(step => step.args.id)]
      .flatMap(id => getSourceDependentMarkSteps(next, id))
  ]);
}

const OPTIONS = Object.freeze(["band", "pixels", "interval", "target"]);

const encodeBarWidth = /* @__PURE__ */ action(
  {
    op: "encodeBarWidth",
    description: "Override aggregate or ranged bar width within its category slot."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeBarWidth");
    const { id: target, layer } = resolveTarget(
      this,
      args.target,
      ["bar"],
      "bar mark"
    );
    const layout = resolveBarColorLayout(layer);
    const width = normalizeBarWidth(
      args,
      this.markConfigs[target]?.barWidth ?? (layer.mark.orientation === undefined ? undefined : { pixels: 5 })
    );
    const grouped = layout === "group";
    const offsetChannel = resolveBarOffsetChannel(layer);
    const grain = resolveBarGrain(layer);
    if (layer.mark.orientation !== undefined && width.band !== undefined) {
      throw new Error("Numeric-center bars require pixel width.");
    }
    if (grain === undefined && this.markConfigs[target]?.boxPlot === undefined && (
      layer.encoding?.x === undefined || layer.encoding?.y === undefined
    )) {
      return this._withMarkConfig(target, { ...this.markConfigs[target], barWidth: width });
    }
    if (width.interval !== undefined && grain !== undefined) {
      const category = resolveBarChannels(layer)?.category;
      if (grain !== BAR_GRAINS.aggregate || grouped || layer.encoding?.[category]?.fieldType !== "temporal") {
        throw new Error("Bar interval width requires ungrouped aggregate temporal categories.");
      }
    }
    if (grain === BAR_GRAINS.histogram) {
      throw new Error("encodeBarWidth requires an aggregate or ranged category slot, not histogram bins.");
    }
    if ([BAR_GRAINS.ranged, BAR_GRAINS.centered].includes(grain)) {
      return rematerializeWidth(this, target, layer, width);
    }
    if (
      grain !== BAR_GRAINS.aggregate ||
      (grouped &&
        layer.encoding?.color?.field !== undefined &&
        layer.encoding?.[offsetChannel]?.field !== layer.encoding.color.field)
    ) {
      throw new Error(
        grouped
          ? `encodeBarWidth requires complete grouped bar x, y, color, and ${offsetChannel} encodings.`
          : "encodeBarWidth requires complete aggregate bar x and y encodings."
      );
    }

    return rematerializeWidth(this, target, layer, width);
  }
);

export function registerBarWidthEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeBarWidth = encodeBarWidth;
}
