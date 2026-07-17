import { chart } from "./ChartProgram.js";
import { hconcatAction, vconcatAction } from "./actions/composition/actions.js";

export function hconcat(options) {
  return hconcatAction.call(chart(), options);
}

export function vconcat(options) {
  return vconcatAction.call(chart(), options);
}
