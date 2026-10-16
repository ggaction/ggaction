import { materializeTextLines } from "./textLines.js";
import { resolveLegendTitleText } from "../layout/legendText.js";

export function materializeLegendTitleLines(program, id, text, style) {
  const { lines } = resolveLegendTitleText(text, style, program.materializationConfigs.textMetrics);
  return materializeTextLines(program, id, lines);
}
