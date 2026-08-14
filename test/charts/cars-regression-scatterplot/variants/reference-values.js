import { createCarsRegressionScatterplotValues } from "../reference-values.js";

const LAYOUT = Object.freeze({
  width: 760,
  height: 480,
  margin: Object.freeze({ top: 40, right: 80, bottom: 70, left: 190 })
});

const LEGEND = Object.freeze({
  originX: 31.66720000000001,
  offset: 80,
  padding: 10,
  background: Object.freeze({
    x: 20.16720000000001,
    y: 43,
    width: 99.83279999999999,
    height: 325.8986541696686,
    fill: "#f8fafc",
    stroke: "#94a3b8",
    strokeWidth: 1
  }),
  labelStyle: Object.freeze({
    fill: "#475569",
    fontSize: 12,
    fontFamily: "sans-serif",
    fontWeight: "normal"
  }),
  titleStyle: Object.freeze({
    fill: "#0f172a",
    fontSize: 14,
    fontFamily: "sans-serif",
    fontWeight: 700
  })
});

function translateSymbol(symbol, sourceX, targetX) {
  const properties = structuredClone(symbol.properties);
  if (Number.isFinite(properties.x)) {
    properties.x = targetX + (properties.x - sourceX);
  }
  if (Array.isArray(properties.commands)) {
    properties.commands = properties.commands.map(command =>
      Number.isFinite(command.x)
        ? { ...command, x: targetX + (command.x - sourceX) }
        : { ...command }
    );
  }
  return { type: symbol.type, properties };
}

export function createLeftLegendPrimitiveValues(cars) {
  const chart = createCarsRegressionScatterplotValues(cars, LAYOUT);
  const sourceOriginX = chart.legends.origin.title.x;
  const originItems = chart.legends.origin.items.map(item => ({
    ...item,
    line: {
      ...item.line,
      x1: LEGEND.originX,
      x2: LEGEND.originX + 32
    },
    symbol: translateSymbol(item.symbol, sourceOriginX, LEGEND.originX),
    label: { ...item.label, x: LEGEND.originX + 44 }
  }));
  const sizeItems = chart.legends.size.items.map(item => ({
    ...item,
    symbol: { ...item.symbol, x: LEGEND.originX + 16 },
    label: { ...item.label, x: LEGEND.originX + 44 }
  }));

  return Object.freeze({
    layout: LAYOUT,
    chart,
    legend: Object.freeze({
      ...LEGEND,
      origin: Object.freeze({
        title: Object.freeze({
          ...chart.legends.origin.title,
          x: LEGEND.originX
        }),
        items: Object.freeze(originItems)
      }),
      size: Object.freeze({
        title: Object.freeze({
          ...chart.legends.size.title,
          x: LEGEND.originX
        }),
        items: Object.freeze(sizeItems)
      })
    })
  });
}
