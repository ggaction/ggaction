import { isPlainObject } from "../../../../core/immutable.js";
import { noOptions } from "../../../../core/validation.js";
import { mapOrdinalValues } from "../../../../grammar/scales/index.js";
import { DEFAULT_COLORS } from "../../../../theme/defaults.js";
import { formatVisibleText } from "../../../../core/textMetrics.js";
import {
  assertLegendBoundsInsideCanvas,
  resolveContinuousBounds,
  resolveLegendBackgroundFromBounds,
  resolveLegendTextBounds
} from "../continuous/common.js";
import {
  alignLegendStart,
  measureLegendSymbolHeight,
  measureLegendTextWidth,
  resolveLegendGrid
} from "../../../../layout/legend.js";

export function activeConfig(program) {
  const kinds = ["series", "color"]
    .filter(kind => program.guideConfigs.legend?.[kind] !== undefined);
  if (kinds.length !== 1) {
    throw new Error("Legend component requires one categorical legend config.");
  }
  const kind = kinds[0];
  return { kind, config: program.guideConfigs.legend[kind] };
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

function textBounds(x, y, value, style, textAlign = "left") {
  return resolveLegendTextBounds(
    { x, y, align: textAlign },
    formatVisibleText(value),
    style
  );
}

function resolveLeftLayout(bounds, canvas, config, width, count) {
  const padding = config.border === false ? 0 : config.border.padding;
  const categoricalWidth = config.domain.reduce((maximum, value) => Math.max(
    maximum,
      width + config.labels.offset +
        measureLegendTextWidth(value, config.labels)
  ), config.titleVisible === false
    ? 0
    : measureLegendTextWidth(config.title, config.titleStyle));
  const contentWidth = categoricalWidth;
  const occupiedRight = bounds.x - config.offset;
  const contentRight = occupiedRight - padding;
  const start = contentRight - contentWidth;
  if (start < padding) {
    throw new Error("Legend layout requires more left-margin space.");
  }
  const symbolX = Array(count).fill(start);
  const itemY = Array.from(
    { length: count },
    (_, index) => bounds.y + 52 + index * config.itemGap
  );
  const labelX = symbolX.map(value => value + width + config.labels.offset);
  const titleX = start;
  const titleY = bounds.y + 20;
  const categoricalTop = config.titleVisible === false
    ? itemY[0] - Math.max(
        config.labels.fontSize,
        measureLegendSymbolHeight(config)
      ) / 2
    : titleY - config.titleStyle.fontSize / 2;
  const categoricalBottom = itemY.at(-1) +
    Math.max(config.labels.fontSize, measureLegendSymbolHeight(config)) / 2;
  const blockTop = categoricalTop;
  const blockBottom = categoricalBottom;
  if (blockTop < 0 || blockBottom > canvas.height) {
    throw new Error("Legend layout requires more vertical Canvas space.");
  }
  let background;
  if (config.border !== false) {
    const backgroundTop = Math.floor(
      blockTop - config.border.padding - config.border.lineWidth
    );
    const backgroundBottom = Math.ceil(blockBottom + config.border.padding);
    background = {
      x: start - config.border.padding,
      y: backgroundTop,
      width: occupiedRight - (start - config.border.padding),
      height: backgroundBottom - backgroundTop
    };
    if (
      background.x < 0 || background.y < 0 ||
      background.x + background.width > canvas.width ||
      background.y + background.height > canvas.height
    ) {
      throw new Error("Legend background requires more left-margin space.");
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

function resolveGridLayout(bounds, canvas, config, width, count, top) {
  const { cells, columnWidths, gridWidth, gridHeight, rowHeight } =
    resolveLegendGrid(config, width, count);
  const titleVisible = config.titleVisible !== false;
  const inlineTitle = titleVisible && config.titlePosition === "left";
  const titleWidth = !titleVisible
    ? 0
    : measureLegendTextWidth(config.title, config.titleStyle);
  const titleHeight = titleVisible ? config.titleStyle.fontSize : 0;
  const titleGap = titleVisible ? (inlineTitle ? 20 : 12) : 0;
  const totalWidth = inlineTitle
    ? titleWidth + titleGap + gridWidth
    : Math.max(titleWidth, gridWidth);
  const start = alignLegendStart(bounds, totalWidth, config.align);
  if (start < 0 || start + totalWidth > canvas.width) {
    throw new Error("Legend layout requires more horizontal Canvas space.");
  }
  const edge = top
    ? bounds.y - config.offset
    : bounds.y + bounds.height + config.offset;
  const gridStart = inlineTitle
    ? start + titleWidth + titleGap
    : start + (totalWidth - gridWidth) / 2;
  const gridTop = top
    ? edge - gridHeight
    : inlineTitle ? edge : edge + titleHeight + titleGap;
  const blockTop = top
    ? inlineTitle
      ? Math.min(
          gridTop,
          edge / 2 + gridTop / 2 - titleHeight / 2
        )
      : gridTop - titleGap - titleHeight
    : edge;
  const blockBottom = top ? edge : gridTop + gridHeight;
  if (top) {
    if (blockTop < 0) {
      throw new Error("Legend layout requires more top-margin space.");
    }
  } else {
    const occupiedTop = config.border === false
      ? blockTop
      : blockTop - config.border.padding;
    const occupiedBottom = config.border === false
      ? blockBottom
      : blockBottom + config.border.padding;
    if (occupiedTop < 0 || occupiedBottom > canvas.height) {
      throw new Error("Legend layout requires more bottom-margin space.");
    }
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
  const titleX = inlineTitle ? start : start + totalWidth / 2;
  const titleY = inlineTitle
    ? gridTop + gridHeight / 2
    : top
      ? gridTop - titleGap - titleHeight / 2
      : blockTop + titleHeight / 2;
  let background;
  if (config.border !== false) {
    background = {
      x: start - config.border.padding,
      y: blockTop - config.border.padding,
      width: totalWidth + config.border.padding * 2,
      height: blockBottom - blockTop + config.border.padding * 2
    };
    if (background.x < 0 || background.y < 0 ||
      background.x + background.width > canvas.width ||
      (!top && background.y + background.height > canvas.height)) {
      throw new Error(`Legend background requires more ${top ? "top" : "bottom"} or horizontal space.`);
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
  const labels = config.domain.map(formatVisibleText);
  const itemWidths = labels.map(
    label => width + config.labels.offset +
      measureLegendTextWidth(label, config.labels)
  );
  const totalWidth = itemWidths.reduce((sum, value) => sum + value, 0) +
    config.itemGap * Math.max(0, count - 1);
  const start = config.align === "center"
    ? (canvas.width - totalWidth) / 2
    : alignLegendStart(bounds, totalWidth, config.align);
  if (start < 0 || start + totalWidth > canvas.width) {
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
  const itemY = Array(count).fill(canvas.height - 28);
  const titleX = start + totalWidth / 2;
  const titleY = canvas.height - 52;
  const maxHeight = Math.max(config.labels.fontSize, measureLegendSymbolHeight(config));
  const itemTop = itemY[0] - maxHeight / 2;
  if ((config.titleVisible === false ? itemTop : titleY) <= bounds.y + bounds.height) {
    throw new Error("Legend layout requires more bottom-margin space.");
  }
  if (config.titleVisible !== false) {
    assertLegendBoundsInsideCanvas(
      [textBounds(titleX, titleY, config.title, config.titleStyle, "center")],
      canvas,
      "Legacy bottom legend title"
    );
  }
  let background;
  if (config.border !== false) {
    const x = start - config.border.padding;
    const y = (config.titleVisible === false ? itemTop : titleY - config.titleStyle.fontSize / 2)
      - config.border.padding;
    background = {
      x,
      y,
      width: totalWidth + config.border.padding * 2,
      height: itemY[0] + maxHeight / 2 + config.border.padding - y
    };
    if (
      background.x < 0 || background.y < 0 ||
      background.x + background.width > canvas.width ||
      background.y + background.height > canvas.height
    ) {
      throw new Error("Legend background requires more bottom or horizontal space.");
    }
  }
  return { symbolX, itemY, labelX, titleX, titleY, background };
}

export function resolveLayout(program, config) {
  const resolved = resolveContinuousBounds(
    program,
    "Legend layout requires Canvas bounds, width, and height."
  );
  const bounds = resolved.plot;
  const canvas = resolved.canvas;

  const count = config.domain.length;
  const width = symbolWidth(config);
  if (config.position === "right") {
    const symbolX = Array(count).fill(
      bounds.x + bounds.width + config.offset
    );
    const itemY = Array.from(
      { length: count },
      (_, index) => bounds.y + 52 + index * config.itemGap
    );
    const labelX = symbolX.map(value => value + width + config.labels.offset);
    const titleX = symbolX[0];
    const titleY = bounds.y + 20;
    const labelBounds = config.domain.map((value, index) => textBounds(
      labelX[index], itemY[index], value, config.labels
    ));
    const titleBounds = config.titleVisible === false
      ? undefined
      : textBounds(titleX, titleY, config.title, config.titleStyle);
    const symbolHeight = measureLegendSymbolHeight(config);
    const symbolBounds = itemY.map(y => ({
      left: symbolX[0],
      right: symbolX[0] + width,
      top: y - symbolHeight / 2,
      bottom: y + symbolHeight / 2
    }));
    const contentBounds = [
      ...labelBounds,
      ...symbolBounds,
      ...(titleBounds === undefined ? [] : [titleBounds])
    ];
    assertLegendBoundsInsideCanvas(
      contentBounds,
      canvas,
      "Right legend layout"
    );
    const background = resolveLegendBackgroundFromBounds(
      contentBounds,
      config.border,
      canvas,
      "Right legend"
    );
    return { symbolX, itemY, labelX, titleX, titleY, background };
  }

  if (config.position === "left") {
    return resolveLeftLayout(bounds, canvas, config, width, count);
  }

  if (config.position === "top") {
    return resolveGridLayout(bounds, canvas, config, width, count, true);
  }

  if (config.layout === "legacy-bottom") {
    return resolveCompactBottomLayout(bounds, canvas, config, width, count);
  }
  return resolveGridLayout(bounds, canvas, config, width, count, false);
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
