import { freezeOwned } from "../../core/immutable.js";
import { materializeCompositionGraphics } from
  "../../materialization/composition.js";
import { materializeFacetGraphics } from "../../materialization/facets.js";
import {
  compositionThemeOwner,
  createThemeFrame,
  moveLocalThemeScope,
  normalizeThemeState,
  removeThemeFrameOwner,
  upsertThemeFrame
} from "./state.js";
import { reconcileProgramTheme } from "./reconcile.js";

const DESCRIPTION = "Apply inherited visual defaults to a composition child.";

function materializeComposition(program) {
  return program.compositionSpec.type === "facet"
    ? materializeFacetGraphics(program)
    : materializeCompositionGraphics(program);
}

function withThemeState(program, state) {
  return program._withMaterializationConfig(["theme"], state);
}

function addFrame(program, frame, { descendants, local = false }) {
  const composition = program.compositionSpec !== undefined;
  const previous = normalizeThemeState(
    program.materializationConfigs.theme,
    { composition }
  );
  return withThemeState(program, {
    ...previous,
    frames: upsertThemeFrame(previous.frames, frame),
    ...(composition
      ? {
          descendantFrames: descendants
            ? upsertThemeFrame(previous.descendantFrames, frame)
            : previous.descendantFrames
        }
      : {}),
    localOrder: local
      ? moveLocalThemeScope(previous.localOrder, frame.scope)
      : previous.localOrder
  });
}

function removeFrame(program, owner, { descendants, localScope }) {
  const composition = program.compositionSpec !== undefined;
  const previous = normalizeThemeState(
    program.materializationConfigs.theme,
    { composition }
  );
  const root = removeThemeFrameOwner(previous.frames, owner);
  const policies = composition && descendants
    ? removeThemeFrameOwner(previous.descendantFrames, owner)
    : { frames: previous.descendantFrames, removed: false };
  return {
    program: withThemeState(program, {
      ...previous,
      frames: root.frames,
      ...(composition ? { descendantFrames: policies.frames } : {}),
      localOrder: localScope === undefined
        ? previous.localOrder
        : freezeOwned(previous.localOrder.filter(scope => scope !== localScope))
    }),
    removed: root.removed || policies.removed
  };
}

function inheritedMetadata(op) {
  return freezeOwned({ op, description: DESCRIPTION, scope: "any" });
}

function enterInheritedAction(program, op, frame) {
  return program._enterAction({
    op,
    description: DESCRIPTION,
    args: op === "applyTheme"
      ? freezeOwned({
          theme: freezeOwned({
            base: frame.name,
            tokens: frame.tokens
          }),
          scope: "descendants",
          inheritedFrom: frame.owner
        })
      : freezeOwned({ inheritedFrom: frame.owner })
  });
}

function applyInheritedFrame(program, frame) {
  const source = program;
  let next = enterInheritedAction(program, "applyTheme", frame);
  next = addFrame(next, frame, {
    descendants: next.compositionSpec !== undefined
  });

  if (next.compositionSpec !== undefined) {
    const children = Object.fromEntries(
      next.compositionSpec.children.map(id => [
        id,
        applyInheritedFrame(next.children[id], frame)
      ])
    );
    next = next._withCompositionState({
      children,
      compositionSpec: next.compositionSpec
    });
    next = materializeComposition(next);
  }

  next = reconcileProgramTheme(next, {
    source,
    metadata: inheritedMetadata("applyTheme")
  });
  return next._exitAction();
}

function removeInheritedFrame(program, frame) {
  const source = program;
  let next = enterInheritedAction(program, "removeTheme", frame);
  const removed = removeFrame(next, frame.owner, {
    descendants: next.compositionSpec !== undefined
  });
  next = removed.program;

  if (next.compositionSpec !== undefined) {
    const children = Object.fromEntries(
      next.compositionSpec.children.map(id => [
        id,
        removeInheritedFrame(next.children[id], frame)
      ])
    );
    next = next._withCompositionState({
      children,
      compositionSpec: next.compositionSpec
    });
    next = materializeComposition(next);
  }

  next = reconcileProgramTheme(next, {
    source,
    metadata: inheritedMetadata("removeTheme")
  });
  return next._exitAction();
}

export function applyCompositionTheme(program, definition, scope) {
  const id = program.compositionSpec.id;
  const frame = createThemeFrame({
    owner: compositionThemeOwner(id, scope),
    scope,
    definition
  });
  let next = addFrame(program, frame, {
    descendants: scope === "descendants",
    local: true
  });
  if (scope !== "descendants") return next;

  const children = Object.fromEntries(
    next.compositionSpec.children.map(childId => [
      childId,
      applyInheritedFrame(next.children[childId], frame)
    ])
  );
  next = next._withCompositionState({
    children,
    compositionSpec: next.compositionSpec
  });
  return materializeComposition(next);
}

export function removeCompositionTheme(program) {
  const state = normalizeThemeState(
    program.materializationConfigs.theme,
    { composition: true }
  );
  const scope = state.localOrder.at(-1);
  if (scope === undefined) {
    throw new Error("removeTheme requires an active program theme.");
  }
  const owner = compositionThemeOwner(program.compositionSpec.id, scope);
  const frame = state.frames.find(current => current.owner === owner) ??
    state.descendantFrames.find(current => current.owner === owner);
  if (frame === undefined) {
    throw new Error("removeTheme requires an active program theme.");
  }

  let next = removeFrame(program, owner, {
    descendants: scope === "descendants",
    localScope: scope
  }).program;
  if (scope !== "descendants") return next;

  const children = Object.fromEntries(
    next.compositionSpec.children.map(id => [
      id,
      removeInheritedFrame(next.children[id], frame)
    ])
  );
  next = next._withCompositionState({
    children,
    compositionSpec: next.compositionSpec
  });
  return materializeComposition(next);
}

export function replayCompositionThemeState(program, storedState) {
  if (storedState === undefined) return program;
  const state = normalizeThemeState(storedState, { composition: true });
  let next = withThemeState(program, state);
  for (const frame of state.descendantFrames) {
    const children = Object.fromEntries(
      next.compositionSpec.children.map(id => [
        id,
        applyInheritedFrame(next.children[id], frame)
      ])
    );
    next = next._withCompositionState({
      children,
      compositionSpec: next.compositionSpec
    });
  }
  return materializeComposition(next);
}

export function replayInheritedThemeFrames(program, storedState) {
  if (storedState === undefined) return program;
  const state = normalizeThemeState(storedState, { composition: true });
  let next = program;
  for (const frame of state.descendantFrames) {
    next = applyInheritedFrame(next, frame);
  }
  return next;
}
