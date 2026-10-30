import assert from 'node:assert/strict';
import {chart} from '../../../../../src/index.js';
import {planTransition,createAnimationPlayer} from '../../../../../src/animation.js';
const from=chart().createCanvas({width:300,height:200}).createData({values:[{x:1,y:2}]}).createPointMark().encodeX({field:'x'}).encodeY({field:'y'});
const plan=planTransition({from,to:from,options:{durationMs:100,easing:'linear',markers:[{id:'start',timeMs:0},{id:'middle',timeMs:50},{id:'end',timeMs:100}]}});
let time=0,id=0;const pending=new Map();const clock={now:()=>time,requestFrame:f=>(pending.set(++id,f),id),cancelFrame:id=>pending.delete(id)};
const events=[];const player=createAnimationPlayer({plan,clock,render(){},onMarker:event=>events.push(event.id)});
player.play();time=100;for(const callback of [...pending.values()]){pending.clear();callback();}
const previous=player.getState();const before=[...events];player.seek(75,{emit:true});
console.log(JSON.stringify({previous,after:player.getState(),before,events,emittedDuringReverseSeek:events.slice(before.length)}));
assert.deepEqual(events,before,'Backward seek from a completed frame must not emit forward marker crossings');
