import { closedAction } from "../../core/action.js";

import { deriveBin2DRows } from "../../grammar/bin2d.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

export const materializeBin2DData = /* @__PURE__ */ closedAction(
  {
    op: "materializeBin2DData",
    description: "Materialize one immutable rectangular 2D-bin dataset."
  }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "bin2d"
    );
    const result = deriveBin2DRows(source.values, transform);
    return this
      .editSemantic({
        property: `dataset[${id}].transform`,
        value: [{ ...transform, resolved: result.resolved }]
      })
      .editSemantic({
        property: `dataset[${id}].values`,
        value: result.values
      });
  }
);
