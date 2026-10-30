import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileTypeScript } from '../support/typescript.js';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('animation declarations keep plans and frames opaque and directly renderable', async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'ggaction-animation-types-'));
  try{
    const file=path.join(directory,'animation.mts');
    await writeFile(file,`
import { chart, render } from ${JSON.stringify(path.join(root,'types/index.js'))};
import { chart as basic } from ${JSON.stringify(path.join(root,'types/basic.js'))};
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, exportAnimationFrames,
  createAnimationPlayer, type TransitionPlan } from ${JSON.stringify(path.join(root,'types/animation.js'))};
import { renderToSVG } from ${JSON.stringify(path.join(root,'types/svg.js'))};
import { renderToPNGBuffer } from ${JSON.stringify(path.join(root,'types/png.js'))};
import { renderToPDFBuffer } from ${JSON.stringify(path.join(root,'types/pdf.js'))};
const from=chart(),to=chart();
const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}});
planTransition({from:basic(),to:basic(),options:{durationMs:0}});
const frame=sampleTransition(plan,50);
for(const decision of frame.decisions)if(decision.kind==='geographic'){
  const key:string=decision.itemKey;const owner:string=decision.ownerKey;
  const kernel:'native-geo'=decision.kernel;
  // @ts-expect-error a currently generated Geo part need not exist at an endpoint
  decision.targetIndex;
}
planTransition({from:frame,to,options:{durationMs:100}});
planTransition({from,to:frame,options:{durationMs:100}});
const saved:string=serializeAnimation(plan,{repeat:Infinity,rate:-1,reducedMotion:true});
const restored=deserializeAnimation(saved);
const frames=exportAnimationFrames(restored.plan,{timesMs:[0,50,100]});
const time:number=frames[0].timeMs;
planTransition({from:frames[0],to,options:{durationMs:100}});
exportAnimationFrames(plan,{fps:60});
declare const context:CanvasRenderingContext2D;
render(frame,context);renderToSVG(frame);renderToPNGBuffer(frame);renderToPDFBuffer(frame);
const player=createAnimationPlayer({plan,...restored.playback,clock:{now:()=>0,
  requestFrame:callback=>'host-frame',cancelFrame:handle=>{const token:string=handle;}},render:frame=>renderToSVG(frame)});
player.play().pause().seek(50).reverse().setRate(2).setRepeat(Infinity).cancel();
player.interrupt({to,options:{durationMs:200},rate:-1});
player.finished.then(result=>{const time:number=result.timeMs;const reason:string=result.reason;});
const status:string=player.getState().status;player.getFrame()?.scene;player.dispose();
// @ts-expect-error a plan cannot be authored as a plain object
const fake:TransitionPlan={kind:'transition-plan',version:1,durationMs:100,easing:'linear'};
// @ts-expect-error a copied renderer input is not an authentic frame
planTransition({from:{graphicSpec:frame.graphicSpec},to,options:{durationMs:100}});
// @ts-expect-error schedule forms are exclusive
exportAnimationFrames(plan,{timesMs:[0],fps:60});
// @ts-expect-error frame arrays cannot be mutated
frames.push(frame);
// @ts-expect-error plans and preferences are read-only
restored.playback.rate=2;
// @ts-expect-error callbacks do not belong to persistence
serializeAnimation(plan,{render(){}});
// @ts-expect-error duration is required
planTransition({from,to,options:{easing:'linear'}});
// @ts-expect-error easing is closed
planTransition({from,to,options:{durationMs:1,easing:'spring'}});
// @ts-expect-error a player requires an explicit clock
createAnimationPlayer({plan,render(){}});
// @ts-expect-error private planner payload exports are not public
import {exportTransitionPlan} from ${JSON.stringify(path.join(root,'types/animation.js'))};
`);
    const result=compileTypeScript(['--noEmit','--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stdout+result.stderr);
  }finally{await rm(directory,{recursive:true,force:true});}
});
