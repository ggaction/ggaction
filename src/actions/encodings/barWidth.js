import { action } from "../../core/action.js";
import { resolveTarget, validateOptions } from "./shared.js";
import {
  BAR_GRAINS,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeBarWidth } from "../../grammar/bars/geometry.js";

const OPTIONS = Object.freeze(["band", "pixels", "target"]);

const encodeBarWidth = action(
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
      this.markConfigs[target]?.barWidth
    );
    const grouped = layout === "group";
    const offsetChannel = resolveBarOffsetChannel(layer);
    const grain = resolveBarGrain(layer);
    if (grain === BAR_GRAINS.ranged) {
      return this._withMarkConfig(target, { ...this.markConfigs[target], barWidth: width })
        .rematerializeBarMark({ id: target });
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

    return this
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        barWidth: width
      })
      .rematerializeBarMark({ id: target });
  }
);

export function registerBarWidthEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeBarWidth = encodeBarWidth;
}
