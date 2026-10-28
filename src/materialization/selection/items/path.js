import { conditionalAreaStructure, hasConditionalAreaPosition } from "../../conditionalAreaStructure.js";
import { conditionalLineStructure, hasConditionalLinePosition } from "../../conditionalLineStructure.js";
import { canonicalJSON } from "../../../core/contentDigest.js";
import { encodeValue } from "../../../core/valueEncoding.js";
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

function seriesDefinitions(layer, dataset, series) {
  const groups = new Map();
  series.forEach((item, graphicIndex) => {
    // Every selection derivation requests lineage; use exact source indices
    // rather than reconstructing membership from equal-valued rows.
    const members = item.sourceIndices.map(index => dataset.values[index]);
    const memberKeys = item.sourceIndices.map(index => dataset.rowKeys[index]);
    const identity = canonicalJSON(encodeValue(item.key));
    if (!groups.has(identity)) groups.set(identity, { key: item.key, segments: [] });
    groups.get(identity).segments.push({ members, memberKeys, graphicIndex });
  });
  return [...groups.values()].map(({ key, segments }) => {
    const members = segments.flatMap(segment => segment.members);
    const fields = { ...uniqueFields(members), ...key };
    return { fields, channels: channelMapFromRow(fields, layer), members,
      semanticIdentity: ["series", key], memberKeys: segments.flatMap(segment => segment.memberKeys),
      topologyKeys: segments.map(segment => segment.memberKeys),
      graphicIndices: segments.map(segment => segment.graphicIndex),
      graphicRoles: segments.map(segment => segments.length === 1 ? "body" : JSON.stringify(["segment", segment.memberKeys[0], segment.memberKeys.at(-1)])) };
  });
}

export function resolveLineItems(program, layer, dataset, grain, resolveItems, selectionResolvers) {
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
        rowKey: dataset.rowKeys[index],
        fields: ownFields(row),
        channels: channelMapFromRow(row, layer),
        members: [row]
      }];
    });
    return finalizeItems(program, layer, "row", definitions, "path", { selectionResolvers });
  }
  const x = layer.encoding?.x;
  const derived = hasConditionalLinePosition(layer) ? conditionalLineStructure(program, layer, dataset).derived : deriveLineSeries(
    dataset.values,
    layer,
    {
      lineage: true,
      scales: program.semanticSpec.scales,
      xDomain: program.resolvedScales[x?.scale]?.domain,
      yDomain: program.resolvedScales[layer.encoding.y?.scale]?.domain,
      ...(x?.bin === undefined ? {} : {
          xBinBoundaries: resolveLineBins(
            dataset.values,
            layer,
            requireSemanticScale(program, x.scale)
          ).boundaries
        })
    }
  );
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset, derived.series),
    "path"
  , { selectionResolvers });
}

export function resolveAreaItems(program, layer, dataset, grain, resolveItems, selectionResolvers) {
  const transform = findUpstreamTransform(program, dataset, "density");
  const derived = hasConditionalAreaPosition(layer) ? conditionalAreaStructure(program, layer, dataset).raw : transform === undefined
    ? layer.encoding?.y?.stack === "center"
      ? deriveCenteredAreaSeries(dataset.values, layer, { lineage: true, xDomain: program.resolvedScales[layer.encoding.x?.scale]?.domain, yDomain: program.resolvedScales[layer.encoding.y?.scale]?.domain })
      : deriveAreaSeries(dataset.values, layer, { lineage: true, xDomain: program.resolvedScales[layer.encoding.x?.scale]?.domain, yDomain: program.resolvedScales[layer.encoding.y?.scale]?.domain })
    : deriveDensityAreaSeries(dataset.values, layer, transform, { lineage: true });
  return finalizeItems(
    program,
    layer,
    "series",
    seriesDefinitions(layer, dataset, derived.series),
    "path"
  , { selectionResolvers });
}
