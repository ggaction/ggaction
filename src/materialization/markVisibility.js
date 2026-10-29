import { normalizeMarkVisibility } from "../grammar/markVisibility.js";
import { conditionalLegendLayer } from "./legendEncodings.js";
import { findMarkVisibilityDataset, requireDataset } from "../selectors/datasets.js";

export function validateVisibilityBinding(layer, input) {
  const visibility = normalizeMarkVisibility(input), resolved = conditionalLegendLayer(layer);
  for (const channel of visibility.channels) {
    const encoding = resolved.encoding?.[channel];
    if (encoding?.field !== visibility.field || !["nominal", "ordinal"].includes(encoding.fieldType) || !encoding.scale) {
      throw new Error("Remove mark visibility before changing its categorical encoding binding.");
    }
  }
  return visibility;
}

// Scale policy changes the explicit calculation input, never the stored source.
// The controlling categorical legend keeps its complete pre-visibility mapping.
export function visibilityScaleInput(program, consumer) {
  const dataset = findMarkVisibilityDataset(program, consumer.layer);
  if (!dataset) return { program, consumer };
  const visibility = validateVisibilityBinding(consumer.layer, dataset.transform[0].visibility);
  if (visibility.scaleDomain !== "all-data" && !visibility.channels.includes(consumer.channel)) return { program, consumer };
  const layer = { ...consumer.layer, data: requireDataset(program, dataset.source).id };
  return { consumer: { ...consumer, layer }, program: { ...program,
    semanticSpec: { ...program.semanticSpec, layers: program.semanticSpec.layers.map(candidate => candidate.id === layer.id ? layer : candidate) } } };
}

export function visibilityLegendDataset(program, layer, channels) {
  const dataset = findMarkVisibilityDataset(program, layer);
  return requireDataset(program, dataset && channels.some(channel => dataset.transform[0].visibility.channels.includes(channel))
    ? dataset.source : layer.data);
}

export function validateLayerVisibility(program, layer) {
  const dataset = findMarkVisibilityDataset(program, layer);
  return dataset ? validateVisibilityBinding(layer, dataset.transform[0].visibility) : undefined;
}

// Editable restoration validates the stored decision and realized ownership.
// It does not replay actions or silently repair filtered values.
export function validateMarkVisibilityState(program) {
  for (const layer of program.semanticSpec.layers) {
    const dataset = findMarkVisibilityDataset(program, layer), config = program.markConfigs[layer.id]?.visibilityFilter;
    if (!dataset && !config) continue;
    if (!dataset || !config || config.dataset !== dataset.id || config.source !== dataset.source ||
        typeof config.empty !== "boolean" || config.empty !== (dataset.values?.length === 0) ||
        Object.keys(config).some(key => !["dataset", "source", "empty", "originalBin"].includes(key))) {
      throw new Error("Visibility requires matching active source, dataset and realization state.");
    }
    const visibility = validateVisibilityBinding(layer, dataset.transform[0].visibility);
    const hidden = new Set(visibility.hidden);
    if (dataset.values?.some(row => hidden.has(row?.[visibility.field]))) throw new Error("Visibility values cannot retain a hidden category.");
    if (!program.materializationConfigs.rowProvenance?.[dataset.id]) throw new Error("Visibility requires its original row provenance.");
  }
}
