import { action } from "../../core/action.js";
import {
  validateNonNegativeFinite,
  validatePositiveFinite,
  validateOptionObject
} from "../../core/validation.js";
import { resolveGraphicBounds } from "../../layout/canvas.js";
import { findCanvasGraphic } from
  "../../materialization/graphicHierarchy.js";

const OPTIONS = Object.freeze([
  "padding",
  "minPlotWidth",
  "minPlotHeight",
  "iterationLimit",
  "overflow"
]);
const SIDES = Object.freeze(["top", "right", "bottom", "left"]);
const DEFAULTS = Object.freeze({
  padding: 0,
  minPlotWidth: 160,
  minPlotHeight: 120,
  iterationLimit: 32,
  overflow: "error"
});
const UNITS_PER_PIXEL = 4;

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
  return policy;
}

function probe(program, margin) {
  try {
    return { ok: true, program: program.editCanvas({ margin }) };
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
  const source = JSON.stringify({
    graphicSpec: program.graphicSpec,
    canvas: program.materializationConfigs.canvas,
    guides: program.materializationConfigs.guides,
    title: program.materializationConfigs.title
  });
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export const fitCanvas = action(
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
