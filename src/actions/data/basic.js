import { createFlattenData, materializeFlattenData } from "./flatten.js";
import {createLookupData,materializeLookupData} from "./lookup.js";
import { createData } from "./create.js";
import { createDerivedData } from "./derived.js";
import { createBasicBin2DData } from "./basicBin2d.js";
import { materializeBin2DData } from "./bin2dMaterialize.js";

export function registerBasicDataActions(ProgramClass) {
  ProgramClass.prototype.createData = createData;
  ProgramClass.prototype.createFlattenData = createFlattenData;
  ProgramClass.prototype.materializeFlattenData = materializeFlattenData;
  ProgramClass.prototype.createLookupData=createLookupData;
  ProgramClass.prototype.materializeLookupData=materializeLookupData;
  ProgramClass.prototype.createDerivedData = createDerivedData;
  ProgramClass.prototype.createBin2DData = createBasicBin2DData;
  ProgramClass.prototype.materializeBin2DData = materializeBin2DData;
}
