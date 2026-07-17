import assert from "node:assert/strict";
import test from "node:test";

import { chart } from "../../src/index.js";

import { assertRenderedPNG } from "./png.js";

const DATA_ALIASES = Object.freeze([
  "rows",
  "cars",
  "jobs",
  "gapminder",
  "shapeRows",
  "namedDashRows",
  "originAccelerationIntervals",
  "ruleRows"
]);
const VALUE_ALIASES = Object.freeze(["pointShapes"]);

function normalizeArtifactScope(artifact, label) {
  if (artifact === false) return false;
  if (artifact === true) return Object.freeze({ roadmap: "roadmap2" });
  if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new TypeError(`${label} artifact must be a boolean or object.`);
  }
  const allowed = new Set(["roadmap", "phase", "capability"]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} has unknown artifact option "${key}".`);
    }
  }
  if (artifact.roadmap === "roadmap2") {
    if (Object.keys(artifact).length !== 1) {
      throw new TypeError(`${label} Roadmap 2 artifact only accepts roadmap.`);
    }
    return Object.freeze({ roadmap: "roadmap2" });
  }
  if (
    artifact.roadmap !== "roadmap3" ||
    typeof artifact.phase !== "string" ||
    typeof artifact.capability !== "string"
  ) {
    throw new TypeError(
      `${label} Roadmap 3 artifact requires roadmap, phase, and capability.`
    );
  }
  return Object.freeze({
    roadmap: "roadmap3",
    phase: artifact.phase,
    capability: artifact.capability
  });
}

export function defineVisualVariant({
  chart,
  variant,
  title,
  callChain,
  primitive,
  userFacing,
  width,
  height,
  colors,
  regions,
  artifact = true
}) {
  if (typeof chart !== "string" || chart.length === 0) {
    throw new TypeError("Visual variant chart must be a non-empty string.");
  }
  if (typeof variant !== "string" || variant.length === 0) {
    throw new TypeError("Visual variant id must be a non-empty string.");
  }
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError(`${chart}/${variant} requires positive dimensions.`);
  }
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new TypeError(`${chart}/${variant} requires visual regions.`);
  }
  for (const region of regions) {
    if (
      region === null ||
      typeof region !== "object" ||
      typeof region.name !== "string" ||
      ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
      region.x < 0 ||
      region.y < 0 ||
      region.width <= 0 ||
      region.height <= 0 ||
      region.x + region.width > width ||
      region.y + region.height > height
    ) {
      throw new RangeError(`${chart}/${variant} has an invalid visual region.`);
    }
  }
  if (typeof primitive !== "function") {
    throw new TypeError(`${chart}/${variant} primitive must be a program factory.`);
  }
  if (userFacing !== undefined && typeof userFacing !== "function") {
    throw new TypeError(`${chart}/${variant} userFacing must be a program factory.`);
  }
  const artifactScope = normalizeArtifactScope(artifact, `${chart}/${variant}`);
  return Object.freeze({
    chart,
    variant,
    title,
    callChain,
    primitive,
    userFacing,
    width,
    height,
    colors,
    regions,
    artifact: artifactScope
  });
}

function replayDisplayedCallChain(source, program) {
  const expression = source.trim().replace(/;$/, "");
  const values = program.semanticSpec.datasets[0]?.values;
  const pointShapes = program.semanticSpec.scales.find(
    scale => scale.id === "shape"
  )?.range;
  const evaluate = new Function(
    "chart",
    ...DATA_ALIASES,
    ...VALUE_ALIASES,
    `"use strict"; return (${expression});`
  );
  return evaluate(
    chart,
    ...DATA_ALIASES.map(() => structuredClone(values)),
    structuredClone(pointShapes)
  );
}

function assertDisplayedProgram(variant, program) {
  const replayed = replayDisplayedCallChain(variant.callChain, program);
  assert.deepEqual(replayed.semanticSpec, program.semanticSpec);
  assert.deepEqual(replayed.graphicSpec, program.graphicSpec);
  assert.deepEqual(replayed.trace, program.trace);
}

function renderOptions(variant, kind) {
  const shared = {
    width: variant.width,
    height: variant.height,
    colors: variant.colors,
    regions: variant.regions
  };
  if (variant.artifact) {
    return {
      ...shared,
      artifact: {
        ...variant.artifact,
        chart: variant.chart,
        variant: variant.variant,
        kind,
        title: variant.title,
        userFacingCallChain: variant.callChain
      }
    };
  }
  return {
    ...shared,
    name: kind === "primitive"
      ? `${variant.chart}-primitives`
      : variant.chart
  };
}

export function registerVisualVariantTests(variants) {
  for (const variant of variants) {
    test(`renders ${variant.chart}/${variant.variant}`, async () => {
      const primitive = variant.primitive();
      if (variant.userFacing !== undefined) {
        const userFacing = variant.userFacing();
        if (variant.artifact) assertDisplayedProgram(variant, userFacing);
        const [primitiveResult, userFacingResult] = await Promise.all([
          assertRenderedPNG(
            primitive,
            renderOptions(variant, "primitive")
          ),
          assertRenderedPNG(
            userFacing,
            renderOptions(variant, "user-facing")
          )
        ]);
        assert.equal(userFacingResult.pixelHash, primitiveResult.pixelHash);
      } else {
        await assertRenderedPNG(
          primitive,
          renderOptions(variant, "primitive")
        );
      }
    });
  }
}
