# STEP 2 — Line Mark Action

## 목표

Primitive line mark 생성 구간을 `createLineMark` Chart API로 교체한다.

```javascript
.createData({ id: "cars", values: cars })
.createLineMark({ id: "trends" })
```

Action은 semantic `line` mark와 dataset reference를 저장하고, graphical
`path` collection의 identity를 만든다. Mark 생성 시점에는 series grouping이
없으므로 path cardinality는 0으로 둔다.

## 진행 상태

- [x] `createLineMark` API와 option validation
- [x] Dataset/currentData 해석
- [x] Semantic line mark와 data reference
- [x] 빈 graphical path collection
- [x] Duplicate/conflict validation
- [x] Nested trace와 immutability test
- [x] 별도 line-chart actions program의 mark block 교체
- [x] Acceptance와 PNG regression
- [x] 영어 Mark API, action reference, `llms.txt`

## API

```javascript
createLineMark({
  id,
  data?
});
```

- `id`는 필수 user-defined mark ID다.
- `data`는 기존 dataset ID이며 생략하면 `context.currentData`를 사용한다.
- `id`, `data` 이외 option은 거절한다.
- 선택한 dataset은 실제로 존재해야 한다.
- 동일 layer ID 또는 graphic ID가 있으면 충돌 오류다.

## Action 분해

```text
createLineMark({ id: "trends", data: "cars" })
├─ editSemantic(layer[trends].mark.type = line)
├─ editSemantic(layer[trends].data = cars)
└─ createGraphics(trends, path, length = 0)
```

저장 결과:

```javascript
semanticSpec.layers = [
  {
    id: "trends",
    mark: { type: "line" },
    data: "cars"
  }
];

graphicSpec.objects.trends = {
  type: "path",
  children: []
};
```

## Cardinality 책임

Point mark는 dataset row마다 graphical point 하나가 필요하므로 mark 생성 시
cardinality를 알 수 있다. Line mark는 grouping encoding이 결정되어야 series
수를 알 수 있다.

```text
createPointMark -> dataset row 수
createLineMark  -> 빈 path collection
series encoding -> path collection length 결정
```

`createLineMark`는 임의로 one-series를 추론하지 않는다. 이후 encoding action이
grouping을 해석하고 path collection length와 points를 명시적으로 materialize한다.

## Test program 보존과 actions program

STEP1의 primitive program과 test는 변경하지 않는다. 이를 복사한 별도 진행용
program에서 mark block만 교체한다.

```text
carsLineChartPrimitives.js  # STEP1 contract, 계속 보존
carsLineChartActions.js     # STEP2부터 domain action을 누적 적용
```

교체 전:

```text
editSemantic(mark.type = line)
editSemantic(data = cars)
...
createGraphics(trends, path, length = 3)
```

교체 후:

```text
createLineMark(trends)
...
editGraphics(trends.length = 3)
editGraphics(trends.points = computed series points)
```

STEP2에서는 test helper가 계산한 series 수로 `length`를 primitive edit한다.
이 임시 edit는 이후 series encoding/materialization action으로 교체한다.

## 구현 순서

1. Line mark option, ID, dataset validation을 구현한다.
2. `createLineMark`를 wrapped action으로 등록한다.
3. Semantic line과 빈 path collection을 unit test한다.
4. Duplicate, invalid input, trace, immutability를 test한다.
5. Primitive program/test를 복사해 actions program/test를 만든다.
6. Actions program의 raw mark block만 교체한다.
7. Actions acceptance trace expectation을 갱신한다.
8. Primitive와 actions PNG를 모두 regression test한다.
9. 영어 Mark API, action reference, supported features, `llms.txt`를 갱신한다.

각 conceptual change는 관련 test와 문서를 포함해 commit/push한다.

## 제외 범위

- Path series cardinality 자동 결정
- Temporal/aggregate encoding
- Grouping과 sorting
- Scale resolution과 path points materialization
- `encodeStrokeDash`
- Axis, legend, title domain action

## 검증 결과

- Unit/acceptance test 156개 통과
- PNG render regression 5개 통과
- STEP1 primitive program과 test 변경 없음
- Actions program이 primitive program과 동일한 최종 semantic/graphic 결과 생성
- `createLineMark` trace에 세 wrapped child action 기록

## 완료 조건

- 사용자가 raw mark/data semantic path 없이 line mark를 생성한다.
- Action 직후 semantic line과 빈 path collection이 존재한다.
- Trace에 세 wrapped child action이 기록된다.
- Primitive program/test는 수정되지 않는다.
- Actions line chart의 최종 semanticSpec과 graphicSpec은 STEP1과 동일하다.
- Phase 1 scatterplot과 Phase 2 primitive PNG가 유지된다.
- 관련 public/LLM 문서가 현재 API와 일치한다.
- 모든 변경이 push되고 worktree가 clean하다.
