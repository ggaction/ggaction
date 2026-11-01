import { chart } from "ggaction";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "ggaction/animation";

const cartesianCompletionVariants=["conditional","fixed-span","overlay","density"];
function cartesianCompletionFrame(variant) {
  const values=[{id:"a",c:"A",y:2,lo:1,hi:3},{id:"b",c:"B",y:4,lo:3,hi:5}];
  let from=chart().createCanvas({width:400,height:300,margin:20,background:"white",plotBorder:false})
    .createData({id:"rows",keyField:"id",values}),to,check;
  if(variant==="conditional") {
    from=from.createParameter({id:"enabled",value:false}).createRuleMark({id:"m",stroke:"red",strokeWidth:8})
      .encodeY({conditions:[{when:{version:2,registry:"standard@1",root:{type:"parameter",id:"enabled"}},value:{field:"hi",fieldType:"quantitative",scale:{id:"y",domain:[0,10],nice:false}}}],otherwise:{field:"lo",fieldType:"quantitative",scale:{id:"y",domain:[0,10],nice:false}}});
    to=from.editParameter({target:"enabled",value:true});check=[200,228];
  }else if(variant==="fixed-span") {
    from=from.createErrorBar({id:"m",x:{field:"c",fieldType:"nominal"},y:{center:"y",lower:"lo",upper:"hi",scale:{domain:[0,10],nice:false}},caps:true,capSize:24,stroke:"red",strokeWidth:6});
    to=from.editErrorBar({target:"m",capSize:48});check=[125,254];
  }else if(variant==="overlay") {
    from=from.createBarMark({id:"m",fill:"blue"}).encodeX({field:"c",fieldType:"nominal"}).encodeY({field:"y",aggregate:"sum",scale:{domain:[0,10],nice:false}})
      .createOverlay({id:"overlay",source:"m",type:"point",point:{fill:"red",stroke:"none"}}).encodeRadius({target:"overlay",value:10});
    to=from.reviseData({source:"rows",id:"next",values:values.map(row=>({...row,y:row.y+4}))});check=[110,176];
  }else {
    from=from.createDensityPlot({id:"m",field:"y",bandwidth:1,extent:[0,6],steps:8,area:{fill:"red",opacity:1},guides:false});
    to=from.editScale({id:"y",domain:[0,from.resolvedScales.y.domain[1]*2],nice:false});check=[200,250];
  }
  const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}});
  const frame=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
  return {from,to,plan,frame,checks:[{point:check,rgba:[255,0,0,255]},{point:[5,5],rgba:[255,255,255,255]}]};
}

export const cases=[
  {id:"animation-cartesian-completion/native-four-renderers",async run(){
    const {default:assert}=await import("node:assert/strict"),{createCanvas}=await import("@napi-rs/canvas"),{render}=await import("ggaction"),{renderToSVG}=await import("ggaction/svg"),{renderToPNGBuffer}=await import("ggaction/png"),{renderToPDFBuffer}=await import("ggaction/pdf");
    for(const variant of cartesianCompletionVariants) {
      const {from,to,plan,frame,checks}=cartesianCompletionFrame(variant),canvas=createCanvas(1,1);
      assert.ok(frame.decisions.some(decision=>decision.kernel==="cartesian-geometry"));
      assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
      render(frame,canvas.getContext("2d"));
      for(const check of checks)assert.deepEqual([...canvas.getContext("2d").getImageData(...check.point,1,1).data],check.rgba);
      const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);assert.deepEqual(png.buffer,await canvas.encode("png"));
      assert.match(renderToSVG(frame),/<(?:path|line|circle)/);assert.equal(pdf.buffer.subarray(0,4).toString(),"%PDF");assert.doesNotMatch(pdf.buffer.toString("latin1"),/\/Subtype\s*\/Image\b/);
    }
  }},
  {id:"animation-cartesian-completion/offline-network-free",async run(){
    const {default:assert}=await import("node:assert/strict"),{spawnSync}=await import("node:child_process"),{createHash}=await import("node:crypto"),{createCanvas}=await import("@napi-rs/canvas"),{render}=await import("ggaction"),{renderToSVG}=await import("ggaction/svg"),{renderToPNGBuffer}=await import("ggaction/png");
    const hash=value=>createHash("sha256").update(value).digest("hex"),payloads=[],expected=[];
    for(const variant of cartesianCompletionVariants){const {plan,frame}=cartesianCompletionFrame(variant),canvas=createCanvas(1,1);render(frame,canvas.getContext("2d"));payloads.push(serializeAnimation(plan));expected.push({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer),canvas:hash(await canvas.encode("png"))});}
    const child=spawnSync(process.execPath,["--input-type=module","-e",`
      import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import{syncBuiltinESMExports}from'node:module';
      let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;for(const x of [http,https]){x.get=deny;x.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const {createHash}=await import('node:crypto'),{createCanvas}=await import('@napi-rs/canvas'),{render}=await import('ggaction'),{deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png');
      let input='';for await(const chunk of process.stdin)input+=chunk;const hash=value=>createHash('sha256').update(value).digest('hex'),frames=[];
      for(const saved of JSON.parse(input)){const frame=sampleTransition(deserializeAnimation(saved).plan,50),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));frames.push({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer),canvas:hash(await canvas.encode('png'))});}
      console.log(JSON.stringify({frames,network}));
    `],{input:JSON.stringify(payloads),encoding:"utf8",timeout:30000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{frames:expected,network:0});
  }},
  {id:"animation-cartesian-completion/current-hit-selection-interrupt",async run(){
    const {default:assert}=await import("node:assert/strict"),{createInteractionSession}=await import("ggaction/interaction"),{getMarkItems}=await import("ggaction/inspection");
    const original=cartesianCompletionFrame("overlay"),from=original.from.selectMarks({id:"picked",target:"overlay",items:[],empty:"none"}),to=original.to;
    const options={durationMs:100,easing:"linear"},plan=planTransition({from,to,options}),frame=sampleTransition(plan,50),key=getMarkItems(from,{target:"overlay"})[0].key;
    const session=createInteractionSession({program:from,bindings:[{type:"keyboard",targets:[{target:"overlay",activation:{type:"select",selection:"picked"}}]}]});
    try {
      session.dispatch({type:"frame",frame,version:1,generation:session.getState().generation});session.dispatch({type:"inspect",point:{x:110,y:176},slop:0});assert.equal(session.getState().hit.target.itemKey,key);
      session.dispatch({type:"focus",move:"first"});assert.deepEqual(session.getState().focus.screenPoint,{x:110,y:176});session.dispatch({type:"activate"});assert.equal(session.getState().history.undoCount,1);
      assert.deepEqual(session.getState().program.semanticSpec.resources.find(resource=>resource.id==="picked").options.itemKeys,[key]);session.dispatch({type:"undo"});assert.equal(session.getState().program,from);
      let current=frame;for(let i=0;i<24;i++){const rebased=planTransition({from:current,to:i%2?from:to,options});assert.equal(sampleTransition(rebased,0),current);current=sampleTransition(rebased,40);assert.equal(current.scene.nodes.length,frame.scene.nodes.length);}
      const rebased=planTransition({from:current,to,options}),restored=deserializeAnimation(serializeAnimation(rebased)).plan;
      for(const time of [0,25,50,100])assert.deepEqual(sampleTransition(restored,time),sampleTransition(rebased,time));
      assert.throws(()=>planTransition({from:structuredClone(current),to,options}),/ChartProgram/);assert.equal(session.getState().program,from);
    }finally{session.destroy();}
  }}
];

export { cartesianCompletionVariants, cartesianCompletionFrame };
