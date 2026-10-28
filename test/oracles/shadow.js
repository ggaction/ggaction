// Independent direct 2D convolution, with no production imports or separable pass.
export function shadowReference(alpha, width, height, sigma) {
  const radius = Math.ceil(3 * sigma), outWidth = width + 2 * radius, outHeight = height + 2 * radius;
  return Array.from({length: outWidth * outHeight}, (_, index) => {
    const x = index % outWidth - radius, y = Math.floor(index / outWidth) - radius;
    return shadowSampleReference(alpha,width,height,sigma,x,y);
  });
}

export function shadowSampleReference(alpha,width,height,sigma,x,y) {
  if (sigma === 0) return x>=0&&x<width&&y>=0&&y<height ? alpha[y*width+x] : 0;
  const radius=Math.ceil(3*sigma);let value=0,mass=0;
  for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    const weight=Math.exp(-(dx*dx+dy*dy)/(2*sigma*sigma));mass+=weight;
    const sx=x+dx,sy=y+dy;
    if(sx>=0&&sx<width&&sy>=0&&sy<height)value+=alpha[sy*width+sx]*weight;
  }
  return Math.round(value/mass);
}
