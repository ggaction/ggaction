# STEP 14 — Coordinate-Aware Axes

## 목표

Encoding channels와 coordinate를 해석해 필요한 complete-axis action을
선택적으로 호출한다.

```javascript
.createAxes({
  x: { title: { text: "Horsepower" } },
  y: { title: { text: "Miles per Gallon" } }
})
```

## 진행 상태

- [x] Coordinate type/channel schema
- [x] `createCoordinate`
- [x] Coordinate ID/type inference
- [x] Axis channel과 scale inference
- [x] Selective x/y dispatch와 false opt-out
- [x] Polar/mixed channel validation
- [x] `createAxes`
- [ ] 대표 프로그램 x/y axis 호출 교체
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createAxes({
  coordinate?: { id?, type? },
  x?: false | CreateXAxisOptions,
  y?: false | CreateYAxisOptions
});
```

Coordinate가 없으면 x/y encoding에서 `main` Cartesian coordinate를 추론해
관련 layer에 연결한다. Undefined axis는 encoding 존재 여부로 선택하고,
`false`는 명시적으로 제외한다. Channel의 scale이 여러 개면 명시적 scale이
없을 때 ambiguity error다.

Theta/radius semantic channel은 Polar inference 대상으로 인식하지만 STEP14는
Cartesian graphics만 materialize하므로 명확한 unsupported error를 발생시킨다.

```text
createAxes
├─ createCoordinate
├─ createXAxis (when selected)
└─ createYAxis (when selected)
```

## 완료 조건

- Cartesian coordinate와 layer references가 semantic에 저장된다.
- Encoding이 있는 axis만 생성되고 scale ambiguity를 숨기지 않는다.
- Polar/mixed channels가 잘못 Cartesian으로 처리되지 않는다.
- 대표 프로그램이 `createAxes` 하나만 사용한다.
- 기존 고해상도 PNG가 유지된다.
