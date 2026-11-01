// Native programs have already been authored at the independently calculated
// current camera. This oracle only assembles their concrete per-item sources.
export function expectedGeoTextScene(from, to) {
  const previous = new Map(from.nodes.map(node => [node.key, node]));
  const targetKeys = new Set(to.nodes.map(node => node.key));
  const missing = from.nodes.filter(node => !targetKeys.has(node.key));
  const rect = value => Array.isArray(value) ? {x:value[0],y:value[1],width:value[2],height:value[3]} : value;
  const source = node => ({weight:.5,type:node.type,properties:node.properties,
    offset:node.offset,clip:rect(node.clip),clips:node.clips.map(rect)});
  const nodes = [];
  let inserted = false;
  for (const node of to.nodes) {
    if (!inserted && node.type === 'text') {
      nodes.push(...missing.map(old => ({...old,properties:{...old.properties,opacity:(old.properties.opacity??1)*.5}})));
      inserted = true;
    }
    const old = previous.get(node.key);
    if (old === undefined) nodes.push({...node,properties:{...node.properties,opacity:(node.properties.opacity??1)*.5}});
    else if (node.type !== 'text') nodes.push(node);
    else nodes.push({...node,type:'weighted-blend',properties:{sources:[source(old),source(node)]},offset:[0,0],clips:[]});
  }
  return {...to,nodes};
}
