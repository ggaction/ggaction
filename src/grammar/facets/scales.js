import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { resolveHistogramBins } from "../histogram.js";
import {
  hasOrdinalDomain,
  isDiscretizedColorScaleType,
  validateCompleteScaleType
} from "../scales/types.js";

export const FACET_SCALE_CHANNELS = Object.freeze([
  "x",
  "y",
  "xOffset",
  "color",
  "size",
  "shape",
  "opacity",
  "strokeDash"
]);

const RESOLUTION_VALUES = new Set(["shared", "independent"]);

function requireScaleDefinitions(semanticSpec) {
  if (!isPlainObject(semanticSpec)) {
    throw new TypeError("Facet scale resolution requires a semantic spec.");
  }
  if (!Array.isArray(semanticSpec.layers) || semanticSpec.layers.length === 0) {
    throw new Error("Facet scale resolution requires at least one layer.");
  }
  if (!Array.isArray(semanticSpec.scales)) {
    throw new Error("Facet scale resolution requires semantic scales.");
  }
  const scales = new Map();
  for (const scale of semanticSpec.scales) {
    if (!isPlainObject(scale) || typeof scale.id !== "string") {
      throw new TypeError("Facet semantic scales require string ids.");
    }
    if (scales.has(scale.id)) {
      throw new Error(`Facet semantic scale id "${scale.id}" is duplicated.`);
    }
    validateCompleteScaleType(scale.type);
    scales.set(scale.id, scale);
  }
  return scales;
}

function normalizeRequestedPolicies(requested) {
  if (!isPlainObject(requested)) {
    throw new TypeError("Facet scales must be a plain object.");
  }
  const unknown = Object.keys(requested).find(
    key => !FACET_SCALE_CHANNELS.includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(`Unknown facet scale channel "${unknown}".`);
  }
  const normalized = {};
  for (const channel of FACET_SCALE_CHANNELS) {
    const policy = requested[channel] ?? "shared";
    if (!RESOLUTION_VALUES.has(policy)) {
      throw new Error(
        `Facet scale channel "${channel}" must be shared or independent.`
      );
    }
    normalized[channel] = policy;
  }
  return normalized;
}

function usedScaleChannels(semanticSpec, scales) {
  const used = new Map();
  for (const layer of semanticSpec.layers) {
    for (const channel of FACET_SCALE_CHANNELS) {
      const id = layer.encoding?.[channel]?.scale;
      if (id === undefined) continue;
      if (!scales.has(id)) {
        throw new Error(
          `Facet layer "${layer.id}" references missing scale "${id}".`
        );
      }
      if (!used.has(id)) used.set(id, new Set());
      used.get(id).add(channel);
    }
  }
  return used;
}

export function normalizeFacetScalePolicies(semanticSpec, requested = {}) {
  const scales = requireScaleDefinitions(semanticSpec);
  const channels = normalizeRequestedPolicies(requested);
  const used = usedScaleChannels(semanticSpec, scales);
  const scalePolicies = {};
  for (const [id, channelSet] of used) {
    const attached = [...channelSet];
    const policies = [...new Set(attached.map(channel => channels[channel]))];
    if (policies.length !== 1) {
      throw new Error(
        `Facet scale "${id}" has conflicting channel policies for ${attached.join(", ")}.`
      );
    }
    scalePolicies[id] = {
      policy: policies[0],
      channels: attached
    };
  }
  return cloneAndFreeze({ channels, scales: scalePolicies });
}

function requireChildDomains(resolvedByChild, scaleId) {
  if (!isPlainObject(resolvedByChild) || Object.keys(resolvedByChild).length === 0) {
    throw new Error("Facet scale domains require at least one resolved child.");
  }
  return Object.fromEntries(Object.entries(resolvedByChild).map(([childId, scales]) => {
    const domain = scales?.[scaleId]?.domain;
    if (!Array.isArray(domain) || domain.length === 0) {
      throw new Error(
        `Facet child "${childId}" is missing resolved domain for scale "${scaleId}".`
      );
    }
    return [childId, domain];
  }));
}

function continuousUnion(domains, id) {
  if (!domains.every(domain =>
    domain.length === 2 && domain.every(Number.isFinite)
  )) {
    throw new TypeError(`Facet shared scale "${id}" requires finite pair domains.`);
  }
  return [
    Math.min(...domains.map(domain => Math.min(...domain))),
    Math.max(...domains.map(domain => Math.max(...domain)))
  ];
}

function stableUnion(domains) {
  const output = [];
  for (const domain of domains) {
    for (const value of domain) {
      if (!output.some(candidate => Object.is(candidate, value))) output.push(value);
    }
  }
  return output;
}

function sharedAutoDomain(scale, domains) {
  if (hasOrdinalDomain(scale.type)) return stableUnion(domains);
  if (scale.type === "quantile") {
    const merged = domains.flat();
    if (!merged.every(Number.isFinite)) {
      throw new TypeError(
        `Facet shared quantile scale "${scale.id}" requires finite sample domains.`
      );
    }
    return merged;
  }
  if (isDiscretizedColorScaleType(scale.type) && scale.type === "threshold") {
    throw new Error(`Facet threshold scale "${scale.id}" requires an explicit domain.`);
  }
  return continuousUnion(domains, scale.id);
}

export function resolveFacetScaleDomains(
  semanticSpec,
  resolvedByChild,
  requested = {}
) {
  const scales = requireScaleDefinitions(semanticSpec);
  const normalized = normalizeFacetScalePolicies(semanticSpec, requested);
  const resolved = {};
  for (const [id, scalePolicy] of Object.entries(normalized.scales)) {
    const scale = scales.get(id);
    const observed = requireChildDomains(resolvedByChild, id);
    const childIds = Object.keys(observed);
    const explicit = scale.domain !== "auto";
    if (scalePolicy.policy === "independent") {
      resolved[id] = {
        ...scalePolicy,
        childDomains: Object.fromEntries(childIds.map(childId => [
          childId,
          explicit ? scale.domain : observed[childId]
        ]))
      };
      continue;
    }
    const domain = explicit
      ? scale.domain
      : sharedAutoDomain(scale, Object.values(observed));
    resolved[id] = {
      ...scalePolicy,
      domain,
      childDomains: Object.fromEntries(childIds.map(childId => [childId, domain]))
    };
  }
  return cloneAndFreeze({
    channels: normalized.channels,
    scales: resolved
  });
}

export function resolveFacetHistogramBoundaries({
  policy = "shared",
  valuesByChild,
  bin,
  domain = "auto",
  nice = true,
  zero = false
} = {}) {
  if (!RESOLUTION_VALUES.has(policy)) {
    throw new Error("Facet histogram policy must be shared or independent.");
  }
  if (!isPlainObject(valuesByChild) || Object.keys(valuesByChild).length === 0) {
    throw new Error("Facet histogram boundaries require child values.");
  }
  const entries = Object.entries(valuesByChild);
  for (const [id, values] of entries) {
    if (!Array.isArray(values) || values.length === 0 || !values.every(Number.isFinite)) {
      throw new TypeError(`Facet histogram child "${id}" requires finite values.`);
    }
  }
  if (policy === "shared") {
    const boundaries = resolveHistogramBins({
      values: entries.flatMap(([, values]) => values),
      bin,
      domain,
      nice,
      zero
    }).boundaries;
    return cloneAndFreeze({
      policy,
      childBoundaries: Object.fromEntries(entries.map(([id]) => [id, boundaries]))
    });
  }
  return cloneAndFreeze({
    policy,
    childBoundaries: Object.fromEntries(entries.map(([id, values]) => [
      id,
      resolveHistogramBins({ values, bin, domain, nice, zero }).boundaries
    ]))
  });
}

