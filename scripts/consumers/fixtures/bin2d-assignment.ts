import { chart, type Bin2DAssignment, type DatasetBin2DTransform } from "ggaction";
import type { Bin2DAssignment as BasicAssignment } from "ggaction/basic";
const basicAssignment: BasicAssignment = "edges";
const assignment: Bin2DAssignment = "step";
const source = chart().createData({ values: [{ x: 0, y: 0 }, { x: 1, y: 1 }] });
source.createBin2DData({ id: "cells", x: "x", y: "y", assignment }).editBin2DData({ assignment: "edges" });
source.createHeatmap({ x: "x", y: "y", bin: { assignment }, guides: false });
// @ts-expect-error Closed assignment vocabulary.
const invalid: Bin2DAssignment = "auto";
// @ts-expect-error Canonical transforms omit the default policy.
const stored: DatasetBin2DTransform["assignment"] = "edges";
// @ts-expect-error Heatmap forwards only the closed assignment vocabulary.
source.createHeatmap({ x: "x", y: "y", bin: { assignment: false } });
void [invalid, stored, basicAssignment];
