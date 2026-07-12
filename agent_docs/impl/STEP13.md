# STEP 13 — Complete Axis Actions

## 목표

Channel별 line, ticks-and-labels, title을 create-only aggregate action으로 묶는다.

```javascript
.createXAxis({ title: { text: "Horsepower" } })
.createYAxis({ title: { text: "Miles per Gallon" } })
```

## 진행 상태

- [x] Top-level과 nested option validation
- [x] Shared scale/position routing
- [x] `createXAxis`
- [x] `createYAxis`
- [x] Nested trace와 duplicate behavior
- [x] 대표 프로그램 component 호출 교체
- [ ] Unit, immutability, validation test
- [ ] Acceptance 및 PNG render test
- [x] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxis({
  scale?, position?,
  line?: { color?, lineWidth? },
  ticksAndLabels?: {
    count?, values?,
    ticks?: { length?, color?, lineWidth? },
    labels?: { offset?, format?, color?, fontSize?, fontFamily?, fontWeight? }
  },
  title?: { text?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? }
});
```

Y축도 동일하다. Shared scale/position은 세 wrapped child에 전달한다. Nested
object는 appearance와 component option만 받고 shared option을 중복해서 받지
않는다.

```text
createXAxis
├─ createXAxisLine
├─ createXAxisTicksAndLabels
└─ createXAxisTitle
```

STEP13에서는 edit, component 생략과 existing component 재사용을 지원하지
않는다. Rematerialization은 기존 leaf edit action을 그대로 사용한다.

## 완료 조건

- Shared option이 상위에서 한 번만 입력된다.
- Parent trace 아래 세 실제 child action이 보존된다.
- 대표 프로그램이 x/y aggregate action 두 개만 사용한다.
- 기존 고해상도 PNG가 유지된다.
