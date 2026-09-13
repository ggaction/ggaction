import { action } from "../../core/action.js";
import { noOptions, validateOptionObject } from "../../core/validation.js";
import { normalizeThemeDefinition } from "../../theme/defaults.js";
import {
  LOCAL_THEME_OWNER,
  createThemeFrame,
  moveLocalThemeScope,
  normalizeThemeState,
  removeThemeFrameOwner,
  upsertThemeFrame
} from "./state.js";

let compositionThemeHandlers;

export function registerCompositionThemeHandlers(handlers) {
  if (handlers === undefined ||
      typeof handlers.apply !== "function" ||
      typeof handlers.remove !== "function") {
    throw new TypeError("Composition theme handlers must provide apply and remove functions.");
  }
  compositionThemeHandlers = handlers;
}

function requireCompositionThemeHandlers() {
  if (compositionThemeHandlers === undefined) {
    throw new Error("Composition theme actions are unavailable from this entry point.");
  }
  return compositionThemeHandlers;
}

export const applyTheme = action(
  {
    op: "applyTheme",
    description: "Apply persistent visual defaults to the chart program.",
    scope: "any"
  },
  function (args = {}) {
    validateOptionObject(args, ["theme", "scope"], "applyTheme", {
      allowEmpty: false,
      emptyMessage: "applyTheme requires theme.",
      emptyError: Error
    });
    if (!Object.hasOwn(args, "theme")) {
      throw new Error("applyTheme requires theme.");
    }
    const definition = normalizeThemeDefinition(args.theme);
    if (args.scope !== undefined &&
        !["self", "descendants"].includes(args.scope)) {
      throw new Error(`Unsupported theme scope "${args.scope}".`);
    }
    if (this.compositionSpec !== undefined) {
      return requireCompositionThemeHandlers().apply(
        this,
        { base: definition.name, tokens: definition.tokens },
        args.scope ?? "descendants"
      );
    }
    const scope = "self";
    const previous = normalizeThemeState(this.materializationConfigs.theme);
    const frame = createThemeFrame({
      owner: LOCAL_THEME_OWNER,
      scope,
      definition: { base: definition.name, tokens: definition.tokens }
    });
    return this._withMaterializationConfig(["theme"], {
      ...previous,
      frames: upsertThemeFrame(previous.frames, frame),
      localOrder: moveLocalThemeScope(previous.localOrder, scope)
    });
  }
);

export const removeTheme = action(
  {
    op: "removeTheme",
    description: "Remove program theme defaults while preserving local styles.",
    scope: "any"
  },
  function (args = {}) {
    noOptions(args, "removeTheme");
    if (this.compositionSpec !== undefined) {
      return requireCompositionThemeHandlers().remove(this);
    }
    const previous = normalizeThemeState(this.materializationConfigs.theme);
    const removed = removeThemeFrameOwner(
      previous.frames,
      LOCAL_THEME_OWNER
    );
    if (!removed.removed) {
      throw new Error("removeTheme requires an active program theme.");
    }
    return this._withMaterializationConfig(["theme"], {
      ...previous,
      frames: removed.frames,
      localOrder: previous.localOrder.filter(scope => scope !== "self")
    });
  }
);
