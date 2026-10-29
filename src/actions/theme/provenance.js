import { collectThemeAuthoredSources, graphicRole, configRole, roleToken } from "./reconcile.js";
import { resolveEffectiveThemeFrame, resolveEffectiveThemeTokens } from "./state.js";
import { resourcePlotThemeOwner, resourcePlotThemeProperty } from "./resourcePlots.js";
import { guideNumericProperty } from "./guideDefaults.js";
import { requireParallelAxisLayer, resolveStyledParallelAxes } from "../guides/axes/parallel/resolve.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { axisGraphicIds, cartesianAxisOwners } from "../../selectors/axes.js";
import { gridNames } from "../../selectors/grids.js";
import { polarGuideNames } from "../guides/polar/resolve.js";
import { legendResourcePolicy } from "../../materialization/guides/resources.js";
import { resolveStoredSelection } from "../../materialization/selection/state.js";
import { conditionalSelectionMembership } from "../../materialization/conditionalSelection.js";
import { selectConditionalBranches } from "../../materialization/conditionalBranches.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../materialization/selection/policies/index.js";
import { exactLegendSelection, legendLayerStyle } from "../../materialization/selection/legend.js";
import { categoricalLegendSymbolId } from "../../grammar/legendBlocks.js";
import { storedSelectionSelector } from "../../selectors/selectionResources.js";

const PROPERTIES = new Set(["background", "fill", "stroke", "strokeWidth", "strokeDash", "strokeDashOffset", "strokeLineCap", "strokeLineJoin", "opacity", "fontFamily", "fontSize", "fontWeight", "fontStyle", "outline", "shadow", "blend"]);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unknown = () => ({ kind: "unknown" });
const familyAction = op => /(?:Plot|Histogram|ParallelCoordinates|Annotation|MarkLabels)$/.test(op);

function visit(node, callback) { callback(node); for (const child of node.children ?? []) visit(child, callback); }
function origins(program, nativeActions) {
  const result = new Map();
  for (const root of program.trace.children) visit(root, node => {
    if (root.op === "editGraphics" && node === root && node.args.property === "items") result.set(node.args.target, unknown());
    if (node.op === "editGraphics" && node.args.remove) result.delete(node.args.target);
    if (node.op === "createGraphics" && typeof node.args.id === "string" && !result.has(node.args.id)) {
      const native = nativeActions.has(root.op) && root.op !== "createGraphics" && /^(?:create|encode|edit|materialize|rematerialize|facet|repeat)/.test(root.op);
      result.set(node.args.id, native ? { kind: familyAction(root.op) ? "family" : "defaults", action: root.op } : unknown());
    }
  });
  return result;
}

// This read-only view derives authority from the same trace/reset owner used by
// theme reconciliation. It never applies a theme, changes state or runs layout.
export function appearanceContext(program, nativeActions) {
  const theme = program.materializationConfigs.theme;
  return { program, authored: collectThemeAuthoredSources(program), origins: origins(program, nativeActions),
    frame: resolveEffectiveThemeFrame(theme), tokens: resolveEffectiveThemeTokens(theme), selections: new Map(), extras: new Map() };
}

function themeSource(context, token) {
  return { kind: "theme", owner: context.frame.owner, name: context.frame.name, token };
}

function interactionSource(context, layer, item, property, role) {
  if (!item) return undefined;
  let winner;
  for (const config of Object.values(context.program.materializationConfigs.highlights ?? {})) {
    if (config.target !== layer.id) continue;
    const definition = context.program.materializationConfigs.selections[config.selection];
    const selector = storedSelectionSelector(context.program, definition);
    // Property selectors can refer to pre-highlight values. Do not reevaluate
    // that baseline by executing actions or pretend the current values prove it.
    if (selector.property !== undefined) return unknown();
    let keys = context.selections.get(config.selection);
    if (!keys) context.selections.set(config.selection, keys = new Set(resolveStoredSelection(context.program, config.selection).keys));
    if (keys.has(item.key)) {
      const labelStroke = role === "label" && ["stroke", "strokeWidth"].includes(property);
      const styleProperty = layer.mark.type === "graph" && role === "arrow" && property === "fill" ? "stroke" : property;
      if (!labelStroke && Object.hasOwn(config.style, styleProperty)) winner = { kind: "interaction", selection: config.selection,
        ...(config.paintSource === "theme" && ["fill", "stroke"].includes(property) ? { token: "highlight" } : {}) };
    } else if (property === "opacity" && config.dimOthers !== false) winner = { kind: "interaction", selection: config.selection, complement: true };
  }
  return winner;
}

function channelSource(context, layer, item, property, value) {
  const channel = property === "fill" ? "color" : property === "stroke" ? (layer.mark.type === "line" ? "color" : "stroke")
    : ["opacity", "strokeWidth"].includes(property) ? property : undefined;
  if (channel === undefined) return undefined;
  let binding = layer.encoding?.[channel];
  const conditional = layer.conditionals?.[channel];
  if (!binding && !conditional) return undefined;
  if (conditional) {
    if (!item) return unknown();
    const membership = conditionalSelectionMembership(context.program, layer, conditional, [item], { resolveMarkItems, resolveMarkSourceItems });
    const selected = selectConditionalBranches(context.program, layer, channel, [item], membership);
    binding = selected.branches[selected.indices[0] === -1 ? selected.branches.length - 1 : selected.indices[0]];
  }
  const scale = binding && findSemanticScale(context.program, binding.scale);
  if (context.frame && (scale?.type === "ordinal" && scale.range === "auto")) {
    if (property === "fill" && value?.type === "pattern" && context.tokens.patternPalette) return themeSource(context, "patternPalette");
    if (binding && context.tokens.palette && ["fill", "stroke"].includes(property)) return themeSource(context, "palette");
  }
  return { kind: "explicit", channel, action: `encode${channel[0].toUpperCase()}${channel.slice(1)}` };
}

function resourcePath(context, layer, item, role, property) {
  const owner = resourcePlotThemeOwner(layer);
  if (!owner) return undefined;
  const component = role === "label" ? "labels" : owner.key === "ohlcPlot" ? (role === "stem" ? "stem" : "body") : owner.key === "pyramidPlot" ? "stages" : owner.key === "flowPlot" ? "body"
    : layer.mark.type === "graph" ? (item?.role === "edge" || role === "arrow" ? "edges" : "nodes")
      : layer.mark.type === "tree" ? (role === "link" ? "links" : "nodes") : "cells";
  return ["marks", layer.id, owner.key, component, layer.mark.type === "graph" && role === "arrow" && property === "fill" ? "stroke" : property];
}

function tokenSource(context, token, value, family) {
  if (!context.frame || token === undefined) return undefined;
  if (!same(value, roleToken(context.tokens, token, family))) return undefined;
  const actual = token === "axisLabel" && context.tokens.axisLabel === undefined ? (family === "parallel" ? "axis" : "text")
    : ["axisLabelFontFamily", "axisTitleFontFamily"].includes(token) && context.tokens[token] === undefined ? "fontFamily"
      : ["axisLabelFontSize", "axisTitleFontSize"].includes(token) && context.tokens[token] === undefined ? "fontSize" : token;
  return context.tokens[actual] === undefined ? undefined : themeSource(context, actual);
}

function authoredExtra(context, id, property, path) {
  // Extra appearance properties do not participate in theme substitution, but
  // an exact native mark option is still authored even when equal to a default.
  const key = JSON.stringify([id, property, path]);
  if (context.extras.has(key)) return context.extras.get(key);
  let result;
  for (const node of context.program.trace.children) {
    if (node.op === "removeMark" && node.args.target === id) result = undefined;
    const mark = /^(create|edit)(Point|Line|Area|Arc|Bar|Rect|Rule|Tick|Text|Image)Mark$/.exec(node.op);
    if (mark) {
      const candidates = context.program.semanticSpec.layers.filter(layer => layer.mark.type === mark[2].toLowerCase());
      const target = node.args.target ?? node.args.id ?? (mark[1] === "create" ? mark[2].toLowerCase() : candidates.length === 1 ? candidates[0].id : undefined);
      if (target === id && Object.hasOwn(node.args, property)) result = { kind: "explicit", action: node.op };
    }
    if (node.op === "editGraphics" && node.args.target === id && node.args.property === property) result = { kind: "explicit", action: node.op };
    if (familyAction(node.op)) {
      const targets = new Set();
      visit(node, child => { if (/^(?:create|edit)(?:Point|Line|Area|Arc|Bar|Rect|Rule|Tick|Text)Mark$/.test(child.op)) targets.add(child.args.id ?? child.args.target); });
      const layer = findLayer(context.program, id);
      if (targets.has(id) && Object.hasOwn(node.args[layer?.mark.type] ?? node.args.style ?? {}, property)) result = { kind: "style", action: node.op };
      if (path) {
        visit(node, child => { if (child.op === resourcePlotThemeOwner(layer)?.op) targets.add(child.args.id); });
        const role = path[3] === "body" ? layer.mark.type === "flow-node" ? "nodes" : "links" : path[3];
        if (targets.has(id) && Object.hasOwn(node.args[role] ?? {}, property)) result = { kind: "style", action: node.op };
      }
    }
  }
  context.extras.set(key, result);
  return result;
}

export function markAppearance(context, layer, item, graphic, owner, itemKey, component) {
  const id = layer.id, role = graphic.identity?.role;
  return Object.entries(graphic.properties ?? {}).filter(([property]) => PROPERTIES.has(property)).map(([property, value]) => {
    const path = resourcePath(context, layer, item, role, property);
    const roleConfig = path && context.program.markConfigs[id]?.[path[2]]?.[path[3]];
    const nativeKey = item?.key && JSON.parse(item.key)[3]?.[1];
    const inheritedProperty = path?.at(-1) ?? property;
    const override = roleConfig?.overrides?.find(entry => entry.key === nativeKey && Object.hasOwn(entry, inheritedProperty));
    const authored = (path && context.authored.get(`c:${path.join(".")}`)) ?? context.authored.get(`g:${id}.${property}`) ?? authoredExtra(context, id, inheritedProperty, path);
    const resource = path && resourcePlotThemeProperty(path, layer);
    const token = resource?.token ?? (["fontSize", "fontWeight"].includes(property) ? property : graphicRole(context.program, id, property));
    const fixedArrowStroke = layer.mark.type === "graph" && role === "arrow" && ["stroke", "strokeWidth"].includes(property);
    const source = (!context.origins.has(id) || context.origins.get(id).kind === "unknown") ? unknown() : (fixedArrowStroke ? context.origins.get(id) : undefined) ?? interactionSource(context, layer, item, property, role)
      ?? (override ? { kind: "style", key: override.key } : undefined)
      ?? channelSource(context, layer, item, property, value) ?? authored
      ?? tokenSource(context, token, value) ?? context.origins.get(id) ?? unknown();
    return { owner, itemKey, component: role ?? component, property, value, source };
  });
}

function guideParts(program) {
  const result = new Map();
  const axes = [...cartesianAxisOwners(program), ...["theta", "radius", "parallel"].filter(channel => program.guideConfigs.axis?.[channel]).map(channel => ({ id: channel, channel }))];
  const parallel = program.guideConfigs.axis?.parallel;
  const parallelAxes = parallel && resolveStyledParallelAxes(program, requireParallelAxisLayer(program, parallel.axes.target).dimensions).axes;
  for (const axis of axes) axisGraphicIds(axis.channel, axis.id).forEach((id, index) => {
    const part = ["line", "ticks", "labels", "title"][index];
    const primitives = axis.channel === "parallel" ? parallelAxes.flatMap((entry, dimension) => entry.config[part] === undefined ? [] : Array.from({ length: ["line", "title"].includes(part) ? 1 : entry[part].values.length }, () => ({ component: `parallel.${dimension}.${part}`, path: ["guides", "axis", "parallel", "axes", "dimensions", dimension, part], family: "parallel" }))) : undefined;
    result.set(id, { primitives, component: `${axis.id}.${part}`, path: ["guides", "axis", axis.id, part], family: axis.channel === "parallel" ? "parallel" : ["theta", "radius"].includes(axis.channel) ? "polar" : "cartesian" });
  });
  for (const role of Object.keys(program.guideConfigs.grid ?? {})) result.set(["theta", "radial"].includes(role) ? polarGuideNames(role).grid : gridNames(role).graphic, { component: role, path: ["guides", "grid", role] });
  for (const kind of Object.keys(program.guideConfigs.legend ?? {})) for (const id of legendResourcePolicy(kind).graphicIds) {
    const part = id.endsWith("Labels") ? "labels" : id.endsWith("Title") ? "titleStyle" : id.endsWith("Background") ? "border" : "symbol";
    result.set(id, { component: `${kind}.${part}`, path: ["guides", "legend", kind, part], legend: kind });
  }
  for (const role of ["title", "subtitle"]) result.set(role === "title" ? "chartTitle" : "chartSubtitle", { component: role, path: ["title", `${role}Style`] });
  return result;
}

function legendInteractionSource(context, config, id, index, property) {
  const symbol = config.symbol?.layers.find(layer => categoricalLegendSymbolId(config, layer.type) === id);
  if (!symbol) return undefined;
  let winner;
  for (const highlight of Object.values(context.program.materializationConfigs.highlights ?? {})) {
    if (highlight.target !== config.target) continue;
    const definition = context.program.materializationConfigs.selections[highlight.selection];
    if (storedSelectionSelector(context.program, definition).property !== undefined) return unknown();
    const states = exactLegendSelection(context.program, config, highlight);
    if (states?.[index] === true && Object.hasOwn(legendLayerStyle(symbol, highlight.style), property)) {
      winner = { kind: "interaction", selection: highlight.selection,
        ...(highlight.paintSource === "theme" && ["fill", "stroke"].includes(property) ? { token: "highlight" } : {}) };
    } else if (states?.[index] === false && property === "opacity" && highlight.dimOthers !== false) {
      winner = { kind: "interaction", selection: highlight.selection, complement: true };
    }
  }
  return winner;
}

export function guideAppearance(context, ids, owner) {
  const parts = context.guideParts ??= guideParts(context.program), result = [];
  for (const id of ids) {
    const graphic = context.program.graphicSpec.objects[id], collection = parts.get(id);
    const items = graphic.items ?? [{ properties: graphic.properties }];
    items.forEach((item, index) => {
      const part = collection?.primitives?.[index] ?? collection;
      for (const [property, value] of Object.entries(item.properties ?? {})) {
        if (!PROPERTIES.has(property)) continue;
        const configProperty = ["fill", "stroke"].includes(property) ? "color" : property === "strokeWidth" ? "lineWidth" : property;
        const path = part && [...part.path, configProperty];
        const numeric = path && guideNumericProperty(path, context.program);
        const token = numeric?.token ?? (path && configRole(context.program, path)) ?? graphicRole(context.program, id, property);
        const legend = part?.legend && context.program.guideConfigs.legend[part.legend];
        const layer = legend && findLayer(context.program, legend.target);
        const inherited = part?.path.at(-1) === "symbol" && layer ? channelSource(context, layer, undefined, property, value) : undefined;
        const source = (!context.origins.has(id) || context.origins.get(id).kind === "unknown") ? unknown() : (legend && legendInteractionSource(context, legend, id, index, property)) ?? context.authored.get(`g:${id}.${property}`) ?? (path && context.authored.get(`c:${path.join(".")}`))
          ?? inherited ?? tokenSource(context, token, value, part?.family) ?? context.origins.get(id) ?? unknown();
        result.push({ owner, component: part?.component ?? "unknown", primitive: index, property, value, source });
      }
    });
  }
  const paths = new Map();
  for (const id of ids) {
    const part = parts.get(id);
    if (!part) continue;
    const prefix = part.path;
    if (prefix[1] === "axis" && prefix[2] === "parallel") {
      context.program.guideConfigs.axis.parallel.axes.dimensions.forEach((_, index) => {
        const path = ["guides", "axis", "parallel", "axes", "dimensions", index, prefix.at(-1)];
        paths.set(path.join("."), { path, component: `parallel.${index}.${prefix.at(-1)}` });
      });
    } else paths.set(prefix.join("."), { path: prefix, component: part.component });
    if (part.legend) paths.set(`legend.${part.legend}`, { path: ["guides", "legend", part.legend], component: part.legend });
  }
  for (const { path, component } of paths.values()) {
    const config = path.reduce((value, key) => value?.[key], context.program.materializationConfigs);
    for (const property of ["offset", "length", "itemGap"]) {
      if (!Object.hasOwn(config ?? {}, property)) continue;
      const fullPath = [...path, property], numeric = guideNumericProperty(fullPath, context.program);
      const token = numeric?.token ?? (property === "offset" && config.inferredOffset ? "axisTitleGap" : undefined);
      if (!token) continue;
      const source = context.authored.get(`c:${fullPath.join(".")}`) ?? (context.frame && context.tokens[token] !== undefined ? themeSource(context, token) : { kind: "defaults" });
      result.push({ owner, component, property, value: config[property], source });
    }
  }
  return result;
}
