import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {renderToPDFBuffer} from '../../../src/renderers/pdf.js';
import {createPublicProgram,createPrimitiveProgram} from './manifest.js';

test('PDF guide underlays matches the independent literal scene without tolerance',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'plot-guide-underlays-'));
  try{
    const pixels=[];
    for(const[name,program]of[['public',createPublicProgram()],['primitive',createPrimitiveProgram()]]){
      const result=await renderToPDFBuffer(program);assert.equal(result.pages,1);
      assert.equal(result.buffer.subarray(0,5).toString(),'%PDF-');
      const file=path.join(directory,name+'.pdf'),out=path.join(directory,name);await writeFile(file,result.buffer);
      execFileSync('pdftoppm',['-r','72','-singlefile','-png',file,out],{stdio:'pipe'});
      const canvas=createCanvas(240,180),context=canvas.getContext('2d');
      context.drawImage(await loadImage(out+'.png'),0,0);assert.deepEqual([...context.getImageData(85,139,1,1).data],[119,119,136,255]);pixels.push(context.getImageData(0,0,240,180).data);
    }
    assert.deepEqual(pixels[0],pixels[1]);
  }finally{await rm(directory,{recursive:true,force:true});}
});
