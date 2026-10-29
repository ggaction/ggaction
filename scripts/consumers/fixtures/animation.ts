import {chart,render} from 'ggaction';
import {chart as basic} from 'ggaction/basic';
import {planTransition,sampleTransition,exportAnimationFrames,serializeAnimation,deserializeAnimation,createAnimationPlayer,type TransitionPlan} from 'ggaction/animation';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
const from=chart(),to=chart(),plan=planTransition({from,to,options:{durationMs:100}});
planTransition({from:basic(),to:basic(),options:{durationMs:0}});
const frame=sampleTransition(plan,50),frames=exportAnimationFrames(plan,{timesMs:[0,50,100]});
planTransition({from:frames[0],to:frame,options:{durationMs:10,easing:'linear'}});
declare const context:CanvasRenderingContext2D;
render(frame,context);renderToSVG(frame);renderToPNGBuffer(frame);renderToPDFBuffer(frame);
const restored=deserializeAnimation(serializeAnimation(plan,{repeat:Infinity,rate:-1,reducedMotion:true}));
const player=createAnimationPlayer({plan:restored.plan,...restored.playback,clock:{now:()=>0,requestFrame:()=>1,cancelFrame(){}},render:frame=>renderToSVG(frame)});
player.play().pause().seek(10).reverse().setRate(2).setRepeat(1);
player.interrupt({to,options:{durationMs:100}});player.cancel();player.dispose();
const settled:Promise<{readonly reason:string;readonly timeMs:number;readonly iteration:number}>=player.finished;
// @ts-expect-error authored plans are not prepared handles
const forged:TransitionPlan={kind:'transition-plan',version:1,durationMs:1,easing:'linear'};
// @ts-expect-error schedules choose one source of times
exportAnimationFrames(plan,{fps:30,timesMs:[0]});
// @ts-expect-error plain graphics are not authentic sampled endpoints
planTransition({from:{graphicSpec:frame.graphicSpec},to,options:{durationMs:1}});
// @ts-expect-error animation persistence cannot retain callbacks
serializeAnimation(plan,{render(){}});
// @ts-expect-error output frames are immutable
frames.push(frame);
