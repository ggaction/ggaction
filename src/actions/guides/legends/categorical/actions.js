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
    const { kind, config } = activeConfig(this);
    const definition = resolveCurrentDefinition(this, config);
    let next = sameValues(config.domain, definition.domain)
      ? this
      : this._withLegendConfig(kind, { ...config, domain: definition.domain });
    if (config.border !== false) next = next.editLegendBackground();
    return next
      .editLegendSymbols()
      .editLegendLabels()
      .editLegendTitle();
  }
);

export const createCategoricalLegend = action(
  { op: "createCategoricalLegend", description: "Create one categorical legend block." },
  function (args = {}) {
    const layer = resolveTarget(this, args.target);
    const kind = layer.mark.type === "bar" ? "color" : "series";
    const groupedBar =
      layer.mark.type === "bar" &&
      layer.encoding?.x?.fieldType === "ordinal" &&
      layer.encoding?.y?.aggregate === "mean" &&
      layer.encoding.y.stack === null &&
      layer.encoding?.xOffset?.field === layer.encoding?.color?.field;
    const options = normalizeOptions(
      args,
      kind,
      groupedBar ? "right" : undefined
    );
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
    return this.createCategoricalLegend(args);
  }
);
