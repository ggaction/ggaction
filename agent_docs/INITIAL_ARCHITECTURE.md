# `ggaction`

### A chart-authoring action library

Visualization authoring is inherently iterative and progressive, yet existing visualization representations primarily describe completed charts rather than the intermediate actions through which designers construct and revise them. Consequently, authoring-support systems struggle to provide fine-grained assistance, understand users’ authoring processes, or recommend meaningful next actions.

`ggaction` addresses this problem by representing chart authoring as a hierarchy of composable semantic actions.

Its user-facing API resembles an ordinary chainable chart-building library. Internally, every method call is recorded as an authoring action. When one action invokes other action methods, those calls are recorded as its lower-level child actions.

A high-level action can therefore be recursively decomposed into progressively finer actions, eventually reaching semantic-property edits and graphical-object operations.

## Interface example

Users construct a chart exclusively through a sequence of action calls. Dataset IDs, mark IDs, field names, and option values are provided as ordinary strings.

```javascript
const program = ggaction.chart()
  .createCanvas({ width: 150, height: 150 })
  .createCoordinate({ id: "main", type: "cartesian" })
  .createData({ id: "cars", values: cars })
  .createCircleMark({ id: "points", data: "cars" })
  .encodeX({
    field: "Horsepower",
    target: "points",
    scale: { type: "linear" }
  })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({});

ggaction.render(program, backendContext);
```

Every public action method:

1. Accepts a single parameter object.
2. Returns a new immutable `ChartProgram`.
3. Records its invocation in the action trace.
4. May invoke lower-level action methods.

The most recently changed semantic entities are stored in the authoring
context. Parameters such as `data`, `target`, `scale`, and `coordinate` may
therefore be omitted when they can be inferred unambiguously.

In the example above, `encodeY` and `encodeColor` target `"points"`, the most recently created mark.

Public action sequences use simple strings. The implementation validates them
before applying an action and stores the validated strings directly.

## Core model

```javascript
class ChartProgram {
  semanticSpec; // Grammar-of-Graphics meaning
  graphicSpec;  // Fully materialized, backend-neutral scene graph
  children;     // Named child programs for program-level composition
  context;      // most recently changed semantic resources and graphical bounds
  trace;        // Hierarchical authoring-action history
}
```

### `semanticSpec`

`semanticSpec` describes only the semantic structure of the chart. Its schema is
a minimal Grammar of Graphics: data, transformations, layers, marks, encodings,
semantic scales, guides, and coordinates.

```javascript
{
  datasets: [],
  layers: [],
  scales: [],
  coordinates: [],
  guides: {}
}
```

`datasets`, `layers`, `scales`, and `coordinates` contain user-created entities.
Their user-defined names are stored in `id`. Each layer combines `data`,
optional `transform` operations, `mark`, and `encoding`.

`hconcat`, `vconcat`, and `facet` are intentionally not part of `semanticSpec`.
They are higher-level operations over completed `ChartProgram` instances.

For example:

```javascript
{
  datasets: [
    { id: "cars", values: [...] }
  ],

  layers: [
    {
      id: "points",
      data: "cars",
      coordinate: "main",
      transform: [],

      mark: { type: "point" },

      encoding: {
        x: {
          field: "Horsepower",
          fieldType: "quantitative",
          scale: "x"
        },
        y: {
          field: "Miles_per_Gallon",
          fieldType: "quantitative",
          scale: "y"
        },
        color: {
          field: "Origin",
          fieldType: "nominal",
          scale: "color"
        }
      }
    }
  ],

  scales: [
    { id: "x", type: "linear", domain: "auto", range: "auto" },
    { id: "y", type: "linear", domain: "auto", range: "auto" },
    { id: "color", type: "ordinal", domain: "auto", range: "auto" }
  ],

  coordinates: [
    { id: "main", type: "cartesian" }
  ],

  guides: {
    axis: {
      x: {
        scale: "x",
        coordinate: "main",
        title: "Horsepower"
      },
      y: {
        scale: "y",
        coordinate: "main",
        title: "Miles per Gallon"
      }
    },

    legend: {
      color: {
        scale: "color",
        title: "Origin"
      }
    }
  }
}
```

The schema distinguishes user-defined entity IDs from system-supported keys:

```text
user-defined IDs
  datasets[].id
  layers[].id
  scales[].id
  coordinates[].id

system-supported keys
  encoding.x
  encoding.y
  guides.axis.x
  guides.axis.y
  guides.legend.color
```

Scales and coordinates are named semantic resources. Guides occupy
system-supported channel slots and reference those resources. Sharing is
represented only through reference identity:

```text
same resource ID      -> shared
different resource ID -> independent
```

For example, two units that reference scale `"x"` and coordinate `"main"`
share them. If their y encodings reference `"pointY"` and `"lineY"`, their y
scales are independent. A guide explicitly references the scale it explains
and, for an axis, the coordinate in which it appears. No separate `shared`,
`independent`, or `resolve` flag is required.

Guide kind is expressed by its namespace rather than a repeated `type` field.
Guide keys are system-supported channels, while each guide's `scale` value is a
user-defined scale ID:

```text
x     -> guides.axis.x
y     -> guides.axis.y
color -> guides.legend.color
```

Public actions may infer omitted resources for convenience, but the stored
`semanticSpec` must always contain the resolved IDs.

When a scale ID is omitted, its channel name is used as the default ID:

```text
x       -> x
y       -> y
color   -> color
size    -> size
opacity -> opacity
```

Layers in the same program therefore share a channel scale by default. An
independent scale is created only when the action receives an explicit ID.
Separate child programs have separate resource scopes, so equal default IDs do
not collide during composition.

When a new encoding joins an existing shared scale, the encoding action must
recompute the scale domain across every semantic consumer of that scale and
invoke the wrapped `rematerializeScale` action. That action rewrites the
concrete properties of all existing mark consumers and rebuilds the single
channel guide if it already exists. This propagation is explicitly defined by
the authoring action; the renderer still performs no semantic compilation.

Every semantic scale defines `type`, `domain`, and `range`. `domain` and
`range` default to `"auto"`. For a positional scale, an automatic range is
resolved against its graphical coordinate extent. For a color scale, it is
resolved to the default palette. A user may instead provide an explicit domain,
range, or palette.

```javascript
scales: [
  {
    id: "color",
    type: "ordinal",
    domain: "auto",
    range: { palette: "tableau10" }
  }
]
```

Every semantic view contains a `layers` array. Static display values such as
`{ value: "red" }` are graphical properties rather than semantic encodings.

The semantic boundary is strict:

```text
changes what the chart says       -> semanticSpec
changes only how it looks         -> graphicSpec
```

Canvas dimensions, margins, background, fonts, theme styling, fixed colors,
fixed sizes, opacity, strokes, and guide appearance are not semantic
properties. They belong to `graphicSpec` and are changed with internal
`editGraphics` calls made by user-facing domain actions. A scale `range`
explicitly requested by the user remains part of the semantic scale, even when
it contains numeric output coordinates. The resolved x, y, color, or size of
each concrete primitive is stored graphically.

A mark type is semantic because a point, line, bar, or area expresses a
different relationship. A graphical primitive such as `circle` is one concrete
realization of a semantic point mark. A data-driven color encoding is semantic
because it maps a field to a visual channel. A fixed point color or opacity is
graphical.

Semantic encodings may use a field or a constant datum in data space. A fixed
display value belongs to graphics:

```javascript
// semantic: a reference line at the data value 25
{ y: { datum: 25, fieldType: "quantitative", scale: "y" } }

// internal implementation of a mark-editing action:
// all circles happen to be red
this.editGraphics({
  target: "points",
  property: "fill",
  value: "red"
});
```

### `graphicSpec`

`graphicSpec` is a fully materialized, backend-neutral scene graph. It contains
only concrete graphical nodes and resolved properties. It does not contain
field references, scale expressions, automatic values, executable functions,
backend tags, or instructions that require semantic interpretation by the
renderer.

```javascript
{
  objects: {
    canvas: {
      type: "canvas",
      properties: {
        width: 150,
        height: 150,
        background: "white"
      }
    },

    points: {
      type: "circle",

      children: [
        {
          id: "points:0",
          properties: {
            x: 32.5,
            y: 114.2,
            radius: 3,
            fill: "#4c78a8",
            opacity: 0.7
          }
        },
        {
          id: "points:1",
          properties: {
            x: 81.4,
            y: 72.8,
            radius: 3,
            fill: "#f58518",
            opacity: 0.7
          }
        }
      ]
    }
  },

  order: ["canvas", "points"]
}
```

`canvas` is the output surface. `points` is a homogeneous graphical collection:
its `type` applies to every child, and its `children` are the concrete
primitives drawn by the renderer. Other graphical objects may similarly use
`rect`, `line`, `text`, or `path`. All children already contain their final
coordinates, colors, sizes, and text. `order` defines the top-level drawing
order.

`semanticSpec` describes what the chart means, while `graphicSpec` describes how that meaning is explicitly realized through graphical objects.

There is no automatic compiler from `semanticSpec` to `graphicSpec`. Updating a
semantic property never implicitly creates or edits a graphical object. Each
high-level action must define the graphical operations that realize its semantic
meaning, using the current semantic state when it needs information for those
operations.

`semanticSpec` is therefore not a deferred chart specification waiting to be
compiled. Its schema and supported property paths are defined by the library, and
actions use it to record authoring intent, perform inference, and decide which
explicit graphical operations to execute. `graphicSpec` changes only through
`createGraphics` and `editGraphics`.

A semantic action such as `encodeX` explicitly modifies both specifications:

```text
encodeX
  ├─ editSemantic(encoding and scale intent)
  ├─ createScale
  │   └─ editSemantic(type, domain, and range)
  └─ rematerializeScale
      ├─ resolve the shared domain and graphical range
      ├─ apply the scale to each consumer's data values
      └─ editGraphics(concrete x values)
```

The final graphical edits are explicitly invoked by `encodeX` through its
wrapped `rematerializeScale` child action; they are not generated automatically
from the encoding stored in `semanticSpec`.

A purely graphical refinement may modify only `graphicSpec`. The user still
expresses it through a domain action:

```javascript
const refined = program.editCircleMark({
  id: "points",
  opacity: 0.4
});
```

`editCircleMark` internally calls `editGraphics`. This changes the appearance
of the circles without introducing a new data encoding or exposing the raw
scene-graph editing API to the user.

### `context`

`context` stores transient information used to interpret subsequent action
calls. It is updated automatically as semantic and graphical edits succeed; an
action implementation must not call a separate `setContext` action.

```javascript
{
  currentData: "cars",
  currentMark: "points",
  currentScale: "x",
  currentCoordinate: "main",
  currentGuide: "axis.x",
	...
}
```

For example:

```text
createCanvas
  → update currentGraphicBounds from the concrete canvas

createCoordinate
  → edit coordinate[main]
  → currentCoordinate becomes "main"

createData
  → edit dataset[cars]
  → currentData becomes "cars"

createCircleMark
  → use currentData when data is omitted
  → edit layer[points]
  → currentMark becomes "points"

encodeX
  → use currentMark when target is omitted
```

Removing `context` from a completed program must not change its rendered output.
The context transition is part of the immutable update performed by the
lowest-level operation: an `editSemantic` path updates the corresponding
current semantic reference, while successful canvas graphics edits refresh the
current graphical bounds. Context updates are not separate trace nodes.

### `trace`

`trace` records how the visualization was constructed.

```text
createCanvas
  ├─ createGraphics(canvas)
  ├─ editGraphics(canvas.width)
  ├─ editGraphics(canvas.height)
  └─ editGraphics(canvas.background)
```

Thus:

```text
semanticSpec = what the chart means
graphicSpec  = how the chart is graphically realized
children     = which completed programs are composed at the program level
context      = how the next action should be interpreted
trace        = how the chart was constructed
```

## Public strings and validation

The public API accepts strings for identifiers and closed-vocabulary options:

```javascript
.createData({ id: "cars", values: cars })

.createCircleMark({ id: "points", data: "cars" })

.encodeX({
  field: "Horsepower",
  target: "points",
  scale: { type: "linear" }
})
```

Dataset, mark, scale, and coordinate IDs are user-defined names. Mark IDs are
also used to identify their corresponding top-level graphical collections.
Guide slots such as `axis.x` are library-defined, and the graphical IDs created
inside guide actions are internal. User-defined IDs are not checked against a
library vocabulary; actions only check requirements such as a non-empty string,
uniqueness when creating an object, and existence when referencing one.

Channels and types are closed vocabularies defined by the library and must be
validated. Valid strings remain strings; they are not wrapped in reference or
token objects.

For example:

```javascript
validateChannel("x");
validateScaleType("linear");
validateMarkType("point");
validateGraphicType("circle");
validateCoordinateType("cartesian");
```

These functions return the validated string or throw a clear error. For
example:

```javascript
const type = validateScaleType("linear");
// "linear"
```

The implementation should reject unknown values:

```javascript
validateScaleType("linar");
// Error: Unknown scale type "linar".
```

For user-defined IDs, state checks are used instead of vocabulary validation:

```javascript
assertDatasetExists(program, "cars");
assertMarkDoesNotExist(program, "points");
```

Semantic properties use validated string paths. User-defined entity IDs appear
in brackets, while system-supported keys use dot notation:

```text
dataset[cars].values
layer[points].mark.type
layer[points].encoding.x.field
scale[x].type
coordinate[main].type
guide.axis.x.title
guide.legend.color.title
```

The implementation parses the path, validates it against the semantic grammar,
and checks the referenced entity when required. IDs used inside brackets must
be non-empty and may contain letters, numbers, `_`, and `-`.
The singular selector `layer[id]` addresses the matching element in the
`semanticSpec.layers` array; `dataset[id]`, `scale[id]`, and `coordinate[id]`
work the same way for their plural arrays.

## Lowest-level actions

All high-level authoring actions are eventually decomposed into three lowest-level actions:

```text
editSemantic
createGraphics
editGraphics
```

These are internal authoring primitives. They are recorded in the action trace,
but are not part of the ordinary user-facing API. Users call domain actions
such as `createCircleMark`, `encodeX`, `createGuides`, and `editGuides`; those
actions invoke the lowest-level operations internally.

### `editSemantic`

`editSemantic` creates or updates a library-defined property in `semanticSpec`.

```javascript
this.editSemantic({
  property: "coordinate[main].type",
  value: "cartesian"
});
```

Its conceptual interface is:

```typescript
editSemantic({
  property,
  value
}: {
  property: string;
  value: unknown;
}): ChartProgram;
```

`editSemantic` uses upsert semantics:

* If the property does not exist, it is created.
* If the property already exists, it is replaced.

A separate `addSemantic` action is therefore unnecessary.

The operation structurally copies the modified path and takes ownership of any
inserted array or object by cloning and freezing it. It never mutates an
existing semantic object or retains externally mutable input by reference.

Supported semantic paths are defined by the library. Unknown entity kinds,
system keys, channels, or properties must produce a clear error.

`editSemantic` never creates or edits graphical objects. Any graphical
realization associated with the semantic change must be explicitly defined by
the enclosing action through `createGraphics` or `editGraphics`.

`editSemantic` is mainly used internally when defining higher-level actions.
Ordinary users should generally use actions such as `createCanvas`,
`createData`, and `encodeX`.

### `createGraphics`

`createGraphics` creates a graphical object in `graphicSpec`. Its type may be a
drawable primitive such as `circle`, `rect`, `line`, or `text`, or a structural
type such as `canvas` or `container`.

An action implementation calls it with strings:

```javascript
this.createGraphics({
  id: "points",
  type: "circle",
  length: 2
});
```

The implementation validates these values:

```javascript
assertGraphicDoesNotExist(program, "points");
validateGraphicType("circle");
```

Its conceptual internal interface is:

```typescript
createGraphics({
  id,
  type,
  length
}: {
  id: string;
  type: string;
  length?: number;
}): ChartProgram;
```

When `length` is omitted, `createGraphics` creates one graphical object. When
`length` is provided for a drawable primitive, it creates that many homogeneous
children with generated IDs such as `points:0` and `points:1`. The parent
`type` applies to every child, so child objects do not repeat it. `length` must
be a non-negative integer and is not used for structural types.

`createGraphics` establishes identity, graphical type, and optional cardinality.
Concrete visual properties are assigned through `editGraphics`. Data binding
is handled by the enclosing semantic action and is not stored as a deferred
graphical operation.

Calling it repeatedly with the same identifier and an equivalent definition is
idempotent. Reusing the identifier with a different type or cardinality throws
a clear conflict error.

### `editGraphics`

`editGraphics` creates or updates one property of an existing graphical object.

An action implementation supplies a target, one property, and one value:

```javascript
this.editGraphics({
  target: "points",
  property: "x",
  value: [32.5, 81.4]
});
```

The implementation validates the target, property, and value internally:

```javascript
assertGraphicExists(program, "points");
validateGraphicProperty("circle", "x");
```

Its conceptual internal interface is:

```typescript
editGraphics({
  target,
  property,
  value
}: {
  target: string;
  property: string;
  value: unknown;
}): ChartProgram;
```

`editGraphics` uses upsert semantics for the selected property.

The operation structurally copies the modified graphical path. Array and object
values stored on concrete nodes are cloned and frozen so earlier programs and
caller-owned inputs cannot be changed indirectly.

For a drawable object with homogeneous primitive children, an array value is
distributed by child index, while a scalar value is applied to every child.
This distribution is an action-input convenience only. The final `graphicSpec`
stores the resulting value directly on each concrete child.

An array value must have the same length as the target's `children` array.
Otherwise, `editGraphics` must throw a clear error.

Only the outer array is interpreted as the per-child distribution. Each item
may itself be a scalar, object, or nested array and is stored intact on the
corresponding child:

```javascript
this.editGraphics({
  target: "points",
  property: "style",
  value: [
    { fill: "red", dash: [4, 2] },
    { fill: "blue", dash: [1, 1] }
  ]
});
```

A non-array object is a single value and is broadcast to every child. To assign
an array-valued property to each child, callers therefore pass a nested outer
array such as `[[4, 2], [1, 1]]`.

A concrete child may also be targeted directly by its ID, in which case the
single value is applied only to that child.

Structural properties are stored directly rather than distributed. A parent
`canvas.children` array contains ordered local graphic IDs, while a composition
`container.children` array contains ordered named child-program IDs. Each ID
must resolve in the appropriate scope.

For an existing drawable collection, the reserved structural property
`length` changes its concrete child cardinality. It must be a non-negative
integer; shrinking removes trailing generated children and growing appends new
generated children without mutating the earlier program. Data-domain actions
such as facet filtering use this internal edit before rematerializing child
properties.

However, the target graphical object must already exist. `editGraphics` must not silently create an object whose graphical type is unknown.

## Defining actions

Every authoring method is wrapped with `action()`. The wrapper records the
method call in the trace and makes wrapped methods called inside it children of
that action. Metadata contains only `op` and `description`.

```javascript
ChartProgram.prototype.createCanvas = action(
  {
    op: "createCanvas",
    description: "Create and configure the chart canvas."
  },
  function ({
    width = 150,
    height = 150,
    background = "white"
  } = {}) {
    return this
      .createGraphics({
        id: "canvas",
        type: "canvas"
      })
      .editGraphics({
        target: "canvas",
        property: "width",
        value: width
      })
      .editGraphics({
        target: "canvas",
        property: "height",
        value: height
      })
      .editGraphics({
        target: "canvas",
        property: "background",
        value: background
      });
  }
);
```

`action()` returns the wrapped method assigned to the prototype:

```javascript
function action(metadata, implementation) {
  return function (args = {}) {
    const entered = this._enterAction({
      ...metadata,
      args: summarizeArgs(args)
    });

    const result = implementation.call(entered, args);

    return result._exitAction();
  };
}
```

`_enterAction()` creates a trace node, attaches it to the current parent
action, and pushes its ID onto the action stack. `_exitAction()` removes the
current action from the stack, returning execution to its parent. Together,
they allow nested action calls to form a trace tree automatically.

For example, the `createGraphics` and `editGraphics` calls above are recorded as
children of `createCanvas` automatically.

## Immutable program updates

Every action returns a new `ChartProgram`. Existing instances must not be mutated.

```javascript
class ChartProgram {
  constructor({
    semanticSpec = createEmptySemanticSpec(),
    graphicSpec = createEmptyGraphicSpec(),
    children = {},
    context = {},
    trace = createTraceRoot(),
    actionStack = []
  } = {}) {
    this.semanticSpec = semanticSpec;
    this.graphicSpec = graphicSpec;
    this.children = children;
    this.context = context;
    this.trace = trace;
    this.actionStack = actionStack;
  }

  _clone({
    semanticSpec = this.semanticSpec,
    graphicSpec = this.graphicSpec,
    children = this.children,
    context = this.context,
    trace = this.trace,
    actionStack = this.actionStack
  } = {}) {
    return new ChartProgram({
      semanticSpec,
      graphicSpec,
      children,
      context,
      trace,
      actionStack
    });
  }
}
```

The empty-spec factories return the canonical structures shown above, and
`createTraceRoot()` returns the virtual `program` node with an empty `children`
array. A new program never begins with shape-less `{}` state.

`_clone` creates the next program shell, but immutability also requires every
update operation to structurally copy the modified path. Unchanged branches may
be shared; no action may mutate an array or object reachable from an existing
program. A completed public action must always return with an empty
`actionStack`.

## Program composition

`hconcat` and `vconcat` combine already-authored programs rather than extending
the Grammar-of-Graphics structure inside one program.

```javascript
const combined = ggaction.hconcat({
  id: "dashboard",
  programs: [
    { id: "left", program: leftProgram },
    { id: "right", program: rightProgram }
  ],
  gap: 12
});
```

The operation returns a new immutable `ChartProgram` and explicitly performs:

```text
hconcat
  ├─ useProgram(left)
  ├─ useProgram(right)
  ├─ retain named child programs
  ├─ createCanvas(parent canvas)
  ├─ createGraphics(dashboard container)
  ├─ editGraphics(canvas.children = [dashboard])
  ├─ editGraphics(dashboard.children = [left, right])
  ├─ editGraphics(dashboard.direction = horizontal)
  └─ editGraphics(dashboard.gap = 12)
```

The parent canvas size is calculated eagerly from the already-materialized
child canvases. For `hconcat`, its width is the sum of child widths and gaps,
and its height is the maximum child height. `vconcat` uses the corresponding
vertical calculation. The graphical part is explicit:

```javascript
parent
  .createCanvas({
    width: resolvedParentWidth,
    height: resolvedParentHeight
  })
  .createGraphics({
    id: "dashboard",
    type: "container"
  })
  .editGraphics({
    target: "canvas",
    property: "children",
    value: ["dashboard"]
  })
  .editGraphics({
    target: "dashboard",
    property: "children",
    value: ["left", "right"]
  })
  .editGraphics({
    target: "dashboard",
    property: "direction",
    value: "horizontal"
  })
  .editGraphics({
    target: "dashboard",
    property: "gap",
    value: 12
  });
```

The parent canvas owns the dashboard container, and the dashboard owns the
ordered child program references. Each retained child program keeps its own
canvas beneath the parent canvas. The container is not an automatically
inferred plot group; it exists because the user explicitly requested program
composition with `hconcat`. The renderer does not inspect the `hconcat` action
or trace.

The parent program retains the actual child programs separately:

```javascript
combined.children;
// {
//   left: leftProgram,
//   right: rightProgram
// }
```

The parent scene graph attaches the container and the container references the
named child programs:

```javascript
combined.graphicSpec;
// {
//   objects: {
//     canvas: {
//       type: "canvas",
//       properties: { width: 312, height: 150 },
//       children: ["dashboard"]
//     },
//     dashboard: {
//       type: "container",
//       properties: {
//         direction: "horizontal",
//         gap: 12
//       },
//       children: ["left", "right"]
//     }
//   },
//   order: ["canvas"]
// }
```

`canvas.children[0]` resolves to the local graphic object `dashboard`.
`dashboard.children[0]` resolves to `combined.children.left`, and
`dashboard.children[1]` resolves to `combined.children.right`. The array order
is the graphical placement order. Resolution is determined by the owning
structural type: a canvas references local graphic objects, while a composition
container references named child programs. This explicit attachment allows the
renderer to place child canvases without reading semantic state or the action
trace.

`vconcat` performs the same operation with a vertical graphical layout. The
horizontal or vertical direction, gap, alignment, and container dimensions are
graphical properties; they are not added to `semanticSpec`.

`facet` is a higher-level composition macro over the same operations:

```javascript
const faceted = ggaction.facet({
  program: baseProgram,
  data: "cars",
  field: "Origin",
  direction: "horizontal"
});
```

It derives one child program for each distinct field value. The wrapped
`filterData` action records the semantic transform and explicitly rematerializes
the affected graphics; changing the transform alone would leave stale concrete
nodes. The facet action also creates a graphical label inside each child canvas
and then delegates to `hconcat` or `vconcat`:

```text
facet(Origin)
  ├─ deriveProgram(USA)
  │   ├─ filterData(Origin = USA)
  │   │  ├─ editSemantic(filter Origin = USA)
  │   │  ├─ editGraphics(collection.length = filtered row count)
  │   │  └─ rematerializeEncodingsAndGuides
  │   └─ createFacetLabel(USA)
  ├─ deriveProgram(Europe)
  │   ├─ filterData(Origin = Europe)
  │   │  └─ rematerializeEncodingsAndGuides
  │   └─ createFacetLabel(Europe)
  ├─ deriveProgram(Japan)
  │   ├─ filterData(Origin = Japan)
  │   │  └─ rematerializeEncodingsAndGuides
  │   └─ createFacetLabel(Japan)
  └─ hconcat(USA, Europe, Japan)
```

The source dataset remains immutable. Each derived program owns a new semantic
filter transform and a newly materialized graphical result. The action trace
retains the `facet` node so the authoring intent is not lost after
decomposition.

The parent does not flatten child semantic views into one `layers` list, because that
would incorrectly mean that the child charts are semantically overlaid. It
keeps them in `children`, while its own `graphicSpec` defines the composition
container and layout. A pure composition parent introduces no new semantic
view, so its own `semanticSpec` uses the canonical empty structure. The child
semantic specifications remain inside the named child programs.

```javascript
{
  datasets: [],
  layers: [],
  scales: [],
  coordinates: [],
  guides: {}
}
```

Completed child programs remain fully independent. Composition does not rename
their internal IDs and does not share or rewrite their scales, coordinates, or
guides. Because each child lives in its own `ChartProgram`, equal IDs such as
`"x"` or `"main"` do not collide. Input traces remain available, while the
composition trace records `useProgram` nodes and the graphical layout actions.

## Data actions

Users identify datasets with strings.

```javascript
ChartProgram.prototype.createData = action(
  {
    op: "createData",
    description: "Create a named dataset."
  },
  function ({ id, values } = {}) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("createData requires a non-empty string id.");
    }

    if (!Array.isArray(values)) {
      throw new Error("createData requires values to be an array.");
    }

    if (!values.every(isPlainObject)) {
      throw new Error("createData requires an array of row objects.");
    }

    if (this.semanticSpec.datasets?.some(dataset => dataset.id === id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }

    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: structuralCloneAndFreeze(values)
    });
  }
);
```

`values` must be an array of plain row objects. An empty array is valid, but an
action that needs to infer a field type or domain from an empty dataset must
require the missing information explicitly.

```javascript
program.createData({
  id: "cars",
  values: [
    { horsepower: 130, mpg: 18 },
    { horsepower: 165, mpg: 15 }
  ]
});
```

External URLs, asynchronous loaders, and other data sources should be added
later through separate actions rather than overloading `createData`.

A dataset is immutable after creation. `createData` takes ownership by
structurally cloning and freezing the supplied rows, so later mutation of the
caller's array or row objects cannot change an existing program. Dataset
filtering and derivation create new semantic transforms or new datasets; they
never edit the original dataset values.

Multiple datasets must be supported:

```javascript
const program = ggaction.chart()
  .createData({ id: "cars", values: cars })
  .createData({ id: "fit", values: regression });
```

Large datasets should not be copied into the action trace. The trace should retain only the dataset ID and lightweight metadata.

## Coordinate actions

A coordinate system is created explicitly. Creating a canvas does not
implicitly add semantic state.

```javascript
ChartProgram.prototype.createCoordinate = action(
  {
    op: "createCoordinate",
    description: "Create a named semantic coordinate system."
  },
  function ({ id = "main", type = "cartesian" } = {}) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("createCoordinate requires a non-empty string id.");
    }

    assertCoordinateDoesNotExist(this, id);

    return this.editSemantic({
      property: `coordinate[${id}].type`,
      value: validateCoordinateType(type)
    });
  }
);
```

The successful semantic edit automatically makes the new coordinate the
`currentCoordinate`. A later positional encoding may omit its `coordinate`
argument and use that context value.

## Mark actions

Users identify marks with strings.

```javascript
ChartProgram.prototype.createCircleMark = action(
  {
    op: "createCircleMark",
    description: "Create a circle mark from a dataset."
  },
  function ({
    id,
    data = this.context.currentData
  } = {}) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("createCircleMark requires a non-empty string id.");
    }

    if (!data) {
      throw new Error("createCircleMark requires a data source.");
    }

    assertMarkDoesNotExist(this, id);
    assertDatasetExists(this, data);
    const values = this.getDataValues({ data });

    return this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: validateMarkType("point")
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      })
      .createGraphics({
        id,
        type: "circle",
        length: values.length
      });
  }
);
```

The public method is:

```javascript
program.createCircleMark({ id: "points", data: "cars" });
```

`createCircleMark` creates a semantic point mark and realizes it as a graphical
circle collection whose length matches the dataset. The semantic layer stores
`mark.type: "point"`; only `graphicSpec` stores `type: "circle"`. The action
does not assign positions, radius, fill, opacity, a coordinate system, or other
graphical values. At this stage the circles exist structurally, but they may
not be visible if rendered. A coordinate system is attached only when a later
positional action needs it. Later encoding and graphical actions materialize
the required values explicitly.

## Encoding actions

```javascript
ChartProgram.prototype.encodeX = action(
  {
    op: "encodeX",
    description: "Encode a field as horizontal position."
  },
  function ({
    field,
    target = this.context.currentMark,
    coordinate = this.context.currentCoordinate,
    scale = {}
  } = {}) {
    if (typeof field !== "string" || field.length === 0) {
      throw new Error("encodeX requires a field name.");
    }

    if (!target) {
      throw new Error("encodeX requires a target or a current mark.");
    }

    if (!coordinate) {
      throw new Error("encodeX requires a coordinate system.");
    }

    assertMarkExists(this, target);
    assertCoordinateExists(this, coordinate);
    const channel = validateChannel("x");
    const fieldType = this.inferFieldType({ mark: target, field });
    const scaleId = scale.id ?? "x";
    const resolvedType = scale.type ??
      this.inferScaleType({ channel, fieldType });

    let next = this
      .editSemantic({
        property: `layer[${target}].coordinate`,
        value: coordinate
      })
      .editSemantic({
        property: `layer[${target}].encoding.x.field`,
        value: field
      })
      .editSemantic({
        property: `layer[${target}].encoding.x.fieldType`,
        value: fieldType
      })
      .editSemantic({
        property: `layer[${target}].encoding.x.scale`,
        value: scaleId
      })
      .createScale({
        ...scale,
        id: scaleId,
        mark: target,
        channel: "x",
        field,
        type: resolvedType
      });

    return next.rematerializeScale({ id: scaleId });
  }
);
```

The public API remains concise:

```javascript
program.encodeX({
  field: "Horsepower",
  target: "points",
  scale: { id: "x", type: "linear" }
});
```

If `target` is omitted, the method uses `context.currentMark`. If `coordinate`
is omitted, it uses `context.currentCoordinate` and attaches that coordinate
system to the semantic layer.

This action may produce:

```text
encodeX
  ├─ inferFieldType
  ├─ editSemantic(coordinate)
  ├─ editSemantic(encoding field, field type, and scale reference)
  ├─ createScale
  │   ├─ inferFieldType
  │   └─ inferScaleType
  └─ rematerializeScale
     ├─ inferCombinedDomain
     ├─ resolveAutoRange
     └─ editGraphics(concrete x values for every consumer)
```

`encodeRadius` assigns a constant graphical radius. It does not add a semantic
field encoding:

```javascript
ChartProgram.prototype.encodeRadius = action(
  {
    op: "encodeRadius",
    description: "Assign a constant radius to a circle mark."
  },
  function ({ value, target = this.context.currentMark } = {}) {
    if (!target) {
      throw new Error("encodeRadius requires a target or a current mark.");
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error("encodeRadius requires a non-negative finite value.");
    }

    assertCircleGraphicExists(this, target);

    return this.editGraphics({
      target,
      property: "radius",
      value
    });
  }
);
```

The scalar is broadcast to every circle child. A data-driven semantic size
mapping remains a separate `encodeSize({ field, ... })` action.

Equivalent actions may be defined for:

```text
encodeY
encodeColor
encodeSize
encodeShape
encodeOpacity
encodeText
encodeTooltip
```

Target-specific action names are intentional. `encodeX` represents applying an x-position encoding, whereas `encodeColor` represents applying a color encoding.

## Scale actions

The public `createScale` parameters remain string-based:

```javascript
program.createScale({
  id: "x",
  mark: "points",
  channel: "x",
  field: "Horsepower",
  type: "linear",
  domain: "auto",
  range: "auto"
});
```

The implementation normalizes these values before modifying `semanticSpec`.

```javascript
ChartProgram.prototype.createScale = action(
  {
    op: "createScale",
    description: "Create a named semantic scale."
  },
  function ({
    id,
    mark,
    channel,
    field,
    type,
    domain = "auto",
    range = "auto"
  } = {}) {
    assertMarkExists(this, mark);
    const validatedChannel = validateChannel(channel);
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("Scale id must be a non-empty string.");
    }

    const fieldType = this.inferFieldType({ mark, field });

    const resolvedType =
      type !== undefined
        ? validateScaleType(type)
        : this.inferScaleType({ channel: validatedChannel, fieldType });

    const existing = this.getScale({ id });
    if (existing) {
      assertScaleEquivalent(existing, {
        type: resolvedType,
        domain,
        range
      });
      return this;
    }

    return this
      .editSemantic({
        property: `scale[${id}].type`,
        value: resolvedType
      })
      .editSemantic({
        property: `scale[${id}].domain`,
        value: domain
      })
      .editSemantic({
        property: `scale[${id}].range`,
        value: range
      });
  }
);
```

`createScale` creates a missing scale. Repeating the action with an equivalent
definition is idempotent; using the same ID with a different definition throws
a conflict. Intentional changes use `editScale`:

```javascript
program.editScale({
  id: "x",
  type: "log",
  domain: [1, 300]
});
```

```javascript
ChartProgram.prototype.editScale = action(
  {
    op: "editScale",
    description: "Edit a semantic scale and rematerialize its consumers."
  },
  function ({ id, type, domain, range } = {}) {
    assertScaleExists(this, id);
    let next = this;

    if (type !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].type`,
        value: validateScaleType(type)
      });
    }

    if (domain !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].domain`,
        value: validateScaleDomain(domain)
      });
    }

    if (range !== undefined) {
      next = next.editSemantic({
        property: `scale[${id}].range`,
        value: validateScaleRange(range)
      });
    }

    return next.rematerializeScale({ id });
  }
);
```

```text
editScale
  ├─ editSemantic(scale properties)
  └─ rematerializeScale
     ├─ applyScaleToMark(each consumer)
     │  └─ editGraphics(resolved values)
     └─ rebuildGuide(the single channel guide, if present)
```

`editScale` accepts the scale ID and only the semantic scale options being
changed. It must validate `type`, `domain`, and `range`, structurally copy the
changed semantic path, and explicitly rematerialize every existing graphical
consumer. The rematerialization steps are wrapped actions, so they remain
visible beneath `editScale` in the trace. This explicit action behavior is not
an automatic semantic-to-graphic compiler.

## Concrete graphical materialization

`graphicSpec` must not contain executable functions, field references, scale
references, declarative expressions, or `"auto"` values.

Avoid:

```javascript
{
  op: "scale",
  scale: "x",
  field: "Horsepower"
}
```

The authoring action evaluates the scale eagerly. `editGraphics` may accept an
array for a property on an object with children, but the stored result is
distributed to those concrete children:

```javascript
{
  points: {
    type: "circle",
    children: [
      {
        id: "points:0",
        properties: { x: 32.5 }
      },
      {
        id: "points:1",
        properties: { x: 81.4 }
      }
    ]
  }
}
```

The same rule applies to color scales, guides, labels, and layout. A color
encoding stores resolved fill colors on concrete nodes. An axis action creates
concrete `line` and `text` nodes with final coordinates and strings.

## Defaults and inference

Defaults must be defined at the abstraction level where they are introduced.

Examples:

```text
quantitative positional field → linear scale
temporal positional field     → time scale
nominal positional field      → point or band scale
createCircleMark              → point semantics with circle graphics
encodeRadius({ value })       → constant concrete circle radius
color encoding                → ordinal or continuous color scale
position encoding             → corresponding axis eligibility for createGuides
```

For example:

```javascript
program.encodeX({ field: "Horsepower" });
```

may infer a linear scale.

A user may explicitly override that decision:

```javascript
program.encodeX({
  field: "Horsepower",
  scale: { type: "log" }
});
```

The precedence order is:

```text
explicit value > inferred value > default value
```

The source of each resolved value should be retained when practical.

## Guide actions

The primary user-facing guide actions are `createGuides` and `editGuides`.
Their meaningful component actions remain available for focused edits.

```text
createGuides
  ├─ createAxes
  │  ├─ createXAxis
  │  │  ├─ createXAxisLine
  │  │  ├─ createXAxisTicks
  │  │  ├─ createXAxisLabels
  │  │  ├─ createXAxisTitle
  │  │  └─ createXAxisGrid
  │  └─ createYAxis
  └─ createLegends
     └─ createColorLegend
```

```javascript
ChartProgram.prototype.createGuides = action(
  {
    op: "createGuides",
    description: "Create semantic guides and their concrete graphics."
  },
  function ({
    axes = "auto",
    grids = "auto",
    legends = "auto"
  } = {}) {
    let next = this;

    if (axes !== false) {
      next = next.createAxes({ axes, grids });
    }

    if (legends !== false) {
      next = next.createLegends({ legends });
    }

    return next;
  }
);
```

The values `"auto"`, `true`, and `false` should be normalized internally.
`"auto"` is resolved only because the user explicitly called `createGuides`;
this is an authoring action, not an automatic semantic-to-graphic compiler.

Guide creation must be context-dependent:

* An x encoding may require an x-axis.
* A y encoding may require a y-axis.
* A color encoding may require a color legend.
* A chart without a legend-producing encoding should not create a legend.

The initial scope supports at most one guide per channel: one x-axis, one
y-axis, and one color legend. If multiple independent scales on the same
channel would require multiple guides, `createGuides` must reject the ambiguous
request or require the caller to choose the one scale to expose. Multiple
guides on one channel are outside the initial scope.

The semantic guide records what is being explained, for example an axis or
legend reference to a scale and its semantic title. Orientation, tick size,
grid color, label font, spacing, and placement are graphical properties and
must be expressed through `createGraphics` and `editGraphics` by the guide
actions. Grid lines are graphical parts of an axis rather than separate
semantic guides.

Guide editing follows the same domain hierarchy. It is not a renamed raw
`editGraphics` interface:

```text
editGuides
  ├─ editAxes
  │  ├─ editXAxis
  │  │  ├─ editXAxisLine
  │  │  ├─ editXAxisTicks
  │  │  ├─ editXAxisLabels
  │  │  ├─ editXAxisTitle
  │  │  └─ editXAxisGrid
  │  └─ editYAxis
  └─ editLegends
     └─ editColorLegend
```

Users provide meaningful guide options rather than graphical targets and raw
property paths:

```javascript
program.editGuides({
  axes: {
    x: {
      line: { lineWidth: 3 },
      ticks: { length: 6 },
      labels: { fontSize: 12 },
      title: { text: "Horsepower" },
      grid: { color: "#dddddd" }
    }
  }
});
```

The action decomposes those options automatically:

```text
editGuides
  └─ editAxes
     └─ editXAxis
        ├─ editXAxisLine({ lineWidth: 3 })
        ├─ editXAxisTicks({ length: 6 })
        ├─ editXAxisLabels({ fontSize: 12 })
        ├─ editXAxisTitle({ text: "Horsepower" })
        └─ editXAxisGrid({ color: "#dddddd" })
```

Each component action translates its domain options into atomic internal
edits. For example, `editXAxisLine({ lineWidth: 3 })` finds the concrete x-axis
line itself and calls `editGraphics` internally. Users never provide its
graphic ID or property path. Meaningful component actions may also be called
directly when only one part needs to change:

```javascript
program.editXAxisLine({ lineWidth: 3 });
```

`editXAxisTitle({ text })` updates both `guide.axis.x.title` and the concrete
title text. Pure appearance actions such as `editXAxisLine`,
`editXAxisLabels`, and `editXAxisGrid` update only `graphicSpec`. The lowest
`editSemantic` and `editGraphics` calls remain atomic even when one higher-level
guide action edits several options.

Every component option object has a library-defined schema. For example,
`editXAxisLine` may accept `lineWidth` and `color`, while `editXAxisLabels` may
accept `fontSize`, `fontFamily`, and `color`. Unknown options must be rejected;
they are not forwarded as arbitrary raw graphic properties.

Guide creation must also be idempotent.

## Action trace

`trace` is an action tree. Every program has a virtual `program` root,
top-level actions are its children, and actions invoked inside another action
become children of the calling action.

```text
program
├─ createCanvas
│  ├─ createGraphics
│  ├─ editGraphics(width)
│  ├─ editGraphics(height)
│  └─ editGraphics(background)
├─ createCoordinate
│  └─ editSemantic(coordinate.type)
├─ createData
│  └─ editSemantic
├─ createCircleMark
│  ├─ editSemantic(mark.type)
│  ├─ editSemantic(data)
│  └─ createGraphics
├─ encodeX
│  ├─ inferFieldType
│  ├─ editSemantic(coordinate)
│  ├─ createScale
│  │  ├─ inferScaleType
│  │  └─ editSemantic
│  └─ rematerializeScale
│     ├─ inferCombinedDomain
│     ├─ resolveAutoRange
│     └─ editGraphics
└─ encodeRadius
   └─ editGraphics(radius)
```

A partial trace has this structure:

```javascript
{
  id: "program",
  op: "program",
  description: "Program action trace root.",
  args: {},
  children: [
    {
      id: "a1",
      op: "encodeX",
      description: "Encode a field as horizontal position.",
      args: {
        field: "Horsepower",
        target: "points"
      },
      children: [
        {
          id: "a2",
          op: "editSemantic",
          description: "Edit one semantic property.",
          args: {
            property: "layer[points].encoding.x.field",
            value: "Horsepower"
          },
          children: []
        },
        {
          id: "a3",
          op: "rematerializeScale",
          description: "Recompute every concrete consumer of a scale.",
          args: { id: "x" },
          children: [
            {
              id: "a4",
              op: "inferCombinedDomain",
              description: "Infer a domain across all scale consumers.",
              args: { id: "x" },
              children: []
            },
            {
              id: "a5",
              op: "editGraphics",
              description: "Edit one graphical property.",
              args: {
                target: "points",
                property: "x",
                valueCount: 2
              },
              children: []
            }
          ]
        }
      ]
    }
  ]
}
```

Each action node contains at least:

```javascript
{
  id,
  op,
  description,
  args,
  children
}
```

- `id`: unique action ID within the program
- `op`: action name
- `description`: short human-readable explanation of the action
- `args`: lightweight serializable argument summary
- `children`: nested actions

The trace API returns the tree, while search APIs may return flattened results:

```javascript
program.getTrace();

program.getAction("a3");

program.getTrace({ maxDepth: 2 });

program.getActions({ op: "editGraphics" });
```

## Rendering

```javascript
ggaction.render(program, backendContext);
```

`backendContext` is the renderer's output target and is unrelated to
`program.context`. The renderer should:

1. Begin with the program's root canvas.
2. Read the concrete nodes and properties stored in `graphicSpec`.
3. Resolve local graphical children such as the dashboard container.
4. Recursively render each named child program's canvas beneath that container.
5. Map backend-neutral node types and properties to the selected backend.
6. Draw the visualization using the selected backend.

For example, an SVG renderer may map `canvas` to `<svg>` and each `circle`
child to `<circle>`. A Canvas renderer may map the same objects to a drawing
surface and repeated `arc()` calls. For a drawable collection, the renderer
draws each child using the parent object's primitive `type`. In a composition,
the parent canvas first resolves its local dashboard container; each dashboard
child ID then resolves to a named `ChartProgram`, whose own canvas is rendered
beneath the parent canvas in the listed order. An SVG backend may use nested
`<svg>` surfaces, while a Canvas backend may composite child surfaces into the
parent drawing surface. This does not prescribe backend markup. Backend
mappings never appear in `graphicSpec`.

The renderer must not read `semanticSpec`, resolve datasets or scales, infer
automatic values, or evaluate declarative expressions. If an action needs a
graphical node or property, that action must have already materialized it
through `createGraphics` or `editGraphics`.

Rendering must not require `context` or `trace`.

The trace is used for inspection, explanation, provenance, recommendation, debugging, and analysis of the authoring process.
