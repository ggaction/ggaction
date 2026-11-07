// Independently fixed positions: y = 200 - 40v and x = 40 + 100j.
export const points = Object.freeze([
  [[40,200],[140,220],[240,180],[340,240],[340,80],[240,140],[140,140],[40,160]],
  [[40,160],[140,140],[240,140],[340,80],[340,80],[240,100],[140,60],[40,40]]
].map(points => Object.freeze(points.map(point => Object.freeze(point)))));
export const colors = Object.freeze(["#2563eb", "#0d9488"]);
export function commands(index) { return [...points[index].map(([x,y],i)=>({op:i===0?"M":"L",x,y})),{op:"Z"}]; }
