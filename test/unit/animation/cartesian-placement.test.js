import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../../src/animation.js";
import { projectAnimationEndpoint } from "../../../src/animation/endpoints.js";
import { projectCartesianAnimationState } from "../../../src/materialization/animation/cartesian.js";
import { resolveCartesianAnimationGeometry } from "../../../src/grammar/animation/cartesianState.js";

const rows=[{id:"a",c:"A",g:"u",y:1,lower:.5,upper:3},{id:"b",c:"A",g:"v",y:3,lower:2,upper:4},
  {id:"c",c:"B",g:"u",y:2,lower:1,upper:4},{id:"d",c:"B",g:"v",y:5,lower:4,upper:7}];
const base=()=>chart().createCanvas({width:400,height:300,margin:30}).createData({id:"d",keyField:"id",values:rows});
const options={durationMs:100,easing:"linear"};
function checkResize(from) {
  const to=from.editCanvas({width:600,height:400}),native=from.editCanvas({width:500,height:350});
  const endpoint=projectAnimationEndpoint(from),states=projectCartesianAnimationState(from,endpoint);
  for(const [index,state] of states.entries())if(endpoint.identities[index]!==undefined)assert.equal(state.reason,undefined,endpoint.identities[index].key);
  const plan=planTransition({from,to,options}),frame=sampleTransition(plan,50),middle=projectAnimationEndpoint(native);
  const expected=new Map(middle.identities.flatMap((identity,index)=>identity===undefined?[]:[[identity.key+identity.role,middle.scene.nodes[index]]]));
  for(const track of plan.tracks) {
    assert.equal(track.kind,"semantic-cartesian",track.key);
    const index=frame.decisions.findIndex(decision=>decision.targetIndex===track.targetIndex),node=frame.scene.nodes[index];
    const matching=expected.get(track.key+track.role);
    const state=projectCartesianAnimationState(native,middle)[middle.identities.findIndex(identity=>identity?.key===track.key&&identity.role===track.role)];
    for(const [key,value] of Object.entries(resolveCartesianAnimationGeometry(state).properties))assert.deepEqual(node.properties[key],value,`${track.key}.${key}`);
    assert.equal(node.type,matching.type);
  }
  assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50),frame);
  const rebased=planTransition({from:frame,to:from,options});
  assert.equal(sampleTransition(rebased,0),frame);
  assert.ok(rebased.tracks.every(track=>["semantic-cartesian","exact"].includes(track.kind)));
  const restored=deserializeAnimation(serializeAnimation(rebased)).plan;
  for(const time of [0,25,50,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(rebased,time));
  return {from,to,frame,plan};
}

test("ordinary and conditional rule offsets share native reversed-band placement",()=>{
  for(const channel of ["x","y"])for(const reverse of [false,true]) {
    const encode=channel==="x"?"encodeX":"encodeY",offset=channel==="x"?"encodeXOffset":"encodeYOffset";
    const p=base().createRuleMark({id:"m"})[encode]({field:"c",fieldType:"nominal",scale:{reverse,padding:.2}})
      [offset]({field:"g",fieldType:"nominal",scale:{padding:.1}});
    checkResize(p);
    const value={field:"g",fieldType:"nominal",scale:{id:p.semanticSpec.layers[0].encoding[`${channel}Offset`].scale}};
    checkResize(p[offset]({conditions:[{when:{version:2,registry:"standard@1",root:{type:"literal",value:false}},value}],otherwise:value}));
  }
});

test("error-bar fixed spans and box median spans share native geometry in both orientations",()=>{
  for(const horizontal of [false,true]) {
    const category={field:"c",fieldType:"nominal"},measure={center:"y",lower:"lower",upper:"upper"};
    checkResize(base().createErrorBar({id:"m",x:horizontal?measure:category,y:horizontal?category:measure,caps:true,capSize:17}));
    for(const width of [{band:.45},{pixels:31}])for(const median of [{},{width:{pixels:9}}]) {
      checkResize(base().createBoxPlot({id:"m",x:horizontal?{field:"y"}:category,y:horizontal?category:{field:"y"},
        outliers:false,width,median,guides:false}));
    }
  }
});

test("raincloud native category slots retain box, median, cap and unjittered point anchors",()=>{
  for(const orientation of ["vertical","horizontal"])for(const side of ["before","after"]) {
    checkResize(base().createRaincloudPlot({id:"m",category:"c",value:"y",orientation,side,density:false,
      summary:{type:"box",outliers:false},points:{type:"strip",jitter:false},guides:false}));
  }
});
