import { buildLinearPathCommands } from "./pathCommands.js";
import { buildAreaCurvePathCommands } from "./curveCommands.js";

export function buildDensityAreaBoundaryPath(lower, upper, curve, independentAxis = "x") {
  const dependent=independentAxis==="x"?"y":"x", baseline=lower[0][dependent];
  if(curve==="linear"&&lower.every(point=>point[dependent]===baseline)) {
    return buildLinearPathCommands([lower[0],...upper,lower.at(-1)],{close:true});
  }
  return buildAreaCurvePathCommands(lower,upper,curve,{independentAxis});
}
