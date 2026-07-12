# STEP 6 — X/Y Encoding

## 목표

Point mark의 concrete `x`, `y` 배열을 사용자 코드에서 직접 계산하지 않고
`encodeX`, `encodeY` action으로 생성한다.

```javascript
const program = chart()
  .createCanvas({ ... })
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" });
```

## 진행 상태

- [x] Encoding과 scale 입력 검증
- [x] Linear scale 계산
- [x] Immutable resolved scale state
- [x] `createScale`
- [x] `rematerializeScale`
- [x] `encodeX`
- [x] `encodeY`
- [x] Canvas 변경 시 positional scale rematerialization
- [ ] `carsScatterplotActions`의 수동 x/y 계산 제거
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
encodeX({
  field,
  target?,
  fieldType?,
  scale?: {
    id?,
    type?,
    domain?,
    range?
  }
});
```

`encodeY`도 동일한 option 구조를 사용한다. `target`은
`context.currentMark`, scale ID는 channel 이름, domain과 range는 `"auto"`가
기본값이다. STEP6에서는 quantitative field와 linear scale만 지원한다.

## 저장 경계

사용자의 scale 의도는 semantic state에 보존한다.

```javascript
semanticSpec.scales = [
  {
    id: "x",
    type: "linear",
    domain: "auto",
    range: "auto"
  }
];
```

실제로 해석된 domain과 range는 immutable derived state에 저장한다.

```javascript
resolvedScales.x = {
  type: "linear",
  domain: [46, 230],
  range: [60, 620]
};
```

최종 좌표만 graphical child에 저장한다. Renderer는 semantic state나 scale을
읽지 않는다.

```javascript
graphicSpec.objects.points.children[0].properties.x = 130.4;
```

## Action 분해

```text
encodeX
├─ editSemantic(layer[points].encoding.x.field)
├─ editSemantic(layer[points].encoding.x.fieldType)
├─ editSemantic(layer[points].encoding.x.scale)
├─ createScale
│  ├─ editSemantic(scale[x].type)
│  ├─ editSemantic(scale[x].domain)
│  └─ editSemantic(scale[x].range)
└─ rematerializeScale
   ├─ resolve shared domain and graphical range
   ├─ _withResolvedScale
   └─ editGraphics(points.x = resolved values)
```

`encodeY`는 같은 구조를 사용하되 자동 graphical range를 반대로 해석한다.

```javascript
x: [bounds.left, bounds.right]
y: [bounds.bottom, bounds.top]
```

`_withResolvedScale`은 private immutable helper이며 action이나 trace node가
아니다. `rematerializeScale`은 semantic scale을 concrete graphic으로 만드는
의미 있는 authoring operation이므로 wrapped action이다.

## Shared scale

기본 scale ID는 channel 이름이다. 같은 scale을 참조하는 모든 layer는 auto
domain 계산에 참여하고, `rematerializeScale`은 모든 graphical consumer를
수정한다.

STEP6에서는 하나의 scale ID를 x와 y channel이 동시에 참조하는 경우를
거절한다. 두 channel은 자동 range 방향이 다르므로 coordinate 지원 전에 이를
암묵적으로 해석하지 않는다.

## Validation 범위

- field와 target은 필수로 해석되어야 한다.
- target layer, dataset, graphical collection이 존재해야 한다.
- STEP6의 quantitative field 값은 모두 finite number여야 한다.
- auto domain은 모든 shared consumer의 값 extent다.
- explicit domain과 range는 finite number 두 개다.
- auto domain을 계산할 값이 없으면 error다.
- 동일한 두 domain 값은 range 중앙으로 materialize한다.
- `linear` 이외의 scale type과 `quantitative` 이외의 field type은 거절한다.
- unknown action과 scale option은 거절한다.

## Canvas rematerialization

`editCanvas`가 width, height 또는 margin으로 graphical bounds를 변경하면 모든
auto-range positional scale을 명시적으로 다시 materialize한다.

```text
editCanvas
├─ editGraphics(canvas properties)
├─ _withContext(updated bounds)
└─ rematerializeScale(each positional scale)
   └─ editGraphics(each graphical consumer)
```

이는 자동 semantic compiler가 아니라 `editCanvas`가 직접 호출하는 wrapped
operation이다.

## 구현 순서

1. `resolvedScales` state와 immutable update helper를 구현한다.
2. Quantitative field, domain, range와 linear mapping을 구현한다.
3. `createScale`과 `rematerializeScale`을 구현한다.
4. 공통 position encoding 로직과 `encodeX`, `encodeY`를 구현한다.
5. Shared scale과 Canvas resize rematerialization을 연결한다.
6. `carsScatterplotActions`에서 수동 x/y graphical edit를 교체한다.
7. Unit, trace, immutability, acceptance, PNG test를 실행한다.
8. README와 영어 사용자 문서를 갱신하고 브라우저 결과를 확인한다.

## Test program 변경

`carsScatterplotActions.js`의 point position은 다음 high-level action으로
교체한다.

```javascript
.createPointMark({ id: "points" })
.encodeX({ field: "Horsepower" })
.encodeY({ field: "Miles_per_Gallon" })
```

Axis가 아직 guide action으로 구현되지 않았으므로 tick과 label 계산 helper는
유지한다. Point position을 설정하던 `editGraphics` 호출만 제거한다.

## 제외 범위

- Axis와 guide 자동 생성
- Color, size, radius encoding
- Log, time, ordinal scale
- Coordinate system
- Missing value 자동 제거
- `editScale`
- Renderer의 scale 추론

## 완료 조건

- `encodeX`, `encodeY`가 semantic encoding과 scale 의도를 기록한다.
- Resolved domain과 range가 semantic intent와 분리되어 저장된다.
- 모든 concrete point 좌표가 `graphicSpec`에 완전히 materialize된다.
- Shared scale consumer와 Canvas resize가 오래된 좌표를 남기지 않는다.
- Trace가 실제 wrapped action hierarchy를 보여준다.
- 기존 program과 caller-owned values가 변경되지 않는다.
- Scatterplot 사용자 코드에 수동 x/y 좌표 계산이 남지 않는다.
- 기존과 동일한 고해상도 PNG가 생성된다.
