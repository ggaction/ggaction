import { colorSizeChannels } from "../../grammar/colorSizeLegend.js";
import { CATEGORICAL_LEGEND_KINDS, legendBlockKey } from "../../grammar/legendBlocks.js";
import { categoricalLegendView } from "../../grammar/legendOverflow.js";
import { resolveDisplayLabel } from "../../grammar/displayLabels.js";
import { readLegendSampling } from "../../grammar/legendSampling.js";
import { formatVisibleText } from "../../core/textMetrics.js";

function applyCategoricalSymbol(symbol, patch) {
  return {
    ...symbol,
    layers: symbol.layers.map(layer => ({
      ...layer,
      ...(patch.size !== undefined && layer.type === "point"
        ? { size: Math.sqrt(patch.size / Math.PI) }
        : {}),
      ...(patch.fill !== undefined && ["point", "swatch"].includes(layer.type)
        ? { fill: patch.fill }
        : {}),
      ...(patch.stroke !== undefined ? { stroke: patch.stroke } : {}),
      ...(patch.strokeWidth !== undefined
        ? layer.type === "line"
          ? { lineWidth: patch.strokeWidth }
          : { strokeWidth: patch.strokeWidth }
        : {}),
      ...(patch.opacity !== undefined ? { opacity: patch.opacity } : {})
    }))
  };
}

export function resolveEffectiveLegendBlockConfig(program, kind, config) {
  const channels = kind === "colorSize" ? colorSizeChannels(config) : kind === "series" || kind === "color" || kind === "stroke"
    ? config.channels
    : [{ size: "size", opacity: "opacity", strokeWidth: "strokeWidth",
      gradient: "color", interval: "color", strokeGradient: "stroke",
      strokeInterval: "stroke" }[kind]];
  const override = config.blockOverrides?.[legendBlockKey(channels)] ?? {};
  const effective = {
    ...config,
    ...(override.title === undefined || override.title === ""
      ? {}
      : { title: override.title }),
    ...(override.title === ""
      ? { titleVisible: false }
      : override.title === undefined
        ? {}
        : { titleVisible: true }),
    ...(override.gap === undefined ? {} : { itemGap: override.gap, blockGap: override.gap }),
    ...(override.text === undefined
      ? {}
      : { labels: { ...config.labels, ...override.text } }),
    ...(Object.hasOwn(override, "labelMap")
      ? { labelMap: override.labelMap }
      : {})
  };
  if (override.symbol === undefined) return effective;
  if(kind === "colorSize") return {...effective,symbol:{...config.symbol,...override.symbol}};
  if (["series", "color", "stroke"].includes(kind)) {
    return {
      ...effective,
      symbol: applyCategoricalSymbol(config.symbol, override.symbol),
      blockSymbol: override.symbol
    };
  }
  if (kind === "opacity" || kind === "gradient" && config.representation === "symbols") {
    return {
      ...effective,
      symbol: {
        ...config.symbol,
        ...(override.symbol.size === undefined
          ? {}
          : { radius: Math.sqrt(override.symbol.size / Math.PI) }),
        ...Object.fromEntries(Object.entries(override.symbol)
          .filter(([key]) => ["fill", "stroke", "strokeWidth"].includes(key)))
      },
      blockSymbol: override.symbol
    };
  }
  if (["interval", "strokeInterval"].includes(kind)) {
    return {
      ...effective,
      symbol: { ...config.symbol, ...override.symbol },
      blockSymbol: override.symbol
    };
  }
  return { ...effective, blockSymbol: override.symbol };
}

export function resolveCategoricalLegendConfig(program, requested) {
  if (requested !== undefined && !CATEGORICAL_LEGEND_KINDS.includes(requested)) {
    throw new Error(`Unknown categorical legend kind "${requested}".`);
  }
  const kinds = CATEGORICAL_LEGEND_KINDS
    .filter(kind => program.guideConfigs.legend?.[kind] !== undefined);
  if (requested !== undefined) {
    if (!kinds.includes(requested)) {
      throw new Error(`Missing categorical legend config "${requested}".`);
    }
    return {
      kind: requested,
      config: resolveEffectiveLegendBlockConfig(
        program,
        requested,
        program.guideConfigs.legend[requested]
      )
    };
  }
  if (kinds.length !== 1) {
    throw new Error("Legend component requires one categorical legend config.");
  }
  const kind = kinds[0];
  return {
    kind,
    config: resolveEffectiveLegendBlockConfig(
      program,
      kind,
      program.guideConfigs.legend[kind]
    )
  };
}

export function categoricalLegendLabels(config) {
  config = categoricalLegendView(config);
  const visible = config.hiddenCount > 0 ? config.domain.slice(0, config.overflow.maxItems) : config.domain;
  const labels = visible.map(value => resolveDisplayLabel(
    value,
    [...(config.labelMap ?? []), ...(config.defaultLabelMap ?? [])],
    formatVisibleText
  ));
  return config.hiddenCount > 0 ? [...labels, `…${config.hiddenCount} entries`] : labels;
}

export function hasExactLegendSamplingForScale(program, scaleId) {
  return ["size", "opacity", "strokeWidth", "gradient", "strokeGradient"].some(kind => {
    const config = program.guideConfigs.legend?.[kind];
    return config?.scale === scaleId && readLegendSampling(config).mode === "values";
  });
}
