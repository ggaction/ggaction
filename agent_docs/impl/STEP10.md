# STEP 10 — Axis Tick Label Actions

## 목표

X/Y tick value를 text label collection으로 materialize하고, 기존 tick
configuration을 기본 source로 공유한다.

## 진행 상태

- [x] Label/font/format validation
- [x] Tick configuration 공유
- [x] X/Y label geometry와 formatting
- [x] `createXAxisLabels` / `editXAxisLabels`
- [x] `createYAxisLabels` / `editYAxisLabels`
- [x] Scale·Canvas rematerialization
- [x] 대표 프로그램 primitive 교체
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [x] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxisLabels({ scale?, position?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? });
createYAxisLabels({ scale?, position?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? });
```

`format`은 `"auto"` 또는 `{ decimals }`를 지원한다. X는 bottom/offset 18,
Y는 left/offset 12가 기본값이다. Existing tick config가 있으면 count/values를
재사용하며 명시적인 label 설정이 충돌하면 error다.

## 완료 조건

- Tick label value, position과 string을 action이 계산한다.
- Scale·Canvas 변경 후 stale label이 남지 않는다.
- 대표 프로그램에서 x/y label primitive와 helper dependency가 사라진다.
