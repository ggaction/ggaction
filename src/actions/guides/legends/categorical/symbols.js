import { action } from "../../../../core/action.js";
import {
  activeConfig,
  layerFor,
  noOptions,
  resolveAppearance,
  resolveLayout,
  symbolGraphic,
  symbolWidth
} from "./layout.js";
import { createPointShapeGraphic } from "../../../../grammar/pointShapes.js";

function makeEditSymbol(type) {
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  const op = `editLegendSymbol${suffix}`;
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
          const children = config.domain.map((_, index) => {
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
            property: "children",
            value: children
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
          ...(graphicType === "collection"
            ? {}
            : { length: config.domain.length })
        })
        [edit]();
    }
  );
}

export const editLegendSymbolLines = makeEditSymbol("line");
export const editLegendSymbolPoints = makeEditSymbol("point");
export const editLegendSymbolSwatches = makeEditSymbol("swatch");
export const createLegendSymbolLines = makeCreateSymbol(
  "line",
  "editLegendSymbolLines"
);
export const createLegendSymbolPoints = makeCreateSymbol(
  "point",
  "editLegendSymbolPoints"
);
export const createLegendSymbolSwatches = makeCreateSymbol(
  "swatch",
  "editLegendSymbolSwatches"
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

export const editLegendSymbols = action(
  { op: "editLegendSymbols", description: "Rematerialize layered legend symbols." },
  function (args = {}) {
    noOptions(args, "editLegendSymbols");
    const { config } = activeConfig(this);
    let next = this;
    for (const layer of config.symbol.layers) {
      const operation = {
        line: "editLegendSymbolLines",
        point: "editLegendSymbolPoints",
        swatch: "editLegendSymbolSwatches"
      }[layer.type];
      next = next[operation]();
    }
    return next;
  }
);
