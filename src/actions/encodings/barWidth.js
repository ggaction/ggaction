import { action } from "../../core/action.js";
import { resolveTarget, validateOptions } from "./shared.js";
import {
  BAR_GRAINS,
  resolveBarColorLayout,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { normalizeBarWidth } from "../../grammar/bars/geometry.js";

const OPTIONS = Object.freeze(["band", "pixels", "target"]);

const encodeBarWidth = action(
  {
    op: "encodeBarWidth",
    description: "Set aggregate bar width within each x band or xOffset slot."
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
    if (
      resolveBarGrain(layer) !== BAR_GRAINS.aggregate ||
      layer.encoding?.color?.field === undefined ||
      (grouped && layer.encoding?.xOffset?.field !== layer.encoding.color.field)
    ) {
      throw new Error(
        grouped
          ? "encodeBarWidth requires complete grouped bar x, y, color, and xOffset encodings."
          : "encodeBarWidth requires complete aggregate bar x, y, and color encodings."
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
