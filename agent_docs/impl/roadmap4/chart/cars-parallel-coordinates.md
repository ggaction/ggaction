# Cars Parallel Coordinates

## 차트 목적

1970년 Cars를 대상으로 연비, 마력, 무게와 가속 시간을 동일한 행 단위 path로 연결하고 Origin별 색으로
비교한다. 약 35개 행만 사용해 교차 관계를 읽을 수 있으면서도 row identity, color legend, selection과
missing segmentation을 실제로 검증한다.

## Candidate user-facing API

P11-A에서 승인받기 전까지 아래 surface는 후보이며 Current API가 아니다.

```javascript
chart()
  .createCanvas({
    width: 860,
    height: 500,
    margin: { top: 110, right: 160, bottom: 65, left: 78 }
  })
  .createData({ values: cars })
  .filterData({
    id: "cars1970",
    field: "Year",
    oneOf: ["1970-01-01"]
  })
  .createParallelCoordinates({
    dimensions: [
      { field: "Miles_per_Gallon", title: "MPG", scale: { nice: true, zero: false } },
      { field: "Horsepower", scale: { nice: true, zero: false } },
      { field: "Weight_in_lbs", title: "Weight (lb)", scale: { nice: true, zero: false } },
      { field: "Acceleration", scale: { nice: true, zero: false } }
    ],
    key: "Name",
    color: {
      field: "Origin",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    },
    line: { strokeWidth: 1.25, opacity: 0.48 }
  })
  .createTitle({
    text: "Cars of 1970",
    subtitle: "Each path connects one car across four measurements"
  });
```

## Candidate action hierarchy

```text
createParallelCoordinates
├─ createCoordinate({ type: "parallel" })
├─ createLineMark()
├─ encodeParallelCoordinates({ dimensions, key, missing })
├─ encodeColor(...)                    optional
├─ encodeStrokeDash(...)               optional
└─ createGuides(...)
   ├─ createParallelAxes(...)          internal wrapped family
   └─ createLegend(...)                when applicable
```

`dimensions`는 coordinate와 encoding 양쪽에 중복 저장하지 않는다. Coordinate는 projection family와 layer
attachment를 소유하고, `encoding.parallel.dimensions`가 ordered field/scale/title assignment를 원자적으로
소유한다.

## Candidate advanced API

```typescript
type ParallelDimension = string | {
  field: string;
  fieldType?: "quantitative" | "ordinal";
  title?: string;
  scale?: ScaleOptions;
};

encodeParallelCoordinates({
  target?: string;
  coordinate?: string;
  dimensions: readonly ParallelDimension[];
  key?: string;
  missing?: "break" | "drop-row" | "error";
}): ChartProgram;
```

- 최소 2개의 unique field가 필요하다.
- `fieldType`은 explicit value, data에서 unique inference, 오류 순으로 해결한다.
- `key` 생략은 source lineage의 stable row identity를 사용한다. Explicit key는 모든 eligible row에서
  non-missing unique value여야 한다.
- `missing` 기본은 `"break"`다. `break`는 한 row identity 아래 여러 path fragment를 허용하고,
  `drop-row`는 불완전한 행 전체를 제외하며, `error`는 materialization 전에 거부한다.
- Repeated `encodeParallelCoordinates`는 dimension 순서와 compatible definitions를 atomic replacement한다.

## Stored-result contract

- `semanticSpec.coordinates[id].type === "parallel"`이다.
- Target line layer는 data/coordinate와 `encoding.parallel`의 ordered dimensions, key policy와 missing policy를
  저장한다.
- Dimension별 scale은 target과 dimension role로 namespace되고 explicit/automatic definition과 resolved domain을
  기존 scale contract에 따라 보존한다.
- `graphicSpec`에는 equally spaced axis x positions, scale-mapped y values와 ordinary backend-neutral path/text/line
  primitives만 저장한다. Renderer는 Parallel semantics를 추론하지 않는다.
- 한 eligible source row가 한 semantic selectable item이다. Missing break의 여러 fragments는 같은 item identity와
  attachment 집합을 공유한다.

## Visual acceptance

- 네 축은 plot bounds 안에서 동일 간격이며 titles와 tick labels가 잘리지 않는다.
- 각 path는 왼쪽부터 dimension order대로 진행하고 Origin color와 legend가 일치한다.
- Primitive와 public program은 exact semantic/graphic/order/Canvas-call contract와 decoded PNG hash가 같다.
- 기본 opacity에서도 전체 패턴과 개별 극단값을 모두 읽을 수 있다.

## Non-goals

- Curved/spline parallel paths, bundling, brushing UI와 animation
- Axis drag reorder 또는 interactive filtering
- Temporal dimension, multiple coordinate blocks와 shared axes across child programs
- Renderer-specific Parallel primitive
