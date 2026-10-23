import assert from "node:assert/strict";
import test from "node:test";

import { ownCompositionSpec } from "../../../src/core/compositionState.js";
import { FACET_SCALE_CHANNELS } from "../../../src/core/vocabulary.js";
import { cloneAndFreeze } from "../../../src/core/immutable.js";

const padding = Object.freeze({ top: 1, right: 2, bottom: 3, left: 4 });
const children = Object.freeze({ left: {}, right: {} });

test("reusing an immutable composition still validates changed child identities and mutable inputs", () => {
  const ownedChildren = cloneAndFreeze(children), input = facet();
  const owned = ownCompositionSpec(input, ownedChildren);
  assert.equal(ownCompositionSpec(owned, ownedChildren), owned);
  assert.throws(() => ownCompositionSpec(owned, cloneAndFreeze({ left: {} })), /match ChartProgram children/);
  input.columns = -1;
  assert.throws(() => ownCompositionSpec(input, ownedChildren), /positive integer/);
  const externalChildren = { left: {}, right: {} };
  ownCompositionSpec(owned, externalChildren); delete externalChildren.right;
  assert.throws(() => ownCompositionSpec(owned, externalChildren), /match ChartProgram children/);
});

function concat(overrides = {}) {
  return {
    id: "dashboard",
    direction: "horizontal",
    children: ["left", "right"],
    gap: 8,
    align: "center",
    padding,
    ...overrides
  };
}

function facet(overrides = {}) {
  return {
    id: "facets",
    type: "facet",
    children: ["left", "right"],
    columns: 2,
    gap: 8,
    align: "start",
    padding,
    facet: {
      data: "cars",
      field: "Origin",
      values: ["USA", "Japan"],
      scales: Object.fromEntries(FACET_SCALE_CHANNELS.map(channel => [channel, "shared"])),
      guides: { axes: "each", legend: "shared" }
    },
    ...overrides
  };
}

test("owns valid concat and facet composition state deeply", () => {
  const ownedConcat = ownCompositionSpec(concat(), children);
  const ownedFacet = ownCompositionSpec(facet(), children);

  assert.equal(Object.isFrozen(ownedConcat), true);
  assert.equal(Object.isFrozen(ownedConcat.padding), true);
  assert.equal(Object.isFrozen(ownedFacet.facet.scales), true);
  assert.equal(ownCompositionSpec(undefined, {}), undefined);
  assert.throws(() => ownCompositionSpec(undefined, children), /require a compositionSpec/);
});

test("rejects invalid composition identity, children, layout, and concat shape", () => {
  for (const [spec, error] of [
    [null, /plain object/],
    [concat({ unknown: true }), /Unknown compositionSpec property/],
    [concat({ id: "" }), /non-empty string/],
    [concat({ type: "grid" }), /Unknown compositionSpec type/],
    [concat({ direction: "diagonal" }), /horizontal or vertical/],
    [concat({ children: ["left", "left"] }), /duplicate IDs/],
    [concat({ children: ["left", "missing"] }), /match ChartProgram children/],
    [concat({ gap: -1 }), /non-negative finite/],
    [concat({ align: "stretch" }), /start, center, or end/],
    [concat({ padding: [] }), /plain object/],
    [concat({ padding: { ...padding, top: -1 } }), /padding.top/],
    [concat({ padding: { ...padding, inline: 4 } }), /exactly four sides/],
    [concat({ columns: 2 }), /does not accept facet properties/]
  ]) {
    assert.throws(() => ownCompositionSpec(spec, children), error);
  }
});

test("rejects invalid facet partition, scale, and guide contracts", () => {
  const base = facet();
  const invalidFacets = [
    [{ ...base, direction: "horizontal" }, /does not use direction/],
    [{ ...base, columns: 0 }, /columns/],
    [{ ...base, facet: [] }, /plain object/],
    [{ ...base, facet: { ...base.facet, extra: true } }, /Unknown compositionSpec.facet/],
    [{ ...base, facet: { ...base.facet, data: "" } }, /data must be a non-empty/],
    [{ ...base, facet: { ...base.facet, values: ["USA"] } }, /one unique scalar per child/],
    [{ ...base, facet: { ...base.facet, values: ["USA", "USA"] } }, /one unique scalar per child/],
    [{ ...base, facet: { ...base.facet, scales: { x: "shared" } } }, /one shared or independent/],
    [{
      ...base,
      facet: {
        ...base.facet,
        scales: { ...base.facet.scales, x: "linked" }
      }
    }, /one shared or independent/],
    [{ ...base, facet: { ...base.facet, guides: { axes: "all", legend: false } } }, /Facet axes/]
  ];

  for (const [spec, error] of invalidFacets) {
    assert.throws(() => ownCompositionSpec(spec, children), error);
  }
});
