import { textBoundsFitCanvas } from "../core/textMetrics.js";
import { resolveConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { alignedTextAnchor, alignedTitleAnchor, buildTitleReadingBlock, paintedTitleComponent, resolveTitleComponentBounds, titleTextProperties } from "../layout/title.js";
const TITLE_IDS = ["chartTitle", "chartSubtitle"];
export function compositionTitleLayout(program) {
  if (program.semanticSpec.title.text === undefined) {
    return { height: 0 };
  }
  const config = program.titleConfig;
  if (config === undefined) {
    throw new Error("Composition title requires chart title configuration.");
  }
  const block = buildTitleReadingBlock({
    text: program.semanticSpec.title.text,
    subtitle: program.semanticSpec.title.subtitle
  }, config, program.materializationConfigs.textMetrics);
  const top = 8 + config.offset;
  if (top < 0) {
    throw new Error("Composition title offset places text outside the Canvas.");
  }
  const reservation = Math.ceil(top + block.height);
  return { config, block, top, reservation, height: config.position === "top" ? reservation : 0 };
}

function materializeTitleComponent(program, id, lines, centers, style, plot, title) {
  if (lines.length === 0) return program;
  const { config, block, top } = title;
  const canvas = program.graphicSpec.objects.canvas.properties;
  const horizontal = ["top", "bottom"].includes(config.position);
  const component = paintedTitleComponent(horizontal ? {
    x: alignedTextAnchor(plot.x, plot.width, config.align) + (config.alongOffset ?? 0),
    y: centers.map(center => (config.position === "top" ? top : canvas.height - top - block.height) + center),
    lines, textAlign: config.align,
    ...(config.position === "bottom" ? { rotation: 0, explicitRotation: true } : {})
  } : {
    x: centers.map(center => config.position === "left" ? top + center : canvas.width - top - center),
    y: alignedTitleAnchor(plot.y, plot.height, block.width, config.align) + (config.alongOffset ?? 0),
    lines, textAlign: "center", rotation: config.position === "left" ? -Math.PI / 2 : Math.PI / 2,
    explicitRotation: true
  });
  const bounds = resolveTitleComponentBounds(component, style, program.materializationConfigs.textMetrics);
  if (!textBoundsFitCanvas(bounds, program.graphicSpec.objects.canvas.properties)) {
    throw new Error("Composition title places text outside the Canvas.");
  }
  const count = component.lines.length;
  let next = program.createGraphics({
    id,
    type: "text",
    ...(count > 1 ? { length: count } : {}),
    parent: "canvas"
  });
  for (const [property, value] of Object.entries({ ...titleTextProperties(component, style),
    ...(component.explicitRotation ? { rotation: component.rotation } : {})
  })) {
    next = next.editGraphics({ target: id, property, value });
  }
  return next;
}

export function materializeCompositionTitle(program, plot, title) {
  if (title.config.position === "top" && program.compositionSpec.topLane !== "shared") {
    // Child Canvas margins already reserve space above visible chart content.
    // Anchor against the retained ink instead of adding that empty space to
    // the title gap. Keep child placements, authored margins and the explicit
    // shared top-lane contract intact.
    let edge = plot.y;
    for (const [id, object] of Object.entries(program.graphicSpec.objects)) {
      if (TITLE_IDS.includes(id) || object.type === "canvas" || object.children?.length ||
          object.properties?.opacity === 0) continue;
      const bounds = resolveConcreteGraphicBounds(program.graphicSpec, id, program.materializationConfigs.textMetrics);
      if (bounds) edge = Math.min(edge, bounds.top);
    }
    title = { ...title, top: Math.max(title.top, edge - 16 - title.block.height) };
  }
  let next = materializeTitleComponent(
    program,
    TITLE_IDS[0],
    title.block.titleLines,
    title.block.titleCenters,
    title.config.titleStyle,
    plot,
    title
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      TITLE_IDS[1],
      title.block.subtitleLines,
      title.block.subtitleCenters,
      title.config.subtitleStyle,
      plot,
      title
    );
  }
  return next;
}

