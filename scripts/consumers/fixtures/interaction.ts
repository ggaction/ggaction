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
createInteractionSession({program,bindings:[{type:'select',target:{childPath:['left'],id:'points'},selection:'picked',mode:'toggle',onMiss:'ignore',slop:2,hitInvisible:true}]});
// @ts-expect-error click bindings use existing named selections
createInteractionSession({program,bindings:[{type:'select',target:'points'}]});
// @ts-expect-error drag and additive gestures have no automatic click binding
createInteractionSession({program,bindings:[{type:'select',target:'points',selection:'picked',mode:'add'}]});
// @ts-expect-error miss policy differs from selection empty semantics
createInteractionSession({program,bindings:[{type:'select',target:'points',selection:'picked',onMiss:'all'}]});
const projected: readonly string[] = session.getState().linkedSelections[0].sources[0].keys;
createInteractionSession({program,selectionPolicy:'drop',bindings:[]});
const available:boolean=session.getState().linkedSelections[0].targetAvailable;
session.subscribe(event=>{if(event.type==='program'||'phase' in event){const changes:readonly string[]=event.selectionChanges.flatMap(change=>change.droppedKeys);}});
// @ts-expect-error lifecycle policy is explicit and closed
createInteractionSession({program,selectionPolicy:'forget'});

// @ts-expect-error projection results are immutable
session.getState().linkedSelections[0].keys.push('change');

session.subscribe(event => { if ('phase' in event && event.phase === 'cancel') { const sameRevision: number = event.revision; } });
createInteractionSession({program,bindings:[{type:'brush',target:'points',selection:'picked',axis:'xy',mode:'intersect'}]});
createInteractionSession({program,bindings:[{type:'brush',target:'bars',selection:'picked',axis:'y',channels:{y:'y2'}}]});
createInteractionSession({program,bindings:[{type:'lasso',target:'points',selection:'picked',mode:'add'}]});
session.subscribe(event=>{if('phase' in event&&event.phase==='preview'){const preview=event.state.previewProgram;}});
// @ts-expect-error one-axis brush cannot select the other axis
createInteractionSession({program,bindings:[{type:'brush',target:'points',selection:'picked',axis:'x',channels:{y:'y'}}]});
// @ts-expect-error screen lasso has no domain axis
createInteractionSession({program,bindings:[{type:'lasso',target:'points',selection:'picked',axis:'x'}]});

createInteractionSession({program,bindings:[{type:'brush',target:'points',selection:'picked',axis:'theta'}]});
program.editMarkSelection({selection:'picked',region:{theta:{ranges:[]}},screenAngles:[0,Math.PI/2]});
session.dispatch({type:'filter',target:'points',payload:{select:{field:'x',op:'gte',value:2},mode:'compose'}});
session.dispatch({type:'filter',target:'points',payload:{clear:true}});
session.dispatch({type:'reorder',target:'bars',payload:{channel:'x',values:['B','A']}});
session.dispatch({type:'reorder',target:'bars',payload:{channel:'x',by:'count',direction:'descending'}});
session.dispatch({type:'reorder',target:'bars',payload:{channel:'x',clear:true}});
// @ts-expect-error clear cannot also set a filter
session.dispatch({type:'filter',target:'points',payload:{clear:true,select:{items:[]}}});
// @ts-expect-error clear cannot also set an order
session.dispatch({type:'reorder',target:'bars',payload:{channel:'x',clear:true,values:['A']}});

createInteractionSession({program,bindings:[{type:'linkFilter',id:'filter',target:'points',selection:'universe',resolve:'global',sources:[
 {target:'source',selection:'picked',projection:{type:'fields',sourceFields:['category'],targetFields:['group']}}
]}]});

createInteractionSession({program,bindings:[{type:'legend',effect:'selection',target:'points',channel:'color',selection:'picked',mode:'toggle'}]});
// @ts-expect-error internal representation is not a public legend channel
createInteractionSession({program,bindings:[{type:'legend',effect:'selection',target:'points',channel:'series',selection:'picked'}]});

program.setMarkVisibility({channel:'color',values:[1,'1',false],visible:false,scaleDomain:'all-data'});
program.removeMarkVisibility();
createInteractionSession({program,bindings:[{type:'legend',effect:'visibility',target:'points',channel:'color',scaleDomain:'visible-data'}]});
session.dispatch({type:'setVisibility',target:'points',payload:{channel:'shape',values:['A'],visible:true,scaleDomain:'all-data'}});
session.dispatch({type:'setVisibility',target:'points',payload:{clear:true}});
// @ts-expect-error Basic has no visibility authoring
basic().setMarkVisibility({channel:'color',values:['A'],visible:false,scaleDomain:'all-data'});
// @ts-expect-error visibility requires an explicit policy
session.dispatch({type:'setVisibility',target:'points',payload:{channel:'color',values:['A'],visible:false}});

createInteractionSession({program:basic(),bindings:[{type:'contextMenu',slop:0}]});
session.dispatch({type:'focusHierarchy',target:'partition',payload:{focus:{key:1}}});
session.dispatch({type:'focusHierarchy',target:{childPath:['left'],id:'partition'},payload:{focus:{path:['A',false]}}});
session.dispatch({type:'focusHierarchy',target:'partition',payload:{focus:null}});
// @ts-expect-error focus is explicit even when restoring the root
session.dispatch({type:'focusHierarchy',target:'partition',payload:{}});
// @ts-expect-error focus does not change partition layout policies
session.dispatch({type:'focusHierarchy',target:'partition',payload:{focus:null,rootVisible:false}});
session.dispatch({type:'contextMenu',point:{x:50,y:60}});
session.subscribe(event=>{if(event.type==='contextMenu'){const owner: string|undefined=event.state.hit?.target?.ownerId;}});
// @ts-expect-error context binding does not pick a target or action for the host
createInteractionSession({program,bindings:[{type:'contextMenu',target:'points'}]});

session.dispatch({type:'setViewport',target:'map',payload:{scalePx:2,translatePx:[10,-20]}});
session.dispatch({type:'setViewport',target:{childPath:['left'],id:'map'},payload:{centerDeg:[10,0],rotateDeg:[0,20,5]}});
// @ts-expect-error viewport commands do not change projection type
session.dispatch({type:'setViewport',target:'map',payload:{type:'mercator'}});
// @ts-expect-error viewport commands do not infer LOD zoom
session.dispatch({type:'setViewport',target:'map',payload:{zoom:2}});

program.editLayout({target:'layout',node:{key:[1,'a'],x:10,y:20}});
session.dispatch({type:'moveNode',target:'layout',payload:{key:1,x:10,y:20}});
createInteractionSession({program,bindings:[{type:'moveNode',target:'network'}]});
// @ts-expect-error node edits cannot simultaneously replace options
program.editLayout({node:{key:1,x:1,y:2},options:{maxNodes:5}});
// @ts-expect-error node dragging has no selection binding
createInteractionSession({program,bindings:[{type:'moveNode',target:'network',selection:'picked'}]});

program.editAnnotation({target:'note',text:'Revised',x:2,y:3,dx:8,layout:false});
session.dispatch({type:'annotate',target:'note',payload:{text:'Revised',format:'auto',placement:'auto'}});
session.dispatch({type:'annotate',target:'map-note',payload:{anchor:{type:'feature',geometry:'regions',key:1,level:'county'},dx:8}});
session.dispatch({type:'annotate',target:'note',payload:{select:{items:['logical-item']}}});
chart().createAnnotation({text:'Chosen',source:'bars',selection:'picked'}).editAnnotation({all:true});
// @ts-expect-error coordinate annotations cannot own item membership
chart().createAnnotation({text:'Bad',x:1,y:2,select:{items:[]}});
// @ts-expect-error membership replacement chooses exactly one native mode
chart().editAnnotation({select:{items:[]},all:true});
// @ts-expect-error annotation commands do not redirect the native target
session.dispatch({type:'annotate',target:'note',payload:{target:'other',text:'No'}});
// @ts-expect-error native annotation edit preserves its existing source
program.editAnnotation({target:'note',source:'new-source'});
