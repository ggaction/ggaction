import {ownRecord} from "./ownData.js";
import {validateKeys,validateWorkLimit} from "./validation.js";

// Private glyph encoding budgets. The caller owns the RGBA input; the encoder
// allocates only its final PNG, plus one shared 1 KiB CRC table, never scanlines.
export const PNG_ENCODING_LIMITS=Object.freeze({dimension:4096,pixels:1_048_576,outputBytes:4_198_788});
const typedArrayPrototype=Object.getPrototypeOf(Uint8Array.prototype);
const byteLength=Object.getOwnPropertyDescriptor(typedArrayPrototype,"byteLength").get;
const bufferOf=Object.getOwnPropertyDescriptor(typedArrayPrototype,"buffer").get;
const arrayBufferLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,"byteLength").get;
const crcTable=Uint32Array.from({length:256},(_,value)=>{
  for(let bit=0;bit<8;bit++)value=value&1?(value>>>1)^0xedb88320:value>>>1;
  return value>>>0;
});
function crc32(bytes,start,end){
  let crc=0xffffffff;
  for(let i=start;i<end;i++)crc=crcTable[(crc^bytes[i])&255]^(crc>>>8);
  return(crc^0xffffffff)>>>0;
}
function u32(bytes,offset,value){
  bytes[offset]=value>>>24;bytes[offset+1]=value>>>16;
  bytes[offset+2]=value>>>8;bytes[offset+3]=value;
}
function chunkHeader(bytes,offset,type,length){
  u32(bytes,offset,length);
  for(let i=0;i<4;i++)bytes[offset+4+i]=type.charCodeAt(i);
  return offset+8;
}

// Straight RGBA8 bytes are encoded losslessly, including RGB under zero alpha.
// No color conversion, Canvas roundtrip, compression dependency, DOM or Node I/O.
export function encodeRGBA8PNG(options){
  ownRecord(options,"PNG encoding");validateKeys(options,["width","height","rgba"],"PNG encoding");
  const{width,height,rgba}=options;
  if(![width,height].every(value=>Number.isSafeInteger(value)&&value>0&&value<=PNG_ENCODING_LIMITS.dimension)){
    throw new RangeError("PNG dimensions must be positive integers within the glyph limit.");
  }
  if(width*height>PNG_ENCODING_LIMITS.pixels)throw new RangeError("PNG pixel count exceeds the glyph limit.");
  if(rgba==null||![Uint8Array.prototype,Uint8ClampedArray.prototype].includes(Object.getPrototypeOf(rgba))){
    throw new TypeError("PNG RGBA requires an ordinary Uint8Array or Uint8ClampedArray.");
  }
  // Intrinsic getters ignore caller-defined length/buffer accessors. A shared
  // buffer is rejected so other threads cannot race the validation/encoding loop.
  const length=byteLength.call(rgba);
  try{arrayBufferLength.call(bufferOf.call(rgba));}
  catch{throw new TypeError("PNG RGBA requires a non-shared ArrayBuffer.");}
  if(length!==width*height*4)throw new RangeError("PNG RGBA byte length must match its dimensions.");
  const rowBytes=width*4+1,rawBytes=rowBytes*height,blocks=Math.ceil(rawBytes/65535);
  const zlibBytes=rawBytes+blocks*5+6,outputBytes=zlibBytes+57;
  if(outputBytes>PNG_ENCODING_LIMITS.outputBytes)throw new RangeError("PNG output exceeds the glyph byte limit.");
  validateWorkLimit(rawBytes*2+blocks*5+128,"PNG encoding byte work");
  const bytes=new Uint8Array(outputBytes);
  bytes.set([137,80,78,71,13,10,26,10]);
  let offset=chunkHeader(bytes,8,"IHDR",13);
  u32(bytes,offset,width);u32(bytes,offset+4,height);bytes[offset+8]=8;bytes[offset+9]=6;
  u32(bytes,offset+13,crc32(bytes,12,offset+13));
  offset=chunkHeader(bytes,33,"IDAT",zlibBytes);
  const checksumStart=offset-4;
  bytes[offset++]=0x78;bytes[offset++]=0x01;
  let rawOffset=0,inputOffset=0,rowOffset=0,a=1,b=0;
  while(rawOffset<rawBytes){
    const length=Math.min(65535,rawBytes-rawOffset);
    bytes[offset++]=rawOffset+length===rawBytes?1:0;
    bytes[offset++]=length;bytes[offset++]=length>>>8;
    bytes[offset++]=(~length)&255;bytes[offset++]=(~length>>>8)&255;
    for(let i=0;i<length;i++){
      const value=rowOffset===0?0:rgba[inputOffset++];
      bytes[offset++]=value;
      a=(a+value)%65521;b=(b+a)%65521;
      if(++rowOffset===rowBytes)rowOffset=0;
    }
    rawOffset+=length;
  }
  u32(bytes,offset,((b<<16)|a)>>>0);offset+=4;
  u32(bytes,offset,crc32(bytes,checksumStart,offset));offset+=4;
  offset=chunkHeader(bytes,offset,"IEND",0);
  u32(bytes,offset,crc32(bytes,offset-4,offset));
  return bytes;
}
