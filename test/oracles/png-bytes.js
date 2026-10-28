import assert from "node:assert/strict";
import {inflateSync} from "node:zlib";

// Independent chunk parser with a bitwise CRC; no production encoder imports.
export function decodeRGBA8PNG(value){
  const bytes=Buffer.from(value),chunks=[];
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  let offset=8;
  while(offset<bytes.length){
    const length=bytes.readUInt32BE(offset),type=bytes.toString("ascii",offset+4,offset+8);
    assert.ok(offset+length+12<=bytes.length);
    let crc=0xffffffff;
    for(const byte of bytes.subarray(offset+4,offset+8+length)){
      crc^=byte;
      for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
    }
    assert.equal(bytes.readUInt32BE(offset+8+length),(crc^0xffffffff)>>>0,`${type} CRC`);
    chunks.push({type,data:bytes.subarray(offset+8,offset+8+length)});
    offset+=length+12;
  }
  assert.deepEqual(chunks.map(chunk=>chunk.type),["IHDR","IDAT","IEND"]);
  assert.equal(chunks[0].data.length,13);assert.equal(chunks[2].data.length,0);
  const header=chunks[0].data,width=header.readUInt32BE(0),height=header.readUInt32BE(4);
  assert.deepEqual([...header.subarray(8)],[8,6,0,0,0]);
  // Node's zlib independently validates the Adler32 and DEFLATE stream.
  const rows=inflateSync(chunks[1].data),rgba=new Uint8Array(width*height*4);
  assert.equal(rows.length,(width*4+1)*height);
  for(let y=0;y<height;y++){
    const start=y*(width*4+1);assert.equal(rows[start],0);
    rgba.set(rows.subarray(start+1,start+1+width*4),y*width*4);
  }
  return{width,height,rgba,chunks};
}
