# 구현 완료 후 성립해야 하는 호출과 결과

상태: **Proposed acceptance examples**. 아래 새 API는 현재 실행할 수 있다고 보장하지 않는다. 구현 Gate에서 strict types/runtime fixture로 옮기고, 실제 결과를 검증한다. 현재 factory는 `import { chart } from "ggaction"`다. scope나 옵션 해석은 각 feature 명세가 우선한다.

## 1. 파생 식 수정과 downstream 재계산

```js
const before = chart()
  .createData({ id: "raw", values: [{ x: 1 }, { x: 2 }, { x: 3 }] })
  .createComputedData({
    id: "twice", source: "raw", as: "z",
    expression: { op: "multiply", left: { field: "x" }, right: { constant: 2 } }
  })
  .createSummaryData({
    id: "average", source: "twice",
    aggregates: [{ op: "mean", field: "z", as: "meanZ" }]
  });

const after = before.editComputedData({
  target: "twice", dependents: "recompute",
  expression: { op: "multiply", left: { field: "x" }, right: { constant: 3 } }
});
```

- before의 twice 값은 2,4,6이고 average.meanZ=4다.
- after의 logical owner twice가 가리키는 새 revision은 3,6,9이며 average의 새 current revision은 meanZ=6이다.
- source raw는 동일하다. before의 모든 상태와 trace는 그대로다.
- dependents를 생략하면 average가 존재하므로 오류다. 일부 데이터만 바뀐 program을 반환하면 안 된다.
- 테스트는 새 revision ID 문자열을 추측하지 말고 owner.current를 통해 실제 dataset을 조회한다.

## 2. 관측되지 않은 시점과 값 0을 구별

```js
const filled = chart()
  .createData({ id: "raw", values: [
    { group: "A", t: 1, value: 2 },
    { group: "A", t: 3, value: 6 }
  ] })
  .createCompleteData({
    id: "complete", source: "raw", groupBy: "group", key: "t",
    sequence: { start: 1, end: 3, step: 1 }, members: "members"
  })
  .createImputedData({
    id: "interpolated", source: "complete", groupBy: "group",
    fields: ["value"], sortBy: [{ field: "t", order: "ascending" }],
    method: "linear"
  });
```

complete의 t=2 행은 value=null, members=[]다. interpolated의 값은 2,4,6이다. 합성된 row가 원본 관측치로 바뀌었다고 members를 조작하지 않는다. impute는 새 derived output의 field를 대체하고 complete 값은 null로 보존한다. 기본값으로 value=0을 채우면 실패다.

## 3. 시간 길이로 이동평균

```js
const windows = chart()
  .createData({ id: "raw", values: [
    { t: 0, x: 2 },
    { t: 86400000, x: 4 },
    { t: 864000000, x: 10 }
  ] })
  .createWindowData({
    id: "moving", source: "raw", temporalUnit: "timestamp",
    sortBy: [{ field: "t", order: "ascending" }],
    operations: [{
      op: "movingMean", field: "x", as: "movingMean",
      frame: { duration: { preceding: 7, unit: "day" } },
      minPeriods: 1, missing: "error"
    }]
  });
```

결과는 2,3,10이다. day는 정확히 86,400,000ms다. 마지막 행에서 이전 두 행을 포함하는 row-count window로 잘못 구현하면 다른 값이 나온다. 이 API의 temporalUnit은 R09가 추가하는 root 옵션이며 기존 WindowSort를 임의로 확장한 옵션이 아니다.

## 4. 여러 채널을 바꾸고 상위 두 점만 라벨링

```js
const before = chart()
  .createCanvas({ width: 480, height: 320 })
  .createData({ id: "raw", values: [
    { name: "A", a: 1, b: 3 },
    { name: "B", a: 2, b: 5 },
    { name: "C", a: 3, b: 4 }
  ] })
  .createPointMark({ id: "points", data: "raw" })
  .encodeX({ target: "points", field: "a" })
  .encodeY({ target: "points", field: "b" });

const after = before
  .encodeChannels({
    target: "points",
    channels: { x: { field: "b" }, y: { field: "a" } }
  })
  .createMarkLabels({
    id: "labels", source: "points", field: "name",
    select: { field: "b", op: "max", count: 2, ties: "first" }
  });
const withoutLabels = after.removeMarkLabels({ target: "labels" });
```

after는 x=b,y=a이며 점은 세 개, 라벨은 B와 C 두 개다. selection field는 raw index가 아니라 final item이 제공하는 b 역할 값이다. withoutLabels는 점 세 개와 scale이 그대로 있고 labels/layout/leader만 제거된다. 이어 editCanvas를 해도 라벨이 부활하면 안 된다.

## 5. 크기 스케일은 면적을 반환

```js
const sized = before.encodeSize({
  target: "points", field: "b",
  scale: { type: "log", domain: [1, 100], range: [4 * Math.PI, 100 * Math.PI] }
});
```

이 예제의 before는 앞 절의 Point program이다. field 값 1/10/100의 independent mapper fixture를 추가하면 circle radius가 2/sqrt(52)/10이어야 한다. 실제 세 점의 b=3,5,4도 같은 로그 t와 area 식으로 계산한다. range를 radius로 해석하거나 mapper에서 얻은 면적에 다시 제곱하면 실패다. legend sample도 같은 size mapper를 사용한다.

## 6. Polar 패널은 로컬 frame과 통계를 사용

```js
const polar = chart()
  .createCanvas({ width: 480, height: 320 })
  .createData({ id: "raw", values: [
    { region: "A", angle: 0, value: 1 },
    { region: "A", angle: 90, value: 2 },
    { region: "B", angle: 0, value: 10 },
    { region: "B", angle: 90, value: 20 }
  ] })
  .createPolarScatterPlot({
    id: "points", data: "raw", coordinate: "polar",
    theta: { field: "angle", fieldType: "quantitative" },
    radius: { field: "value", fieldType: "quantitative" },
    guides: false
  })
  .editCoordinate({
    target: "polar",
    polarFrame: { center: { x: 0.5, y: 0.5 }, radius: { unit: "fraction", value: 0.8 } }
  });

const panels = polar.facet({
  field: "region", data: "raw", columns: 2,
  scales: { theta: "shared", r: "independent" }
});
```

기존 facade 옵션 이름은 radius이고, 새 facet resolution의 사용자 r는 semantic radius로 normalize한다. 각 child는 자기 plot bounds에서 중심과 radius를 계산한다. A의 자동 radial max는2, B는20이며 원본 polar program은 그대로다. guides:false는 이 수치 fixture를 단순화하기 위한 선택이다. R43 완료에는 별도로 guide/legend/header/label/theme가 있는 전체 fixture가 필요하다.
