import { cartesianAxisOwners } from "../../selectors/axes.js";
import { axisGraphicIds } from "../../materialization/guides/resources.js";
import { action } from "../../core/action.js";
import {
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateOptionObject
} from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { findCanvasGraphic } from
  "../../materialization/graphicHierarchy.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { textBoundsFitCanvas } from "../../core/textMetrics.js";
import { isOwned } from "../../core/immutable.js";
import { MINIMUM_PLOT_SIZE } from "../../grammar/responsiveCanvas.js";

const OPTIONS = Object.freeze([
  "padding",
  "minPlotWidth",
  "minPlotHeight",
  "iterationLimit",
  "overflow",
  "align"
]);
const SIDES = Object.freeze(["top", "right", "bottom", "left"]);
const DEFAULTS = Object.freeze({
  padding: 0,
  minPlotWidth: MINIMUM_PLOT_SIZE.width,
  minPlotHeight: MINIMUM_PLOT_SIZE.height,
  iterationLimit: 32,
  overflow: "error",
  align: "preserve"
});
const UNITS_PER_PIXEL = 4;
const signatures = new WeakMap();

function normalizeOptions(args) {
  validateOptionObject(args, OPTIONS, "fitCanvas", { allowEmpty: true });
  const policy = { ...DEFAULTS, ...args };
  validateNonNegativeFinite(policy.padding, "fitCanvas padding");
  validatePositiveFinite(policy.minPlotWidth, "fitCanvas minPlotWidth");
  validatePositiveFinite(policy.minPlotHeight, "fitCanvas minPlotHeight");
  if (!Number.isInteger(policy.iterationLimit) ||
      policy.iterationLimit <= 0 || policy.iterationLimit > 64) {
    throw new RangeError(
      "fitCanvas iterationLimit must be an integer from 1 through 64."
    );
  }
  if (!["error", "report"].includes(policy.overflow)) {
    throw new Error(`Unsupported fitCanvas overflow policy "${policy.overflow}".`);
  }
  if (!["preserve", "center"].includes(policy.align)) throw new Error('fitCanvas align must be "preserve" or "center".');
  return policy;
}

// In exact-plot mode only the outer space is fitted. User-authored margins
// are a minimum; temporary guide reservations may be reclaimed. Their origin
// survives persistence and repeated centering, unlike the resolved margins.
function fitExactPlot(program, policy) {
  const config = program.materializationConfigs.canvas, plot = resolveGraphicBounds(program);
  const floor = config.requestedMargin ?? config.margin;
  const bounds = [];
  const collect = id => {
    const object = program.graphicSpec.objects[id];
    if (object.type === "canvas") { for (const child of object.children ?? []) collect(child); return; }
    const b = resolveConcreteGraphicBounds(program.graphicSpec, id, program.materializationConfigs.textMetrics);
    if (b) bounds.push(b);
  };
  for (const id of program.graphicSpec.order) collect(id);
  const content = { left: Math.min(...bounds.map(b=>b.left),plot.x), right: Math.max(...bounds.map(b=>b.right),plot.x+plot.width),
    top: Math.min(...bounds.map(b=>b.top),plot.y), bottom: Math.max(...bounds.map(b=>b.bottom),plot.y+plot.height) };
  const required = { left: Math.max(0,plot.x-content.left)+policy.padding, right: Math.max(0,content.right-plot.x-plot.width)+policy.padding,
    top: Math.max(0,plot.y-content.top)+policy.padding, bottom: Math.max(0,content.bottom-plot.y-plot.height)+policy.padding };
  const margin = Object.fromEntries(SIDES.map(side=>[side,Math.max(floor[side],required[side])]));
  if (policy.align === "center") for (const [first,second] of [["left","right"],["top","bottom"]]) {
    const slack = margin[first]+margin[second]-required[first]-required[second];
    margin[first]=required[first]+slack/2; margin[second]=required[second]+slack/2;
  }
  let next = sameMargin(margin, config.margin) ? program : program.editCanvas({ plot: config.plot, margin });
  next = next._withCanvasConfig({ ...next.materializationConfigs.canvas, requestedMargin: floor });
  const issues = [];
  if (plot.width < policy.minPlotWidth) issues.push(`plot width ${plot.width} is smaller than minPlotWidth ${policy.minPlotWidth}`);
  if (plot.height < policy.minPlotHeight) issues.push(`plot height ${plot.height} is smaller than minPlotHeight ${policy.minPlotHeight}`);
  if (issues.length && policy.overflow === "error") throw new Error(`fitCanvas overflow: ${issues.join("; ")}.`);
  return next._withMaterializationConfig(["fitting"], { policy, result: {
    status: issues.length ? "overflow" : "fit", margin: next.materializationConfigs.canvas.margin,
    plot: { width: plot.width, height: plot.height }, iterations: 1, issues,
    signature: layoutSignature(next)
  } });
}

function probe(program, margin) {
  try {
    const next = program.editCanvas({ margin });
    for (const owner of cartesianAxisOwners(next).filter(owner => owner.channel === "y")) {
    const title = owner.config?.title;
    if (title?.inferredOffset && Math.abs(Math.cos(title.rotation)) < 1e-10) {
      const bounds = resolveConcreteGraphicBounds(next.graphicSpec, axisGraphicIds("y", owner.id)[3], next.materializationConfigs.textMetrics);
      const edge = title.position === "right" ? "right" : "left";
      const reserve = title.fontSize / 4 * (edge === "right" ? 1 : -1);
      if (!textBoundsFitCanvas({...bounds, [edge]: bounds[edge] + reserve}, findCanvasGraphic(next).properties)) {
        return {ok:false, message:"Fitting retains inferred axis-title ink clearance."};
      }
    }
    }
    return { ok: true, program: next };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function marginWith(margin, side, value) {
  return { ...margin, [side]: value };
}

function minimizeSide(program, margin, side, policy) {
  const current = margin[side];
  const floor = Math.ceil(policy.padding * UNITS_PER_PIXEL) /
    UNITS_PER_PIXEL;
  if (floor > current) {
    const expanded = marginWith(margin, side, floor);
    const result = probe(program, expanded);
    return result.ok
      ? { program: result.program, margin: expanded, iterations: 1, issues: [] }
      : {
          program,
          margin,
          iterations: 1,
          issues: [`${side} padding: ${result.message}`]
        };
  }

  let low = Math.ceil(policy.padding * UNITS_PER_PIXEL);
  let high = Math.floor(current * UNITS_PER_PIXEL);
  if (low > high) {
    return { program, margin, iterations: 0, issues: [] };
  }

  const cache = new Map();
  const test = units => {
    if (cache.has(units)) return cache.get(units);
    const result = probe(
      program,
      marginWith(margin, side, units / UNITS_PER_PIXEL)
    );
    cache.set(units, result);
    return result;
  };
  let iterations = 0;
  const upper = test(high);
  iterations += 1;
  if (!upper.ok) {
    return { program, margin, iterations, issues: [] };
  }

  while (low < high && iterations < policy.iterationLimit) {
    const middle = Math.floor((low + high) / 2);
    const result = test(middle);
    iterations += 1;
    if (result.ok) high = middle;
    else low = middle + 1;
  }
  const best = test(high);
  const fittedMargin = marginWith(
    margin,
    side,
    high / UNITS_PER_PIXEL
  );
  return {
    program: best.program,
    margin: fittedMargin,
    iterations,
    issues: low === high
      ? []
      : [`${side} fitting reached iterationLimit ${policy.iterationLimit}`]
  };
}

function fitMargins(program, policy) {
  let probeProgram = program;
  let margin = { ...program.materializationConfigs.canvas.margin };
  let iterations = 0;
  const issues = [];
  for (const side of SIDES) {
    const result = minimizeSide(probeProgram, margin, side, policy);
    probeProgram = result.program;
    margin = result.margin;
    iterations += result.iterations;
    issues.push(...result.issues);
  }
  return { margin, iterations, issues };
}

function sameMargin(first, second) {
  return SIDES.every(side => first[side] === second[side]);
}

function samePolicy(first, second) {
  return OPTIONS.every(option => first?.[option] === second[option]);
}

function layoutSignature(program) {
  const graphicSpec = program.graphicSpec, configs = program.materializationConfigs;
  const cached = signatures.get(graphicSpec);
  if (cached && cached.canvas === configs.canvas && cached.guides === configs.guides && cached.title === configs.title) {
    return cached.signature;
  }
  const source = JSON.stringify({
    graphicSpec,
    canvas: configs.canvas,
    guides: configs.guides,
    title: configs.title
  });
  // Two independent 32-bit lanes avoid a BigInt allocation for every byte of
  // a large facet/mark scene. This is an invalidation fingerprint, not a digest.
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    const code = source.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  const signature = [first, second].map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
  // Fitting itself only adds its result metadata, leaving these four immutable
  // inputs unchanged. Preserve the persisted signature while avoiding another
  // full-scene serialization/hash on subsequent no-op fits.
  if (isOwned(graphicSpec)) signatures.set(graphicSpec, {
    canvas: configs.canvas, guides: configs.guides, title: configs.title, signature
  });
  return signature;
}

export const fitCanvas = /* @__PURE__ */ action(
  {
    op: "fitCanvas",
    description: "Fit Canvas margins around existing layout resources."
  },
  function (args = {}) {
    const policy = normalizeOptions(args);
    const canvas = findCanvasGraphic(this);
    if (canvas?.type !== "canvas" ||
        this.materializationConfigs.canvas?.margin === undefined) {
      throw new Error("fitCanvas requires an existing Canvas.");
    }
    const previous = this.materializationConfigs.fitting;
    if (samePolicy(previous?.policy, policy) &&
        previous?.result?.signature === layoutSignature(this)) {
      return this;
    }
    if (this.materializationConfigs.canvas.plot !== undefined) return fitExactPlot(this, policy);
    if (policy.align !== "preserve") throw new Error('fitCanvas align:center requires exact inner plot sizing.');
    const sourceMargin = this.materializationConfigs.canvas.margin;
    const fitted = fitMargins(this, policy);
    let next = sameMargin(sourceMargin, fitted.margin)
      ? this
      : this.editCanvas({ margin: fitted.margin });
    const plot = resolveGraphicBounds(next);
    if (plot.width < policy.minPlotWidth) {
      fitted.issues.push(
        `plot width ${plot.width} is smaller than minPlotWidth ${policy.minPlotWidth}`
      );
    }
    if (plot.height < policy.minPlotHeight) {
      fitted.issues.push(
        `plot height ${plot.height} is smaller than minPlotHeight ${policy.minPlotHeight}`
      );
    }
    if (fitted.issues.length > 0 && policy.overflow === "error") {
      throw new Error(`fitCanvas overflow: ${fitted.issues.join("; ")}.`);
    }
    next = next._withMaterializationConfig(["fitting"], {
      policy,
      result: {
        status: fitted.issues.length === 0 ? "fit" : "overflow",
        margin: fitted.margin,
        plot: { width: plot.width, height: plot.height },
        iterations: fitted.iterations,
        issues: fitted.issues,
        signature: layoutSignature(next)
      }
    });
    return next;
  }
);
