import {
  deriveWindowRows,
  normalizeWindowTransform
} from "../../grammar/window.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "partitionBy", "sortBy", "operations"
]);

export const materializeWindowData = derivedMaterializer(
  "materializeWindowData",
  "Materialize one immutable window-derived dataset.",
  "window",
  deriveWindowRows
);

export const createWindowData = derivedCreator(
  "createWindowData",
  "Create immutable partitioned window values.",
  OPTIONS,
  "Window dataset id",
  "Source dataset id",
  normalizeWindowTransform,
  "materializeWindowData"
);
