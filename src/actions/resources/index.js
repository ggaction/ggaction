import { removeCoordinate, removeData, removeScale } from "./remove.js";

export function registerResourceActions(ProgramClass) {
  ProgramClass.prototype.removeData = removeData;
  ProgramClass.prototype.removeScale = removeScale;
  ProgramClass.prototype.removeCoordinate = removeCoordinate;
}
