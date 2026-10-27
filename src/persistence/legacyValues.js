import { deriveFilteredRows } from "../grammar/filter.js";
import { deriveSortedRows } from "../grammar/sort.js";
import { deriveComputedRows } from "../grammar/computed.js";
import { deriveCompleteRows } from "../grammar/complete.js";
import { deriveFoldRows } from "../grammar/fold.js";
import { deriveFlattenRows } from "../grammar/flatten.js";
import { deriveLookupRows } from "../grammar/lookup.js";
import { deriveTimeUnitRows } from "../grammar/timeUnit.js";
import { deriveStackRows } from "../grammar/stack.js";
import { deriveSummaryRows } from "../grammar/summary.js";
import { deriveWindowRows } from "../grammar/window.js";
import { deriveNormalizedRows } from "../grammar/normalize.js";
import { deriveImputedRows } from "../grammar/impute.js";
import { deriveBoxData } from "../grammar/boxPlot.js";
import { deriveKernelDensity } from "../grammar/density.js";
import { deriveECDF } from "../grammar/ecdf.js";
import { deriveGradientProfiles } from "../grammar/gradientProfile.js";
import { deriveHorizon } from "../grammar/horizon.js";
import { deriveInterval } from "../grammar/interval.js";
import { deriveRegression } from "../grammar/regression/index.js";
import { regressionStatisticsRows } from "../grammar/regression/statistics.js";
import { deriveBinRows } from "../grammar/bin.js";
import { deriveBin2DRows } from "../grammar/bin2d.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { encodeValue, invalidSnapshot } from "./codec.js";

const DERIVE = Object.freeze({
  filter: deriveFilteredRows, sort: deriveSortedRows, computed: deriveComputedRows,
  complete: deriveCompleteRows, fold: deriveFoldRows, flatten: deriveFlattenRows,
  timeUnit: deriveTimeUnitRows, stack: deriveStackRows, summary: deriveSummaryRows,
  window: deriveWindowRows, normalize: deriveNormalizedRows, impute: deriveImputedRows,
  boxSummary: (rows, transform) => deriveBoxData(rows, transform).summaries,
  boxOutlier: (rows, transform) => deriveBoxData(rows, transform).outliers,
  density: deriveKernelDensity, ecdf: deriveECDF, gradientProfile: deriveGradientProfiles,
  horizon: deriveHorizon, interval: deriveInterval, regression: deriveRegression,
  bin: deriveBinRows, bin2d: deriveBin2DRows
});

// Validation computes expected values without replaying actions or replacing the
// saved values/graphics. Legacy correspondence must be proven, never repaired.
export function validateLegacyValues(dataset, source, context) {
  const transform = dataset.transform[0];
  let result;
  if (transform.type === "markFilter") {
    if (context.indices === undefined) throw invalidSnapshot("Legacy filtered rows require explicit saved provenance.", "payload.semanticSpec.datasets");
    result = context.indices.map(index => source.values[index]);
  } else if (transform.type === "lookup") result = deriveLookupRows(source.values, context.lookup.values, transform);
  else if (transform.type === "regressionStatistics") result = regressionStatisticsRows(context.regressionFit, source);
  else if (transform.type === "statisticalReference") result = context.referenceValues;
  else result = DERIVE[transform.type]?.(source.values, transform);
  const values = Array.isArray(result) ? result : result?.values;
  if (values === undefined || canonicalJSON(encodeValue(values)) !== canonicalJSON(encodeValue(dataset.values))) {
    throw invalidSnapshot(`Legacy ${transform.type} values do not match their saved inputs.`, "payload.semanticSpec.datasets");
  }
}
