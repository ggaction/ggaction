export const ellipseSamplePixels=[[130,110],[75,110],[185,110],[130,75],[130,145],[92,86],[168,134],[30,50],[230,170]];
// Independent literal transform: the unit circle r=.5 becomes ellipse radii110/70.
export function ellipseOffset(x,y){return Math.hypot((x-130)/110,(y-110)/70);}
export function ellipseExpected(x,y){
  const offset=Math.min(1,ellipseOffset(x,y));
  return [254,243,199].map((v,i)=>Math.round(v+([15,118,110][i]-v)*offset)).concat(255);
}
export function ellipseSamples(){return ellipseSamplePixels.map(pixel=>{
  const footprint=[0,.5,1].flatMap(dx=>[0,.5,1].map(dy=>ellipseExpected(pixel[0]+dx,pixel[1]+dy)));
  return {pixel,expected:ellipseExpected(pixel[0]+.5,pixel[1]+.5),min:[0,1,2,3].map(c=>Math.min(...footprint.map(p=>p[c]))),max:[0,1,2,3].map(c=>Math.max(...footprint.map(p=>p[c])))};
});}
