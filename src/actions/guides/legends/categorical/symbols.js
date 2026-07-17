import { action } from "../../../../core/action.js";
import {
  activeConfig,
  graphic,
  layerFor,
  noOptions,
  resolveAppearance,
  resolveLayout,
  symbolGraphic,
  symbolWidth
} from "./layout.js";
import { resolveLegendGraphicPlacement } from
  "../../../../materialization/graphicHierarchy.js";
import { createPointShapeGraphic } from "../../../../grammar/pointShapes.js";
import { resolveStoredSelection } from "../../../../materialization/selection/state.js";

function exactLegendSelection(program, config, highlight) {
  if (highlight.target !== config.target) return undefined;
  const resolved = resolveStoredSelection(program, highlight.selection);
  const selected = new Set(resolved.keys);
  const groups = config.domain.map(value =>
    resolved.items.filter(item => item.fields?.[config.field] === value)
  );
  if (
    groups.some(group => group.length === 0) ||
    resolved.items.some(item => !config.domain.includes(item.fields?.[config.field]))
  ) return undefined;
  const states = groups.map(group => {
    const count = group.filter(item => selected.has(item.key)).length;
    return count === 0 ? false : count === group.length ? true : undefined;
  });
  return states.includes(undefined) ? undefined : states;
}

function legendLayerStyle(layer, style) {
  if (layer.type === "line") {
    return Object.fromEntries(
      ["stroke", "strokeWidth", "strokeDash", "opacity"]
        .flatMap(key => Object.hasOwn(style, key) ? [[key, style[key]]] : [])
    );
  }
  if (layer.type === "swatch") {
    return Object.fromEntries(
      ["fill", "stroke", "strokeWidth", "opacity"]
        .flatMap(key => Object.hasOwn(style, key) ? [[key, style[key]]] : [])
    );
  }
  return Object.fromEntries(
    ["fill", "stroke", "strokeWidth", "opacity"]
      .flatMap(key => Object.hasOwn(style, key) ? [[key, style[key]]] : [])
  );
}

function makeEditSymbol(type) {
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  const op = `rematerializeLegendSymbol${suffix}`;
  return action(
    { op, description: `Rematerialize categorical legend ${type} symbols.` },
    function (args = {}) {
      noOptions(args, op);
      const { config } = activeConfig(this);
      const layer = layerFor(config, type);
      const id = symbolGraphic(config, type);
      const dynamicPoint = type === "point" && config.channels.includes("shape");
      const expected = dynamicPoint
        ? "collection"
        : { line: "line", point: "circle", swatch: "rect" }[type];
      if (this.graphicSpec.objects[id]?.type !== expected) {
        throw new Error(`${op} requires existing ${type} symbols.`);
      }
      const layout = resolveLayout(this, config);
      const appearance = resolveAppearance(this, config);
      let next = this;
      if (!dynamicPoint) {
        next = next.editGraphics({
          target: id,
          property: "length",
          value: config.domain.length
        });
      }
      if (type === "line") {
        const x1 = layout.symbolX.map(
          value => value + (symbolWidth(config) - layer.length) / 2
        );
        return next
          .editGraphics({ target: id, property: "x1", value: x1 })
          .editGraphics({ target: id, property: "y1", value: layout.itemY })
          .editGraphics({
            target: id,
            property: "x2",
            value: x1.map(value => value + layer.length)
          })
          .editGraphics({ target: id, property: "y2", value: layout.itemY })
          .editGraphics({ target: id, property: "stroke", value: appearance.colors })
          .editGraphics({ target: id, property: "strokeWidth", value: layer.lineWidth })
          .editGraphics({ target: id, property: "strokeDash", value: appearance.dashes });
      }
      if (type === "point") {
        const x = layout.symbolX.map(value => value + symbolWidth(config) / 2);
        if (dynamicPoint) {
          const items = config.domain.map((_, index) => {
            const fill = layer.fill ?? appearance.colors[index];
            return createPointShapeGraphic({
              shape: appearance.shapes[index],
              x: x[index],
              y: layout.itemY[index],
              area: Math.PI * layer.size ** 2,
              fill,
              stroke: layer.stroke,
              strokeWidth: layer.strokeWidth
            });
          });
          return next.editGraphics({
            target: id,
            property: "items",
            value: items
          });
        }
        return next
          .editGraphics({ target: id, property: "x", value: x })
          .editGraphics({ target: id, property: "y", value: layout.itemY })
          .editGraphics({ target: id, property: "radius", value: layer.size })
          .editGraphics({
            target: id,
            property: "fill",
            value: layer.fill ?? appearance.colors
          })
          .editGraphics({ target: id, property: "stroke", value: layer.stroke })
          .editGraphics({ target: id, property: "strokeWidth", value: layer.strokeWidth });
      }
      const x = layout.symbolX.map(
        value => value + (symbolWidth(config) - layer.width) / 2
      );
      return next
        .editGraphics({ target: id, property: "x", value: x })
        .editGraphics({
          target: id,
          property: "y",
          value: layout.itemY.map(value => value - layer.height / 2)
        })
        .editGraphics({ target: id, property: "width", value: layer.width })
        .editGraphics({ target: id, property: "height", value: layer.height })
        .editGraphics({ target: id, property: "fill", value: appearance.colors })
        .editGraphics({ target: id, property: "stroke", value: layer.stroke })
        .editGraphics({ target: id, property: "strokeWidth", value: layer.strokeWidth });
    }
  );
}

function makeCreateSymbol(type, edit) {
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  const op = `createLegendSymbol${suffix}`;
  return action(
    { op, description: `Create categorical legend ${type} symbols.` },
    function (args = {}) {
      noOptions(args, op);
      const { config } = activeConfig(this);
      layerFor(config, type);
      const id = symbolGraphic(config, type);
      if (this.graphicSpec.objects[id] !== undefined) {
        throw new Error(`${op} requires missing ${type} symbols.`);
      }
      const graphicType = type === "point" && config.channels.includes("shape")
        ? "collection"
        : { line: "line", point: "circle", swatch: "rect" }[type];
      return this
        .createGraphics({
          id,
          type: graphicType,
          ...resolveLegendGraphicPlacement(this),
          ...(this.graphicSpec.objects[graphic(config, "Labels")] === undefined
            ? {}
            : { before: graphic(config, "Labels") }),
          ...(graphicType === "collection"
            ? {}
            : { length: config.domain.length })
        })
        [edit]();
    }
  );
}

export const rematerializeLegendSymbolLines = makeEditSymbol("line");
export const rematerializeLegendSymbolPoints = makeEditSymbol("point");
export const rematerializeLegendSymbolSwatches = makeEditSymbol("swatch");
export const createLegendSymbolLines = makeCreateSymbol(
  "line",
  "rematerializeLegendSymbolLines"
);
export const createLegendSymbolPoints = makeCreateSymbol(
  "point",
  "rematerializeLegendSymbolPoints"
);
export const createLegendSymbolSwatches = makeCreateSymbol(
  "swatch",
  "rematerializeLegendSymbolSwatches"
);

export const createLegendSymbols = action(
  { op: "createLegendSymbols", description: "Create layered legend symbols." },
  function (args = {}) {
    noOptions(args, "createLegendSymbols");
    const { config } = activeConfig(this);
    let next = this;
    for (const layer of config.symbol.layers) {
      const operation = {
        line: "createLegendSymbolLines",
        point: "createLegendSymbolPoints",
        swatch: "createLegendSymbolSwatches"
      }[layer.type];
      next = next[operation]();
    }
    return next;
  }
);

export const rematerializeLegendSymbols = action(
  { op: "rematerializeLegendSymbols", description: "Rematerialize layered legend symbols." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendSymbols");
    const { config } = activeConfig(this);
    let next = this;
    for (const layer of config.symbol.layers) {
      const operation = {
        line: "rematerializeLegendSymbolLines",
        point: "rematerializeLegendSymbolPoints",
        swatch: "rematerializeLegendSymbolSwatches"
      }[layer.type];
      next = next[operation]();
    }
    return next;
  }
);

export const rematerializeLegendHighlights = action(
  {
    op: "rematerializeLegendHighlights",
    description: "Reflect exact categorical mark highlights in legend symbols."
  },
  function (args = {}) {
    noOptions(args, "rematerializeLegendHighlights");
    const hasCategorical =
      this.guideConfigs.legend?.series !== undefined ||
      this.guideConfigs.legend?.color !== undefined;
    if (!hasCategorical) return this;
    const { config } = activeConfig(this);
    const highlights = Object.values(
      this.materializationConfigs.highlights ?? {}
    ).map(highlight => ({
      highlight,
      states: exactLegendSelection(this, config, highlight)
    })).filter(entry => entry.states !== undefined);
    if (highlights.length === 0) return this;

    let next = this.rematerializeLegendSymbols();
    for (const { highlight, states } of highlights) {
      for (const layer of config.symbol.layers) {
        const id = symbolGraphic(config, layer.type);
        const graphic = next.graphicSpec.objects[id];
        const selectedStyle = legendLayerStyle(layer, highlight.style);
        const dimOpacity = highlight.dimOthers === false
          ? undefined
          : highlight.dimOthers.opacity;
        next = next.editGraphics({
          target: id,
          property: "items",
          value: graphic.items.map((child, index) => ({
            type: child.type ?? graphic.type,
            properties: states[index]
              ? { ...child.properties, ...selectedStyle }
              : dimOpacity === undefined
                ? child.properties
                : { ...child.properties, opacity: dimOpacity }
          }))
        });
      }
    }
    return next;
  }
);
