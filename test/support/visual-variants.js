import assert from "node:assert/strict";
import test from "node:test";

import { artifactTrackConfig } from "./artifact-schema.js";
import { assertRenderedPNG } from "./png.js";

function normalizeArtifactScope(artifact, label) {
  if (artifact === false) return false;
  if (artifact === true) return Object.freeze({ roadmap: "roadmap2" });
  if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)) {
    throw new TypeError(`${label} artifact must be a boolean or object.`);
  }
  const config = artifactTrackConfig(artifact.roadmap);
  const allowed = new Set(["roadmap", ...config.scopeKeys]);
  for (const key of Object.keys(artifact)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} has unknown artifact option "${key}".`);
    }
  }
  for (const key of config.scopeKeys) {
    if (typeof artifact[key] !== "string" || artifact[key].length === 0) {
      throw new TypeError(
        `${label} ${config.label} artifact requires ${config.scopeKeys.join(", ")}.`
      );
    }
  }
  return Object.freeze({
    roadmap: artifact.roadmap,
    ...Object.fromEntries(config.scopeKeys.map(key => [key, artifact[key]]))
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
  visualSignature,
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
  if (visualSignature !== undefined && (
    visualSignature === null ||
    typeof visualSignature !== "object" ||
    !Number.isFinite(visualSignature.inkRatio?.min) ||
    !Number.isFinite(visualSignature.inkRatio?.max) ||
    visualSignature.inkRatio.min < 0 ||
    visualSignature.inkRatio.max < visualSignature.inkRatio.min ||
    !["x", "y", "width", "height"].every(key =>
      Number.isFinite(visualSignature.inkBounds?.[key])
    ) ||
    (visualSignature.inkBounds.tolerance !== undefined &&
      (!Number.isFinite(visualSignature.inkBounds.tolerance) ||
        visualSignature.inkBounds.tolerance < 0))
  )) {
    throw new TypeError(`${chart}/${variant} has an invalid visual signature.`);
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
    visualSignature,
    artifact: artifactScope
  });
}

export function displayedActionOperations(source) {
  if (typeof source !== "string") {
    throw new TypeError("Visual call chain must be a string.");
  }
  const trimmed = source.trim();
  if (!trimmed.endsWith(";")) {
    throw new TypeError("Visual call chain must end with a semicolon.");
  }
  const methods = [...trimmed.matchAll(/\.([A-Za-z][A-Za-z0-9]*)\s*\(/g)]
    .map(match => match[1]);
  if (/^chart\(\)/.test(trimmed)) return methods;
  const operation = trimmed.match(/^([A-Za-z][A-Za-z0-9]*)\s*\(/)?.[1];
  if (["hconcat", "vconcat"].includes(operation)) {
    return [operation, ...methods];
  }
  if (/^[A-Za-z][A-Za-z0-9]*\s*\./.test(trimmed)) return methods;
  throw new TypeError(
    "Visual call chain must start with chart(), hconcat(), vconcat(), or a program variable."
  );
}

export function assertDisplayedProgram(variant, program) {
  assert.deepEqual(
    displayedActionOperations(variant.callChain),
    program.trace.children.map(node => node.op),
    `${variant.chart}/${variant.variant} displayed action flow`
  );
}

function renderOptions(variant, kind) {
  const shared = {
    width: variant.width,
    height: variant.height,
    colors: variant.colors,
    regions: variant.regions,
    visualSignature: variant.visualSignature
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
