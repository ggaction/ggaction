import {
  cloneAndFreeze,
  freezeOwned,
  isPlainObject
} from "../../core/immutable.js";
import {
  normalizeThemeDefinition,
  resolveThemeTokens
} from "../../theme/defaults.js";

export const LOCAL_THEME_OWNER = "local";

function ownArray(value) {
  return freezeOwned([...(value ?? [])]);
}

function requireThemeScope(value) {
  if (!["self", "descendants"].includes(value)) {
    throw new Error(`Unsupported theme scope "${value}".`);
  }
  return value;
}

function requireThemeOwner(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Theme frame owner must be a non-empty string.");
  }
  return value;
}

export function compositionThemeOwner(id, scope = "descendants") {
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError("Composition theme owner requires a non-empty id.");
  }
  requireThemeScope(scope);
  return scope === "self" ? `composition:${id}:self` : `composition:${id}`;
}

export function createThemeFrame({
  owner = LOCAL_THEME_OWNER,
  scope = "self",
  definition
}) {
  const normalized = normalizeThemeDefinition(definition);
  return freezeOwned({
    owner: requireThemeOwner(owner),
    scope: requireThemeScope(scope),
    name: normalized.name,
    tokens: normalized.tokens
  });
}

export function upsertThemeFrame(frames = [], frame) {
  if (!Array.isArray(frames)) {
    throw new TypeError("Theme frames must be an array.");
  }
  if (!isPlainObject(frame)) {
    throw new TypeError("Theme frame must be a plain object.");
  }
  return freezeOwned([
    ...frames.filter(current => current.owner !== frame.owner),
    frame
  ]);
}

export function removeThemeFrameOwner(frames = [], owner) {
  if (!Array.isArray(frames)) {
    throw new TypeError("Theme frames must be an array.");
  }
  requireThemeOwner(owner);
  const next = frames.filter(frame => frame.owner !== owner);
  return freezeOwned({
    frames: freezeOwned(next),
    removed: next.length !== frames.length
  });
}

export function moveLocalThemeScope(localOrder = [], scope) {
  if (!Array.isArray(localOrder)) {
    throw new TypeError("Theme localOrder must be an array.");
  }
  requireThemeScope(scope);
  return freezeOwned([
    ...localOrder.filter(current => current !== scope),
    scope
  ]);
}

function ownCanonicalThemeState(state, composition) {
  const frames = ownArray(state.frames);
  const localOrder = ownArray(state.localOrder);
  const overrides = ownArray(state.overrides);
  const result = { frames, localOrder, overrides };
  if (composition || state.descendantFrames !== undefined) {
    result.descendantFrames = ownArray(state.descendantFrames);
  }
  return cloneAndFreeze(result);
}

export function normalizeThemeState(state, { composition = false } = {}) {
  if (state === undefined) {
    return freezeOwned({
      frames: freezeOwned([]),
      ...(composition ? { descendantFrames: freezeOwned([]) } : {}),
      localOrder: freezeOwned([]),
      overrides: freezeOwned([])
    });
  }
  if (!isPlainObject(state)) {
    throw new TypeError("Program theme state must be a plain object.");
  }
  if (Array.isArray(state.frames)) {
    return ownCanonicalThemeState(state, composition);
  }

  const name = state.name ?? "light";
  const tokens = state.tokens ?? {};
  const scope = state.scope ?? "self";
  const origin = state.origin?.ownerCompositionId;
  const owner = origin === undefined
    ? LOCAL_THEME_OWNER
    : compositionThemeOwner(origin, "descendants");
  const frame = createThemeFrame({
    owner,
    scope,
    definition: { base: name, tokens }
  });
  return freezeOwned({
    frames: freezeOwned([frame]),
    ...(composition && scope === "descendants"
      ? { descendantFrames: freezeOwned([frame]) }
      : composition
        ? { descendantFrames: freezeOwned([]) }
        : {}),
    localOrder: origin === undefined ? freezeOwned([scope]) : freezeOwned([]),
    overrides: cloneAndFreeze(state.overrides ?? [])
  });
}

export function resolveEffectiveThemeFrame(state) {
  const frames = state?.frames;
  return Array.isArray(frames) ? frames.at(-1) : undefined;
}

export function resolveEffectiveThemeTokens(state) {
  const frame = resolveEffectiveThemeFrame(state);
  return frame === undefined
    ? resolveThemeTokens("light")
    : resolveThemeTokens({ base: frame.name, tokens: frame.tokens });
}

export function setThemeStateOverrides(state, overrides) {
  if (!Array.isArray(overrides)) {
    throw new TypeError("Theme overrides must be an array.");
  }
  return freezeOwned({
    ...state,
    overrides: cloneAndFreeze([...overrides].sort())
  });
}

// Resolve active font defaults before guide layout validates their occupied bounds.
export function axisThemeTypography(state, component) {
  if (resolveEffectiveThemeFrame(state) === undefined) return {};
  const tokens = resolveEffectiveThemeTokens(state);
  const role = component === "labels" ? "axisLabel" : "axisTitle";
  const fontSize = tokens[`${role}FontSize`];
  return {
    fontFamily: tokens[`${role}FontFamily`] ?? tokens.fontFamily,
    ...(fontSize === undefined ? {} : { fontSize })
  };
}
