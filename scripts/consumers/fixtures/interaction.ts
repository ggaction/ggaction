import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { createInteractionSession, type InteractionCommand, type InteractionEvent } from "ggaction/interaction";
import { createTransitionScene } from "ggaction/scene";
const program = chart();
const session = createInteractionSession({ program, bindings: [{ type: "inspect", events: ["click"] }] });
createInteractionSession({ program: basic(), bindings: [] });
const command: InteractionCommand = { type: "frame", scene: createTransitionScene(program, { format: "canvas" }), version: 1, generation: 0 };
session.dispatch(command);
session.dispatch({ type: "inspect", point: { x: 5, y: 6 }, pointerType: "touch", slop: 2 });
declare const element: HTMLCanvasElement;
const unmount = session.mount(element, { rootTransform: [1, 0, 0, 1, 0, 0] });
const unsubscribe = session.subscribe((event: InteractionEvent) => { const key: string | undefined = event.state.hit?.target?.itemKey; });
session.dispatch({type:'select',target:'points',payload:{id:'picked',select:{items:[]}}});
session.dispatch({type:'select',target:'points',payload:{id:'picked',nearest:{space:'screen',point:{x:10,y:20},maxDistance:8,hitInvisible:true}}});
session.dispatch({type:'select',target:'points',payload:{id:'picked',nearest:{space:'data',fields:['x','y'],values:[1,2],metric:'euclidean',maxDistance:5},mode:'toggle'}});
// @ts-expect-error nearest and ordinary selectors are exclusive
session.dispatch({type:'select',target:'points',payload:{id:'picked',select:{items:[]},nearest:{space:'screen',point:{x:1,y:2},maxDistance:3}}});
// @ts-expect-error screen and data distances must be explicit
session.dispatch({type:'select',target:'points',payload:{id:'picked',nearest:{space:'data',fields:['x'],values:[1],metric:'cosine',maxDistance:5}}});
// @ts-expect-error no implicit unbounded nearest search
session.dispatch({type:'select',target:'points',payload:{id:'picked',nearest:{space:'screen',point:{x:1,y:2}}}});
session.dispatch({type:'setParameter',target:{childPath:['left'],id:'threshold'},payload:{value:2},origin:'user'});
session.dispatch({type:'clearSelection',target:'points',payload:{id:'picked'},transactionId:'clear'});
session.subscribe(event=>{if ('phase' in event) {const previous=event.previous;const next=event.current;const revision:number=event.revision;}});
// @ts-expect-error explicit owner required
session.dispatch({type:'select',payload:{id:'picked',select:{items:[]}}});
// @ts-expect-error invalid selection update mode
session.dispatch({type:'select',target:'points',payload:{id:'picked',select:{items:[]},mode:'union'}});
session.updateProgram(program); unsubscribe(); unmount(); session.destroy();
// @ts-expect-error unsupported controller binding
createInteractionSession({ program, bindings: [{ type: "drag" }] });
// @ts-expect-error unsupported implicit pixel ratio conversion
session.mount(element, { pixelRatio: 2 });
// @ts-expect-error sampled SVG fragments are not Canvas frames
session.dispatch({ type: "frame", scene: createTransitionScene(program), version: 1, generation: 0 });
// @ts-expect-error inspection metadata is immutable
session.getState().hit!.target!.itemKey = "change";
createInteractionSession({program,bindings:[{type:'linkSelection',id:'rows',target:{childPath:['right'],id:'points'},selection:'picked',resolve:'global',sources:[{target:{childPath:['left'],id:'points'},selection:'picked',projection:{type:'rows',sourceData:'rows',targetData:'rows'}}]}]});
createInteractionSession({program,bindings:[{type:'linkSelection',id:'tuple',target:'points',selection:'picked',resolve:'union',sources:[{target:'other',selection:'otherPicked',projection:{type:'fields',sourceFields:['category'],targetFields:['group']}}]}]});
const projected: readonly string[] = session.getState().linkedSelections[0].sources[0].keys;
// @ts-expect-error projection results are immutable
session.getState().linkedSelections[0].keys.push('change');
