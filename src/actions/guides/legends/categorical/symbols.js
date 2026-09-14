import { editGraphicProperties } from "../../../primitives/graphicProperties.js";
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
import { resolveCategoricalLegendPlacement } from "../lifecycle.js";
import { createPointShapeGraphic } from "../../../../grammar/pointShapes.js";
import {
  materializeRectItem,
  requestedRectStyleDetails
} from "../../../../grammar/roundedRect.js";
import { requestedStrokeDetails } from "../../../../grammar/strokeStyle.js";
import { replaceGraphicItems } from "../../../primitives/editGraphics.js";

function applyLayerOpacity(program, id, opacity) {
  return opacity === undefined
    ? program
    : program.editGraphics({ target: id, property: "opacity", value: opacity });
}

function makeEditSymbol(type) {
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  const op = `rematerializeLegendSymbol${suffix}`;
  return action(
    { op, description: `Rematerialize categorical legend ${type} symbols.` },
    function (args = {}) {
      noOptions(args, op);
      const { config } = activeConfig(this, args.kind);
      const layer = layerFor(config, type);
      const id = symbolGraphic(config, type);
      const dynamicPoint = type === "point" && config.channels.includes("shape");
      const styledSwatch = type === "swatch" && Object.hasOwn(layer, "cornerRadius");
      const expected = dynamicPoint || styledSwatch
        ? "collection"
        : { line: "line", point: "circle", swatch: "rect" }[type];
      const actual = this.graphicSpec.objects[id]?.type;
      const compatibleStyledSwatch = styledSwatch && ["rect", "collection"].includes(actual);
      if (actual !== expected && !compatibleStyledSwatch) {
        throw new Error(`${op} requires existing ${type} symbols.`);
      }
      const layout = resolveLayout(this, config);
      const appearance = resolveAppearance(this, config);
      let next = this;
      if (!dynamicPoint && !styledSwatch) {
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
        next = editGraphicProperties(editGraphicProperties(editGraphicProperties(next, id, {
          x1: x1,
          y1: layout.itemY
        }), id, {
          x2: x1.map(value => value + layer.length),
          y2: layout.itemY
        })
          .editGraphics({
            target: id,
            property: "stroke",
            value: layer.stroke ?? (config.channels.includes("stroke")
              ? appearance.strokes
              : appearance.colors)
          }), id, {
          strokeWidth: layer.lineWidth,
          strokeDash: appearance.dashes
        });
        for (const [property, value] of Object.entries(
          requestedStrokeDetails(layer, "Legend line symbol")
        )) {
          next = next.editGraphics({ target: id, property, value });
        }
        return applyLayerOpacity(next, id, layer.opacity);
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
              stroke: config.channels.includes("stroke")
                ? appearance.strokes[index]
                : layer.stroke,
              strokeWidth: layer.strokeWidth,
              opacity: layer.opacity,
              ...requestedStrokeDetails(layer, "Legend point symbol")
            });
          });
          return next.editGraphics({
            target: id,
            property: "items",
            value: items
          });
        }
        next = editGraphicProperties(next, id, {
          x: x,
          y: layout.itemY,
          radius: layer.size,
          fill: layer.fill ?? appearance.colors
        })
          .editGraphics({
            target: id,
            property: "stroke",
            value: config.channels.includes("stroke")
              ? appearance.strokes
              : layer.stroke
          })
          .editGraphics({ target: id, property: "strokeWidth", value: layer.strokeWidth });
        for (const [property, value] of Object.entries(
          requestedStrokeDetails(layer, "Legend point symbol")
        )) {
          next = next.editGraphics({ target: id, property, value });
        }
        return applyLayerOpacity(next, id, layer.opacity);
      }
      const x = layout.symbolX.map(
        value => value + (symbolWidth(config) - layer.width) / 2
      );
      const details = requestedRectStyleDetails(layer, "Legend swatch symbol");
      const fills = layer.fill === undefined
        ? appearance.colors
        : config.domain.map(() => layer.fill);
      const strokes = config.channels.includes("stroke")
        ? appearance.strokes
        : config.domain.map(() => layer.stroke);
      return replaceGraphicItems(
        next,
        id,
        "rect",
        config.domain.map((_, index) => materializeRectItem({
          x: x[index],
          y: layout.itemY[index] - layer.height / 2,
          width: layer.width,
          height: layer.height,
          fill: fills[index],
          stroke: strokes[index],
          strokeWidth: layer.strokeWidth,
          ...(layer.opacity === undefined ? {} : { opacity: layer.opacity }),
          ...requestedStrokeDetails(details, "Legend swatch symbol")
        }, details.cornerRadius ?? 0))
      );
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
      const { config } = activeConfig(this, args.kind);
      const layer = layerFor(config, type);
      const id = symbolGraphic(config, type);
      if (this.graphicSpec.objects[id] !== undefined) {
        throw new Error(`${op} requires missing ${type} symbols.`);
      }
      const graphicType = type === "point" && config.channels.includes("shape") ||
        type === "swatch" && (layer.cornerRadius ?? 0) > 0
        ? "collection"
        : { line: "line", point: "circle", swatch: "rect" }[type];
      return this
        .createGraphics({
          id,
          type: graphicType,
          ...resolveCategoricalLegendPlacement(this),
          ...(this.graphicSpec.objects[graphic(config, "Labels")] === undefined
            ? {}
            : { before: graphic(config, "Labels") }),
          ...(graphicType === "collection"
            ? {}
            : { length: config.domain.length })
        })
        [edit]({ kind: config.kind });
    }
  );
}

export const rematerializeLegendSymbolLines = /* @__PURE__ */ makeEditSymbol("line");
export const rematerializeLegendSymbolPoints = /* @__PURE__ */ makeEditSymbol("point");
export const rematerializeLegendSymbolSwatches = /* @__PURE__ */ makeEditSymbol("swatch");
export const createLegendSymbolLines = /* @__PURE__ */ makeCreateSymbol(
  "line",
  "rematerializeLegendSymbolLines"
);
export const createLegendSymbolPoints = /* @__PURE__ */ makeCreateSymbol(
  "point",
  "rematerializeLegendSymbolPoints"
);
export const createLegendSymbolSwatches = /* @__PURE__ */ makeCreateSymbol(
  "swatch",
  "rematerializeLegendSymbolSwatches"
);

export const createLegendSymbols = /* @__PURE__ */ action(
  { op: "createLegendSymbols", description: "Create layered legend symbols." },
  function (args = {}) {
    noOptions(args, "createLegendSymbols");
    const { config } = activeConfig(this, args.kind);
    let next = this;
    for (const layer of config.symbol.layers) {
      const operation = {
        line: "createLegendSymbolLines",
        point: "createLegendSymbolPoints",
        swatch: "createLegendSymbolSwatches"
      }[layer.type];
      next = next[operation]({ kind: config.kind });
    }
    return next;
  }
);

export const rematerializeLegendSymbols = /* @__PURE__ */ action(
  { op: "rematerializeLegendSymbols", description: "Rematerialize layered legend symbols." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendSymbols");
    const { config } = activeConfig(this, args.kind);
    let next = this;
    for (const layer of config.symbol.layers) {
      const operation = {
        line: "rematerializeLegendSymbolLines",
        point: "rematerializeLegendSymbolPoints",
        swatch: "rematerializeLegendSymbolSwatches"
      }[layer.type];
      next = next[operation]({ kind: config.kind });
    }
    return next;
  }
);

export const rematerializeBasicLegendHighlights = /* @__PURE__ */ action(
  {
    op: "rematerializeLegendHighlights",
    description: "Reflect exact categorical mark highlights in legend symbols."
  },
  function (args = {}) {
    noOptions(args, "rematerializeLegendHighlights");
    return this;
  }
);
