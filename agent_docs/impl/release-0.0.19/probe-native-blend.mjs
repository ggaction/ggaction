import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const require=createRequire(path.join(path.resolve(process.argv[2]||root),'package.json'));
const {createCanvas,loadImage,PDFDocument}=require('@napi-rs/canvas');
const pkg=JSON.parse(await readFile(path.join(path.dirname(require.resolve('@napi-rs/canvas')),'package.json'),'utf8'));
const directory=await mkdtemp(path.join(tmpdir(),'ggaction-blend-probe-')),results=[];
try{
 for(const backdrop of ['#ffffff','#808080','#336699'])for(const alpha of [1,0.5]){
  const source=createCanvas(40,40),s=source.getContext('2d');
  s.fillStyle='#f00000';s.fillRect(4,4,30,30);s.strokeStyle='#ffff00';s.lineWidth=4;s.strokeRect(4,4,30,30);
  const raster=createCanvas(80,50),c=raster.getContext('2d');
  c.fillStyle=backdrop;c.fillRect(0,0,80,50);c.globalCompositeOperation='difference';c.globalAlpha=alpha;c.drawImage(source,0,0);
  const pdf=new PDFDocument(),p=pdf.beginPage(80,50);
  p.fillStyle=backdrop;p.fillRect(0,0,80,50);p.globalCompositeOperation='difference';p.globalAlpha=alpha;p.drawImage(source,0,0);pdf.endPage();
  const pdfPath=path.join(directory,'probe.pdf'),pngBase=path.join(directory,'probe');
  await writeFile(pdfPath,pdf.close());execFileSync('pdftoppm',['-r','72','-singlefile','-png',pdfPath,pngBase]);
  const image=await loadImage(pngBase+'.png'),decoded=createCanvas(image.width,image.height),d=decoded.getContext('2d');d.drawImage(image,0,0);
  const samples=[];
  for(const [x,y]of [[10,10],[4,10]]){
   const canvas=[...c.getImageData(x,y,1,1).data],pdfPixel=[...d.getImageData(x,y,1,1).data];
   samples.push({position:[x,y],canvas,pdf:pdfPixel,equal:canvas.every((v,i)=>v===pdfPixel[i])});
  }
  results.push({backdrop,alpha,samples});
 }
 const proof={status:results.every(r=>r.samples.every(s=>s.equal))?'passed':'differences',scope:'Native offscreen image difference compositing on Canvas and PDF; this is not an implemented ggaction bar API or the complete renderer acceptance matrix.',node:process.version,platform:process.platform,canvasVersion:pkg.version,results};
 await mkdir(new URL('./targets/',import.meta.url),{recursive:true});
 await writeFile(new URL('./targets/blend-native-probe.json',import.meta.url),JSON.stringify(proof,null,2)+'\n');console.log(proof.status);
 assert.equal(proof.status,'passed');
}finally{await rm(directory,{recursive:true,force:true});}
