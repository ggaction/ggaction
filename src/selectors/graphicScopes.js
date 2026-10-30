// Composition namespaces are shared by guide projection and native hit metadata.
// Callers retain responsibility for validating each program and their own budget.
export function* graphicScopes(program, spend) {
  const stack = [{ program, childPath: [], namespaces: [] }];
  while (stack.length) {
    const context = stack.pop();
    spend();
    if (context.childPath.length > 1024) throw new RangeError("Graphic scopes exceed their composition work budget.");
    yield context;
    const spec = context.program.compositionSpec;
    for (const id of spec?.children ?? []) stack.push({ program: context.program.children[id],
      childPath: [...context.childPath, id], namespaces: [...context.namespaces, `${spec.id}-${id}`] });
  }
}
