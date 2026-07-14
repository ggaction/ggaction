import { action } from "../../../../core/action.js";
import { isPlainObject } from "../../../../core/immutable.js";
import { noOptions, resolveLayout, activeConfig } from "./layout.js";
import { normalizeOptions } from "./options.js";
import {
  resolveCurrentDefinition,
  resolveDefinition,
  resolveTarget,
  sameValues
} from "./resolve.js";

export const rematerializeLegend = action(
  { op: "rematerializeLegend", description: "Rematerialize every categorical legend component." },
  function (args = {}) {
    noOptions(args, "rematerializeLegend");
    let next = this;
    const hasCategorical =
      this.guideConfigs.legend?.series !== undefined ||
      this.guideConfigs.legend?.color !== undefined;
    if (hasCategorical) {
      const { kind, config } = activeConfig(this);
      const definition = resolveCurrentDefinition(this, config);
      next = sameValues(config.domain, definition.domain)
        ? this
        : this._withLegendConfig(kind, {
            ...config,
            domain: definition.domain
          });
      if (config.border !== false) next = next.editLegendBackground();
      next = next
        .editLegendSymbols()
        .editLegendLabels()
        .editLegendTitle();
    }
    if (this.guideConfigs.legend?.size !== undefined) {
      next = next.rematerializeSizeLegend();
    }
    return next;
  }
);

export const createCategoricalLegend = action(
  { op: "createCategoricalLegend", description: "Create one categorical legend block." },
  function (args = {}) {
    const layer = resolveTarget(this, args.target);
    const kind = ["bar", "area"].includes(layer.mark.type) ? "color" : "series";
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
      border: options.border
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
  { op: "createLegend", description: "Create an inferred categorical legend." },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("createLegend options must be a plain object.");
    }
    const wantsShape = args.channels?.includes("shape") === true;
    const pointCandidates = this.semanticSpec.layers.filter(layer =>
      layer.mark?.type === "point" &&
      layer.encoding?.shape?.scale !== undefined &&
      (wantsShape || layer.encoding?.color?.scale !== undefined)
    );
    const requestedPoint = args.target === undefined
      ? pointCandidates.length === 1 ? pointCandidates[0] : undefined
      : pointCandidates.find(layer => layer.id === args.target);
    if (requestedPoint !== undefined) {
      const { count, ...categoricalArgs } = args;
      if (
        requestedPoint.encoding?.size?.scale !== undefined &&
        categoricalArgs.position !== undefined &&
        categoricalArgs.position !== "right"
      ) {
        throw new Error(
          "Combined point series and size legends currently require right position."
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
          ...(count === undefined ? {} : { count })
        });
      }
      return next;
    }
    return this.createCategoricalLegend(args);
  }
);
