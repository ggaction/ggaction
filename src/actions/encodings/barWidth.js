import { action } from "../../core/action.js";
import { resolveTarget, validateOptions } from "./shared.js";
import { isAggregate } from "../../grammar/aggregate.js";

const OPTIONS = Object.freeze(["band", "target"]);

const encodeBarWidth = action(
  {
    op: "encodeBarWidth",
    description: "Set grouped bar width within each xOffset slot."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeBarWidth");
    const band = args.band ?? 0.72;
    if (!Number.isFinite(band) || band <= 0 || band > 1) {
      throw new RangeError("Bar width band must be greater than 0 and at most 1.");
    }

    const { id: target, layer } = resolveTarget(
      this,
      args.target,
      ["bar"],
      "bar mark"
    );
    if (
      layer.encoding?.x?.fieldType !== "ordinal" ||
      !isAggregate(layer.encoding?.y?.aggregate) ||
      layer.encoding.y.stack !== null ||
      layer.encoding?.color?.field === undefined ||
      layer.encoding?.xOffset?.field !== layer.encoding.color.field
    ) {
      throw new Error(
        "encodeBarWidth requires complete grouped bar x, y, color, and xOffset encodings."
      );
    }

    return this
      ._withMarkConfig(target, {
        ...this.markConfigs[target],
        barWidth: { band }
      })
      .rematerializeBarMark({ id: target });
  }
);

export function registerBarWidthEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeBarWidth = encodeBarWidth;
}
