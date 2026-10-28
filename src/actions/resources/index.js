import { removeResource } from "./stored.js";
import { removeCoordinate, removeData, removeScale } from "./remove.js";

export function registerResourceActions(ProgramClass) {
  ProgramClass.prototype.removeResource = removeResource;
  ProgramClass.prototype.removeData = removeData;
  ProgramClass.prototype.removeScale = removeScale;
  ProgramClass.prototype.removeCoordinate = removeCoordinate;
}
