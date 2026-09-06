import {
  deriveCenteredAreaSeries,
  deriveAreaSeries,
  deriveDensityAreaSeries
} from "../../../grammar/areaSeries.js";
import {
  deriveLineSeries,
  resolveLineBins
} from "../../../grammar/lineSeries.js";
import { findUpstreamTransform } from "../../dataProvenance.js";
import { requireSemanticScale } from "../../../selectors/scales.js";
import {
  channelMapFromRow,
  finalizeItems,
  ownFields,
  uniqueFields
} from "./common.js";

function rowsForSeries(rows, key) {
  const entries = Object.entries(key);
  return entries.length === 0
    ? rows
    : rows.filter(row => entries.every(([field, value]) => row[field] === value));
}

function seriesDefinitions(layer, rows, series) {
  return series.map(item => {
    const members = item.sourceIndices === undefined ? rowsForSeries(rows, item.key)
      : item.sourceIndices.map(index => rows[index]);
    const fields = { ...uniqueFields(members), ...item.key };
    const channels = channelMapFromRow(fields, layer);
    return { fields, channels, members };
  });
}

export function resolveLineItems(program, layer, dataset) {
  if (layer.encoding?.parallel !== undefined) {
    const parallel = layer.encoding.parallel;
    const definitions = dataset.values.flatMap((row, index) => {
      const incomplete = parallel.dimensions.some(dimension => {
        const value = row[dimension.field];
        return dimension.fieldType === "quantitative"
          ? !Number.isFinite(value)
          : typeof value !== "string" && !Number.isFinite(value);
      });
      if (incomplete && parallel.missing === "drop-row") return [];
      return [{
        key: parallel.key === undefined
          ? `${layer.id}/row/source:${index}`
          : `${layer.id}/row/${String(row[parallel.key])}`,
        fields: ownFields(row),
        channels: channelMapFromRow(row, layer),
        members: [row]
      }];
    });
    return finalizeItems(program, layer, "row", definitions, "path");
  }
  const x = layer.encoding?.x;
  const derived = deriveLineSeries(
    dataset.values,
    layer,
    x?.bin === undefined
      ? undefined
      : {
          xBinBoundaries: resolveLineBins(
            dataset.values,
            layer,
            requireSemanticScale(program, x.scale)
          ).boundaries
        }
  );
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset.values, derived.series),
    "path"
  );
}

export function resolveAreaItems(program, layer, dataset) {
  const transform = findUpstreamTransform(program, dataset, "density");
  const derived = transform === undefined
    ? layer.encoding?.y?.stack === "center"
      ? deriveCenteredAreaSeries(dataset.values, layer)
      : deriveAreaSeries(dataset.values, layer)
    : deriveDensityAreaSeries(dataset.values, layer, transform);
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset.values, derived.series),
    "path"
  );
}
