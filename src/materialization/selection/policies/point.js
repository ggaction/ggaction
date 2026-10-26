import { ownFields, channelMapFromRow } from "../items/common.js";
import { resolvePointItems } from "../items/index.js";
import { normalizePointHighlightStyle } from "../styles.js";

export const pointSelectionPolicy = Object.freeze({
  supportedGrains: Object.freeze(["item"]),
  resolveItems: resolvePointItems,
  resolveSourceItems: (program, layer, dataset) => dataset.values.map(row => ({fields:ownFields(row),channels:channelMapFromRow(row,layer),members:[row]})),
  normalizeHighlightStyle: normalizePointHighlightStyle,
  applyHighlightOp: "applyPointHighlight",
  rematerializeOp: "rematerializePointMark"
});
