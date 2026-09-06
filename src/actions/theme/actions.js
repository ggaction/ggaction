import { action } from "../../core/action.js";
import { noOptions, validateOptionObject } from "../../core/validation.js";
import { THEME_NAMES } from "../../theme/defaults.js";

export const applyTheme = action(
  {
    op: "applyTheme",
    description: "Apply persistent visual defaults to the chart program."
  },
  function (args = {}) {
    validateOptionObject(args, ["theme"], "applyTheme", {
      allowEmpty: false,
      emptyMessage: "applyTheme requires theme.",
      emptyError: Error
    });
    if (!THEME_NAMES.includes(args.theme)) {
      throw new Error(`Unsupported theme "${args.theme}".`);
    }
    const previous = this.materializationConfigs.theme;
    return this._withMaterializationConfig(["theme"], {
      name: args.theme,
      overrides: previous?.overrides ?? []
    });
  }
);

export const removeTheme = action(
  {
    op: "removeTheme",
    description: "Remove program theme defaults while preserving local styles."
  },
  function (args = {}) {
    noOptions(args, "removeTheme");
    if (this.materializationConfigs.theme === undefined) {
      throw new Error("removeTheme requires an active program theme.");
    }
    return this._withMaterializationConfig(["theme"], {
      ...this.materializationConfigs.theme,
      name: "light",
      removing: true
    });
  }
);
