import { annotateError } from "../core/diagnostics.js";
import { createGraphicBounds } from "../layout/canvas.js";
import { evaluateResponsiveLayout, RESPONSIVE_ITERATIONS } from "../layout/responsivePolicy.js";
import { unionConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { resolveGuideCollisionBlocks } from "./guides/resources.js";
import { planCanvasRematerialization } from "./layout.js";
import { applyMaterializationPlan } from "./planner.js";

const toBounds = plot => ({ left: plot.x, right: plot.x + plot.width,
  top: plot.y, bottom: plot.y + plot.height });

function measuredPass(program, plot) {
  const graphic = program.graphicSpec, canvas = graphic.objects.canvas;
  const ids = graphic.order.flatMap(id => id === "canvas" ? canvas.children ?? [] : [id]);
  const occupied = unionConcreteGraphicBounds(graphic, ids, program.materializationConfigs.textMetrics) ?? plot;
  const blocks = resolveGuideCollisionBlocks(graphic, program.guideConfigs,
    program.titleConfig, program.materializationConfigs.textMetrics);
  return { plot, occupied, lanes: blocks.map(block => ({
    id: JSON.stringify([block.id, block.position]), bounds: block.bounds
  })) };
}

function nextPlot(pass, canvas, margin) {
  const plot = pass.plot, occupied = pass.occupied;
  const reserve = (side, required) => Math.max(margin[side], Math.ceil(required * 4) / 4);
  const reservation = {
    left: reserve("left", plot.left - occupied.left),
    right: reserve("right", occupied.right - plot.right),
    top: reserve("top", plot.top - occupied.top),
    bottom: reserve("bottom", occupied.bottom - plot.bottom)
  };
  return { left: reservation.left, right: canvas.width - reservation.right,
    top: reservation.top, bottom: canvas.height - reservation.bottom };
}

function failure(result, reason = result.reason) {
  return annotateError(new Error(`Responsive layout is unsatisfied (${reason}).`), {
    reason: "layout-unsatisfied", layout: { ...result, status: "unsatisfied", reason }
  });
}

// Every candidate replays the original domain action; no intermediate program
// or authored margin escapes. Scale ranges are prepared before its preflight.
export function withResponsiveLayout(program, apply) {
  const config = program.materializationConfigs.canvas;
  const canvas = program.graphicSpec.objects.canvas.properties;
  const options = { canvas: { width: canvas.width, height: canvas.height }, minPlotSize: config.responsive.minPlotSize };
  let plot = toBounds(createGraphicBounds({ ...canvas, margin: config.margin }));
  if (plot.right - plot.left < options.minPlotSize.width || plot.bottom - plot.top < options.minPlotSize.height) {
    throw failure(evaluateResponsiveLayout([{ plot, occupied: plot, lanes: [] }], options), "insufficient-space");
  }
  const passes = [];
  for (let iteration = 0; iteration < RESPONSIVE_ITERATIONS; iteration += 1) {
    let candidate = program._withContext({ responsivePlot: plot, responsiveMeasuring: true,
      deferGuideLayoutValidation: true });
    candidate = applyMaterializationPlan(candidate, planCanvasRematerialization(candidate)
      .filter(step => step.op === "rematerializeScale"));
    candidate = apply(candidate);
    passes.push(measuredPass(candidate, plot));
    const result = evaluateResponsiveLayout(passes, options);
    if (result.status === "satisfied") {
      const context = { ...candidate.context };
      for (const key of ["responsivePlot", "responsiveMeasuring", "deferGuideLayoutValidation"]) {
        if (Object.hasOwn(program.context, key)) context[key] = program.context[key];
        else delete context[key];
      }
      return candidate._withCanvasConfig({ ...candidate.materializationConfigs.canvas,
        responsiveResult: result })._clone({ context });
    }
    if (result.status === "unsatisfied") throw failure(result);
    const proposed = nextPlot(passes.at(-1), canvas, config.margin);
    if (![proposed.left, proposed.right, proposed.top, proposed.bottom].every(Number.isFinite) ||
        proposed.right <= proposed.left || proposed.bottom <= proposed.top) {
      throw failure(result, "insufficient-space");
    }
    plot = proposed;
  }
}
