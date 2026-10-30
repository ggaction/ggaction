import { positionBindings } from "../../core/encodingBindings.js";
import { validateWorkLimit } from "../../core/validation.js";

// Each prepared anchor retains its own resolved mapping. Count that expansion
// before cloning descriptors, including inactive conditional source bindings.
export function validateCartesianMappingWork(program,layer,count) {
  const bindings=[...Object.values(layer.encoding??{}),...Object.keys(layer.conditionals??{}).flatMap(channel=>positionBindings(layer,channel))];
  const mappings=bindings.flatMap(binding=>binding?.scale===undefined?[]:[program.resolvedScales[binding.scale]]);
  const mappingWork=mappings.reduce((sum,scale)=>sum+(scale?.domain??[]).reduce((total,value)=>total+1+(typeof value==="string"?value.length:0),0),0);
  validateWorkLimit(count*Math.max(1,mappingWork)*2,"Cartesian animation mapping work");
}
