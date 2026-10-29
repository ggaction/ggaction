import { normalizeMarkSelector } from "../../grammar/markSelection.js";
import { validateGraphPlotDefinition } from "../../grammar/graph/plot.js";
import { resolveGraphPlot } from "../../materialization/graph/plot.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";

export function activeGraphFilter(program, layer) {
  return layer.mark?.type === "graph" ? program.markConfigs[layer.id]?.graphPlot?.view : undefined;
}

function writeView(program, layer, view) {
  const { view: _previous, ...base } = program.markConfigs[layer.id].graphPlot;
  const graphPlot = view === undefined ? base : { ...base, view };
  validateGraphPlotDefinition(graphPlot, layer.graphLabels);
  resolveGraphPlot(program, layer, graphPlot);
  return program._withMarkConfig(layer.id, { ...program.markConfigs[layer.id], graphPlot })
    .materializeGraphPlot({ id: layer.id });
}

export function filterGraphPlot(program, layer, selector, mode) {
  const normalized = normalizeMarkSelector(selector), previous = activeGraphFilter(program, layer);
  if (previous !== undefined && canonicalJSON(encodeValue(previous.selectors.at(-1))) === canonicalJSON(encodeValue(normalized))) return program;
  if (previous !== undefined && mode === undefined) throw new Error('Repeated filterMarks requires mode "replace" or "compose".');
  const selectors = previous === undefined || mode === "replace" ? [normalized] : [...previous.selectors, normalized];
  return writeView(program, layer, { selectors });
}

export function removeGraphFilter(program, layer) {
  return writeView(program, layer, undefined);
}
