import { mapLinear as mapValue } from "./numeric.js";

export function requireRegressionLayout({ width, height, margin, sizeRange }) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new TypeError(
      "Regression scatterplot layout requires positive finite dimensions."
    );
  }
  if (
    margin === null ||
    typeof margin !== "object" ||
    ![margin.top, margin.right, margin.bottom, margin.left].every(
      value => Number.isFinite(value) && value >= 0
    )
  ) {
    throw new TypeError(
      "Regression scatterplot layout requires four non-negative margins."
    );
  }
  if (
    !Array.isArray(sizeRange) ||
    sizeRange.length !== 2 ||
    !sizeRange.every(value => Number.isFinite(value) && value >= 0) ||
    sizeRange[0] > sizeRange[1]
  ) {
    throw new TypeError(
      "Regression scatterplot sizeRange must be an ascending non-negative pair."
    );
  }

  const bounds = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(
      "Regression scatterplot margins must leave positive plot bounds."
    );
  }
  return bounds;
}

export function createRegressionPointChild(row, index, config) {
  const groupIndex = config.groupDomain.indexOf(row[config.groupField]);
  const shape = config.shapeRange[groupIndex % config.shapeRange.length];
  const fill = config.colorRange[groupIndex % config.colorRange.length];
  const centerX = mapValue(row[config.xField], config.xDomain, config.xRange);
  const centerY = mapValue(row[config.yField], config.yDomain, config.yRange);
  const area = mapValue(row[config.yField], config.sizeDomain, config.sizeRange);
  const shared = { fill, opacity: 0.27 };

  if (shape === "circle") {
    return {
      row: index,
      group: row[config.groupField],
      value: row[config.yField],
      type: "circle",
      properties: {
        x: centerX,
        y: centerY,
        radius: Math.sqrt(area / Math.PI),
        ...shared
      }
    };
  }

  if (shape === "diamond") {
    const radius = Math.sqrt(area / 2);
    return {
      row: index,
      group: row[config.groupField],
      value: row[config.yField],
      type: "path",
      properties: {
        commands: [
          { op: "M", x: centerX, y: centerY - radius },
          { op: "L", x: centerX + radius, y: centerY },
          { op: "L", x: centerX, y: centerY + radius },
          { op: "L", x: centerX - radius, y: centerY },
          { op: "Z" }
        ],
        ...shared
      }
    };
  }

  const side = Math.sqrt(area);
  return {
    row: index,
    group: row[config.groupField],
    value: row[config.yField],
    type: "rect",
    properties: {
      x: centerX - side / 2,
      y: centerY - side / 2,
      width: side,
      height: side,
      ...shared,
      stroke: fill,
      strokeWidth: 0
    }
  };
}
