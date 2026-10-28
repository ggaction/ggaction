import { validateConditionalDependencies } from "../materialization/resourceState.js";
import { resolveFilterEnvironment } from "../materialization/expressionInputs.js";
import { validateLegacyPathCommands } from "../grammar/pathCommands.js";
import { validateGraphicIdentity } from "../grammar/schemas/graphicIdentity.js";
import { validateLegendOverflow } from "../grammar/legendOverflow.js";
import { normalizeTextOverrides } from "../grammar/text.js";
import { normalizeLegendDisplayLabelMap } from "../grammar/displayLabels.js";
import { validateFacetAxisPolicy } from "../core/facetAxisPolicy.js";
import { resolveFacetFamily } from "../grammar/facets/dependencies.js";
import { validateRegressionPlacement } from "../grammar/regression/parameters.js";
import { validateGraphicClip } from "../grammar/schemas/graphicClip.js";
import { validatePointShape } from "../grammar/pointShapes.js";
import {deriveLookupRows,sameLookupValue} from "../grammar/lookup.js";
import {deriveTransformSchema,datasetSchemaContext,assertFieldsAvailable,transformInputFields} from "../grammar/datasetSchema.js";
import {orderedDatasetAncestors} from "../grammar/datasetDependencies.js";
import {validateLegendSpacing} from "../grammar/legendSpacing.js";
import { requestedMarkClip, validateMarkClipCoordinate } from "../selectors/markClip.js";
import { validateAuthoredFacetLegend } from "../grammar/facets/legendIntent.js";
import { validateFacetHeaderRotations } from "../grammar/facetHeaders.js";
import { AXIS_RESOURCE_CHANNELS } from "../core/vocabulary.js";
import { cartesianAxisOwners, assertCartesianAxisSideAvailable } from "../selectors/axes.js";
import { axisGraphicIds } from "../selectors/axes.js";



import {findLayer} from '../selectors/layers.js';
import {findCoordinate} from '../selectors/coordinates.js';
import {resolveColorSizeMapping,normalizeColorSizeSymbol,colorSizeChannels,validateColorSizeShapeSamples} from '../grammar/colorSizeLegend.js';
import{validateLegendClip}from"../grammar/legendClip.js";
import {validateLegendLayerOpacity}from"../grammar/legendOpacity.js";
import { isSizeShapeChannels, resolveSizeShapeMapping } from "../grammar/legendCombinations.js";
import { describeLegendBlock, validateLegendChannels } from "../grammar/legendBlocks.js";
import { localLegendPosition } from "../grammar/legendGroups.js";
import { normalizeLegendBorderDash } from "../grammar/legendBorder.js";
import { validateGraphicItemLimit } from "../core/validation.js";
import { LEGEND_TITLE_STYLE_KEYS, validateLegendTitleAlignment } from "../grammar/legendTitleStyle.js";
import { validateGuideDash, normalizeGuideDashMap } from "../grammar/guideDash.js";
import { validateAxisLabelFlushThreshold, validateAxisTextPlacement,
  axisLabelHasText } from "../grammar/axisTextPlacement.js";
import { validateTickSelectionRounding, axisTickSelection } from "../grammar/ticks.js";
import { validateAreaPaintConfig } from "../grammar/areaPaint.js";
import { validateOptionObject, validateKeys, validatePositiveFinite, validateNonNegativeFinite, validateNonEmptyString, validateGeneratedItemLimit } from "../core/validation.js";
import { validateRegressionFitStatistics, requireRegressionStatisticsSource, regressionStatisticsRows } from "../grammar/regression/statistics.js";
import { resolveGraphicItemCapacity } from "../selectors/graphicCapacity.js";
import { isContinuousColorScaleType } from "../grammar/scales/types.js";
import { validateTickColorChannels } from "../grammar/scales/colorConsumers.js";
import { normalizeColorInterpolationOptions } from "../grammar/scales/color.js";
import { normalizeTransformParameters } from "../grammar/scales/transformed.js";
import { validateLegendGroupState } from "../grammar/legendGroups.js";
import { normalizeGradientDirection, validateLegendGradient } from "../grammar/legendGradient.js";
import { normalizeTextMetricProfile } from "../core/textMetricProfile.js";
import { resolveTextOffsetDataset } from "../grammar/text.js";
import { isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { collectAllResourceReferences } from "../core/resourceReferences.js";
import { requiredTraceExtension } from "../core/extensionRegistry.js";
import { resolveDatasetReference } from "../selectors/datasets.js";
import { normalizeMarkSelector, validateRowSelectionDataset } from "../grammar/markSelection.js";
import { highlightTargets } from "../selectors/selectionTargets.js";
import { parseSemanticPath } from "../grammar/schemas/semanticPath.js";
import { validateStoredSemanticValue } from "../actions/primitives/semantic.js";
import { validateGraphicType, isGraphicContainerType } from "../grammar/schemas/graphic.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { invalidSnapshot } from "./codec.js";
import { DATA_IDENTITY_FIELDS, validateSourceIdentity } from "../core/itemIdentity.js";
import { validateDatasetLineage } from "../grammar/rowLineage.js";
import { validateResourceGraph } from "../materialization/resourceState.js";
import { validateDataSourceState } from "../materialization/dataSourceState.js";
import { resolveComputedEnvironment } from "../materialization/expressionInputs.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { storedSelectionSelector } from "../selectors/selectionResources.js";
import { requireStoredResource, resolveGraphicLineage } from "../selectors/resources.js";

export const STATE_KEYS = Object.freeze([
  "semanticSpec", "graphicSpec", "resolvedScales", "materializationConfigs",
  "children", "compositionSpec", "context", "trace", "actionStack"
]);

function validateStoredColorLegendSampling(program, config, path) {
  requireObject(config.sampling, path);
  const sample = config.sampling;
  exactKeys(sample, sample.mode === "values" ? ["mode", "values", "count"] : ["mode", "count"], path);
  if (!["auto", "values"].includes(sample.mode)) throw invalidSnapshot("Invalid color legend sample mode.", path);
  if (!Number.isInteger(sample.count) || sample.count < 2) throw invalidSnapshot("Invalid color legend sample count.", path);
  validateGeneratedItemLimit(sample.count, "Color legend sample count");
  const scale = program.resolvedScales[config.scale];
  if (!isContinuousColorScaleType(scale?.type)) throw invalidSnapshot("Sampled color legend requires a continuous color scale.", path);
  if (sample.mode === "values") {
    requireArray(sample.values, path);
    if (!sample.values.length || sample.values.length > 100 || sample.values.some((value, index) => !Number.isFinite(value) || index > 0 && value <= sample.values[index - 1] || value < Math.min(...scale.domain) || value > Math.max(...scale.domain) || scale.type === "log" && value <= 0)) throw invalidSnapshot("Invalid exact color legend samples.", path);
  }
}

export function requireObject(value, path) {
  if (!isPlainObject(value)) throw invalidSnapshot(`${path} must be a plain object.`, path);
}

export function exactKeys(value, keys, path) {
  requireObject(value, path);
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw invalidSnapshot(`${path} must contain exactly: ${keys.join(", ")}.`, path);
  }
}

function requireArray(value, path) {
  if (!Array.isArray(value) || Array.from({ length: value.length }, (_, i) => i).some(i => !Object.hasOwn(value, i))) {
    throw invalidSnapshot(`${path} must be a dense array.`, path);
  }
}

export function validateGraphic(graphic, path = "payload.graphicSpec", { legacy = false } = {}) {
  const validateProperties = (type, properties) => {
    validateConcreteGraphicProperties(type, properties);
    if (legacy && Object.hasOwn(properties, "fillRule")) throw invalidSnapshot("Path fillRule requires editable snapshot version 4.", path);
    if (legacy && properties.commands !== undefined) validateLegacyPathCommands(properties.commands);
  };
  exactKeys(graphic, ["objects", "order"], path);
  requireObject(graphic.objects, `${path}.objects`);
  requireArray(graphic.order, `${path}.order`);
  const ids = new Set(Object.keys(graphic.objects));
  function attachment(id) {
    if (typeof id !== "string" || !Object.hasOwn(graphic.objects, id)) {
      throw invalidSnapshot(`Unknown graphic attachment "${String(id)}".`, path);
    }
  }
  for (const [id, object] of Object.entries(graphic.objects)) {
    if (!id.length) throw invalidSnapshot("Graphic IDs must be non-empty.", path);
    requireObject(object, `${path}.objects.${id}`);
    validateGraphicType(object.type);
    if (Object.keys(object).some(key => !["type", "properties", "items", "children", "clip"].includes(key))) {
      throw invalidSnapshot(`Unknown graphic member at ${id}.`, path);
    }
    if (object.clip !== undefined) {
      if (legacy && object.clip.type === "path") throw invalidSnapshot("Path clip requires editable snapshot version 4.", path);
      validateGraphicClip(object.clip, object.type);
    }
    if (object.properties !== undefined) validateProperties(object.type, object.properties);
    if (object.items !== undefined) {
      if (object.type === "canvas" || object.properties !== undefined) throw invalidSnapshot(`Invalid item owner "${id}".`, path);
      requireArray(object.items, `${path}.objects.${id}.items`);
      for (const item of object.items) {
        exactKeys(item, [...(object.type === "collection" ? ["id", "type", "properties"] : ["id", "properties"]), ...(item.identity === undefined ? [] : ["identity"])], path);
        if (item.identity !== undefined) validateGraphicIdentity(item.identity);
        if (typeof item.id !== "string" || !item.id.length || ids.has(item.id)) throw invalidSnapshot(`Duplicate or invalid graphic item ID "${item.id}".`, path);
        ids.add(item.id);
        const type = item.type ?? object.type;
        validateGraphicType(type);
        if (isGraphicContainerType(type)) throw invalidSnapshot("Graphic items must be primitive drawables.", path);
        validateProperties(type, item.properties);
      }
    } else if (object.properties === undefined) {
      throw invalidSnapshot(`Graphic "${id}" requires properties or items.`, path);
    }
    if (object.children !== undefined) {
      if (!isGraphicContainerType(object.type)) throw invalidSnapshot(`Graphic "${id}" cannot own children.`, path);
      requireArray(object.children, `${path}.objects.${id}.children`);
      object.children.forEach(attachment);
    }
  }
  graphic.order.forEach(attachment);
  walkGraphicTreeEvents(graphic, {});
}

export function validateTrace(trace, ProgramClass, extensions, path = "payload.trace") {
  const seen = new Set();
  function visit(node, root) {
    exactKeys(node, ["id", "op", "description", "args", "children"], path);
    if (typeof node.description !== "string" || typeof node.op !== "string" ||
        (root ? node.id !== "program" || node.op !== "program" : !/^a[1-9]\d*$/.test(node.id) || node.op === "program") || seen.has(node.id)) {
      throw invalidSnapshot(`Invalid or duplicate trace node "${node.id}".`, path);
    }
    seen.add(node.id);
    requireObject(node.args, `${path}.args`);
    requireArray(node.children, `${path}.children`);
    const extension = requiredTraceExtension(ProgramClass, node.op);
    if (extension !== undefined) extensions.add(extension);
    node.children.forEach(child => visit(child, false));
  }
  visit(trace, true);
  // The constructor derives the next action number from the node count.
  for (let index = 1; index < seen.size; index++) {
    if (!seen.has(`a${index}`)) throw invalidSnapshot("Trace action IDs must be consecutive.", path);
  }
}

function validateSemanticProperties(program, value, property) {
  let parsed;
  try { parsed = parseSemanticPath(property); } catch (error) {
    if (!isPlainObject(value) || !Object.keys(value).length) throw error;
    for (const [key, child] of Object.entries(value)) validateSemanticProperties(program, child, `${property}.${key}`);
    return;
  }
  const leaf = parsed.path.at(-1);
  if (["data", "coordinate", "scale"].includes(leaf)) validateUserId(value, property);
  if (leaf === "field" && (typeof value !== "string" || value.length === 0)) throw invalidSnapshot(`Invalid field at ${property}.`, property);
  validateStoredSemanticValue(program, parsed, value);
}

export function validateProgramState(program, path, { allowMissingLookupSchemas = false, legacy = false } = {}) {
  const semantic = program.semanticSpec;
  exactKeys(semantic, ["datasets", "layers", "scales", "coordinates", "guides", "title", ...(legacy ? [] : ["resources"])], `${path}.semanticSpec`);
  if (!legacy) validateDatasetLineage(semantic.datasets);
  if (!legacy) validateResourceGraph(program);
  if (!legacy) validateDataSourceState(program);
  for (const dataset of semantic.datasets) {
    if (legacy && dataset.sourceReceipt !== undefined) throw invalidSnapshot("Data source receipts require editable snapshot version 4.", path);
    for (const transform of dataset.transform ?? []) {
      if (transform.type === "filter" && transform.where !== undefined) {
        if (legacy) throw invalidSnapshot("Expression filters require editable snapshot version 4.", path);
        resolveFilterEnvironment(program, resolveDatasetReference(program, dataset.source), transform);
      }
      if (transform.type !== "computed" || transform.expression?.version !== 2) continue;
      if (legacy) throw invalidSnapshot("Computed v2 requires editable snapshot version 4.", path);
      const source = resolveDatasetReference(program, dataset.source);
      resolveComputedEnvironment(program, source, transform);
      if (dataset.values !== undefined) {
        const report = program.materializationConfigs.calculations?.datasets?.[dataset.id];
        const reportPath = `${path}.materializationConfigs.calculations.datasets.${dataset.id}`;
        exactKeys(report, ["algorithm", "registry", "evaluatedRows", "missingRows", "counts", "parameterInputs", "owner", "inputs"], reportPath);
        if (report.algorithm !== "expression@2" || report.registry !== "standard@1" ||
            report.evaluatedRows !== source.values?.length || report.evaluatedRows !== dataset.values.length ||
            report.missingRows !== dataset.values.filter(row => row[transform.as] === undefined).length ||
            canonicalJSON(report.parameterInputs) !== canonicalJSON(transform.parameterInputs) ||
            canonicalJSON(report.owner) !== canonicalJSON({ kind: "data", id: dataset.id }) ||
            canonicalJSON(report.inputs) !== canonicalJSON([{ kind: "data", id: source.id }])) {
          throw invalidSnapshot("Computed diagnostics must match their dataset and parameter inputs.", reportPath);
        }
        const countKeys = ["divideByZero", "domain", "nonFinite", "dateRange", "arrayBounds"];
        exactKeys(report.counts, countKeys, `${reportPath}.counts`);
        for (const key of countKeys) {
          if (!Number.isSafeInteger(report.counts[key]) || report.counts[key] < 0) {
            throw invalidSnapshot("Computed diagnostic counts must be nonnegative integers.", reportPath);
          }
        }
      }
    }
  }
  const resources = new Map();
  for (const [collection, kind, referenceKind] of [
    ["datasets", "dataset", "data"], ["layers", "layer", "mark"],
    ["scales", "scale", "scale"], ["coordinates", "coordinate", "coordinate"]
  ]) {
    requireArray(semantic[collection], `${path}.semanticSpec.${collection}`);
    const entries = new Map();
    for (const resource of semantic[collection]) {
      requireObject(resource, `${path}.semanticSpec.${collection}`);
      validateUserId(resource.id, `${kind} id`);
      if (entries.has(resource.id)) throw invalidSnapshot(`Duplicate ${kind} "${resource.id}".`, path);
      entries.set(resource.id, resource);
    }
    resources.set(referenceKind, entries);
    for (const resource of entries.values()) {
      if (kind === "dataset" && !legacy && resource.source === undefined && Array.isArray(resource.values)) {
        validateSourceIdentity(resource);
      }
      if (kind === "layer") validateTickColorChannels(resource);
      if (kind === "layer" && ["dx", "dy"].some(channel => resource.encoding?.[channel] !== undefined)) {
        const dataset = semantic.datasets.find(item => item.id === resource.data);
        if (dataset === undefined) throw new Error("Numeric text offsets require an existing dataset.");
        resolveTextOffsetDataset(resource, dataset);
      }
      if (kind === "scale") {
        normalizeColorInterpolationOptions(resource.interpolate, resource);
        if (resource.type === "pow") normalizeTransformParameters("pow", {
          ...(resource.exponent === undefined ? {} : {exponent:resource.exponent})
        });
      }
      for (const [key, value] of Object.entries(resource)) {
        if (kind === "dataset" && !legacy && DATA_IDENTITY_FIELDS.includes(key)) continue;
        if (key !== "id") validateSemanticProperties(program, value, `${kind}[${resource.id}].${key}`);
      }
    }
  }
  for (const [key, prefix] of [["guides", "guide"], ["title", "title"]]) {
    requireObject(semantic[key], `${path}.semanticSpec.${key}`);
    for (const [name, value] of Object.entries(semantic[key])) validateSemanticProperties(program, value, `${prefix}.${name}`);
  }
  for (const key of ["resolvedScales", "materializationConfigs", "context"]) requireObject(program[key], `${path}.${key}`);
  for (const key of ["marks", "guides"]) requireObject(program.materializationConfigs[key], `${path}.materializationConfigs.${key}`);
  if (program.compositionSpec?.type === "facet" && isPlainObject(program.compositionSpec.facet.guides.legend)) {
    validateAuthoredFacetLegend(program, program.compositionSpec.facet.guides.legend);
  }
  if (program.compositionSpec?.type === "facet") {
    validateFacetAxisPolicy(program.compositionSpec.facet.guides.axes,
      resolveFacetFamily(program.semanticSpec).family, program.compositionSpec.facet.repeat !== undefined);
    const headers = program.materializationConfigs.facets?.[program.compositionSpec.id]?.headers;
    if (headers !== undefined) validateFacetHeaderRotations(headers);
    if (headers?.row?.title !== undefined && program.compositionSpec.facet.grid === undefined) {
      throw new TypeError("Facet row field title requires a row-column facet grid.");
    }
  }
  validateGuideVisibilityState(program);
  if (program.materializationConfigs.textMetrics !== undefined) normalizeTextMetricProfile(program.materializationConfigs.textMetrics);
  for (const config of [
    ...Object.values(program.guideConfigs.axis ?? {}).map(axis => axis.ticks),
    ...["horizontal", "vertical"].map(direction => program.guideConfigs.grid?.[direction])
  ]) {
    if (config?.strokeDash !== undefined) validateGuideDash(config.strokeDash);
    if (config?.strokeDashMap !== undefined) normalizeGuideDashMap(config.strokeDashMap, { reset: false });
  }
  const cartesianOwners = cartesianAxisOwners(program);
  for (const [id, axis] of Object.entries(program.guideConfigs.axis ?? {})) {
    if (isPlainObject(axis?.title?.offset)) {
      if (!cartesianOwners.some(owner => owner.id === id)) throw invalidSnapshot("Relative title offset requires a Cartesian axis owner.", path);
      validateAxisTextPlacement(axis.title, { title: true });
      if (axis.title.inferredOffset === true) throw invalidSnapshot("Relative title offset cannot be inferred.", path);
      const owner = cartesianOwners.find(owner => owner.id === id);
      const labels = program.graphicSpec.objects[axisGraphicIds(owner.channel, id)[2]];
      // Composition parents retain source intent, not local unit graphics.
      // Their retained unit/children are validated through the same unit rule.
      if (axis.labels?.position !== axis.title.position || (program.compositionSpec === undefined &&
          !(labels?.items ?? (labels ? [labels] : [])).some(item => axisLabelHasText(item.properties)))) {
        throw invalidSnapshot("Relative title offset requires nonempty same-side labels.", path);
      }
    }
    if (axis?.labels?.flushThreshold !== undefined) {
      if (!cartesianOwners.some(owner => owner.id === id)) throw invalidSnapshot("Label flushThreshold requires a Cartesian axis owner.", path);
      validateAxisLabelFlushThreshold(axis.labels.flushThreshold);
    }
    for (const config of [axis?.ticks, axis?.labels]) {
      if (config === undefined || !Object.hasOwn(config, "rounding")) continue;
      if (!cartesianOwners.some(owner => owner.id === id)) {
        throw invalidSnapshot("Tick rounding requires a Cartesian axis owner.", path);
      }
      validateTickSelectionRounding(config, program.resolvedScales[config.scale]?.type);
    }
  }
  for (const owner of cartesianOwners) {
    const channel = owner.id;
    const axis = owner.config;
    if (axis?.ticks && axis?.labels &&
        (Object.hasOwn(axis.ticks, "rounding") || Object.hasOwn(axis.labels, "rounding")) &&
        JSON.stringify(axisTickSelection(axis.ticks)) !== JSON.stringify(axisTickSelection(axis.labels))) {
      throw invalidSnapshot("Stored tick rounding conflicts with axis labels.", path);
    }
    if (axis?.frame !== undefined) {
      validateOptionObject(axis.frame, ["offset", "underlay"], `Stored axis "${channel}" frame`, { allowEmpty: false });
      if (Object.hasOwn(axis.frame, "offset")) validateNonNegativeFinite(axis.frame.offset, "Axis frame offset");
      if (Object.hasOwn(axis.frame, "underlay") && axis.frame.underlay !== true) {
        throw new Error("Stored axis underlay must be canonical true intent.");
      }
    }
    if (axis?.labels !== undefined) validateAxisTextPlacement(axis.labels);
    if (axis?.title !== undefined) validateAxisTextPlacement(axis.title, { title: true });
  }
  for (const config of Object.values(program.guideConfigs.grid ?? {})) {
    if (!Object.hasOwn(config, "rounding")) continue;
    validateTickSelectionRounding(config, program.resolvedScales[config.scale]?.type);
    const owners = cartesianOwners.map(owner => owner.config?.ticks)
      .filter(ticks => ticks?.scale === config.scale);
    if (config.inferredValues !== true || config.rounding !== "nearest" || owners.length === 0 ||
        owners.some(ticks => JSON.stringify(axisTickSelection(ticks)) !== JSON.stringify(axisTickSelection(config)))) {
      throw invalidSnapshot("Stored grid rounding requires its matching inferred tick policy.", path);
    }
  }
  const border = program.materializationConfigs.canvas?.plotBorder;
  if (isPlainObject(border) && Object.hasOwn(border, "underlay") && border.underlay !== true) {
    throw new Error("Stored plot border underlay must be canonical true intent.");
  }
  for (const id of Object.keys(program.guideConfigs.axis ?? {})) {
    const config = program.guideConfigs.axis[id];
    if (config?.frame !== undefined && Object.hasOwn(config.frame, "underlay") &&
        !cartesianOwners.some(owner => owner.id === id)) {
      throw new Error("Stored axis underlay requires a Cartesian axis owner.");
    }
    if (!AXIS_RESOURCE_CHANNELS.includes(id) && !Object.hasOwn(program.semanticSpec.guides.axis ?? {}, id)) {
      throw invalidSnapshot("Named axis configs require their semantic owner.", path);
    }
  }
  for (const [id, semanticAxis] of Object.entries(program.semanticSpec.guides.axis ?? {})) {
    if (AXIS_RESOURCE_CHANNELS.includes(id)) continue;
    validateUserId(id, "Axis id");
    validateKeys(semanticAxis, ["channel", "position", "scale", "coordinate", "title"], "Stored named axis");
    if (!["x", "y"].includes(semanticAxis.channel) ||
        !(semanticAxis.channel === "x" ? ["bottom", "top"] : ["left", "right"]).includes(semanticAxis.position)) {
      throw invalidSnapshot("Named axes require a Cartesian channel and compatible physical side.", path);
    }
    validateUserId(semanticAxis.scale, "Axis scale id");
    validateUserId(semanticAxis.coordinate, "Axis coordinate id");
    if (resources.get("coordinate").get(semanticAxis.coordinate)?.type !== "cartesian") {
      throw invalidSnapshot("Named Cartesian axes require a Cartesian coordinate.", path);
    }
    const config = program.guideConfigs.axis?.[id];
    requireObject(config, `${path}.guides.axis.${id}`);
    validateKeys(config, ["binding", "frame", "line", "ticks", "labels", "title", "visibility"], "Stored named axis config");
    const components = ["line", "ticks", "labels", "title"];
    if (!components.some(component => config[component] !== undefined)) {
      throw invalidSnapshot("Named axes require at least one retained component.", path);
    }
    for (const [index, component] of components.entries()) {
      const stored = config[component];
      const graphic = program.graphicSpec.objects[axisGraphicIds(semanticAxis.channel, id)[index]];
      if ((program.compositionSpec === undefined && (stored !== undefined) !== (graphic !== undefined)) ||
          (stored !== undefined && (stored.position !== semanticAxis.position ||
            stored.scale !== undefined && stored.scale !== semanticAxis.scale))) {
        throw invalidSnapshot("Named axis components must share their owner's side and scale.", path);
      }
    }
    if ((semanticAxis.title !== undefined) !== (config.title !== undefined)) {
      throw invalidSnapshot("Named axis title meaning requires its retained title component.", path);
    }
    assertCartesianAxisSideAvailable(program, { id, channel: semanticAxis.channel,
      coordinate: semanticAxis.coordinate, position: semanticAxis.position });
  }
  if (program.guideConfigs.legendGroups !== undefined) validateLegendGroupState(program.guideConfigs.legendGroups);
  if (program.guideConfigs.suppressedLegends !== undefined) {
    requireObject(program.guideConfigs.suppressedLegends, `${path}.materializationConfigs.guides.suppressedLegends`);
    for (const [target, config] of Object.entries(program.guideConfigs.suppressedLegends)) {
      validateUserId(target, "Suppressed legend target");
      requireObject(config, `${path}.materializationConfigs.guides.suppressedLegends.${target}`);
      if (!semantic.layers.some(layer => layer.id === target) || Object.keys(config).some(key => key !== "channels")) {
        throw invalidSnapshot("Suppressed legend requires an existing mark and channel selection.", path);
      }
      validateLegendChannels(config.channels, "Suppressed legend");
    }
  }
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    validateLegendOverflow(kind, config);
    validateLegendClip(kind,config);
    for (const [key, override] of Object.entries(config.blockOverrides ?? {})) {
      if (override.labelMap !== undefined) {
        const descriptor = describeLegendBlock(program, kind, config);
        if (key !== descriptor.key) throw invalidSnapshot("Display labels require their existing legend block owner.", path);
        normalizeLegendDisplayLabelMap(descriptor, override.labelMap, program.resolvedScales[descriptor.scaleIds[0]]?.type);
      }
    }
    validateLegendSpacing(kind,config);
    if (localLegendPosition(config) !== undefined) {
      const descriptor = describeLegendBlock(program, kind, config);
      for (const [key, override] of Object.entries(config.blockOverrides)) {
        if ((override.position !== undefined || override.alongOffset !== undefined) && key !== descriptor.key) throw invalidSnapshot("Local position requires its existing block owner.", path);
      }
    }
    for(const layer of config.symbol?.layers??[])validateLegendLayerOpacity(layer.opacity);
    if(kind==='colorSize') {
      if(!['color-size','color-size-shape'].includes(config.combine))throw invalidSnapshot('Color-size legend requires its combined owner.',path);
      const layer=findLayer(program,config.target);
      const mapping=resolveColorSizeMapping({layer,scales:program.resolvedScales,pointConfig:program.markConfigs[layer?.id],coordinate:findCoordinate(program,layer?.coordinate),combine:config.combine,channels:colorSizeChannels(config)});
      for(const key of ['target','field','fieldType','colorScale','sizeScale','shapeScale','colorChannel','domain'])if(JSON.stringify(config[key])!==JSON.stringify(mapping[key]))throw invalidSnapshot('Stale color-size mapping.',path);
      const guide=semantic.guides.legend?.colorSize;
      if(guide?.colorScale!==mapping.colorScale||guide?.sizeScale!==mapping.sizeScale||guide.title!==config.title||guide.shapeScale!==mapping.shapeScale||guide.colorChannel!==mapping.colorChannel)throw invalidSnapshot('Stale color-size semantic owner.',path);
      requireObject(config.symbol,path);normalizeColorSizeSymbol(config.symbol,undefined,config);
      if(config.symbol.type!=='point'||config.combine==='color-size'&&(!Object.hasOwn(config.symbol,'strokeWidth')||!Object.hasOwn(config.symbol,'opacity')))throw invalidSnapshot('Color-size symbol requires point type.',path);
      const sample=config.sampling;requireObject(sample,path);
      exactKeys(sample,sample.mode==='values'?['mode','count','values']:['mode','count'],path);
      if(!['auto','values'].includes(sample.mode)||!Number.isInteger(sample.count)||sample.count<2)throw invalidSnapshot('Invalid color-size samples.',path);
      validateGeneratedItemLimit(sample.count,'Color-size samples');
      if(config.combine==='color-size-shape')validateColorSizeShapeSamples(sample,program.resolvedScales[mapping.colorScale]);
      else if(sample.mode==='values'){
        requireArray(sample.values,path);
        if(!sample.values.length||sample.values.length>100||sample.values.some((v,i)=>!Number.isFinite(v)||i>0&&v<=sample.values[i-1]||v<Math.min(...mapping.domain)||v>Math.max(...mapping.domain)||[mapping.colorScale,mapping.sizeScale].some(id=>program.resolvedScales[id].type==='log'&&v<=0)))throw invalidSnapshot('Invalid exact color-size samples.',path);
      }
    } else if (config.combine !== undefined) {
      if (config.combine !== "size-shape" || kind !== "series" || !isSizeShapeChannels(config.channels)) throw invalidSnapshot("Invalid combined legend owner.", path);
      const layer = semantic.layers.find(layer=>layer.id===config.target);
      const definition = resolveSizeShapeMapping({layer,scales:program.resolvedScales,
        order:semantic.guides.legend?.series?.order,rows:resolveDatasetReference(program,layer.data).values});
      if (!Array.isArray(config.sizeAreas) || config.sizeAreas.length !== definition.sizeAreas.length ||
          config.sizeAreas.some((area,index)=>!Object.is(area,definition.sizeAreas[index]))) throw invalidSnapshot("Stale combined legend size mapping.", path);
    }
    if (config.gradientDirection !== undefined) {
      if (!["gradient", "strokeGradient"].includes(kind)) throw invalidSnapshot("Gradient direction requires a gradient owner.", path);
      normalizeGradientDirection(config.gradientDirection, "Stored gradient direction");
    }
    if (["gradient", "strokeGradient"].includes(kind) && config.representation !== "symbols" && !["top", "bottom"].includes(config.titlePosition)) {
      throw invalidSnapshot("Gradient titlePosition requires top or bottom.", path);
    }
    if (config.border && Object.hasOwn(config.border, "strokeDash")) {
      normalizeLegendBorderDash(config.border.strokeDash, "Stored legend border strokeDash");
    }
    if (config.titleStyle !== undefined) {
      validateOptionObject(config.titleStyle, LEGEND_TITLE_STYLE_KEYS, "Stored legend title style");
      validateLegendTitleAlignment(config.titleStyle, config.titlePosition);
    }
    if (config.inferredOffset !== undefined && typeof config.inferredOffset !== "boolean") throw invalidSnapshot("Invalid legend offset inference.", path);
    if (["gradient", "strokeGradient"].includes(kind) && config.representation !== "symbols") {
      validateLegendGradient(config.gradient, "Stored legend gradient");
    }
    if (["gradient", "strokeGradient"].includes(kind) && config.representation !== "symbols" && config.sampling !== undefined) {
      validateStoredColorLegendSampling(program, config, path);
      if (config.sampling.mode !== "values" || config.count !== config.sampling.count) {
        throw invalidSnapshot("Gradient exact sampling must retain its automatic count.", path);
      }
    }
    if (config.representation === undefined) continue;
    if (kind !== "gradient" || !["symbols", "gradient"].includes(config.representation)) throw invalidSnapshot("Invalid continuous color legend representation.", path);
    if (config.representation === "symbols") {
      if (config.gradient !== undefined) throw invalidSnapshot("Symbol color legend cannot store gradient dimensions.", path);
      validateStoredColorLegendSampling(program, config, path);
      requireObject(config.symbol, path);
      validateKeys(config.symbol, ["type", "radius", "stroke", "strokeWidth"], "Stored sampled color symbol");
      if (config.symbol.type !== "point") throw invalidSnapshot("Invalid sampled color symbol type.", path);
      validatePositiveFinite(config.symbol.radius, "Stored sampled color radius");
      validateNonNegativeFinite(config.symbol.strokeWidth, "Stored sampled color strokeWidth");
      if (config.symbol.stroke !== undefined) validateNonEmptyString(config.symbol.stroke, "Stored sampled color stroke");
      if (!["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"].includes(config.position) || !["horizontal", "vertical"].includes(config.direction) || config.layout !== "edge" || !["left", "center", "right"].includes(config.align) || !["top", "left"].includes(config.titlePosition) || config.columns !== undefined && (!Number.isInteger(config.columns) || config.columns < 1)) throw invalidSnapshot("Invalid sampled color item layout.", path);
      validatePositiveFinite(config.itemGap, "Stored sampled color itemGap");
      validateNonNegativeFinite(config.offset, "Stored sampled color offset");
    } else if (["symbol", "columns", "direction", "layout"].some(key => config[key] !== undefined)) throw invalidSnapshot("Gradient color legend cannot store symbol representation settings.", path);
  }

  const regressionFits = program.materializationConfigs.regressionFits ?? {};
  requireObject(regressionFits, `${path}.materializationConfigs.regressionFits`);
  for (const [id, cache] of Object.entries(regressionFits)) {
    const dataset = resources.get("data").get(id);
    validateRegressionFitStatistics(cache, dataset, resources.get("data").get(dataset?.source));
  }
  for (const dataset of semantic.datasets) {
    if (dataset.transform?.[0]?.type === "pivot") {
      const transform = dataset.transform[0], source = resources.get("data").get(dataset.source);
      if (source === undefined) throw invalidSnapshot("Pivot requires its existing source dataset.", path);
      assertFieldsAvailable(source.schema, transformInputFields(transform), { data: source.id, operation: "Pivot" });
      const schema = deriveTransformSchema(source.schema, transform, dataset.values,
        { sourceId: source.id, ownerId: dataset.id });
      if (!sameLookupValue(dataset.schema, schema)) throw invalidSnapshot("Pivot schema does not match its source and columns.", path);
    }
    if(dataset.transform?.[0]?.type==="lookup"){
      orderedDatasetAncestors(semantic.datasets,dataset.id);
      const transform=dataset.transform[0],source=resources.get("data").get(dataset.source),right=resources.get("data").get(transform.lookup.data);
      if(source===undefined||right===undefined)throw invalidSnapshot("Lookup requires both existing input datasets.",path);
      const missingSchemas = [source, right, dataset].some(input => input.schema === undefined);
      if (!allowMissingLookupSchemas || !missingSchemas) {
        const schema=deriveTransformSchema(source.schema,transform,dataset.values,
          datasetSchemaContext(source,transform,dataset.id,id=>resources.get("data").get(id)));
        if(!sameLookupValue(dataset.schema,schema))throw invalidSnapshot("Lookup schema does not match both inputs.",path);
      }
      if(dataset.values!==undefined&&!sameLookupValue(dataset.values,deriveLookupRows(source.values,right.values,transform)))throw invalidSnapshot("Lookup values do not match both input datasets.",path);
    }
    if (dataset.transform?.[0]?.type !== "regressionStatistics") continue;
    const fit = resources.get("data").get(dataset.source);
    requireRegressionStatisticsSource(fit);
    if (regressionFits[fit.id] === undefined) throw invalidSnapshot("Regression statistics requires its linear fit cache.", path);
    if (dataset.values !== undefined) {
      const expected = regressionStatisticsRows(regressionFits[fit.id], fit);
      if (dataset.values.length !== expected.length || dataset.values.some((row, index) =>
        !isPlainObject(row) || Object.keys(row).length !== Object.keys(expected[index]).length ||
        Object.entries(expected[index]).some(([key, value]) => !Object.hasOwn(row, key) || !Object.is(row[key], value)))) {
        throw invalidSnapshot("Regression statistics values do not match their linear fit cache.", path);
      }
    }
  }

  for (const [id, config] of Object.entries(program.materializationConfigs.rowProvenance ?? {})) {
    exactKeys(config, ["indices"], `${path}.materializationConfigs.rowProvenance.${id}`);
    const { indices } = config;
    const dataset = resources.get("data").get(id), source = resources.get("data").get(dataset?.source);
    if (dataset?.transform?.[0]?.type !== "markFilter" || !source || !Array.isArray(indices) ||
        indices.length !== dataset.values?.length || Array.from(indices).some((index, offset) =>
          !Number.isInteger(index) || index < 0 || index >= source.values.length ||
          (offset > 0 && index <= indices[offset - 1]) || !sameLookupValue(dataset.values[offset], source.values[index]))) {
      throw invalidSnapshot("Invalid filtered row provenance.", path);
    }
  }
  const selections = program.materializationConfigs.selections ?? {};
  requireObject(selections, `${path}.materializationConfigs.selections`);
  for (const [id, selection] of Object.entries(selections)) {
    validateUserId(id, "Selection id");
    exactKeys(selection, ["target", ...(legacy ? ["selector"] : ["grain", "resource", "projection"]), ...(Object.hasOwn(selection, "sourceSelection") ? ["sourceSelection"] : [])], `${path}.materializationConfigs.selections.${id}`);
    validateUserId(selection.target, "Selection target");
    if (!legacy) {
      exactKeys(selection.resource, ["kind", "id", "revision"], `${path}.materializationConfigs.selections.${id}.resource`);
      if (selection.resource.kind !== "persistent-selection") throw invalidSnapshot("Selection requires its persistent-selection resource.", path);
      const resource = requireStoredResource(program, selection.resource);
      exactKeys(selection.projection, Object.hasOwn(selection.projection, "data") ? ["data"] : [], path);
      if (resource.options.mode === "row-keys" && !selection.projection.data) throw invalidSnapshot("Row-key selection requires a data projection.", path);
    }
    normalizeMarkSelector(legacy ? selection.selector : storedSelectionSelector(program, selection));
    if (Object.hasOwn(selection, "sourceSelection")) validateUserId(selection.sourceSelection, "Composite selection owner");
  }
  resources.set("selection", new Map(Object.entries(selections)));
  validateConditionalDependencies(program);
  for (const reference of collectAllResourceReferences(program)) {
    if (reference.kind === "data") resolveDatasetReference(program, reference.id);
    else if (!resources.get(reference.kind)?.has(reference.id)) {
      throw invalidSnapshot(`Unknown ${reference.kind} "${reference.id}" referenced by ${reference.ownerKind} "${reference.ownerId}".`, path);
    }
  }
  for (const selection of Object.values(selections)) {
    if (selection.sourceSelection !== undefined) {
      const owner = selections[selection.sourceSelection];
      if (owner.sourceSelection !== undefined || owner.target === selection.target ||
          !highlightTargets(program, owner.target).includes(selection.target)) {
        throw invalidSnapshot("Invalid composite selection owner.", path);
      }
    }
    const predicate = legacy ? selection.selector : storedSelectionSelector(program, selection);
    if (predicate.rows !== undefined) validateRowSelectionDataset(predicate.rows, resources.get("data").get(predicate.rows.data));
  }
  for (const config of Object.values(program.materializationConfigs.highlights ?? {})) {
    if (config.groupSelection === undefined) continue;
    const owner = selections[config.groupSelection], selection = selections[config.selection];
    if (owner.sourceSelection !== undefined || selection.target !== config.target ||
        (config.selection !== config.groupSelection && selection.sourceSelection !== config.groupSelection)) {
      throw invalidSnapshot("Invalid composite highlight selection group.", path);
    }
  }
  for (const [id, scale] of Object.entries(program.resolvedScales)) {
    requireObject(scale, `${path}.resolvedScales.${id}`);
    requireArray(scale.domain, `${path}.resolvedScales.${id}.domain`);
    requireArray(scale.range, `${path}.resolvedScales.${id}.range`);
    normalizeColorInterpolationOptions(scale.interpolate, scale);
    if (scale.type === "pow") normalizeTransformParameters("pow", {
      ...(scale.exponent === undefined ? {} : {exponent:scale.exponent})
    });
    if (!resources.get("scale").has(id) || scale.type !== resources.get("scale").get(id).type) {
      throw invalidSnapshot(`Resolved scale "${id}" has no matching semantic owner/type.`, path);
    }
  }
  for (const id of Object.keys(program.markConfigs)) {
    if (program.markConfigs[id].textOverrides !== undefined) {
      if (resources.get("mark").get(id).mark.type !== "text") throw invalidSnapshot("Text overrides require a text mark.", path);
      normalizeTextOverrides(program.markConfigs[id].textOverrides);
    }
    validateRegressionPlacement(program.markConfigs[id].regression?.placement);
    requestedMarkClip(program.markConfigs[id]);
    validateMarkClipCoordinate(program, resources.get("mark").get(id), program.markConfigs[id].clip);
    if (!resources.get("mark").has(id)) throw invalidSnapshot(`Mark config "${id}" has no layer owner.`, path);
    if (resources.get("mark").get(id).mark.type === "point" && program.markConfigs[id].shape !== undefined) {
      validatePointShape(program.markConfigs[id].shape);
    }
    if (resources.get("mark").get(id).mark.type === "area") {
      validateAreaPaintConfig(program.markConfigs[id]);
    }
  }
  for (const kind of ["data", "mark"]) {
    const visited = new Set();
    const active = new Set();
    function visit(resource) {
      if (active.has(resource.id)) throw invalidSnapshot(`Cyclic ${kind} source "${resource.id}".`, path);
      if (visited.has(resource.id)) return;
      active.add(resource.id);
      if (resource.source !== undefined) visit(kind === "data" ? resolveDatasetReference(program, resource.source) : resources.get(kind).get(resource.source));
      active.delete(resource.id);
      visited.add(resource.id);
    }
    for (const resource of resources.get(kind).values()) visit(resource);
  }
  validateGraphic(program.graphicSpec, `${path}.graphicSpec`, { legacy });
  for (const [id, graphic] of Object.entries(program.graphicSpec.objects)) {
    if (!legacy) for (const item of graphic.items ?? []) {
      if (item.identity !== undefined) resolveGraphicLineage(program, item.identity);
    }
    if (graphic.items !== undefined) validateGraphicItemLimit(graphic.items.length, resolveGraphicItemCapacity(program, {
      id, label: "Graphic collection length"
    }));
  }
}

function validateGuideVisibilityState(program) {
  const check = (visibility, allowed) => {
    if (visibility === undefined) return;
    if (!isPlainObject(visibility) || Object.entries(visibility).some(([key, value]) => !allowed.includes(key) || typeof value !== "boolean"))
      throw new TypeError("Stored guide visibility must contain only supported boolean flags.");
  };
  for (const config of Object.values(program.guideConfigs.axis ?? {})) {
    check(config.visibility, ["all", "line", "ticks", "labels", "title"]);
    for (const dimension of config.axes?.dimensions ?? []) check(dimension.visibility, ["all", "line", "ticks", "labels", "title"]);
  }
  for (const config of Object.values(program.guideConfigs.legend ?? {})) check(config.visibility, ["all", "labels", "titleStyle"]);
  for (const config of Object.values(program.guideConfigs.grid ?? {})) if (Object.hasOwn(config, "visible") && typeof config.visible !== "boolean")
    throw new TypeError("Stored grid visible must be a boolean.");
  const paint = program.materializationConfigs.guideVisibilityPaint;
  if (paint !== undefined) {
    if (!isPlainObject(paint)) throw new TypeError("Stored guide visibility paint must be an object.");
    for (const items of Object.values(paint)) {
      if (!isPlainObject(items)) throw new TypeError("Stored guide visibility paint entries must be objects.");
      for (const value of Object.values(items)) if (!isPlainObject(value) || Object.keys(value).length !== 1 ||
          !Object.hasOwn(value, "opacity") || value.opacity !== null && (!Number.isFinite(value.opacity) || value.opacity < 0 || value.opacity > 1))
        throw new TypeError("Stored guide visibility paint requires an original opacity or null.");
    }
  }
}
