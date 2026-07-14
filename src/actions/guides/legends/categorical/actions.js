import { action } from "../../../../core/action.js";
import { cloneAndFreeze, isPlainObject } from "../../../../core/immutable.js";
import { noOptions, resolveLayout, activeConfig } from "./layout.js";
import { normalizeOptions } from "./options.js";
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
      if (config.border !== false) next = next.editLegendBackground();
      next = next
        .editLegendSymbols()
        .editLegendLabels()
        .editLegendTitle();
    }
    if (this.guideConfigs.legend?.size !== undefined) {
      next = next.rematerializeSizeLegend();
    }
    if (this.guideConfigs.legend?.gradient !== undefined) {
      next = next.rematerializeGradientLegend();
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
  { op: "createLegend", description: "Create an inferred legend for selected channels." },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("createLegend options must be a plain object.");
    }
    const channels = args.channels;
    if (channels !== undefined && !Array.isArray(channels)) {
      throw new TypeError("createLegend channels must be an array.");
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
      const encoding = layer.mark?.type === "point" ? layer.encoding?.color : undefined;
      const scale = this.semanticSpec.scales.find(candidate =>
        candidate.id === encoding?.scale
      );
      return scale?.type === "sequential";
    });
    const continuousColor = args.target === undefined
      ? continuousColorCandidates.length === 1
        ? continuousColorCandidates[0]
        : undefined
      : continuousColorCandidates.find(layer => layer.id === args.target);
    if (
      (channels?.length === 1 && channels[0] === "color" && continuousColor) ||
      (channels === undefined && continuousColor)
    ) {
      return this.createGradientLegend(args);
    }
    const wantsShape = channels?.includes("shape") === true;
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
    const { [kind]: semanticRemoved, ...semanticLegend } =
      this.semanticSpec.guides.legend ?? {};
    const { [kind]: configRemoved, ...legendConfigs } =
      this.guideConfigs.legend ?? {};
    void semanticRemoved;
    void configRemoved;
    const { legend: semanticLegendRoot, ...guidesWithoutLegend } =
      this.semanticSpec.guides;
    const guides = Object.keys(semanticLegend).length === 0
      ? guidesWithoutLegend
      : { ...guidesWithoutLegend, legend: semanticLegend };
    void semanticLegendRoot;
    const { legend: configLegendRoot, ...configsWithoutLegend } =
      this.materializationConfigs.guides;
    const guideConfigs = Object.keys(legendConfigs).length === 0
      ? configsWithoutLegend
      : { ...configsWithoutLegend, legend: legendConfigs };
    void configLegendRoot;
    const removed = new Set(
      Object.keys(this.graphicSpec.objects).filter(id => id.startsWith(prefix))
    );

    return this._clone({
      semanticSpec: cloneAndFreeze({
        ...this.semanticSpec,
        guides
      }),
      graphicSpec: cloneAndFreeze({
        objects: Object.fromEntries(
          Object.entries(this.graphicSpec.objects).filter(([id]) => !removed.has(id))
        ),
        order: this.graphicSpec.order.filter(id => !removed.has(id))
      }),
      materializationConfigs: cloneAndFreeze({
        ...this.materializationConfigs,
        guides: guideConfigs
      })
    });
  }
);
