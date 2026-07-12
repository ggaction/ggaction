import { registerAxisCollectionActions } from "./axes.js";
import { registerAxisLabelActions } from "./labels.js";
import { registerAxisLineActions } from "./lines.js";
import { registerAxisTickGroupActions } from "./tickGroups.js";
import { registerAxisTickActions } from "./ticks.js";
import { registerAxisTitleActions } from "./titles.js";
import { registerAxisActions } from "./axis.js";

export function registerGuideAxisActions(ProgramClass) {
  registerAxisLineActions(ProgramClass);
  registerAxisTickActions(ProgramClass);
  registerAxisLabelActions(ProgramClass);
  registerAxisTickGroupActions(ProgramClass);
  registerAxisTitleActions(ProgramClass);
  registerAxisActions(ProgramClass);
  registerAxisCollectionActions(ProgramClass);
}
