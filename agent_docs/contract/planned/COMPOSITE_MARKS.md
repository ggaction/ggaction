# Planned Composite Mark contracts

These accepted contracts define future aggregate mark APIs. They are not current public behavior.

## Shared interval notation

```typescript
type IntervalChannel =
  | {
      field: FieldName;
      center?: "mean" | "median";
      extent?: "stderr" | "stdev" | "ci" | "iqr";
      level?: UnitIntervalExclusive;
    }
  | {
      center: FieldName;
      lower: FieldName;
      upper: FieldName;
    };

type PositionChannel = {
  field?: FieldName;
  fieldType?: FieldType;
  scale?: PositionScale;
};

```

These types are reused below by the remaining planned interval composites. The current
`createErrorBar` contract, including horizontal and explicit intervals, lives in
[`../current/STATISTICS.md`](../current/STATISTICS.md#createerrorbar).

## createBoxPlot remaining capabilities

The vertical/horizontal Tukey and minmax action is Current in
[`../current/COMPOSITE_MARKS.md`](../current/COMPOSITE_MARKS.md#createboxplot).
This section owns only the accepted configurable factor, width, style, and outlier expansion.

```typescript
createBoxPlot({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: PositionChannel;
  y?: PositionChannel;
  coordinate?: UserId;
  whisker?: BoxWhisker;
  width?: { band: UnitIntervalExclusive };
  outliers?: boolean;
  box?: {
    fill?: NonEmptyString;
    opacity?: UnitInterval;
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
  };
  median?: {
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
  };
  outlier?: {
    shape?: PointShape;
    radius?: PositiveFinite;
    opacity?: UnitInterval;
  };
}): ChartProgram;
```

- `whisker` defaults to Tukey factor `1.5`; `outliers` defaults to `true` for Tukey and has no effect in minmax
  mode. Concrete order is whiskers/caps behind the box, then median, then outliers.
- `width.band` defaults to `0.7`. Box defaults are fill/stroke `#4c78a8`, opacity `1`, stroke width `1.5`;
  median defaults are stroke `#1f2937`, width `1.5`; whiskers/caps default to black `#111111`, width `1.5`, and
  outliers default to black diamond, radius-equivalent area from `3`, opacity `0.75`.
  Median span follows the concrete box body extent, while reused error-bar caps keep their 8px logical default.
- Omitted `id` resolves once to `"boxPlot"`; a second box plot requires an explicit ID. Child IDs and datasets
  are namespaced from the resolved owner. The aggregate is create-only; users modify stable child
  marks through their assignment actions rather than through `editBoxPlot`. Missing categorical combinations
  are not synthesized.
- Phase 8 does not accept an additional `groupBy`. The categorical position already owns the statistical
  partition; subgroup offset/color/layout remains outside this initial contract.
- Status: Planned, NOT IMPLEMENTED. Public factor, width/outlier/style options and their approved primitive/public
  variants remain; both orientations, Tukey/minmax statistics and ranged-bar composition are Current.
