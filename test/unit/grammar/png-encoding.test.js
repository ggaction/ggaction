import assert from "node:assert/strict";
import test from "node:test";
import {createCanvas,loadImage} from "@napi-rs/canvas";
import {encodeRGBA8PNG,PNG_ENCODING_LIMITS} from "../../../src/core/pngEncoding.js";
import {decodeRGBA8PNG} from "../../oracles/png-bytes.js";

function rgbaBytes(width,height){
  return Uint8Array.from({length:width*height*4},(_,i)=>(i*37+(i>>>3))&255);
}
test("encodes a literal single-pixel PNG with independent CRC and zlib validation",()=>{
  const bytes=encodeRGBA8PNG({width:1,height:1,rgba:new Uint8Array([255,0,0,128])});
  assert.equal(Buffer.from(bytes).toString("hex"),"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c48900000010494441547801010500faff00ff00008004810180192f85b00000000049454e44ae426082");
  const decoded=decodeRGBA8PNG(bytes);assert.deepEqual([...decoded.rgba],[255,0,0,128]);
  assert.deepEqual([decoded.width,decoded.height],[1,1]);assert.equal(bytes.length,73);
});
test("preserves RGBA bytes across stored-block boundaries, subarrays and transparent colors",()=>{
  for(const [width,height] of [[1,1],[2,3],[64,255],[64,256],[65,252],[4096,1]]){
    const bytes=rgbaBytes(width,height),input=new Uint8Array(bytes.length+8);input.set(bytes,4);
    const view=input.subarray(4,4+bytes.length),before=input.slice();
    const png=encodeRGBA8PNG({width,height,rgba:view}),second=encodeRGBA8PNG({width,height,rgba:new Uint8ClampedArray(bytes)});
    assert.deepEqual(png,second);assert.deepEqual(decodeRGBA8PNG(png).rgba,bytes);assert.deepEqual(input,before);
    const raw=(width*4+1)*height;
    assert.equal(png.length,63+raw+Math.ceil(raw/65535)*5);
    png[0]=0;assert.equal(second[0],137,"outputs are independently owned");
  }
});
test("native PNG decoding agrees with opaque bytes and retains exact stored alpha",async()=>{
  const source=new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,128,255,0,0,0,0,0,0,0]);
  const bytes=encodeRGBA8PNG({width:3,height:2,rgba:source}),image=await loadImage(Buffer.from(bytes));
  assert.deepEqual([image.width,image.height],[3,2]);
  const context=createCanvas(3,2).getContext("2d");context.drawImage(image,0,0);
  assert.deepEqual([...context.getImageData(0,0,3,1).data],[...source.slice(0,12)]);
  assert.deepEqual([...context.getImageData(0,1,1,1).data],[255,255,255,128]);
  assert.deepEqual([...decodeRGBA8PNG(bytes).rgba], [...source],"transparent RGB remains encoded even when a Canvas discards it");
});
test("bounds dimensions, byte work and output allocation before encoding",()=>{
  assert.ok(Object.isFrozen(PNG_ENCODING_LIMITS));
  for(const [width,height] of [[0,1],[1,0],[-1,1],[1,1.5],[NaN,1],[Infinity,1],[4097,1],[4096,4096],[Number.MAX_SAFE_INTEGER,2]]){
    assert.throws(()=>encodeRGBA8PNG({width,height,rgba:new Uint8Array()}),/dimension|pixel/);
  }
  // Maximum pixel count with the largest allowed number of scanline filters.
  const width=256,height=4096,input=new Uint8Array(width*height*4);
  const output=encodeRGBA8PNG({width,height,rgba:input});
  assert.equal(output.byteLength,PNG_ENCODING_LIMITS.outputBytes);
  assert.equal(output.byteLength,4_198_788);
  const decoded=decodeRGBA8PNG(output);assert.equal(decoded.rgba.byteLength,input.byteLength);
  assert.equal(decoded.rgba.some(value=>value!==0),false);
});
test("rejects malformed and shared input without executing caller accessors",()=>{
  const rgba=new Uint8Array(4),valid={width:1,height:1,rgba};
  for(const options of [undefined,null,[],{}, {...valid,unknown:0},{...valid,rgba:undefined}])assert.throws(()=>encodeRGBA8PNG(options));
  for(const value of [null,[],[0,0,0,0],new Uint16Array(2),new DataView(new ArrayBuffer(4)),new Uint8Array(3),new Uint8Array(5),Object.create(Uint8Array.prototype),new(class extends Uint8Array{})(4)]){
    assert.throws(()=>encodeRGBA8PNG({...valid,rgba:value}));
  }
  assert.throws(()=>encodeRGBA8PNG({...valid,rgba:new Uint8Array(new SharedArrayBuffer(4))}),/non-shared/);
  const detached=new Uint8Array(4);structuredClone(detached.buffer,{transfer:[detached.buffer]});
  assert.throws(()=>encodeRGBA8PNG({...valid,rgba:detached}),/byte length/);
  let reads=0;
  for(const key of ["width","height","rgba"]){
    const options={...valid};Object.defineProperty(options,key,{enumerable:true,get(){reads++;return valid[key];}});
    assert.throws(()=>encodeRGBA8PNG(options),/accessors/);
  }
  const named={...valid};named[Symbol()]=1;assert.throws(()=>encodeRGBA8PNG(named));
  // Only intrinsic typed-array size/buffer and integer byte slots are consumed.
  Object.defineProperties(rgba,{length:{get(){reads++;return 4;}},buffer:{get(){reads++;return new ArrayBuffer(4);}}});
  assert.equal(encodeRGBA8PNG(valid).length,73);assert.equal(reads,0);
});
