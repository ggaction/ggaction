# Radar 차원 편집 제안

## 진행 상태

- [x] 기존 공개 경로 검증: `editFoldData`는 차트 소유 데이터의 직접 편집을 거부한다.
- [x] 기존 `encodeTheta`/`encodeR`로 원자료 필드를 지정하면 차원 접기 의미가 사라지는 문제 재현.
- [x] 공개 API 승인: 2026-10-20 사용자가 구체적인 API 제안에 “이 API로 추가해”라고 답했다.
- [x] 구현, 문서, 타입, inspection, 회귀 검증.

## Gate

상태: `approved`. 제안 증거 revision: `533164c537d2819a47e6db6d92383d5c815b2bca`.
기존 차트 생성이나 시각적 디자인을 바꾸는 제안이 아니라, 기존 Radar의 차원 목록과 순서를
원자적으로 편집하는 계약이다. 다른 옵션 감사 버그 수정은 이 결정과 독립적으로 진행한다.

## 제안 API

```js
// 기존 wide radar가 이미 생성되어 있는 프로그램의 이어지는 호출.
program.editRadarPlot({
  target: "plot",
  wide: { fields: ["midmean", "ci1", "ci0"] }
});
```

- `target`: 기존 Radar 소유자. 생략은 기존 current/unique target 추론 규칙을 사용한다.
- `wide.fields`: 서로 다른 수치형 원자료 필드 2개 이상. 순서가 theta 차원 순서를 결정한다.
- 이 호출은 기존 fold 데이터, theta 순서/축, radius 도메인, 닫힌 선을 함께 재생성한다.
- 기존 groupBy, 색상, 스타일과 가이드 의도를 보존한다.
- 존재하지 않는 필드, 중복 필드, 2개 미만 차원, Radar가 아닌 대상은 원자적으로 거부한다.
- 기존 long-form Radar는 이 최소 wide 편집 계약의 대상이 아니다.
- 한 옵션 카드가 이 공개 함수 한 번을 호출한다.

## 확인할 증거와 호환성

기존 생성 함수의 wide 입력/소유 관계를 재사용한다. semantic state와 backend-neutral
graphicSpec 경계를 추가하지 않는다. 생성 후 편집과 최종 fields로 직접 생성한 차원의
기하/통계 동등성, 불변성, 실패 원자성, 코드/worker/persistence 재생, 가이드/색상 보존을
회귀 테스트로 검증한다. 타입, action inventory, inspection, 현재 계약과 공개 문서를
같은 변경으로 갱신한다. 새 API는 additive이며 기존 호출은 유지한다.

## 구현 검증

- `test/unit/actions/charts/radar-edit.test.js`: 차원 목록·순서 변경, 직접 생성과의
  결과 동등성, 가이드·색상·닫힌 경로, 저장/복원, 불변성과 실패 원자성.
- `test/contracts/radar-facade-types.test.js`: 공개 타입의 허용·거부 입력.
- Autocomplete의 `test/owned-chart-controls.test.js` 및 실제 브라우저:
  선택한 Color로 Radar 생성 후 차원 편집 카드를 Apply하는 흐름을 확인했다.
- `COMPLETE_CHARTS.md`, action inventory, 관계/카드, inspection descriptor,
  공개 참조와 타입을 같은 구현 체크포인트에서 갱신했다.
