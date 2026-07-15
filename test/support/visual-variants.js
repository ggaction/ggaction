import assert from "node:assert/strict";
import test from "node:test";

import { assertRenderedPNG } from "./png.js";

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
    artifact
  });
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
        roadmap: "roadmap2",
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
    test(`renders ${variant.chart}/${variant.variant}`, async context => {
      const results = {};
      await context.test("primitive", async () => {
        results.primitive = await assertRenderedPNG(
          variant.primitive,
          renderOptions(variant, "primitive")
        );
      });
      if (variant.userFacing !== undefined) {
        if (variant.artifact) {
          await context.test("matches displayed call-chain actions", () => {
            const displayed = [...variant.callChain.matchAll(
              /\.([A-Za-z][A-Za-z0-9]*)\s*\(/g
            )].map(match => match[1]);
            assert.deepEqual(
              variant.userFacing.trace.children.map(node => node.op),
              displayed
            );
          });
        }
        await context.test("user-facing", async () => {
          results.userFacing = await assertRenderedPNG(
            variant.userFacing,
            renderOptions(variant, "user-facing")
          );
        });
        await context.test("matches primitive pixels", () => {
          assert.equal(results.userFacing.pixelHash, results.primitive.pixelHash);
        });
      }
    });
  }
}
