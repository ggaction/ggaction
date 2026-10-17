import assert from'node:assert/strict';
import{execFileSync}from'node:child_process';
import{mkdtemp,symlink,writeFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import path from'node:path';
import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),old=await mkdtemp(path.join(tmpdir(),'ggaction-default-sample-window-'));
const baseline='0e373e71';
try{
 const archive=execFileSync('git',['archive',baseline,'src','package.json'],{cwd:root,maxBuffer:64*1024*1024});
 execFileSync('tar',['-xf','-','-C',old],{input:archive});await symlink(path.join(root,'node_modules'),path.join(old,'node_modules'),'dir');
 const probe=`import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';import{createCanvas}from'@napi-rs/canvas';const root=process.argv[1];const{chart,render}=await import(pathToFileURL(root+'/src/index.js'));const{renderToSVG}=await import(pathToFileURL(root+'/src/renderers/svg.js'));const sha=x=>createHash('sha256').update(x).digest('hex');const results=[];for(const kind of['shape','color'])for(const recipe of['auto','point','swatch'])for(const override of[false,true]){let p=chart().createCanvas({width:1000,height:800,margin:250}).createData({values:[{x:0,y:0,g:'A'},{x:1,y:1,g:'B'}]}).createScatterPlot({x:'x',y:'y',guides:false});p=kind==='shape'?p.encodeShape({field:'g'}):p.encodeColor({field:'g'});p=p.createLegend({channels:[kind],symbol:recipe==='auto'?'auto':{layers:[{type:recipe,stroke:'blue',strokeWidth:4}]}});if(override)p=p.editLegendBlock({target:'scatterPlot',channel:kind,symbol:{opacity:.7}});const c=createCanvas(1,1);render(p,c.getContext('2d'));results.push({kind,recipe,override,graphic:sha(JSON.stringify(p.graphicSpec)),svg:sha(renderToSVG(p)),pixels:sha(c.getContext('2d').getImageData(0,0,c.width,c.height).data)});}console.log(JSON.stringify(results));`;
 const run=directory=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',probe,directory],{cwd:root,encoding:'utf8'}));
 const before=run(old),after=run(root);assert.deepEqual(after,before);
 await writeFile(new URL('../evidence/legend-symbol-window-default-parity.json',import.meta.url),JSON.stringify({status:'pass',baseline,cases:after.length,graphicJSONByteExact:true,svgByteExact:true,decodedRGBAExact:true,results:after},null,2)+'\n');
 console.log(JSON.stringify({status:'pass',cases:after.length}));
}finally{await rm(old,{recursive:true,force:true});}
