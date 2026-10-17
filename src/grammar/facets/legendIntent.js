import { isPlainObject } from "../../core/immutable.js";
import { validateOptionObject, validateNonEmptyString } from "../../core/validation.js";
import { validateUserId } from "../../core/identifiers.js";
import { LEGEND_CONFIG_KINDS, LEGEND_POSITIONS } from "../../core/vocabulary.js";
import { describeLegendBlock } from "../legendBlocks.js";
import { validateLegendGroupState } from "../legendGroups.js";
import { resolveSharedFacetLegends, sameFacetGuideValue as same } from "./guides.js";

const CONFIG_KEYS = Object.freeze([
  "kind", "target", "channels", "scales", "scale", "field", "fieldType", "domain", "title", "titleVisible",
  "inferredTitle", "inferredSymbol", "inferredStrokeWidth", "inferredOffset", "position", "align", "offset", "direction", "columns",
  "titlePosition", "symbol", "labels", "titleStyle", "itemGap", "layout", "overflow", "border", "gradient",
  "count", "sampling", "representation", "gradientDirection", "inheritAppearance", "inheritPosition", "blockOverrides",
  "combine", "sizeAreas", "clipHeight"
]);

export function isAuthoredFacetLegend(value) {
  return isPlainObject(value) && value.type === "authored-legend";
}

export function validateAuthoredFacetLegend(program, intent) {
  validateOptionObject(intent, ["type", "blocks", "groups"], "Stored parent legend");
  if (!isAuthoredFacetLegend(intent) || Object.keys(intent).length !== 3 ||
      !isPlainObject(intent.blocks) || Object.keys(intent.blocks).length === 0 || !isPlainObject(intent.groups)) {
    throw new Error("Stored parent legend requires its closed authored block intent.");
  }
  validateLegendGroupState(intent.groups);
  const configs = {};
  for (const [kind, block] of Object.entries(intent.blocks)) {
    if (!LEGEND_CONFIG_KINDS.includes(kind)) throw new Error("Stored parent legend has an unknown block kind.");
    validateOptionObject(block, ["config", "guide"], "Stored parent legend block");
    validateOptionObject(block.config, CONFIG_KEYS, "Stored parent legend config");
    const config = block.config;
    validateUserId(config.target, "Parent legend target");
    if (!LEGEND_POSITIONS.includes(config.position)) throw new Error("Stored parent legend requires a native position.");
    for (const flag of ["inferredTitle", "inferredSymbol", "inferredStrokeWidth", "inferredOffset", "titleVisible", "inheritAppearance", "inheritPosition"]) {
      if (config[flag] !== undefined && typeof config[flag] !== "boolean") throw new Error(`Stored parent legend ${flag} must be boolean.`);
    }
    const descriptor = describeLegendBlock(program, kind, config);
    if (block.guide !== undefined) {
      validateOptionObject(block.guide, ["scale", "scales", "channels", "title", "order"], "Stored parent legend meaning");
      if (block.guide.title !== undefined) validateNonEmptyString(block.guide.title, "Parent legend title");
      if (block.guide.channels !== undefined && !same([...block.guide.channels].sort(), descriptor.channels)) {
        throw new Error("Stored parent legend meaning must match its block channels.");
      }
      if (block.guide.scale !== undefined && block.guide.scale !== descriptor.scaleIds[0] ||
          block.guide.scales !== undefined && !same(block.guide.scales, descriptor.scaleIds)) {
        throw new Error("Stored parent legend meaning must match its block scale binding.");
      }
    }
    if (!same(config, program.guideConfigs.legend?.[kind])) throw new Error("Parent legend materialization must match its authored owner.");
    configs[kind] = config;
  }
  if (!same(Object.keys(configs).sort(), Object.keys(program.guideConfigs.legend ?? {}).sort()) ||
      !same(intent.groups, program.guideConfigs.legendGroups ?? {})) {
    throw new Error("Parent legend materialization must contain exactly its authored blocks and groups.");
  }
  resolveSharedFacetLegends(program.compositionSpec.children.map(id => ({ id,
    guideConfigs: { legend: configs, legendGroups: intent.groups }, resolvedScales: program.children[id].resolvedScales })));
  return intent;
}
