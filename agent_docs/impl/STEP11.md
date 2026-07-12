# STEP 11 — Ticks & Labels Aggregate Actions

## 목표

Scale, position, count/values를 공유하는 tick과 label leaf action을 하나의
상위 authoring action으로 묶는다.

```javascript
.createXAxisTicksAndLabels()
.createYAxisTicksAndLabels()
```

## 진행 상태

- [ ] Aggregate와 nested option validation
- [ ] Shared option routing
- [ ] `createXAxisTicksAndLabels` / `createYAxisTicksAndLabels`
- [ ] `editXAxisTicksAndLabels` / `editYAxisTicksAndLabels`
- [ ] Shared configuration edit 동기화
- [ ] 대표 프로그램 leaf 호출 교체
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxisTicksAndLabels({
  scale?, position?, count?, values?,
  ticks?: { length?, color?, lineWidth? },
  labels?: { offset?, format?, color?, fontSize?, fontFamily?, fontWeight? }
});
```

Y축도 같은 구조다. Parent는 shared option과 tick appearance를
`create*Ticks`에 전달하고, label appearance만 `create*Labels`에 전달한다.
Label은 먼저 생성된 tick configuration을 재사용한다.

Edit parent는 shared option이 있으면 tick을 먼저 수정한 뒤 label을 같은
count/values로 수정한다. Component appearance만 있으면 해당 leaf만 호출한다.
Scale ID 변경은 STEP11 edit 범위에서 제외한다.

## Action 분해

```text
createXAxisTicksAndLabels
├─ createXAxisTicks
└─ createXAxisLabels

editXAxisTicksAndLabels(shared values)
├─ editXAxisTicks
└─ editXAxisLabels
```

Rematerialization은 aggregate가 아니라 기존 leaf edit action을 각각 호출한다.

## 완료 조건

- Shared setting이 한 번만 입력되고 두 config가 일치한다.
- Parent trace 아래 실제 leaf action hierarchy가 남는다.
- 기존 leaf API는 독립적으로 유지된다.
- 대표 프로그램이 x/y aggregate 호출 두 개를 사용한다.
- 기존 고해상도 PNG가 유지된다.
