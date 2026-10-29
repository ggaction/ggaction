# Accessible data contract

`ggaction/accessibility` exports the advanced, read-only
`exportAccessibleData(program, { format?, target? } = {})` function for Full and
Basic editable programs. It requires a closed action stack, never edits or adds
trace entries, and returns a deeply frozen snapshot. Options are enumerable own
data properties; accessors, symbols, unknown options and unsupported formats fail.
It has no renderer, DOM, Node or action-registration dependency.

## Table data

Omitted `format` and `format: "table"` return the existing
`{schemaVersion:1,title,views}` format. Title is the semantic string or null.
Owner views contain columns, rows and units at the final materialized grain;
compositions retain nested child/facet views. The complete table schema and
examples are in [Rendering](../../../docs/api/rendering.md#accessible-data-alternatives).
Standalone Text remains unsupported in table mode. All failures reject the
complete export rather than returning a partial alternative.

## Native logical items

`format: "items"` returns `{schemaVersion:1,format:"items",title,views}`. Views are
flat, in composition depth-first child order and then semantic owner order:
`{kind:"items",ownerId,markType,childPath,items}`. `childPath` identifies the exact
leaf program; it is empty at the root. Owned mark components appear under their
stable owner, including attached Text items. Each native item has:

- `key`: the native opaque stable logical key, with the same ancestor namespaces
  as `getMarkItems` inspection. Do not parse or manufacture keys.
- `component`, `markType`, optional native `role`, `fields`, `channels`: exact
  final-item data from the native policy, including aggregate cells and path
  series. This mode does not expand a path into source rows or infer prose.
- `selectedBy`: every stored native selection whose resolved current keys include
  this item, in stored selection order. Composite dependent assignments report
  their authored source selection ID once. IDs are local to the view's childPath;
  absent component assignments are not inferred from another component.
- `visible`: false only when the native logical item explicitly reports false;
  otherwise true. Native filters remove items from the result. Hierarchy focus
  can retain hidden logical nodes with false. Clipping, opacity, occlusion and
  current animation frames are not inferred by this flag.
- Optional `representationKeys`: the native logical representation aliases with
  the same ancestor namespaces as key. Selection evaluation retains the native
  representation policy and never replaces authored selection keys.
- Optional `navigation`: native hierarchy node keys for key, parent, firstChild,
  previousSibling, nextSibling and root. These are node keys, not graphic item
  keys, scoped by this view's childPath and component. Missing links remain null.

Both formats accept a string `target` naming one stable owner at the supplied
program. A component target reports its owner. A composition-level target is
ambiguous and fails; export the explicit child program or omit target and use
childPath. Unknown or incomplete owners fail. Empty charts have no views.

Item mode bounds the whole export to 100,000 items and 10,000,000 cumulative
traversal, namespace and selection-membership work units. A limit failure returns
no partial snapshot. The host must re-export after edits, source revision, native
filter/visibility/focus or selection changes. Previous snapshots remain immutable.
The host supplies safe text content, captions and accessible DOM relationships;
this function does not install keyboard listeners or imply pixel-visible focus.
