# STEP 5 — Point Mark Action

## 목표

Semantic point mark 생성과 concrete graphical collection 생성을
`createPointMark` high-level action으로 감싼다.

```javascript
const program = chart()
  .createData({
    id: "cars",
    values: cars
  })
  .createPointMark({
    id: "points"
  });
```

## 진행 상태

- [x] Point shape validation
- [ ] Dataset과 `currentData` 조회
- [ ] Mark ID와 duplicate validation
- [ ] `createPointMark`
- [ ] Semantic point와 graphical circle 생성
- [ ] Collection length와 빈 dataset 처리
- [ ] Nested trace와 context test
- [ ] `carsScatterplotActions`의 mark primitive 교체
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createPointMark({
  id,
  data?,
  shape?
});
```

기본값:

```javascript
{
  data: context.currentData,
  shape: "circle"
}
```

`data`와 `shape`는 생략할 수 있다.

```javascript
.createData({
  id: "cars",
  values: cars
})
.createPointMark({
  id: "points"
})
```

## Action 분해

```text
createPointMark({
  id: "points",
  data: "cars",
  shape: "circle"
})
├─ editSemantic({
│    property: "layer[points].mark.type",
│    value: "point"
│  })
├─ editSemantic({
│    property: "layer[points].data",
│    value: "cars"
│  })
└─ createGraphics({
     id: "points",
     type: "circle",
     length: dataset.length
   })
```

## Semantic과 graphic의 구분

User-facing action은 semantic mark 이름을 사용한다.

```text
public action      createPointMark
semantic mark      point
graphic primitive  circle
```

저장 결과:

```javascript
semanticSpec.layers = [
  {
    id: "points",
    mark: { type: "point" },
    data: "cars"
  }
];
```

```javascript
graphicSpec.objects.points = {
  type: "circle",
  children: [
    { id: "points:0", properties: {} },
    { id: "points:1", properties: {} }
  ]
};
```

## Shape

STEP5에서는 `"circle"`만 지원한다.

```javascript
shape: "circle"
```

다른 값은 명확한 error를 발생시킨다.

```javascript
createPointMark({
  id: "points",
  shape: "square"
});
// Error: Unsupported point shape "square".
```

Constant shape는 graphical appearance이므로 `semanticSpec`에 저장하지 않는다.

```text
constant shape       → graphicSpec
field-driven shape   → future semantic encoding
```

향후 `encodeShape({ field })`는 별도 encoding action으로 구현한다.

## Dataset 해석

명시적인 `data`가 있으면 해당 dataset을 사용한다.

```javascript
createPointMark({
  id: "points",
  data: "cars"
});
```

생략하면 `context.currentData`를 사용한다.

```javascript
const dataId = args.data ?? this.context.currentData;
```

둘 다 없으면 error다. 선택한 dataset은 실제로 존재해야 한다.

## Collection length

Dataset row 수를 graphical collection 길이로 사용한다.

```javascript
length = dataset.values.length;
```

392-row dataset은 빈 circle child 392개를 생성한다.

```javascript
{
  type: "circle",
  children: [
    { id: "points:0", properties: {} },
    // ...
    { id: "points:391", properties: {} }
  ]
}
```

빈 dataset도 허용하며 child 수는 0이다.

## Rendering 상태

`createPointMark`는 다음 값을 설정하지 않는다.

- x
- y
- fill
- radius
- opacity
- coordinate
- scale

따라서 action 직후 graphic은 아직 렌더링할 수 없는 incomplete 상태다.

```text
createPointMark
→ mark identity와 cardinality만 생성
→ encoding action이 concrete properties를 채움
```

Renderer가 누락된 x, y, radius, fill을 추론하면 안 된다.

## Context

`editSemantic`이 layer path를 처리하면서 다음 값을 갱신한다.

```javascript
context.currentMark = "points";
```

`createPointMark`는 `_withContext`를 직접 호출하지 않는다. `currentData`도
변경하지 않는다.

```javascript
context.currentData === "cars";
context.currentMark === "points";
```

## Validation

### Options

`id`, `data`, `shape`만 허용한다. 알 수 없는 option은 거절한다.

### Mark ID

- 필수다.
- 문자, 숫자, `_`, `-`만 허용한다.
- 동일 layer ID가 있으면 error다.
- 동일 graphic ID가 있으면 error다.

### Data

- 명시적인 ID 또는 `currentData`를 사용한다.
- 유효한 user-defined ID여야 한다.
- 실제 dataset이 존재해야 한다.

### Shape

- 기본값은 `"circle"`이다.
- STEP5에서는 `"circle"`만 허용한다.

## Duplicate 처리

다음 상태를 모두 검사한다.

```text
semanticSpec.layers에 같은 ID 존재
graphicSpec.objects에 같은 ID 존재
```

둘 중 하나라도 존재하면 생성하지 않는다.

## Trace

```text
program
└─ createPointMark({ id: "points" })
   ├─ editSemantic(mark.type = point)
   ├─ editSemantic(data = cars)
   └─ createGraphics(
        id = points,
        type = circle,
        length = 392
      )
```

사용자가 `data`와 `shape`를 생략하면 parent trace에는 실제 사용자 입력만
남는다. Resolved data와 shape는 child action에서 확인할 수 있다. Dataset row
배열은 trace에 복사하지 않는다.

## Test program 변경

기존 `carsScatterplotActions.js`를 계속 발전시킨다.

변경 전:

```javascript
.editSemantic({
  property: "layer[points].mark.type",
  value: "point"
})
.editSemantic({
  property: "layer[points].data",
  value: "cars"
})
.createGraphics({
  id: "points",
  type: "circle",
  length: validCars.length
})
```

변경 후:

```javascript
.createPointMark({
  id: "points"
})
```

나머지 graphical primitive는 유지한다.

```javascript
.createPointMark({ id: "points" })
.editGraphics({ target: "points", property: "x", value: x })
.editGraphics({ target: "points", property: "y", value: y })
.editGraphics({ target: "points", property: "fill", value: fill })
.editGraphics({ target: "points", property: "radius", value: 3 })
```

## 구현 순서

1. Point shape vocabulary와 validation을 구현한다.
2. Dataset lookup과 currentData resolution을 구현한다.
3. Mark ID, semantic duplicate, graphic duplicate 검사를 구현한다.
4. `createPointMark` wrapped action을 구현한다.
5. Dataset length 기반 `createGraphics`를 연결한다.
6. 빈 dataset과 multiple mark를 test한다.
7. Nested trace와 `currentMark` context를 test한다.
8. Incomplete graphic 상태를 test한다.
9. `carsScatterplotActions.js`의 mark primitive를 교체한다.
10. Acceptance trace assertion을 갱신한다.
11. PNG render test를 실행한다.
12. 영어 사용자 문서를 갱신한다.
13. 브라우저와 고해상도 PNG를 직접 확인한다.

각 conceptual change는 관련 테스트와 문서를 함께 갱신하고 별도 commit으로
push한다.

## 테스트

### Unit

- currentData를 사용하는 기본 생성
- 명시적인 data 사용
- 기본 circle shape와 unsupported shape
- invalid mark ID
- missing currentData와 unknown dataset
- duplicate semantic mark와 duplicate graphical ID
- dataset row 수와 collection length 일치
- 빈 dataset과 multiple marks
- nested action trace
- `currentMark` 갱신
- 이전 program 불변성
- incomplete graphic properties

### Acceptance

- `carsScatterplotActions`가 `createPointMark` 사용
- semantic mark type은 `point`
- graphic type은 `circle`
- circle child 392개
- `createPointMark` 아래에 두 `editSemantic`과 `createGraphics`
- 기존 x/y/fill/radius 결과 유지
- Canvas circle 392개, line 10개, text 10개

### Render

- `cars-scatterplot-actions.png`
- 1280×800
- STEP4와 동일한 graphical output

## 영어 사용자 문서

`docs/mark-actions.md`를 추가한다.

- `createPointMark`
- semantic point와 graphical circle 구분
- `data`와 currentData
- shape 기본값
- dataset 기반 collection length
- create 직후 incomplete graphic이라는 점
- encoding이 별도 단계라는 점

README 기본 예제에도 `createPointMark`를 추가한다.

## 후속 확장

### Encoding

다음 STEP에서 함께 설계한다.

```text
encodeX
encodeY
encodeColor
encodeRadius
encodeShape
scale inference
graphical materialization
```

### Point shapes

향후 지원 후보는 `circle`, `square`, `triangle`, `cross`, `diamond`다. 새
shape는 graphic primitive와 renderer 지원이 함께 준비된 경우에만 vocabulary에
추가한다.

## 제외 범위

- `editPointMark`
- circle 이외의 shape
- coordinate
- scale
- encoding
- radius와 fill 자동 기본값
- field type inference
- axis와 guide 변경
- renderer의 missing-property 추론

## 완료 조건

- 사용자가 raw semantic/graphic creation chain 없이 point mark를 생성한다.
- `createPointMark`가 semantic point와 graphical circle을 명시적으로 만든다.
- Dataset row 수와 circle child 수가 일치한다.
- `currentData`를 기본 data로 사용할 수 있다.
- `currentMark`가 정확히 갱신된다.
- 지원하지 않는 shape와 duplicate를 거절한다.
- create 직후 graphic에는 encoded property가 없다.
- 기존 scatterplot의 graphical output이 변하지 않는다.
- 모든 unit, acceptance, PNG render test가 통과한다.
- 브라우저에서 동일한 scatterplot이 렌더링된다.
