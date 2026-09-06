import {
  deriveTimeUnitRows,
  normalizeTimeUnitTransform
} from "../../grammar/timeUnit.js";
import { derivedCreator, derivedMaterializer } from "./shared.js";

const OPTIONS = Object.freeze(["id", "source", "field", "unit", "as", "temporalUnit"]);

export const materializeTimeUnitData = derivedMaterializer(
  "materializeTimeUnitData",
  "Materialize one immutable UTC time-unit dataset.",
  "timeUnit",
  deriveTimeUnitRows
);

export const createTimeUnitData = derivedCreator(
  "createTimeUnitData",
  "Create immutable UTC calendar bucket values.",
  OPTIONS,
  "Time-unit dataset id",
  "Source dataset id",
  normalizeTimeUnitTransform,
  "materializeTimeUnitData"
);
