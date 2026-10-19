import { validateGraphicClip } from "../grammar/schemas/graphicClip.js";
import {validateLegendSpacing} from "../grammar/legendSpacing.js";
import { requestedMarkClip, validateMarkClipCoordinate } from "../selectors/markClip.js";
import { validateAuthoredFacetLegend } from "../grammar/facets/legendIntent.js";
import { AXIS_RESOURCE_CHANNELS } from "../core/vocabulary.js";
import { cartesianAxisOwners, assertCartesianAxisSideAvailable } from "../selectors/axes.js";
import { axisGraphicIds } from "../selectors/axes.js";



import {findLayer} from '../selectors/layers.js';
import {findCoordinate} from '../selectors/coordinates.js';
import {resolveColorSizeMapping,normalizeColorSizeSymbol} from '../grammar/colorSizeLegend.js';
import{validateLegendClip}from"../grammar/legendClip.js";
import {validateLegendLayerOpacity}from"../grammar/legendOpacity.js";
import { isSizeShapeChannels, resolveSizeShapeMapping } from "../grammar/legendCombinations.js";
import { describeLegendBlock } from "../grammar/legendBlocks.js";
import { localLegendPosition } from "../grammar/legendGroups.js";
import { normalizeLegendBorderDash } from "../grammar/legendBorder.js";
import { normalizeNumericDisplayLabelMap } from "../grammar/displayLabels.js";
import { isContinuousSizeScaleType } from "../grammar/scales/size.js";
import { validateGraphicItemLimit } from "../core/validation.js";
import { LEGEND_TITLE_STYLE_KEYS, validateLegendTitleAlignment } from "../grammar/legendTitleStyle.js";
import { validateGuideDash, normalizeGuideDashMap } from "../grammar/guideDash.js";
import { validateAxisTextPlacement } from "../grammar/axisTextPlacement.js";
import { validateAreaPaintConfig } from "../grammar/areaPaint.js";
import { validateOptionObject, validateKeys, validatePositiveFinite, validateNonNegativeFinite, validateNonEmptyString, validateGeneratedItemLimit } from "../core/validation.js";
import { validateRegressionFitStatistics, requireRegressionStatisticsSource, regressionStatisticsRows } from "../grammar/regression/statistics.js";
import { resolveGraphicItemCapacity } from "../selectors/graphicCapacity.js";
import { isContinuousColorScaleType } from "../grammar/scales/types.js";
import { normalizeColorInterpolationOptions } from "../grammar/scales/color.js";
import { normalizeTransformParameters } from "../grammar/scales/transformed.js";
import { validateLegendGroupState } from "../grammar/legendGroups.js";
import { normalizeGradientDirection, validateLegendGradient } from "../grammar/legendGradient.js";
import { normalizeTextMetricProfile } from "../core/textMetricProfile.js";
import { isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { collectAllResourceReferences } from "../core/resourceReferences.js";
import { requiredTraceExtension } from "../core/extensionRegistry.js";
import { resolveDatasetReference } from "../selectors/datasets.js";
import { normalizeMarkSelector } from "../grammar/markSelection.js";
import { parseSemanticPath } from "../grammar/schemas/semanticPath.js";
import { validateStoredSemanticValue } from "../actions/primitives/semantic.js";
import { validateGraphicType, isGraphicContainerType } from "../grammar/schemas/graphic.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { invalidSnapshot } from "./codec.js";

export const STATE_KEYS = Object.freeze([
  "semanticSpec", "graphicSpec", "resolvedScales", "materializationConfigs",
  "children", "compositionSpec", "context", "trace", "actionStack"
]);

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

export function validateGraphic(graphic, path = "payload.graphicSpec") {
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
    if (object.clip !== undefined) validateGraphicClip(object.clip, object.type);
    if (object.properties !== undefined) validateConcreteGraphicProperties(object.type, object.properties);
    if (object.items !== undefined) {
      if (object.type === "canvas" || object.properties !== undefined) throw invalidSnapshot(`Invalid item owner "${id}".`, path);
      requireArray(object.items, `${path}.objects.${id}.items`);
      for (const item of object.items) {
        exactKeys(item, object.type === "collection" ? ["id", "type", "properties"] : ["id", "properties"], path);
        if (typeof item.id !== "string" || !item.id.length || ids.has(item.id)) throw invalidSnapshot(`Duplicate or invalid graphic item ID "${item.id}".`, path);
        ids.add(item.id);
        const type = item.type ?? object.type;
        validateGraphicType(type);
        if (isGraphicContainerType(type)) throw invalidSnapshot("Graphic items must be primitive drawables.", path);
        validateConcreteGraphicProperties(type, item.properties);
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

export function validateProgramState(program, path) {
  const semantic = program.semanticSpec;
  exactKeys(semantic, ["datasets", "layers", "scales", "coordinates", "guides", "title"], `${path}.semanticSpec`);
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
      if (kind === "scale") {
        normalizeColorInterpolationOptions(resource.interpolate, resource);
        if (resource.type === "pow") normalizeTransformParameters("pow", {
          ...(resource.exponent === undefined ? {} : {exponent:resource.exponent})
        });
      }
      for (const [key, value] of Object.entries(resource)) {
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
  if (program.materializationConfigs.textMetrics !== undefined) normalizeTextMetricProfile(program.materializationConfigs.textMetrics);
  for (const config of [
    ...Object.values(program.guideConfigs.axis ?? {}).map(axis => axis.ticks),
    ...["horizontal", "vertical"].map(direction => program.guideConfigs.grid?.[direction])
  ]) {
    if (config?.strokeDash !== undefined) validateGuideDash(config.strokeDash);
    if (config?.strokeDashMap !== undefined) normalizeGuideDashMap(config.strokeDashMap, { reset: false });
  }
  const cartesianOwners = cartesianAxisOwners(program);
  for (const owner of cartesianOwners) {
    const channel = owner.id;
    const axis = owner.config;
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
    validateKeys(config, ["binding", "frame", "line", "ticks", "labels", "title"], "Stored named axis config");
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
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    validateLegendClip(kind,config);
    validateLegendSpacing(kind,config);
    if (localLegendPosition(config) !== undefined) {
      const descriptor = describeLegendBlock(program, kind, config);
      for (const [key, override] of Object.entries(config.blockOverrides)) {
        if (override.position !== undefined && key !== descriptor.key) throw invalidSnapshot("Local position requires its existing block owner.", path);
      }
    }
    for(const layer of config.symbol?.layers??[])validateLegendLayerOpacity(layer.opacity);
    if(kind==='colorSize') {
      if(config.combine!=='color-size')throw invalidSnapshot('Color-size legend requires its combined owner.',path);
      const layer=findLayer(program,config.target);
      const mapping=resolveColorSizeMapping({layer,scales:program.resolvedScales,pointConfig:program.markConfigs[layer?.id],coordinate:findCoordinate(program,layer?.coordinate)});
      for(const key of ['target','field','fieldType','colorScale','sizeScale','domain'])if(JSON.stringify(config[key])!==JSON.stringify(mapping[key]))throw invalidSnapshot('Stale color-size mapping.',path);
      const guide=semantic.guides.legend?.colorSize;
      if(guide?.colorScale!==mapping.colorScale||guide?.sizeScale!==mapping.sizeScale||guide.title!==config.title)throw invalidSnapshot('Stale color-size semantic owner.',path);
      requireObject(config.symbol,path);normalizeColorSizeSymbol(config.symbol);
      if(config.symbol.type!=='point'||!Object.hasOwn(config.symbol,'strokeWidth')||!Object.hasOwn(config.symbol,'opacity'))throw invalidSnapshot('Color-size symbol requires point type.',path);
      const sample=config.sampling;requireObject(sample,path);
      exactKeys(sample,sample.mode==='values'?['mode','count','values']:['mode','count'],path);
      if(!['auto','values'].includes(sample.mode)||!Number.isInteger(sample.count)||sample.count<2)throw invalidSnapshot('Invalid color-size samples.',path);
      validateGeneratedItemLimit(sample.count,'Color-size samples');
      if(sample.mode==='values'){
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
    if (["size","colorSize"].includes(kind) && config.blockOverrides !== undefined) {
      for (const [key, override] of Object.entries(config.blockOverrides)) {
        if (override.labelMap === undefined) continue;
        if (key !== (kind==='colorSize'?'["color","size"]':'["size"]') || !isContinuousSizeScaleType(program.resolvedScales[kind==='colorSize'?config.sizeScale:config.scale]?.type)) {
          throw invalidSnapshot("Numeric display labels require a continuous size legend block.", path);
        }
        normalizeNumericDisplayLabelMap(override.labelMap, "Stored size legend labelMap");
      }
    }
    if (config.titleStyle !== undefined) {
      validateOptionObject(config.titleStyle, LEGEND_TITLE_STYLE_KEYS, "Stored legend title style");
      validateLegendTitleAlignment(config.titleStyle, config.titlePosition);
    }
    if (config.inferredOffset !== undefined && typeof config.inferredOffset !== "boolean") throw invalidSnapshot("Invalid legend offset inference.", path);
    if (["gradient", "strokeGradient"].includes(kind) && config.representation !== "symbols") {
      validateLegendGradient(config.gradient, "Stored legend gradient");
    }
    if (config.representation === undefined) continue;
    if (kind !== "gradient" || !["symbols", "gradient"].includes(config.representation)) throw invalidSnapshot("Invalid continuous color legend representation.", path);
    if (config.representation === "symbols") {
      if (config.gradient !== undefined) throw invalidSnapshot("Symbol color legend cannot store gradient dimensions.", path);
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
      requireObject(config.symbol, path);
      validateKeys(config.symbol, ["type", "radius", "stroke", "strokeWidth"], "Stored sampled color symbol");
      if (config.symbol.type !== "point") throw invalidSnapshot("Invalid sampled color symbol type.", path);
      validatePositiveFinite(config.symbol.radius, "Stored sampled color radius");
      validateNonNegativeFinite(config.symbol.strokeWidth, "Stored sampled color strokeWidth");
      if (config.symbol.stroke !== undefined) validateNonEmptyString(config.symbol.stroke, "Stored sampled color stroke");
      if (!["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"].includes(config.position) || !["horizontal", "vertical"].includes(config.direction) || config.layout !== "edge" || !["left", "center", "right"].includes(config.align) || !["top", "left"].includes(config.titlePosition) || config.columns !== undefined && (!Number.isInteger(config.columns) || config.columns < 1)) throw invalidSnapshot("Invalid sampled color item layout.", path);
      validatePositiveFinite(config.itemGap, "Stored sampled color itemGap");
      validateNonNegativeFinite(config.offset, "Stored sampled color offset");
    } else if (["sampling", "symbol", "columns", "direction", "layout"].some(key => config[key] !== undefined)) throw invalidSnapshot("Gradient color legend cannot store symbol representation settings.", path);
  }

  const regressionFits = program.materializationConfigs.regressionFits ?? {};
  requireObject(regressionFits, `${path}.materializationConfigs.regressionFits`);
  for (const [id, cache] of Object.entries(regressionFits)) {
    const dataset = resources.get("data").get(id);
    validateRegressionFitStatistics(cache, dataset, resources.get("data").get(dataset?.source));
  }
  for (const dataset of semantic.datasets) {
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

  const selections = program.materializationConfigs.selections ?? {};
  requireObject(selections, `${path}.materializationConfigs.selections`);
  for (const [id, selection] of Object.entries(selections)) {
    validateUserId(id, "Selection id");
    exactKeys(selection, ["target", "selector"], `${path}.materializationConfigs.selections.${id}`);
    validateUserId(selection.target, "Selection target");
    normalizeMarkSelector(selection.selector);
  }
  resources.set("selection", new Map(Object.entries(selections)));
  for (const reference of collectAllResourceReferences(program)) {
    if (reference.kind === "data") resolveDatasetReference(program, reference.id);
    else if (!resources.get(reference.kind)?.has(reference.id)) {
      throw invalidSnapshot(`Unknown ${reference.kind} "${reference.id}" referenced by ${reference.ownerKind} "${reference.ownerId}".`, path);
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
    requestedMarkClip(program.markConfigs[id]);
    validateMarkClipCoordinate(program, resources.get("mark").get(id), program.markConfigs[id].clip);
    if (!resources.get("mark").has(id)) throw invalidSnapshot(`Mark config "${id}" has no layer owner.`, path);
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
  validateGraphic(program.graphicSpec, `${path}.graphicSpec`);
  for (const [id, graphic] of Object.entries(program.graphicSpec.objects)) {
    if (graphic.items !== undefined) validateGraphicItemLimit(graphic.items.length, resolveGraphicItemCapacity(program, {
      id, label: "Graphic collection length"
    }));
  }
}
