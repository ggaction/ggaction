import { gaussianProfile } from "../../oracles/gaussian-profile.js";

import { rows, statistics } from "../../../examples/density-plot/data.js";
export { layout, rows, statistics, targets } from "../../../examples/density-plot/data.js";

export function referenceProfiles(variant) {
  const groups = variant === "vertical" ? [undefined] : ["A", "B"];
  return groups.map(group => ({ group, points: gaussianProfile(
    rows.filter(row => group === undefined || row.group === group).map(row => row.value), statistics
  ) }));
}
