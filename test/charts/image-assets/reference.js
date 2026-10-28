// Independent inverse mapping into literal quadrants and a white source circle.
const quadrants = [[222,91,73], [57,123,184], [37,151,130], [237,189,70]];
export function samples(fixture) {
  const [left, top, width, height] = fixture.rect;
  return [[45,100], [155,100], [70,65], [130,65], [70,92], [130,92], [70,126], [130,126], [70,154], [130,154], [103,113]].map(pixel => {
    const [x,y] = pixel.map(value => value + .5), underlay = [226,232,240]; let rgb = [255,255,255];
    if (x >= 50 && x < 150 && y >= 60 && y < 160) {
      rgb = underlay;
      if (x >= left && x < left+width && y >= top && y < top+height && (!fixture.circleClip || Math.hypot(x-100,y-110) < 45)) {
        const u = (x-left)*200/width, v = (y-top)*100/height;
        const source = Math.hypot(u-100,v-50) < 16 ? [255,255,255] : quadrants[(v<50?0:2)+(u<100?0:1)];
        const alpha = fixture.opacity ?? 1; rgb = source.map((value,i)=>Math.round(value*alpha+underlay[i]*(1-alpha)));
      }
    }
    return {pixel,expected:[...rgb,255]};
  });
}
