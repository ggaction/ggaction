import { cloneAndFreeze } from "../core/immutable.js";
import { textMetricKey, textMetricFontWeight } from "../core/font.js";
import { fontMetricBinding } from "../core/textMetrics.js";
import { FONT_METRIC_MAX_QUERIES, FONT_METRIC_MAX_TEXT_UNITS } from "../core/textMetricProfile.js";
import { validateWorkLimit } from "../core/validation.js";
import { textGraphemeSegments, textHardLines, textWordTokens } from "../layout/text.js";
import { graphicScopes } from "../selectors/graphicScopes.js";
import { cartesianAxisOwners } from "../selectors/axes.js";
import { valuesFromTickConfig } from "./guides/tickValues.js";
import { axisLabelTexts } from "./axisLabelText.js";

// A conservative finite closure: character wrapping emits contiguous grapheme
// spans; word wrapping emits such spans after its native whitespace folding.
// Check work before allocating each candidate. The collector checks unique
// query and UTF-16 budgets before any decoder or measurement callback runs.
function visitWrapQueries(text, mode, add, spend) {
  spend(text.length + 1);
  add("");
  for (const line of textHardLines(text)) {
    add(line);
    const folded = mode === "word" ? textWordTokens(line).join(" ") : line;
    const segments = [...textGraphemeSegments(folded)].map(item => item.segment);
    for (let start = 0; start < segments.length; start++) {
      let value = "";
      for (let end = start; end < segments.length; end++) {
        spend(1 + value.length + segments[end].length);
        value += segments[end];
        add(value);
      }
    }
  }
}

export function prepareAxisLabelReflowQueries(program, profile) {
  const queries = new Map(); let work = 0, units = 0;
  const spend = count => validateWorkLimit(work += count, "Axis label query work");
  for (const scope of graphicScopes(program, () => spend(1))) {
    for (const owner of cartesianAxisOwners(scope.program)) {
      spend(1);
      const config = owner.config?.labels;
      if (config === undefined || config.maxWidth === undefined && config.responsive === undefined) continue;
      const style = { fontFamily: config.fontFamily, fontSize: config.fontSize,
        fontWeight: textMetricFontWeight(config.fontWeight), fontStyle: "normal" };
      const binding = fontMetricBinding(profile, style);
      const add = text => {
        const query = { ...style, text }, key = textMetricKey(query);
        if (queries.has(key)) return;
        if (queries.size === FONT_METRIC_MAX_QUERIES || units + text.length > FONT_METRIC_MAX_TEXT_UNITS) {
          throw new RangeError("Axis label measurement query closure exceeds its budget.");
        }
        units += text.length;
        queries.set(key, { resource: binding.resource, query });
      };
      const values = valuesFromTickConfig(scope.program, config);
      spend(values.length);
      const texts = axisLabelTexts(values, scope.program.resolvedScales[config.scale], config);
      for (const text of new Set(texts)) {
        if (text !== "") visitWrapQueries(text, config.wrap ?? "word", add, spend);
      }
    }
  }
  return cloneAndFreeze([...queries.values()]);
}
