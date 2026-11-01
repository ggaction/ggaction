import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { buildCategoricalDensityPath } from "../categoricalDensity.js";
import { buildDensityAreaBoundaryPath } from "../densityAreaPath.js";
import { buildAreaCurvePathCommands } from "../curveCommands.js";
import { interpolateNumber } from "./values.js";

export function validateCartesianDensity(state) {
  if(state.kind!=="area-category-density") {
    if(Object.hasOwn(state,"density"))throw new TypeError("Only categorical density retains a density width mapping.");
    return;
  }
  if(!Object.hasOwn(state,"density"))throw new TypeError("Categorical density requires its width mapping.");
  const density=ownRecord(state.density,"Cartesian density mapping");
  rejectUnknownProperties(density,["values","maximum"],"Cartesian density mapping");
  if(!Object.hasOwn(density,"values")||!Object.hasOwn(density,"maximum"))throw new TypeError("Cartesian density requires values and maximum.");
  ownArray(density.values,"Cartesian density values");
  if(density.values.length!==state.points.length||!Number.isFinite(density.maximum)||density.maximum<=0||
    density.values.some(value=>!Number.isFinite(value)||value<0||value>density.maximum))throw new RangeError("Invalid Cartesian density width mapping.");
}
export function sampleCartesianDensity(from,to,progress) {
  return !Object.hasOwn(from,"density")?{}:{density:{values:from.density.values.map((value,index)=>interpolateNumber(value,to.density.values[index],progress)),
    maximum:interpolateNumber(from.density.maximum,to.density.maximum,progress)}};
}
export function resolveCartesianDensity(state,samples) {
  if(state.kind==="area-density") {
    const points=samples.map(point=>({x:point.x.position,y:point.y.position})),count=points.length/2;
    const lower=points.slice(0,count),upper=points.slice(count),axis=state.policy.orientation==="horizontal"?"y":"x";
    return {type:"path",properties:{commands:state.policy.layout==="overlay"?buildDensityAreaBoundaryPath(lower,upper,state.policy.curve,axis)
      :buildAreaCurvePathCommands(lower,upper,state.policy.curve,{independentAxis:axis})}};
  }
  const {channel,side,widthBand,curve}=state.policy,other=channel==="x"?"y":"x";
  const series={category:state.points[0][channel].value,side,values:state.points.map((point,index)=>({value:point[other].value,density:state.density.values[index]}))};
  const positions=samples.map(point=>({category:point[channel].position,value:point[other].position,bandwidth:point[channel].resolvedScale.bandwidth}));
  return {type:"path",properties:{commands:buildCategoricalDensityPath(series,{center:positions[0].category,categoryScale:samples[0][channel].resolvedScale,
    valueScale:samples[0][other].resolvedScale,channel,widthBand,maximum:state.density.maximum,positions,curve})}};
}
