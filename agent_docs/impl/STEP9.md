# STEP 9 — Axis Tick Actions

## 목표

Resolved linear scale에서 nice tick을 계산하고 x/y tick line collection을
domain action으로 생성한다.

## 진행 상태

- [x] Nice tick과 explicit values
- [x] Immutable guide configuration
- [x] `createXAxisTicks` / `editXAxisTicks`
- [x] `createYAxisTicks` / `editYAxisTicks`
- [x] Scale·Canvas rematerialization
- [x] 대표 프로그램 primitive 교체
- [x] Unit, trace, immutability test
- [x] Acceptance 및 PNG render test
- [x] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? });
createYAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? });
```

기본값은 channel scale, x=`bottom`, y=`left`, count 5, length 6,
color `#64748b`, lineWidth 1이다. `count`와 `values`는 상호 배타적이다.
Count는 목표 개수이며 nice step 때문에 실제 개수와 다를 수 있다.

Tick configuration은 semantic이나 concrete graphic이 아닌 immutable
`guideConfigs`에 보존한다. `rematerializeScale`은 config가 있는 tick edit
action을 호출하여 value, collection length와 geometry를 다시 계산한다.

## 제외 범위

- Tick label, format, title, grid
- top/right position과 minor tick
- linear 이외의 position scale

## 완료 조건

- 사용자 코드에 tick position 계산이 남지 않는다.
- Count와 explicit values mode가 모두 작동한다.
- Scale·Canvas 변경 후 stale tick이 남지 않는다.
- 기존 고해상도 scatterplot이 유지된다.
