import {
  deriveWindowRows,
  normalizeWindowTransform
} from "../../grammar/window.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "partitionBy", "sortBy", "operations", "temporalUnit"
]);

export const materializeWindowData = /* @__PURE__ */ derivedMaterializer(
  "materializeWindowData",
  "Materialize one immutable window-derived dataset.",
  "window",
  deriveWindowRows
);

export const createWindowData = /* @__PURE__ */ derivedCreator(
  "createWindowData",
  "Create immutable partitioned window values.",
  OPTIONS,
  "Window dataset id",
  "Source dataset id",
  normalizeWindowTransform,
  "materializeWindowData"
);
