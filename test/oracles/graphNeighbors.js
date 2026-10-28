// Independent one-dimensional exhaustive fixture oracle. No production imports.
export function directNearestEdges(rows, k, mode = "directed") {
  const neighbors = rows.map((row, i) => rows.map((other, j) => ({ j, key: other.key, d: Math.abs(row.x - other.x) }))
    .filter(other => other.j !== i).sort((a, b) => a.d - b.d || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).slice(0, k));
  const pairs = [];
  rows.forEach((row, i) => neighbors[i].forEach(({ j, d }) => {
    if (mode === "mutual" && !neighbors[j].some(other => other.j === i)) return;
    const a = row.key, b = rows[j].key;
    const key = mode === "directed" || a < b ? [a, b] : [b, a];
    if (!pairs.some(pair => pair[0] === key[0] && pair[1] === key[1])) pairs.push([...key, d]);
  }));
  return pairs.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
}
