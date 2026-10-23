// Independent sRGB / adapted XYZ / Lab calculations with matrix-vector arithmetic.
const matrices = {
 d65:{white:[.95047,1,1.08883],to:[[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]],from:[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]]},
 d50:{white:[.96422,1,.82521],to:[[.4360747,.3850649,.1430804],[.2225045,.7168786,.0606169],[.0139322,.0971045,.7141733]],from:[[3.1338561,-1.6168667,-.4906146],[-.9787684,1.9161415,.033454],[.0719453,-.2289914,1.4052427]]}
};
const product=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,index)=>sum+value*vector[index],0));
const byte=value=>Math.round(255*Math.max(0,Math.min(1,value)));
const hex=values=>"#"+values.map(value=>value.toString(16).padStart(2,"0")).join("");
export function referenceLabColor(left,right,t,whitePoint="d65") {
 const space=matrices[whitePoint];
 const lab=rgb=>{
  const xyz=product(space.to,rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4));
  const f=xyz.map((v,i)=>{const q=v/space.white[i];return q>216/24389?Math.cbrt(q):(24389/27*q+16)/116;});
  return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];
 };
 const a=lab(left),b=lab(right),v=a.map((value,i)=>value+(b[i]-value)*t);
 const f=[(v[0]+16)/116+v[1]/500,(v[0]+16)/116,(v[0]+16)/116-v[2]/200];
 const xyz=f.map((value,i)=>space.white[i]*(value>6/29?value**3:3*(6/29)**2*(value-4/29)));
 return hex(product(space.from,xyz).map(value=>byte(value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055)));
}
export function referenceSignedPower(value,domain,exponent) {
 const power=v=>Math.sign(v)*Math.abs(v)**exponent;
 return (power(value)-power(domain[0]))/(power(domain[1])-power(domain[0]));
}

// With one achromatic endpoint, constant-hue HCL is a straight line in the
// rectangular Lab plane. This oracle never converts to hue/chroma or imports
// the runtime's polar interpolation implementation.
export function referenceNeutralHclColor(left, right, t, whitePoint = "d65") {
 const neutral = rgb => rgb[0] === rgb[1] && rgb[1] === rgb[2];
 if (!neutral(left) && !neutral(right)) throw new Error("A neutral endpoint is required.");
 const space = matrices[whitePoint];
 const decode = rgb => {
  const xyz = product(space.to, rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4));
  const f = xyz.map((value, i) => { const q = value / space.white[i]; return q > 216 / 24389 ? Math.cbrt(q) : (24389 / 27 * q + 16) / 116; });
  return [116 * f[1] - 16, neutral(rgb) ? 0 : 500 * (f[0] - f[1]), neutral(rgb) ? 0 : 200 * (f[1] - f[2])];
 };
 const a = decode(left), b = decode(right), v = a.map((value, i) => value + (b[i] - value) * t);
 const f = [(v[0] + 16) / 116 + v[1] / 500, (v[0] + 16) / 116, (v[0] + 16) / 116 - v[2] / 200];
 const xyz = f.map((value, i) => space.white[i] * (value > 6 / 29 ? value ** 3 : 3 * (6 / 29) ** 2 * (value - 4 / 29)));
 return hex(product(space.from, xyz).map(value => byte(value <= .0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - .055)));
}
export function referenceGreyGamma(t,gamma) {
 return hex(Array(3).fill(byte(t**gamma)));
}

// Solve [L, saturation*cos, saturation*sin] by Gaussian elimination,
// independently of the runtime's analytic inverse color-space equations.
export function referenceCubehelixColor(left,right,t,gamma=1) {
 const coefficients=[[-.14861,1.78277],[-.29227,-.90649],[1.97294,0]];
 const decode=rgb=>{
  const matrix=coefficients.map((row,i)=>[1,...row,rgb[i]/255]);
  for(let column=0;column<3;column++) {
   let pivot=column;
   for(let i=column+1;i<3;i++)if(Math.abs(matrix[i][column])>Math.abs(matrix[pivot][column]))pivot=i;
   [matrix[column],matrix[pivot]]=[matrix[pivot],matrix[column]];
   const divisor=matrix[column][column];matrix[column]=matrix[column].map(v=>v/divisor);
   for(let i=0;i<3;i++)if(i!==column) {
    const factor=matrix[i][column];matrix[i]=matrix[i].map((v,j)=>v-factor*matrix[column][j]);
   }
  }
  const [l,x,y]=matrix.map(row=>row[3]);
  return {h:(Math.atan2(y,x)*180/Math.PI+240)%360,s:Math.hypot(x,y)/(l*(1-l)),l};
 };
 const a=decode(left),b=decode(right);
 const h=a.h+((b.h-a.h+540)%360-180)*t,s=a.s+(b.s-a.s)*t,l=t===0&&gamma<0&&a.l===b.l?a.l:a.l+(b.l-a.l)*t**gamma;
 const angle=(h+120)*Math.PI/180,amplitude=s*l*(1-l);
 return hex(coefficients.map(([cosine,sine])=>{const value=l+amplitude*(cosine*Math.cos(angle)+sine*Math.sin(angle));return t===0&&gamma<0&&Number.isNaN(value)?0:byte(value);}));
}

