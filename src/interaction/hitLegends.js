import { legendGuideItems } from "../materialization/guides/legendItems.js";

export function bindLegendHitMetadata(program, { direct, token, spend }) {
  for (const item of legendGuideItems(program, spend)) {
    direct(item.graphicId, token(item.ownerId, item.role, item.value));
  }
}
