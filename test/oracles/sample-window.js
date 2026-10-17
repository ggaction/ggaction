// Literal approved geometry: area=1600π, radius=40, stroke=2, H=30.
// No runtime bounds, materializer, or graphic specification is consulted.
export function drawSampleWindow(ctx,{pixelRatio=1,dx=0,dy=0,background='white'}={}) {
 ctx.canvas.width=100*pixelRatio;ctx.canvas.height=100*pixelRatio;ctx.scale(pixelRatio,pixelRatio);
 if(background!=='transparent'){ctx.fillStyle=background;ctx.fillRect(0,0,100,100);}
 ctx.save();ctx.translate(9+dx,35+dy);ctx.beginPath();ctx.rect(0,0,82,30);ctx.clip();
 ctx.beginPath();ctx.arc(41,15,40,0,Math.PI*2);ctx.fillStyle='red';ctx.fill();ctx.strokeStyle='blue';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 return ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height).data;
}
