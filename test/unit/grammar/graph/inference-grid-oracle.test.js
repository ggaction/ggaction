import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedGridNeighbors } from '../../../oracles/inference-grid.js';

test('lattice shell oracle agrees with literal typed ties and independent exhaustive distances', () => {
  const grid=n=>Array.from({length:n},(_,i)=>{const id=n-1-i,side=Math.ceil(Math.sqrt(n));return{id,x:id%side,y:Math.floor(id/side)};});
  assert.deepEqual(expectedGridNeighbors(grid(4),1),[
    {sourceIndex:3,targetIndex:2,weight:1},{sourceIndex:2,targetIndex:3,weight:1},
    {sourceIndex:1,targetIndex:3,weight:1},{sourceIndex:0,targetIndex:2,weight:1}
  ]);
  const rows=grid(37),expected=rows.map((row,i)=>({row,i})).sort((a,b)=>a.row.id-b.row.id).flatMap(({row,i})=>rows.map((other,j)=>({sourceIndex:i,targetIndex:j,weight:Math.abs(row.x-other.x)+Math.abs(row.y-other.y)}))
    .filter(edge=>edge.sourceIndex!==edge.targetIndex).sort((a,b)=>a.weight-b.weight||rows[a.targetIndex].id-rows[b.targetIndex].id).slice(0,5).sort((a,b)=>rows[a.targetIndex].id-rows[b.targetIndex].id));
  assert.deepEqual(expectedGridNeighbors(rows,5),expected);
  assert.throws(()=>expectedGridNeighbors(grid(4),4),/node count/);
  assert.throws(()=>expectedGridNeighbors([{id:0,x:1,y:0},{id:1,x:1,y:0}],1),/lattice point/);
});
