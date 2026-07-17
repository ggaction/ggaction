import { action } from "../../../../core/action.js";
import { validateOptionObject } from "../../../../core/validation.js";
import { noOptions, resolveLayout, activeConfig } from "./layout.js";
import { normalizeOptions } from "./options.js";
import { findLayer } from "../../../../selectors/layers.js";
import { findSemanticScale } from "../../../../selectors/scales.js";
import { isSizeLegendPoint } from "../size.js";
import {
  resolveCurrentDefinition,
  resolveDefinition,
  resolveLegendKind,
  resolveTarget,
  sameValues
} from "./resolve.js";

export const rematerializeLegend = action(
  { op: "rematerializeLegend", description: "Rematerialize every existing legend component." },
  function (args = {}) {
    noOptions(args, "rematerializeLegend");
    let next = this;
    const hasCategorical =
      this.guideConfigs.legend?.series !== undefined ||
      this.guideConfigs.legend?.color !== undefined;
    if (hasCategorical) {
      const { kind, config } = activeConfig(this);
      const definition = resolveCurrentDefinition(this, config);
      const changed =
        !sameValues(config.channels, definition.channels) ||
        !sameValues(config.domain, definition.domain) ||
        !sameValues(config.scales, definition.scales) ||
        config.field !== definition.field ||
        config.title !== definition.title;
      next = changed
        ? this._withLegendConfig(kind, {
            ...config,
            channels: definition.channels,
            scales: definition.scales,
            field: definition.field,
            title: definition.title,
            domain: definition.domain
          })
        : this;
      if (kind === "series") {
        if (!sameValues(
          this.semanticSpec.guides.legend.series.scales,
          definition.scales
        )) {
          next = next.editSemantic({
            property: "guide.legend.series.scales",
            value: definition.scales
          });
        }
        if (this.semanticSpec.guides.legend.series.title !== definition.title) {
          next = next.editSemantic({
            property: "guide.legend.series.title",
            value: definition.title
          });
        }
      } else {
        if (this.semanticSpec.guides.legend.color.scale !== definition.scales[0]) {
          next = next.editSemantic({
            property: "guide.legend.color.scale",
            value: definition.scales[0]
          });
        }
        if (this.semanticSpec.guides.legend.color.title !== definition.title) {
          next = next.editSemantic({
            property: "guide.legend.color.title",
            value: definition.title
          });
        }
      }
      if (config.border !== false) next = next.rematerializeLegendBackground();
      next = next
        .rematerializeLegendSymbols()
        .rematerializeLegendLabels();
      if (config.titleVisible !== false) next = next.rematerializeLegendTitle();
      const hasHighlight = Object.values(
        next.materializationConfigs.highlights ?? {}
      ).some(highlight => highlight.target === config.target);
      if (hasHighlight) next = next.rematerializeLegendHighlights();
    }
    if (this.guideConfigs.legend?.size !== undefined) {
      next = next.rematerializeSizeLegend();
    }
    if (this.guideConfigs.legend?.gradient !== undefined) {
      next = next.rematerializeGradientLegend();
    }
    if (this.guideConfigs.legend?.interval !== undefined) {
      next = next.rematerializeIntervalLegend();
    }
    if (this.guideConfigs.legend?.opacity !== undefined) {
      next = next.rematerializeOpacityLegend();
    }
    return next;
  }
);

export const createCategoricalLegend = action(
  { op: "createCategoricalLegend", description: "Create one categorical legend block." },
  function (args = {}) {
    const layer = resolveTarget(this, args.target);
    const kind = resolveLegendKind(layer, args.channels);
    const options = normalizeOptions(args, kind);
    if (
      this.semanticSpec.guides.legend?.series !== undefined ||
      this.semanticSpec.guides.legend?.color !== undefined
    ) {
      throw new Error("createCategoricalLegend requires a missing legend.");
    }
    const definition = resolveDefinition(
      this,
      layer,
      options.channels,
      options.title
    );
    const config = {
      target: layer.id,
      ...definition,
      inferredTitle: !Object.hasOwn(args, "title"),
      position: options.position,
      align: options.align,
      direction: options.direction,
      columns: options.columns,
      offset: options.offset,
      titlePosition: options.titlePosition,
      symbol: options.symbol,
      labels: options.labels,
      titleStyle: options.titleStyle,
      itemGap: options.itemGap,
      bottomGrid: options.bottomGrid,
      border: options.border,
      titleVisible: true
    };
    resolveLayout(this, config);
    let next = this;
    if (kind === "series") {
      next = next
        .editSemantic({
          property: "guide.legend.series.channels",
          value: definition.channels
        })
        .editSemantic({
          property: "guide.legend.series.scales",
          value: definition.scales
        })
        .editSemantic({
          property: "guide.legend.series.title",
          value: definition.title
        });
    } else {
      next = next
        .editSemantic({
          property: "guide.legend.color.scale",
          value: definition.scales[0]
        })
        .editSemantic({
          property: "guide.legend.color.title",
          value: definition.title
        });
    }
    next = next._withLegendConfig(kind, config);
    if (config.border !== false) next = next.createLegendBackground();
    return next
      .createLegendSymbols()
      .createLegendLabels()
      .createLegendTitle();
  }
);

export const createLegend = action(
  { op: "createLegend", description: "Create an inferred legend for selected channels." },
  function (args = {}) {
    validateOptionObject(args, undefined, "createLegend");
    const channels = args.channels;
    if (channels !== undefined && !Array.isArray(channels)) {
      throw new TypeError("createLegend channels must be an array.");
    }
    const explicitSize = channels?.length === 1 && channels[0] === "size";
    const requestedSizeLayer = args.target === undefined
      ? undefined
      : findLayer(this, args.target);
    const sizeCandidates = this.semanticSpec.layers.filter(isSizeLegendPoint);
    const hasNonSizeLegendEncoding = layer =>
      ["color", "shape", "strokeDash", "opacity"].some(channel =>
        layer.encoding?.[channel]?.scale !== undefined
      );
    const hasNonSizeLegendCandidate = this.semanticSpec.layers.some(
      hasNonSizeLegendEncoding
    );
    const inferredSize = channels === undefined && (
      (args.target !== undefined && isSizeLegendPoint(requestedSizeLayer) &&
        !hasNonSizeLegendEncoding(requestedSizeLayer)) ||
      (args.target === undefined && sizeCandidates.length === 1 &&
        !hasNonSizeLegendCandidate)
    );
    if (explicitSize || inferredSize) {
      const {
        target,
        count,
        position,
        channels: _channels,
        ...unsupported
      } = args;
      const unsupportedKeys = Object.keys(unsupported);
      if (unsupportedKeys.length > 0) {
        throw new Error(
          `Standalone size legend does not support option "${unsupportedKeys[0]}".`
        );
      }
      if (position !== undefined && position !== "right") {
        throw new Error('Standalone size legends currently require position "right".');
      }
      return this.createSizeLegend({
        ...(target === undefined ? {} : { target }),
        ...(count === undefined ? {} : { count })
      });
    }
    const opacityCandidates = this.semanticSpec.layers.filter(layer =>
      layer.mark?.type === "point" && layer.encoding?.opacity?.scale !== undefined
    );
    const hasOtherLegendCandidate = this.semanticSpec.layers.some(layer =>
      ["color", "shape", "strokeDash", "size"].some(channel =>
        layer.encoding?.[channel]?.scale !== undefined
      )
    );
    if (
      (channels?.length === 1 && channels[0] === "opacity") ||
      (channels === undefined && opacityCandidates.length === 1 &&
        !hasOtherLegendCandidate)
    ) {
      return this.createOpacityLegend(args);
    }
    const continuousColorCandidates = this.semanticSpec.layers.filter(layer => {
      const encoding = ["point", "bar"].includes(layer.mark?.type)
        ? layer.encoding?.color
        : undefined;
      const scale = findSemanticScale(this, encoding?.scale);
      return scale?.type === "sequential";
    });
    const continuousColor = args.target === undefined
      ? continuousColorCandidates.length === 1
        ? continuousColorCandidates[0]
        : undefined
      : (() => {
          const layer = findLayer(this, args.target);
          return continuousColorCandidates.includes(layer) ? layer : undefined;
        })();
    if (
      (channels?.length === 1 && channels[0] === "color" && continuousColor) ||
      (channels === undefined && continuousColor)
    ) {
      return this.createGradientLegend(args);
    }
    const intervalColorCandidates = this.semanticSpec.layers.filter(layer => {
      const encoding = layer.mark?.type === "point" ? layer.encoding?.color : undefined;
      const scale = findSemanticScale(this, encoding?.scale);
      return ["quantize", "quantile", "threshold"].includes(scale?.type);
    });
    const intervalColor = args.target === undefined
      ? intervalColorCandidates.length === 1
        ? intervalColorCandidates[0]
        : undefined
      : (() => {
          const layer = findLayer(this, args.target);
          return intervalColorCandidates.includes(layer) ? layer : undefined;
        })();
    if (
      (channels?.length === 1 && channels[0] === "color" &&
        intervalColorCandidates.length > 0) ||
      (channels === undefined && intervalColorCandidates.length > 0)
    ) {
      return this.createIntervalLegend(args);
    }
    const wantsShape = channels?.includes("shape") === true;
    const pointCandidates = this.semanticSpec.layers.filter(layer =>
      layer.mark?.type === "point" &&
      layer.encoding?.shape?.scale !== undefined &&
      (wantsShape || layer.encoding?.color?.scale !== undefined)
    );
    const requestedPoint = args.target === undefined
      ? pointCandidates.length === 1 ? pointCandidates[0] : undefined
      : (() => {
          const layer = findLayer(this, args.target);
          return pointCandidates.includes(layer) ? layer : undefined;
        })();
    if (requestedPoint !== undefined) {
      const { count, ...categoricalArgs } = args;
      if (
        requestedPoint.encoding?.size?.scale !== undefined &&
        categoricalArgs.position !== undefined &&
        !["right", "left"].includes(categoricalArgs.position)
      ) {
        throw new Error(
          "Combined point series and size legends currently require a side position."
        );
      }
      const hasMatchingLine = this.semanticSpec.layers.some(candidate =>
        candidate.mark?.type === "line" &&
        candidate.encoding?.color?.field === requestedPoint.encoding.color.field &&
        candidate.encoding.color.scale === requestedPoint.encoding.color.scale
      );
      const symbol = categoricalArgs.symbol ?? {
        layers: [
          ...(hasMatchingLine
            ? [{ type: "line", length: 32, lineWidth: 3 }]
            : []),
          {
            type: "point",
            size: Math.sqrt(64 / Math.PI),
            stroke: "white",
            strokeWidth: 0
          }
        ]
      };
      const inferredChannels = ["color", "shape"].filter(
        channel => requestedPoint.encoding?.[channel]?.scale !== undefined
      );
      let next = this.createCategoricalLegend({
        ...categoricalArgs,
        target: requestedPoint.id,
        channels: categoricalArgs.channels ?? inferredChannels,
        symbol
      });
      if (requestedPoint.encoding?.size?.scale !== undefined) {
        next = next.createSizeLegend({
          target: requestedPoint.id,
          ...(count === undefined ? {} : { count }),
          inheritAppearance:
            categoricalArgs.position === "left" ||
            categoricalArgs.labels !== undefined ||
            categoricalArgs.titleStyle !== undefined
        });
        next = next.rematerializeLegend();
      }
      return next;
    }
    return this.createCategoricalLegend(args);
  }
);

export const removeCategoricalLegend = action(
  {
    op: "removeCategoricalLegend",
    description: "Remove the active categorical legend and its concrete components."
  },
  function (args = {}) {
    noOptions(args, "removeCategoricalLegend");
    const entries = ["series", "color"]
      .filter(kind => this.guideConfigs.legend?.[kind] !== undefined);
    if (entries.length === 0) return this;
    if (entries.length !== 1) {
      throw new Error("removeCategoricalLegend requires one active categorical legend.");
    }
    const kind = entries[0];
    const prefix = kind === "series" ? "seriesLegend" : "colorLegend";
    const targets = Object.keys(this.graphicSpec.objects)
      .filter(id => id.startsWith(prefix));
    let next = this.editSemantic({
      property: `guide.legend.${kind}`,
      remove: true
    });
    for (const target of targets) {
      next = next.editGraphics({ target, remove: true });
    }
    return next._withoutMaterializationConfig(["guides", "legend", kind]);
  }
);
