import { isPlainObject } from "../../../../core/immutable.js";
import { noOptions } from "../../../../core/validation.js";
import { mapOrdinalValues } from "../../../../grammar/scales.js";

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

export function resolveLayout(program, config) {
  const bounds = program.context.currentGraphicBounds;
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

  const labels = config.domain.map(String);
  const itemWidths = labels.map(
    label => width + config.labels.offset + label.length * 7
  );
  const totalWidth = itemWidths.reduce((sum, value) => sum + value, 0) +
    config.itemGap * Math.max(0, count - 1);
  let start;
  if (config.align === "left") start = bounds.x;
  else if (config.align === "right") {
    start = bounds.x + bounds.width - totalWidth;
  } else start = (canvas.properties.width - totalWidth) / 2;
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
    const maxHeight = Math.max(
      config.labels.fontSize,
      ...config.symbol.layers.map(layer =>
        layer.type === "swatch"
          ? layer.height
          : layer.type === "point"
            ? layer.size * 2
            : layer.lineWidth
      )
    );
    const x = start - config.border.padding;
    const y = titleY - config.titleStyle.fontSize / 2 - config.border.padding;
    const backgroundWidth = totalWidth + config.border.padding * 2;
    const height = itemY[0] + maxHeight / 2 + config.border.padding - y;
    background = { x, y, width: backgroundWidth, height };
  }
  return { symbolX, itemY, labelX, titleX, titleY, background };
}

export function resolveAppearance(program, config) {
  let colors = config.domain.map(() => "#4c78a8");
  let dashes = config.domain.map(() => []);
  for (let index = 0; index < config.channels.length; index += 1) {
    const scale = program.resolvedScales[config.scales[index]];
    const values = mapOrdinalValues(config.domain, scale.domain, scale.range);
    if (config.channels[index] === "color") colors = values;
    if (config.channels[index] === "strokeDash") dashes = values;
  }
  return { colors, dashes };
}

export { noOptions };

export function layerFor(config, type) {
  const layer = config.symbol.layers.find(item => item.type === type);
  if (layer === undefined) {
    throw new Error(`Legend recipe does not contain a ${type} layer.`);
  }
  return layer;
}
