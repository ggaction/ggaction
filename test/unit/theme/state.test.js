import assert from "node:assert/strict";
import test from "node:test";

import {
  LOCAL_THEME_OWNER,
  compositionThemeOwner,
  createThemeFrame,
  moveLocalThemeScope,
  normalizeThemeState,
  removeThemeFrameOwner,
  resolveEffectiveThemeTokens,
  upsertThemeFrame
} from "../../../src/actions/theme/state.js";

test("keeps one newest frame per owner while preserving other owners", () => {
  const local = createThemeFrame({
    definition: { base: "light", tokens: { mark: "local" } }
  });
  assert.equal(local.owner, LOCAL_THEME_OWNER);
  const parent = createThemeFrame({
    owner: compositionThemeOwner("parent"),
    scope: "descendants",
    definition: { base: "dark", tokens: { mark: "parent" } }
  });
  const newerParent = createThemeFrame({
    owner: compositionThemeOwner("parent"),
    scope: "descendants",
    definition: { base: "light", tokens: { mark: "new-parent" } }
  });

  let frames = upsertThemeFrame([], local);
  frames = upsertThemeFrame(frames, parent);
  frames = upsertThemeFrame(frames, newerParent);
  assert.deepEqual(frames.map(frame => frame.owner), [
    "local",
    "composition:parent"
  ]);
  assert.equal(frames.at(-1).tokens.mark, "new-parent");
  assert.equal(Object.isFrozen(frames), true);
});

test("removes only one owner and restores the frame below it", () => {
  const local = createThemeFrame({
    definition: { base: "light", tokens: { mark: "local" } }
  });
  const parent = createThemeFrame({
    owner: compositionThemeOwner("parent"),
    scope: "descendants",
    definition: { base: "dark", tokens: { mark: "parent" } }
  });
  const frames = upsertThemeFrame(upsertThemeFrame([], local), parent);
  const removed = removeThemeFrameOwner(frames, parent.owner);

  assert.equal(removed.removed, true);
  assert.deepEqual(removed.frames, [local]);
  assert.equal(
    resolveEffectiveThemeTokens({ frames: removed.frames }).mark,
    "local"
  );
});

test("normalizes legacy state without mutating it", () => {
  const legacy = {
    name: "dark",
    tokens: { grid: "legacy-grid" },
    overrides: ["g:point.fill"]
  };
  const snapshot = structuredClone(legacy);
  const normalized = normalizeThemeState(legacy);

  assert.deepEqual(legacy, snapshot);
  assert.deepEqual(normalized.frames.map(frame => frame.owner), ["local"]);
  assert.equal(resolveEffectiveThemeTokens(normalized).grid, "legacy-grid");
  assert.deepEqual(normalized.localOrder, ["self"]);
  assert.deepEqual(normalized.overrides, ["g:point.fill"]);
  assert.equal(Object.isFrozen(normalized), true);
});

test("tracks the latest direct composition scope deterministically", () => {
  let order = moveLocalThemeScope([], "descendants");
  order = moveLocalThemeScope(order, "self");
  order = moveLocalThemeScope(order, "descendants");
  assert.deepEqual(order, ["self", "descendants"]);
  assert.equal(Object.isFrozen(order), true);
});
