import { chart } from '../../../../../src/index.js';
import { planTransition } from '../../../../../src/animation.js';
import { graphicAnimationOwnerKey } from '../../../../../src/grammar/animation/ownerKey.js';
const p=chart().createCanvas().createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:2}]}).createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'});
const plan=planTransition({from:p,to:p,options:{durationMs:100}}),original=plan.from.identities.find(Boolean),missing={...original};delete missing.lineage;
let reads=0,result,error;const descriptor=Object.create(null);descriptor.configurable=true;descriptor.get=()=>{reads++;return original.lineage;};
Object.defineProperty(Object.prototype,'lineage',descriptor);
try{result=graphicAnimationOwnerKey(missing);}catch(caught){error=caught.message;}finally{delete Object.prototype.lineage;}
console.log(JSON.stringify({missingOwnLineage:!Object.hasOwn(missing,'lineage'),getterReads:reads,result,error}));
if(reads!==0||error===undefined)process.exitCode=1;
