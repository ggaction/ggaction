import { chart } from 'ggaction';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from 'ggaction/animation';

const geoTextExpressionVariants=['labels','layout','annotation'];
function geoTextExpressionFrame(variant='labels') {
  const features=[{type:'Feature',id:'a',properties:{name:'MMMM'},geometry:{type:'Point',coordinates:[45,45]}},
    ...(variant==='layout'?[{type:'Feature',id:'b',properties:{name:'WWWW'},geometry:{type:'Point',coordinates:[45,45]}}]:[])];
  let from=chart().createCanvas({width:400,height:300,margin:0,background:'white',plotBorder:false})
    .createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features}})
    .createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places-mark',opacity:0});
  let to,target;
  if(variant==='annotation') {
    target='note';from=from.createGeoAnnotation({id:target,anchor:{type:'position',position:[45,45]},text:'MMMM',fontFamily:'monospace',fontSize:48,fill:'red'});
    to=from.editGeoAnnotation({target,text:'MMMMW',fill:'blue'});
  }else {
    target='labels';from=from.createMarkLabels({id:target,field:'name',fontFamily:'monospace',fontSize:48,fill:'red',dx:4});
    if(variant==='layout')from=from.layoutLabels({target,leader:{stroke:'black',strokeWidth:2}});
    to=from.editTextMark({target,textOverrides:[{match:{fields:{name:'MMMM'}},occurrence:0,text:'MMMMW'}],fill:'blue'});
    if(variant==='layout')to=to.removeLabelLayout({target});
  }
  to=to.editProjection({scalePx:4});
  const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),frame=sampleTransition(plan,50);
  return{from,to,target,plan,frame,nativeFrom:from.editProjection({scalePx:2}),nativeTo:to.editProjection({scalePx:2})};
}

export const cases=[
  {id:'animation-geotext-expressions/current-four-renderers',async run(){
    const {default:assert}=await import('node:assert/strict'),{createCanvas}=await import('@napi-rs/canvas'),{render}=await import('ggaction'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png'),{renderToPDFBuffer}=await import('ggaction/pdf');
    for(const variant of geoTextExpressionVariants) {
      const {from,to,plan,frame,nativeFrom,nativeTo}=geoTextExpressionFrame(variant),canvas=createCanvas(1,1);
      assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);
      const native=[nativeFrom,nativeTo].map(p=>{const c=createCanvas(1,1);render(p,c.getContext('2d'));return c.getContext('2d').getImageData(0,0,400,300).data;});
      render(frame,canvas.getContext('2d'));const actual=canvas.getContext('2d').getImageData(0,0,400,300).data;let pixels=0;
      for(let i=0;i<actual.length;i+=4)if(native[0][i]===255&&native[0][i+1]===0&&native[0][i+2]===0&&native[1][i]===0&&native[1][i+1]===0&&native[1][i+2]===255){if(variant!=='layout')assert.deepEqual([...actual.slice(i,i+4)],[188,0,188,255]);pixels++;}
      assert.ok(pixels>20);assert.deepEqual((await renderToPNGBuffer(frame)).buffer,await canvas.encode('png'));
      const svg=renderToSVG(frame);assert.match(svg,/linearRGB/);assert.match(svg,/MMMMW/);
      const pdf=await renderToPDFBuffer(frame);assert.equal(pdf.buffer.subarray(0,4).toString(),'%PDF');assert.match(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image\b/);
    }
  }},
  {id:'animation-geotext-expressions/offline-network-free',async run(){
    const {default:assert}=await import('node:assert/strict'),{spawnSync}=await import('node:child_process'),{createHash}=await import('node:crypto'),{createCanvas}=await import('@napi-rs/canvas'),{render}=await import('ggaction'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png');
    const hash=value=>createHash('sha256').update(value).digest('hex'),payloads=[],expected=[];
    for(const variant of geoTextExpressionVariants){const {plan,frame}=geoTextExpressionFrame(variant),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));payloads.push(serializeAnimation(plan));expected.push({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer),canvas:hash(await canvas.encode('png'))});}
    const child=spawnSync(process.execPath,['--input-type=module','-e',`
      import http from 'node:http';import https from 'node:https';import net from 'node:net';import tls from 'node:tls';import{syncBuiltinESMExports}from'node:module';
      let network=0;const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;for(const x of [http,https]){x.get=deny;x.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const {createHash}=await import('node:crypto'),{createCanvas}=await import('@napi-rs/canvas'),{render}=await import('ggaction'),{deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png');
      let input='';for await(const chunk of process.stdin)input+=chunk;const hash=value=>createHash('sha256').update(value).digest('hex'),frames=[];
      for(const saved of JSON.parse(input)){const frame=sampleTransition(deserializeAnimation(saved).plan,50),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));frames.push({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash((await renderToPNGBuffer(frame)).buffer),canvas:hash(await canvas.encode('png'))});}
      console.log(JSON.stringify({frames,network}));
    `],{input:JSON.stringify(payloads),encoding:'utf8',timeout:30000});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),{frames:expected,network:0});
  }},
  {id:'animation-geotext-expressions/current-hit-rebase',async run(){
    const {default:assert}=await import('node:assert/strict'),{createInteractionSession}=await import('ggaction/interaction');
    const original=geoTextExpressionFrame(),from=original.from.selectMarks({id:'picked',target:'labels',items:[],empty:'none'}),to=original.to,options={durationMs:100,easing:'linear'};
    const frame=sampleTransition(planTransition({from,to,options}),50),key=frame.decisions.find(d=>d.kernel==='native-geo-text').itemKey;
    const session=createInteractionSession({program:from,bindings:[{type:'keyboard',targets:[{target:'labels',activation:{type:'select',selection:'picked'}}]}]});
    try {
      session.dispatch({type:'frame',frame,version:1,generation:session.getState().generation});session.dispatch({type:'focus',target:'labels',itemKey:key});
      session.dispatch({type:'inspect',point:session.getState().focus.screenPoint,slop:0});assert.equal(session.getState().hit.target.itemKey,key);
      session.dispatch({type:'activate'});assert.equal(session.getState().history.undoCount,1);session.dispatch({type:'undo'});assert.equal(session.getState().program,from);
      let current=frame;for(let i=0;i<20;i++){const p=planTransition({from:current,to:i%2?from:to,options});assert.equal(sampleTransition(p,0),current);current=sampleTransition(p,40);assert.ok(current.scene.nodes.filter(n=>n.type==='weighted-blend').every(n=>n.properties.sources.length<=2));}
      const plan=planTransition({from:current,to,options}),restored=deserializeAnimation(serializeAnimation(plan)).plan;for(const t of [0,25,50,100])assert.deepEqual(sampleTransition(plan,t),sampleTransition(restored,t));
    }finally{session.destroy();}
  }}
];

export {geoTextExpressionVariants,geoTextExpressionFrame};
