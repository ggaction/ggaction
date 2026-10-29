---
layout: default
title: Calendar Plots
---

# Calendar plots

Aggregate observations by civil day and place each date in a week/weekday cell.
These chart-authoring actions require the Full `ggaction` entry point. The same
cells, month boundaries and labels render with Canvas, SVG, PNG and PDF.

{% include chart-example.html id="calendar" %}

The [calendar tutorial](../tutorials/calendar.md) uses the shared executable example.

## `createCalendarLayout`

**Chart authoring.**

```typescript
createCalendarLayout(options: TargetedOptions<CreateCalendarLayoutOptions>): ChartProgram;
```

Pass `{ id?, data?, date, value?, start, end, timeZone, weekStartsOn, aggregate,
missing }`. `date` names the date column. `value` names a finite numeric column;
it is required for `sum`, `mean`, `median`, `min` and `max`, and forbidden for
`count`. Duplicate dates contribute to the same daily aggregate. Zero and
negative observations are valid.

Specify both inclusive `start` and `end` as strict `YYYY-MM-DD` strings, a UTC or
IANA `timeZone`, and `weekStartsOn` from zero (Sunday) through six (Saturday).
Dates may be integer epoch milliseconds or strict ISO strings. An ISO offset
identifies an absolute instant. A string without an offset uses the explicit
time zone. Ambiguous or nonexistent local times are errors. Invalid, missing
or out-of-range source dates are rejected; rows never disappear silently.

Choose `missing: "empty"` to create null-valued cells for unobserved civil days,
or `"omit"` to leave them out. Empty cells differ from an observed zero.
Calendar days advance in civil time across daylight-saving changes. Each year
starts a fresh week frame; some leap years need 54 weeks. Dates are ordered
chronologically, while contributing source rows keep their original order.
Month boundaries follow the emitted cells, including separate islands and holes.

The default ID is `calendarLayout`. Use another explicit ID for a second layout.
An omitted `data` reference uses the current or unique eligible materialized
dataset; ambiguous references are errors. At most 10,000 source observations and
10,000 civil days are accepted, with a 10,000,000-unit cumulative work limit.
Creating the layout stores its result without drawing a mark.

## `createCalendarPlot`

**Chart authoring.**

```typescript
createCalendarPlot(options?: TargetedOptions<CalendarPlotOptions>): ChartProgram;
```

Options are `{ id?, layout?, coordinate?, color?, cells?, monthBoundary?, labels?,
clip? }`. Create a Canvas first. Layout and Cartesian coordinate references use
explicit, current, then unique eligible selection. If needed, the `main`
coordinate is created. The default mark ID is `calendar`.

Years stack vertically. Weeks run left to right and weekdays top to bottom.
Square cells resize to fit the available frame. A day retains its logical identity
when data is reordered or the Canvas changes size.

`color` accepts continuous or discretized quantitative color-scale options. It
defaults to a sequential scale named `<mark>-color`; its automatic domain uses
observed daily aggregates and excludes null cells. With no observations, specify
a domain or use `color: false`. Create a legend explicitly with
`createLegend({ target: "calendar" })`.

Use `color: false` for fixed cell paint. Cell defaults are `fill: "#2563eb"`,
`emptyFill: "#f1f5f9"`, `stroke: "none"`, `strokeWidth: 0`, `opacity: 1` and
`gap: 0.08`. The gap is a fraction of cell size, from zero up to but excluding
one. Both fills accept [FillPaint](appearance/mark-style.md#pattern-and-gradient-fills).
Zero opacity is valid.

`monthBoundary` accepts `false` or a style with defaults `stroke: "#64748b"`,
`strokeWidth: 1`, `opacity: 1`. `labels` accepts `false` or a record containing
`month`, `weekday`, `week` and `year`. Each role accepts `false` or a text style.
All roles are enabled by default, using `fill: "#0f172a"`, `fontFamily:
"sans-serif"`, `fontSize: 10` and `fontWeight: "normal"`. Label fills also accept
FillPaint. Explicit font resources use the shared font preparation contract.

Cell, boundary and label styles share `outline` and `shadow`, including `false`
to reset an effect. See [mark style](appearance/mark-style.md) for their values
and Canvas/SVG shadow preparation. `clip` defaults to true.

One civil day is one selectable item. Its fields include `date`, `instant`,
`year`, `month`, `day`, `week`, `weekday`, `value` and `empty`. Source row keys
identify the actual contributing observations; empty cells have no source rows.
Month and date labels are decorations. Highlighting a day changes its cell body
without changing those decorations. Accessible data exports one row per day.
Ordinary row encodings do not replace calendar coordinates.

## `editCalendarPlot`

**Chart authoring.**

```typescript
editCalendarPlot(options: TargetedOptions<EditCalendarPlotOptions>): ChartProgram;
```

Use the creation options with `target` instead of `id`. Provide a nonempty patch;
omitted values remain unchanged and explicit `undefined` is rejected. After
`labels: false`, supplying one role's style re-enables only that role. Supplying
a boundary style also re-enables a disabled boundary.

Scale identity is preserved unless a new ID is provided. A new color ID rebinds
the legend; changing a customized legend family follows the existing explicit
remove/recreate rules. `color: false` removes that mark's color legend.

## Update the calendar data and layout

Use `editLayout({ target?, options: { ... } })` to patch the date/value columns,
range, time zone, week start, aggregate or missing-day policy. Its `options`
record must be nonempty. Ordering is always chronological, so `order` is rejected.
Switching to `count` removes the previous value-column binding.

Raw, computed, parameter-driven and prepared source revisions update affected
calendar layouts, shared scales, marks, legends and highlights together. All
candidates are checked before the new state is materialized. A failure preserves
the original program. Saved programs verify their stored cells and boundaries
against the exact source and calendar definition.

Use `hconcat` or `vconcat` with explicit layouts for separate panels, and scoped
targets for child edits. `facet` and `repeatCharts` do not partition calendar
resources implicitly. Remove a calendar mark with `removeMark` before removing
its layout with `removeResource({ kind: "layout", id })`.
