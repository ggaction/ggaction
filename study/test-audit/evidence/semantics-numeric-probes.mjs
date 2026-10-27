import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { mapLinear, quantile, niceDomain } from '../../../ggaction/test/oracles/numeric.js';
const moduleUrl=pathToFileURL('/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/oracles/numeric.js').href;
const child=spawnSync(process.execPath,['--input-type=module','-e',`import {numericTicks} from ${JSON.stringify(moduleUrl)}; console.log(numericTicks([1e16,1e16+4],5));`],{timeout:1000,encoding:'utf8'});
console.log(JSON.stringify({linear:{actual:mapLinear(0,[-Number.MAX_VALUE,Number.MAX_VALUE],[0,100]),expected:50},quantile:{actual:String(quantile([-Number.MAX_VALUE,Number.MAX_VALUE],.5)),expected:0},ticks:{status:child.status,error:child.error?.code,signal:child.signal,stdout:child.stdout}},null,2));
