# STEP 4 — Data Action

## 목표

Dataset 생성을 `createData` high-level action으로 감싼다. 사용자는 raw
semantic path를 직접 작성하지 않는다.

```javascript
const program = chart()
  .createCanvas({ ... })
  .createData({
    id: "cars",
    values: cars
  });
```

## 진행 상태

- [x] Dataset ID validation
- [ ] Dataset values validation
- [ ] `createData`
- [ ] Dataset immutability와 duplicate 검사
- [ ] Nested trace와 context test
- [ ] `carsScatterplotActions`의 dataset primitive 교체
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createData({
  id,
  values
});
```

### `id`

- 필수인 비어 있지 않은 문자열이다.
- 문자, 숫자, `_`, `-`만 허용한다.
- 사용자 정의 이름이므로 closed vocabulary 검사는 하지 않는다.
- 동일한 ID가 이미 있으면 duplicate error를 발생시킨다.

### `values`

- 필수인 row object 배열이다.
- 빈 배열을 허용한다.
- 각 row는 plain object여야 한다.
- row 내부의 nested object와 nested array를 허용한다.
- function, class instance, cyclic object는 거절한다.
- caller가 전달한 배열과 row를 구조적으로 복제하고 freeze한다.

`id`와 `values` 이외의 option은 거절한다.

## Action 분해

```text
createData({ id: "cars", values })
└─ editSemantic({
     property: "dataset[cars].values",
     value: values
   })
```

`createData`는 graphical output을 만들지 않으므로 `createGraphics`와
`editGraphics`를 호출하지 않는다.

## Context

`editSemantic`은 validated semantic path에서 resource kind와 ID를 추출한다.

```text
dataset[cars].values
→ { kind: dataset, id: cars }
→ context.currentData = "cars"
```

따라서 `createData`는 `_withContext`를 직접 호출하지 않는다. 동일한 context
transition을 high-level action에서 중복하면 책임이 분산되고 다른 semantic
action에서도 같은 코드가 반복된다.

```text
dataset path    → currentData
layer path      → currentMark
scale path      → currentScale
coordinate path → currentCoordinate
guide path      → currentGuide
```

## Trace

전체 dataset은 trace에 저장하지 않는다.

```text
program
└─ createData({ id: "cars", valuesCount: 392 })
   └─ editSemantic({
        property: "dataset[cars].values",
        valueCount: 392
      })
```

두 action 모두 배열 자체 대신 row 개수만 기록한다.

## Dataset 불변성

Dataset은 생성 후 수정할 수 없다.

```javascript
program.createData({
  id: "cars",
  values: otherCars
});
// Error: Dataset "cars" already exists.
```

`editData`는 만들지 않는다. 향후 데이터 변경은 transform 또는 derived
dataset action으로 표현한다.

```text
source dataset
└─ transform or derived dataset
```

## Multiple datasets

한 프로그램에는 여러 dataset이 존재할 수 있다.

```javascript
const program = chart()
  .createData({ id: "cars", values: cars })
  .createData({ id: "fit", values: regression });
```

마지막으로 생성한 dataset이 current semantic resource가 된다.

```javascript
program.context.currentData === "fit";
```

## Test program 변경

기존 `carsScatterplotActions.js`를 계속 발전시킨다.

변경 전:

```javascript
.editSemantic({
  property: "dataset[cars].values",
  value: validCars
})
```

변경 후:

```javascript
.createData({
  id: "cars",
  values: validCars
})
```

나머지 primitive chain은 변경하지 않는다. 현재 `validCars` 계산 helper도
유지한다. Missing-value filtering을 `createData`에 암묵적으로 넣지 않으며,
향후 transform action에서 제거한다.

## 구현 순서

1. 사용자 정의 ID validation helper를 구현한다.
2. Dataset array와 row validation을 구현한다.
3. `createData` wrapped action을 구현한다.
4. Duplicate dataset 검사를 구현한다.
5. Dataset input ownership과 immutability를 test한다.
6. Nested trace와 `currentData` context를 test한다.
7. Multiple dataset을 test한다.
8. `carsScatterplotActions.js`의 dataset primitive를 교체한다.
9. Acceptance test와 trace assertion을 갱신한다.
10. PNG render test를 실행한다.
11. 영어 사용자 문서를 갱신한다.
12. 브라우저와 고해상도 PNG를 직접 확인한다.

각 conceptual change는 관련 테스트와 문서를 함께 갱신하고 별도 commit으로
push한다.

## 예상 사용자 프로그램

```javascript
return chart()
  .createCanvas({
    width,
    height,
    margin,
    background: "white"
  })
  .createData({
    id: "cars",
    values: validCars
  })
  .editSemantic({
    property: "layer[points].mark.type",
    value: "point"
  })
  .editSemantic({
    property: "layer[points].data",
    value: "cars"
  })
  // remaining graphical primitives
```

## 테스트

### Unit

- 정상 dataset 생성
- 빈 dataset 생성
- nested row value 보존
- caller input mutation으로부터 보호
- invalid ID와 invalid values
- duplicate ID
- multiple datasets
- nested trace와 trace dataset 요약
- `currentData` 갱신
- 이전 program 불변성

### Acceptance

- `carsScatterplotActions`가 `createData`를 사용
- dataset row 392개
- top-level trace에 `createData`
- `createData` 아래에 `editSemantic`
- graphical output은 이전과 동일
- Canvas circle 392개, line 10개, text 10개

### Render

- `cars-scatterplot-actions.png`
- 1280×800
- STEP3 결과와 동일한 graphical output

## 영어 사용자 문서

`docs/data-actions.md`를 추가한다.

- `createData`
- ID 규칙과 row array 형식
- dataset immutability와 multiple datasets
- nested values
- dataset이 graphical output을 자동 생성하지 않는다는 점

README 기본 예제에도 `createData`를 추가한다.

## 제외 범위

- `editData`
- URL 또는 비동기 data loader
- CSV parsing
- Missing-value 자동 제거
- Filter와 aggregate transform
- Derived dataset
- Field type inference
- Mark와 encoding
- Dataset에 따른 graphic 자동 생성

## 완료 조건

- 사용자가 raw semantic path 없이 dataset을 생성할 수 있다.
- `createData`가 내부적으로 `editSemantic`을 호출한다.
- Dataset이 caller mutation으로부터 보호된다.
- 생성 후 dataset 값을 변경할 수 없다.
- Trace에 전체 dataset이 저장되지 않는다.
- `currentData`가 정확히 갱신된다.
- 기존 graphical output이 변하지 않는다.
- 모든 unit, acceptance, PNG render test가 통과한다.
- 브라우저에서 동일한 scatterplot이 렌더링된다.
