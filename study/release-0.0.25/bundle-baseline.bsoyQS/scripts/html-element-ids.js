// Read attributes from actual opening elements, excluding escaped examples and
// raw-text content. Values remain serialized, matching the built-link checker.
export function htmlElementIds(html) {
  const attributes = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;
  const source = html.replace(/<!--[\s\S]*?-->/g, '').replace(
    new RegExp(`(<(script|style|textarea|title)\\b${attributes}>)[\\s\\S]*?(<\\/\\2\\s*>)`, 'gi'),
    '$1$3'
  );
  const result = [];
  for (const [tag] of source.matchAll(new RegExp(`<([a-z][a-z0-9:-]*)\\b${attributes}>`, 'gi'))) {
    for (const attribute of tag.matchAll(/\s+([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      if (attribute[1].toLowerCase() === 'id') result.push(attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }
  }
  return result;
}
