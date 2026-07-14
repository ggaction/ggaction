import { isPlainObject } from "../../../../core/immutable.js";
import { noOptions } from "../../../../core/validation.js";
import { mapOrdinalValues } from "../../../../grammar/scales.js";
import { resolveGraphicBounds } from "../../../../layout/canvas.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";

export function activeConfig(program) {
  const entries = ["series", "color"]
    .filter(kind => program.guideConfigs.legend?.[kind] !== undefined)
    .map(kind => [kind, program.guideConfigs.legend[kind]]);
  if (entries.length !== 1) {
    throw new Error("Legend component requires one categorical legend config.");
  }
  return { kind: entries[0][0], config: entries[0][1] };
}

function prefix(config) {
  return config.kind === "series" ? "seriesLegend" : "colorLegend";
}

export function symbolGraphic(config, type) {
  const onlyDefault = config.symbol.layers.length === 1 &&
    ((config.kind === "series" && type === "line") ||
      (config.kind === "color" && type === "swatch"));
  if (onlyDefault) return `${prefix(config)}Symbols`;
  const suffix = { line: "Lines", point: "Points", swatch: "Swatches" }[type];
  return `${prefix(config)}Symbol${suffix}`;
}

export function graphic(config, component) {
  return `${prefix(config)}${component}`;
}

export function symbolWidth(config) {
  return Math.max(...config.symbol.layers.map(layer => {
    if (layer.type === "line") return layer.length;
    if (layer.type === "point") return layer.size * 2;
    return layer.width;
  }));
}

function symbolHeight(config) {
  return Math.max(...config.symbol.layers.map(layer => {
    if (layer.type === "swatch") return layer.height;
    if (layer.type === "point") return layer.size * 2;
    return layer.lineWidth;
  }));
}

function resolveGrid(config, width, count) {
  const labels = config.domain.map(String);
  const itemWidths = labels.map(
    label => width + config.labels.offset + label.length * 7
  );
  const columnCount = Math.min(config.columns ?? count, count);
  const rowCount = Math.ceil(count / columnCount);
  const cells = Array.from({ length: count }, (_, index) => {
    if (config.direction === "horizontal") {
      return { column: index % columnCount, row: Math.floor(index / columnCount) };
    }
    return {
      column: Math.floor(index / rowCount),
      row: index % rowCount
    };
  });
  const actualColumns = Math.max(...cells.map(cell => cell.column)) + 1;
  const actualRows = Math.max(...cells.map(cell => cell.row)) + 1;
  const columnWidths = Array.from({ length: actualColumns }, (_, column) =>
    Math.max(...cells
      .map((cell, index) => cell.column === column ? itemWidths[index] : 0))
  );
  const gridWidth = columnWidths.reduce((sum, value) => sum + value, 0) +
    config.itemGap * Math.max(0, actualColumns - 1);
  const rowHeight = Math.max(config.labels.fontSize, symbolHeight(config));
  const gridHeight = rowHeight * actualRows +
    config.itemGap * Math.max(0, actualRows - 1);
  return {
    cells,
    columnWidths,
    gridWidth,
    gridHeight,
    rowHeight
  };
}

function alignedStart(bounds, width, align) {
  if (align === "left") return bounds.x;
  if (align === "right") return bounds.x + bounds.width - width;
  return bounds.x + (bounds.width - width) / 2;
}

function resolveTopLayout(program, bounds, canvas, config, width, count) {
  const { cells, columnWidths, gridWidth, gridHeight, rowHeight } =
    resolveGrid(config, width, count);
  const titleWidth = config.title.length * 7;
  const titleGap = config.titlePosition === "left" ? 20 : 12;
  const totalWidth = config.titlePosition === "left"
    ? titleWidth + titleGap + gridWidth
    : Math.max(titleWidth, gridWidth);
  const start = alignedStart(bounds, totalWidth, config.align);
  if (start < 0 || start + totalWidth > canvas.properties.width) {
    throw new Error("Legend layout requires more horizontal Canvas space.");
  }
  const blockBottom = bounds.y - config.offset;
  const gridStart = config.titlePosition === "left"
    ? start + titleWidth + titleGap
    : start + (totalWidth - gridWidth) / 2;
  const gridTop = blockBottom - gridHeight;
  const blockTop = config.titlePosition === "left"
    ? Math.min(gridTop, blockBottom / 2 + gridTop / 2 - config.titleStyle.fontSize / 2)
    : gridTop - titleGap - config.titleStyle.fontSize;
  if (blockTop < 0) {
    throw new Error("Legend layout requires more top-margin space.");
  }
  const titleGraphic = program.graphicSpec.objects.chartSubtitle ??
    program.graphicSpec.objects.chartTitle;
  if (
    titleGraphic?.type === "text" &&
    titleGraphic.properties.y + titleGraphic.properties.fontSize / 2 >= blockTop
  ) {
    throw new Error("Top legend and chart title require more top-margin space.");
  }
  const columnX = [];
  let cursor = gridStart;
  for (const columnWidth of columnWidths) {
    columnX.push(cursor);
    cursor += columnWidth + config.itemGap;
  }
  const symbolX = cells.map(cell => columnX[cell.column]);
  const labelX = symbolX.map(value => value + width + config.labels.offset);
  const itemY = cells.map(cell =>
    gridTop + rowHeight / 2 + cell.row * (rowHeight + config.itemGap)
  );
  const titleX = config.titlePosition === "left"
    ? start
    : start + totalWidth / 2;
  const titleY = config.titlePosition === "left"
    ? gridTop + gridHeight / 2
    : gridTop - titleGap - config.titleStyle.fontSize / 2;
  let background;
  if (config.border !== false) {
    const x = start - config.border.padding;
    const y = blockTop - config.border.padding;
    const backgroundWidth = totalWidth + config.border.padding * 2;
    const height = blockBottom - blockTop + config.border.padding * 2;
    if (x < 0 || y < 0 || x + backgroundWidth > canvas.properties.width) {
      throw new Error("Legend background requires more top or horizontal space.");
    }
    background = { x, y, width: backgroundWidth, height };
  }
  return {
    symbolX,
    itemY,
    labelX,
    titleX,
    titleY,
    background,
    blockTop,
    blockBottom
  };
}

function resolveBottomLayout(program, bounds, canvas, config, width, count) {
  const { cells, columnWidths, gridWidth, gridHeight, rowHeight } =
    resolveGrid(config, width, count);
  const titleWidth = config.title.length * 7;
  const titleGap = config.titlePosition === "left" ? 20 : 12;
  const totalWidth = config.titlePosition === "left"
    ? titleWidth + titleGap + gridWidth
    : Math.max(titleWidth, gridWidth);
  const start = alignedStart(bounds, totalWidth, config.align);
  if (start < 0 || start + totalWidth > canvas.properties.width) {
    throw new Error("Legend layout requires more horizontal Canvas space.");
  }

  const blockTop = bounds.y + bounds.height + config.offset;
  const gridStart = config.titlePosition === "left"
    ? start + titleWidth + titleGap
    : start + (totalWidth - gridWidth) / 2;
  const gridTop = config.titlePosition === "left"
    ? blockTop
    : blockTop + config.titleStyle.fontSize + titleGap;
  const blockBottom = gridTop + gridHeight;
  const titleX = config.titlePosition === "left"
    ? start
    : start + totalWidth / 2;
  const titleY = config.titlePosition === "left"
    ? gridTop + gridHeight / 2
    : blockTop + config.titleStyle.fontSize / 2;

  const axisTitle = program.graphicSpec.objects.xAxisTitle;
  const occupiedTop = config.border === false
    ? blockTop
    : blockTop - config.border.padding;
  if (
    axisTitle?.type === "text" &&
    axisTitle.properties.y + axisTitle.properties.fontSize / 2 >= occupiedTop
  ) {
    throw new Error("Bottom legend and x-axis title require more bottom-margin space.");
  }
  const occupiedBottom = config.border === false
    ? blockBottom
    : blockBottom + config.border.padding;
  if (occupiedTop < 0 || occupiedBottom > canvas.properties.height) {
    throw new Error("Legend layout requires more bottom-margin space.");
  }

  const columnX = [];
  let cursor = gridStart;
  for (const columnWidth of columnWidths) {
    columnX.push(cursor);
    cursor += columnWidth + config.itemGap;
  }
  const symbolX = cells.map(cell => columnX[cell.column]);
  const labelX = symbolX.map(value => value + width + config.labels.offset);
  const itemY = cells.map(cell =>
    gridTop + rowHeight / 2 + cell.row * (rowHeight + config.itemGap)
  );
  let background;
  if (config.border !== false) {
    background = {
      x: start - config.border.padding,
      y: blockTop - config.border.padding,
      width: totalWidth + config.border.padding * 2,
      height: blockBottom - blockTop + config.border.padding * 2
    };
    if (
      background.x < 0 ||
      background.y < 0 ||
      background.x + background.width > canvas.properties.width ||
      background.y + background.height > canvas.properties.height
    ) {
      throw new Error("Legend background requires more bottom or horizontal space.");
    }
  }
  return {
    symbolX,
    itemY,
    labelX,
    titleX,
    titleY,
    background,
    blockTop,
    blockBottom
  };
}

function resolveCompactBottomLayout(bounds, canvas, config, width, count) {
  const labels = config.domain.map(String);
  const itemWidths = labels.map(
    label => width + config.labels.offset + label.length * 7
  );
  const totalWidth = itemWidths.reduce((sum, value) => sum + value, 0) +
    config.itemGap * Math.max(0, count - 1);
  const start = config.align === "center"
    ? (canvas.properties.width - totalWidth) / 2
    : alignedStart(bounds, totalWidth, config.align);
  if (start < 0 || start + totalWidth > canvas.properties.width) {
    throw new Error("Legend layout requires more horizontal Canvas space.");
  }
  const symbolX = [];
  const labelX = [];
  let cursor = start;
  for (let index = 0; index < count; index += 1) {
    symbolX.push(cursor);
    labelX.push(cursor + width + config.labels.offset);
    cursor += itemWidths[index] + config.itemGap;
  }
  const itemY = Array(count).fill(canvas.properties.height - 28);
  const titleX = start + totalWidth / 2;
  const titleY = canvas.properties.height - 52;
  if (titleY <= bounds.y + bounds.height) {
    throw new Error("Legend layout requires more bottom-margin space.");
  }
  let background;
  if (config.border !== false) {
    const maxHeight = Math.max(config.labels.fontSize, symbolHeight(config));
    const x = start - config.border.padding;
    const y = titleY - config.titleStyle.fontSize / 2 - config.border.padding;
    background = {
      x,
      y,
      width: totalWidth + config.border.padding * 2,
      height: itemY[0] + maxHeight / 2 + config.border.padding - y
    };
  }
  return { symbolX, itemY, labelX, titleX, titleY, background };
}

export function resolveLayout(program, config) {
  const bounds = resolveGraphicBounds(program);
  const canvas = program.graphicSpec.objects.canvas;
  if (
    bounds === undefined ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    canvas?.type !== "canvas" ||
    !Number.isFinite(canvas.properties.width) ||
    !Number.isFinite(canvas.properties.height)
  ) {
    throw new Error("Legend layout requires Canvas bounds, width, and height.");
  }

  const count = config.domain.length;
  const width = symbolWidth(config);
  if (config.position === "right") {
    const symbolX = Array(count).fill(bounds.x + bounds.width + 30);
    const itemY = Array.from(
      { length: count },
      (_, index) => bounds.y + 52 + index * config.itemGap
    );
    const labelX = symbolX.map(value => value + width + config.labels.offset);
    if (labelX.some(value => value >= canvas.properties.width)) {
      throw new Error("Legend layout requires more right-margin space.");
    }
    const titleX = symbolX[0];
    const titleY = bounds.y + 20;
    let background;
    if (config.border !== false) {
      const x = symbolX[0] - config.border.padding;
      const y = bounds.y + 8;
      const backgroundWidth =
        canvas.properties.width - x - config.border.padding;
      const height = itemY.at(-1) - y + config.border.padding;
      if (backgroundWidth <= 0 || height <= 0) {
        throw new Error("Legend background requires positive width and height.");
      }
      background = { x, y, width: backgroundWidth, height };
    }
    return { symbolX, itemY, labelX, titleX, titleY, background };
  }

  if (config.position === "top") {
    return resolveTopLayout(program, bounds, canvas, config, width, count);
  }

  if (config.bottomGrid !== true) {
    return resolveCompactBottomLayout(bounds, canvas, config, width, count);
  }
  return resolveBottomLayout(program, bounds, canvas, config, width, count);
}

export function resolveAppearance(program, config) {
  let colors = config.domain.map(() => DEFAULT_COLORS.mark);
  let dashes = config.domain.map(() => []);
  let shapes = config.domain.map(() => "circle");
  for (let index = 0; index < config.channels.length; index += 1) {
    const scale = program.resolvedScales[config.scales[index]];
    const values = mapOrdinalValues(config.domain, scale.domain, scale.range);
    if (config.channels[index] === "color") colors = values;
    if (config.channels[index] === "strokeDash") dashes = values;
    if (config.channels[index] === "shape") shapes = values;
  }
  return { colors, dashes, shapes };
}

export { noOptions };

export function layerFor(config, type) {
  const layer = config.symbol.layers.find(item => item.type === type);
  if (layer === undefined) {
    throw new Error(`Legend recipe does not contain a ${type} layer.`);
  }
  return layer;
}
