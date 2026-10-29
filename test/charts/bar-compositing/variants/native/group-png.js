import {deflateSync} from "node:zlib";
// Encode the fixture's final straight RGBA bytes directly. A Canvas roundtrip
// would premultiply and quantize them before the consumer decodes the image.
function chunk(type, data) {
  const body=Buffer.concat([Buffer.from(type),data]),result=Buffer.alloc(body.length+8);
  result.writeUInt32BE(data.length,0);body.copy(result,4);
  let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
  result.writeUInt32BE((crc^0xffffffff)>>>0,result.length-4);return result;
}
export function encodeGroupPNG({width,height,rgba}) {
  if(width!==260||height!==90||rgba.length!==93600)throw new RangeError("Unexpected bounded blend group.");
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc(height*(width*4+1));
  for(let y=0;y<height;y++)rows.set(rgba.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(rows)),chunk("IEND",Buffer.alloc(0))]);
}
