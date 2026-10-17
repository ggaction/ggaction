// Independent literal SVG expectations. No ggaction materializer is imported.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('./',import.meta.url));
const repo=path.resolve(here,'../../..');
const dependencyRoot=path.resolve(process.argv[2]||repo);
const require=createRequire(path.join(dependencyRoot,'package.json'));
const {chromium}=require('playwright');
const artifacts=path.join(repo,'.artifacts/test/png/review/capabilities/targets');
await mkdir(artifacts,{recursive:true});await mkdir(path.join(here,'targets'),{recursive:true});
const panels=[];
const text=(x,y,s,extra='')=>`<text x="${x}" y="${y}" ${extra}>${s}</text>`;
const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#555" ${extra}/>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const circle=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const area=ps=>Math.abs(ps.reduce((a,p,i)=>{const q=ps[(i+1)%ps.length];return a+p[0]*q[1]-q[0]*p[1]},0))/2;
function polygon(points,A,x,y,angle=0){const k=Math.sqrt(A/area(points));return `<polygon points="${points.map(p=>p.map(v=>v*k).join(',')).join(' ')}" transform="translate(${x} ${y}) rotate(${angle})" fill="#4c78a8"/>`;}
function add(id,title,issues,calls,body,checks){panels.push({id,title,issues,calls,body,checks});}
const wedge=[[0,-2/Math.sqrt(3)],[-.25,1/Math.sqrt(3)],[.25,1/Math.sqrt(3)]];
const arrow=[[-1/7,1],[1/7,1],[1/7,-1/8],[2/5,-1/8],[0,-1],[-2/5,-1/8],[-1/7,-1/8]];
assert.ok(Math.abs(area(wedge)-Math.sqrt(3)/4)<1e-12);assert.ok(Math.abs(area(arrow)-47/70)<1e-12);
add('named-shapes','1. Wedge / arrow: physical area, fixed anchor',[170,175],
 ["program.editPointMark({shape:'wedge'})","program.editPointMark({shape:'arrow'}).encodeAngle({value:90})"],
 [wedge,arrow].map((ps,i)=>[100,225].map((A,j)=>polygon(ps,A,85+j*110,100+i*80,j*90)+text(60+j*110,137+i*80,`area ${A}, ${j*90}°`)).join('')).join(''),
 {wedgeArea:area(wedge),arrowArea:area(arrow),wedgeAnchor:'centroid',arrowAnchor:'bounds-center'});
let b=text(45,65,'Size + shape')+text(275,65,'Color + size');
for(let i=0;i<3;i++){const y=100+i*43;const A=[25,100,225][i];b+=(i===0?circle(65,y,Math.sqrt(A/Math.PI),'#4c78a8'):i===1?rect(60,y-5,10,10,'#4c78a8'):polygon([[0,-2/Math.sqrt(3)],[-1,1/Math.sqrt(3)],[1,1/Math.sqrt(3)]],A,65,y))+text(95,y+4,['A','B','C'][i]);b+=circle(300,y,i+1,['#000','#808080','#fff'][i],'stroke="#777"')+text(330,y+4,[0,5,10][i]);}
add('combined-legends','2. One label list per combined block',[164,171,177,205],
 ["program.createLegend({combine:'size-shape'})","program.createLegend({combine:'color-size',values:[0,5,10]})","program.editLegendLabels({channel:'opacity',fontSize:10})"],b,
 {categoricalAreas:[25,100,225],quantitativeRadii:[1,2,3],labelLists:2});
const r=Math.sqrt(5000/Math.PI);
add('symbol-window','3. Clip a large symbol without shrinking it',[176],
 ["program.createLegend({channels:['size'],clipHeight:30})"],
 `<defs><clipPath id="window"><rect x="${85-r-1}" y="105" width="${2*(r+1)}" height="30"/></clipPath></defs>`+
 circle(85,120,r,'#4c78a8','stroke="#222" stroke-width="2" clip-path="url(#window)"')+
 circle(240,120,r,'#4c78a8','stroke="#222" stroke-width="2"')+circle(385,120,15,'#4c78a8')+
 text(43,195,'clipped, H=30')+text(200,195,'full area=5000')+text(342,195,'smaller r=15'),
 {fullRadius:r,clipHeight:30,visibleBounds:[85-r-1,105,2*(r+1),30]});
b=`<defs><linearGradient id="ramp"><stop stop-color="#31688e"/><stop offset="1" stop-color="#fde725"/></linearGradient></defs>`+
 rect(50,70,120,16,'url(#ramp)')+line(50,86,50,92)+line(170,86,170,92)+text(45,110,'0')+text(162,110,'10')+text(110,136,'Bottom title','text-anchor="middle"')+
 rect(30,48,175,103,'none','stroke="#999" stroke-dasharray="4 2 6 1"');
for(let i=0;i<3;i++){const y=75+i*49;b+=`<g opacity="${[0,.7,1][i]}">`+line(275,y,315,y,'stroke-width="3"')+circle(295,y,6,'#f58518','stroke="#333" stroke-width="2"')+'</g>'+text(335,y+4,`opacity ${[0,.7,1][i]}`);}
add('legend-appearance','4. Direction, title, border and recipe opacity',[173,193,200,208],
 ["program.editLegendLayout({channel:'color',direction:'horizontal',titlePosition:'bottom'})","program.editLegendBorder({border:{strokeDash:[4,2,6,1]}})","program.editLegendSymbols({symbol:{layers:[{type:'point',opacity:0.7}]}})","program.editLegendBlock({target:'points',channel:'size',position:'bottom-left'})"],b,
 {gradient:[120,16],titleClearance:12,recipeOpacities:[0,.7,1],dash:[4,2,6,1]});
b=rect(65,55,310,140,'#fff','stroke="#ddd"')+line(65,195,375,195)+line(45,55,45,195)+line(395,55,395,195);
for(let i=0;i<3;i++){const y=55+i*70;b+=line(65,y,375,y,`stroke-dasharray="${i===1?'':'2 2'}"`)+line(39,y,45,y,`stroke-dasharray="${i===1?'':'2 2'}"`)+text(32,y+4,[100,50,0][i],'text-anchor="end"')+text(403,y+4,[1,.5,0][i]);}
b+=text(360,175,'Inside title','text-anchor="end"')+text(55,40,'Quantity')+text(395,40,'Share');
add('axis-owners','5. Named axes, frame and owned title placement',[166,174,194,195,197,199],
 ["program.createAxes({y:[{id:'quantity',scale:'quantity',position:'left'},{id:'share',scale:'share',position:'right'}]})","program.editYAxis({target:'share',offset:20})","program.editXAxisTitle({offset:-20,align:'right',alongOffset:10})","program.editYAxisLabels({target:'quantity',align:'right'})"],b,
 {plot:[65,55,310,140],axisFrames:[45,395],outwardOffsets:[20,20],insideTitleY:175});
b='';for(let i=0;i<4;i++){b+=rect(35+i*105,55,60,120,'#fff','stroke="#ddd"')+circle(55+i*105,110+i*8,4,'#4c78a8');}
b+=rect(110,200,270,26,'none','stroke="#999"');for(let i=0;i<3;i++)b+=circle(135+i*80,213,4,['#4c78a8','#f58518','#54a24b'][i])+text(149+i*80,217,['A','B','C'][i]);
add('shared-facet-owner','6. One shared legend owned by the parent',[193,206],
 ["program.facet({field:'group',columns:4,guides:{legend:{position:'bottom',direction:'horizontal'}}})","program.editLegendLayout({position:'bottom'})"],b,
 {cellPlotWidth:60,finalPlotUnionWidth:375,legendWidth:270,parentOwners:1});
function cube(h,s,L){const a=s*L*(1-L),rad=(h+120)*Math.PI/180;return [L+a*(-.14861*Math.cos(rad)+1.78277*Math.sin(rad)),L+a*(-.29227*Math.cos(rad)-.90649*Math.sin(rad)),L+a*(1.97294*Math.cos(rad))].map(v=>Math.round(Math.max(0,Math.min(1,v))*255));}
const color=v=>'rgb('+v.join(',')+')';
b=text(30,55,'cubehelix gamma 1 / 2.2')+text(30,160,'signed power, domain [-2, 2], exponent 3');
const colors=[];for(let j=0;j<2;j++)for(let i=0;i<9;i++){const t=i/8,L=.2+.6*t**[1,2.2][j],rgb=cube(120*t,1,L);colors.push({gamma:[1,2.2][j],t,rgb});b+=rect(30+i*46,65+j*32,46,25,color(rgb));}
for(let i=0;i<9;i++){const v=-2+i*.5,t=(Math.sign(v)*Math.abs(v)**3+8)/16;assert.ok(t>=0&&t<=1);b+=rect(30+i*46,175,46,25,color([Math.round(255*t),0,Math.round(255*(1-t))]))+text(30+i*46,220,String(v));}
add('color-math','7. Gamma affects lightness; pow uses raw values',[169,172],
 ["program.editColorScale({interpolate:'cubehelix',gamma:2.2})","program.editColorScale({type:'pow',exponent:3})"],b,
 {cubehelixSamples:colors,powerDomain:[-2,2],powerExponent:3});
b='';for(let i=0;i<3;i++){const bg=['#fff','#808080','#336699'][i];b+=rect(30+i*145,65,125,125,bg)+rect(55+i*145,90,75,75,'#f00000','stroke="#ffff00" stroke-width="8" style="mix-blend-mode:difference"')+text(30+i*145,220,bg);}
add('difference-source','8. Each bar fill + stroke is composited once',[203],
 ["program.editBarMark({blend:'difference'})"],b,
 {source:'#f00000',outline:'#ffff00',backdrops:['#fff','#808080','#336699'],nativeProbe:'blend-native-probe.json'});
// Independent D50-adapted and D65 sRGB/XYZ matrices; not runtime color helpers.
const spaces={d65:{white:[.95047,1,1.08883],to:[[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]],from:[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]]},d50:{white:[.96422,1,.82521],to:[[.4360747,.3850649,.1430804],[.2225045,.7168786,.0606169],[.0139322,.0971045,.7141733]],from:[[3.1338561,-1.6168667,-.4906146],[-.9787684,1.9161415,.033454],[.0719453,-.2289914,1.4052427]]}};
const multiply=(M,v)=>M.map(row=>row.reduce((s,k,i)=>s+k*v[i],0));
function lab(rgb,s){const xyz=multiply(s.to,rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4));const f=xyz.map((v,i)=>{const q=v/s.white[i];return q>216/24389?Math.cbrt(q):(24389/27*q+16)/116});return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];}
function fromLab(L,s){const f=[(L[0]+16)/116+L[1]/500,(L[0]+16)/116,(L[0]+16)/116-L[2]/200];const xyz=f.map((v,i)=>s.white[i]*(v>6/29?v**3:3*(6/29)**2*(v-4/29)));return multiply(s.from,xyz).map(v=>Math.round(255*Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))));}
b='';const whitePointSamples=[];for(const [row,key]of ['d65','d50'].entries()){const s=spaces[key],a=lab([1,0,0],s),z=lab([0,0,1],s);b+=text(30,58+row*85,key.toUpperCase());for(let i=0;i<9;i++){const t=i/8,rgb=i===0?[255,0,0]:i===8?[0,0,255]:fromLab(a.map((v,j)=>v+(z[j]-v)*t),s);whitePointSamples.push({whitePoint:key,t,rgb});b+=rect(30+i*46,70+row*85,46,40,color(rgb));}}
add('lab-white-point','9. D65 stays default; D50 is explicit',[168],
 ["program.editColorScale({interpolate:'lab',whitePoint:'d50'})","program.editColorScale({whitePoint:'auto'})"],b,
 {whitePointSamples,method:'Independent sRGB/XYZ D65 and D50-adapted matrices; Lab interpolation; byte quantization'});
const viewWidth=480,viewHeight=270;
const svgFor=(p)=>`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270" style="isolation:isolate;background:white"><style>text{font:12px Arial;fill:#222}</style>${text(16,25,p.title,'font-weight="bold"')}${p.body}</svg>`;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1000,height:1200},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC'});
const page=await context.newPage();
try{
 for(const p of panels){
  const svg=svgFor(p),hash=createHash('sha256').update(svg).digest('hex');
  await writeFile(path.join(here,'targets',p.id+'.svg'),svg+'\n');
  await page.setContent('<html><body style="margin:0">'+svg+'</body></html>');
  const visible=await page.locator('svg').evaluate(el=>({width:el.width.baseVal.value,height:el.height.baseVal.value,ink:el.querySelectorAll('circle,polygon,rect,line').length,textBounds:[...el.querySelectorAll('text')].map(t=>{const b=t.getBBox();return [b.x,b.y,b.width,b.height]})}));
  assert.equal(visible.width,viewWidth);assert.equal(visible.height,viewHeight);assert.ok(visible.ink>0);
  assert.ok(visible.textBounds.every(([x,y,w,h])=>x>=0&&y>=0&&x+w<=viewWidth&&y+h<=viewHeight),p.id+' text bounds');
  if(p.id==='legend-appearance'){
   const clearance=await page.locator('text').evaluateAll(es=>{const title=es.find(t=>t.textContent==='Bottom title').getBBox();const labels=es.filter(t=>['0','10'].includes(t.textContent)).map(t=>t.getBBox());return title.y-Math.max(...labels.map(b=>b.y+b.height));});
   assert.equal(clearance,12);
  }
  await page.locator('svg').screenshot({path:path.join(artifacts,p.id+'.png')});
  const metadata={capability:'proposed-capabilities',chart:p.id,variant:'target',displayTitle:p.title,targetPublicCallChain:p.calls,status:'proposed-primitive-only',primitiveSha256:hash,checks:p.checks};
  await writeFile(path.join(artifacts,p.id+'.variant.json'),JSON.stringify(metadata,null,2)+'\n');
 }
 const html='<html><body style="margin:0;background:white;display:grid;grid-template-columns:480px 480px;gap:10px">'+panels.map(svgFor).join('')+'</body></html>';
 await writeFile(path.join(here,'targets/index.html'),html+'\n');await page.setContent(html);
 await page.screenshot({path:path.join(artifacts,'overview.png'),fullPage:true});
 await writeFile(path.join(here,'targets/manifest.json'),JSON.stringify({schemaVersion:1,status:'primitive-review-only',browser:browser.version(),scope:'Independent literal expectations; public APIs are proposed and public/primitive parity awaits approved implementation. No chart images were visually inspected by the agent.',panels:panels.map(({body,...p})=>({...p,svg:p.id+'.svg'}))},null,2)+'\n');
 console.log(JSON.stringify({panels:panels.length,status:'primitive-geometry-and-render-passed',browser:browser.version(),overview:path.join(artifacts,'overview.png')}));
}finally{await context.close();await browser.close();}
