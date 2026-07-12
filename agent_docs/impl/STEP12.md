# STEP 12 — Axis Title Actions

## 목표

X/Y axis title의 semantic text와 concrete text graphic을 domain action으로
생성하고, `at`과 resolved scale로 축 방향 위치를 결정한다.

## 진행 상태

- [x] Title text inference와 validation
- [x] `at` validation과 위치 계산
- [x] Font/style validation과 immutable config
- [x] `createXAxisTitle` / `editXAxisTitle`
- [x] `createYAxisTitle` / `editYAxisTitle`
- [x] Scale·Canvas rematerialization
- [ ] 대표 프로그램 title primitive 제거
- [ ] Unit, trace, immutability test
- [ ] Acceptance 및 PNG render test
- [ ] 영어 사용자 문서
- [ ] 브라우저와 고해상도 PNG 확인

## API

```javascript
createXAxisTitle({ text?, scale?, position?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? });
createYAxisTitle({ text?, scale?, position?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? });
```

`at`은 `start`, `center`, `end` 또는 domain 내부 numeric value다. Text를
생략하면 연결된 단일 field를 추론한다. X 기본 offset/rotation은 42/0,
Y는 52/`-Math.PI / 2`다.

Semantic guide에는 scale/title을, placement와 appearance는 immutable
`guideConfigs.axis[channel].title`에 저장한다. Renderer는 final text graphic만
읽는다.

## 완료 조건

- Text inference와 categorical/numeric `at`이 작동한다.
- Scale·Canvas 변경 후 stale title geometry가 남지 않는다.
- 대표 프로그램의 raw create/edit graphics가 모두 제거된다.
- 기존 고해상도 PNG가 유지된다.
