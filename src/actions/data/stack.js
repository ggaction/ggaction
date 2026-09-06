import {
  deriveStackRows,
  normalizeStackTransform
} from "../../grammar/stack.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "category", "group", "value", "mode", "as"
]);

export const materializeStackData = derivedMaterializer(
  "materializeStackData",
  "Materialize one immutable category/series stack dataset.",
  "stack",
  deriveStackRows
);

export const createStackData = derivedCreator(
  "createStackData",
  "Create reusable start, end, value, and share stack rows.",
  OPTIONS,
  "Stack dataset id",
  "Stack source dataset id",
  normalizeStackTransform,
  "materializeStackData"
);
