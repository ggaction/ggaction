# Roadmap 5 Phase 0 — Capability Contract Gate

## 목표

여섯 capability의 정확한 의미, public API, lifecycle, initial limit, representative chart와 Phase 순서를 runtime
구현 전에 하나의 승인 가능한 package로 확정한다.

쉽게 말하면 Phase 0은 코드를 만드는 단계가 아니라 다음 질문의 답을 먼저 고정하는 단계다.

- 시간의 “한 달”은 어느 시각대를 기준으로 자르는가?
- 범주 순서는 일회성 scale 설정인가, 차트가 기억하는 의미인가?
- moving window의 3칸은 시간 3일인가, 정렬된 행 3개인가?
- Tick은 plot 가장자리의 rug인가, x/y 중심을 가진 작은 선분인가?
- Angle 30은 30° 그대로인가, 데이터 범위를 0~360°로 다시 매핑하는가?
- Center stack은 어떤 mark와 음수 값까지 책임지는가?

## 진행 상태

- [x] Current source, declarations와 exact contracts 확인
- [x] 여섯 capability와 명시적 non-goal 분리
- [x] Public action/extension/type proposal 작성
- [x] Representative chart contract 네 개 작성
- [x] Phase dependency와 Approval Gate 작성
- [x] Contract/unit/package baseline 실행
- [x] R5-P0-A review package commit/push — `9c64e13c`
- [ ] 사용자 explicit approval
- [ ] Approved subset을 current Planned inventory로 승격

## Gate R5-P0-A

### 승인 대상

- UTC bucket-start `createTimeUnitData`
- Semantic `orderCategories`와 `removeCategoryOrder`
- Row-frame `movingMean`/`movingSum`
- Complete x/y centered Tick create/edit lifecycle
- Point/Tick direct-degree `encodeAngle`와 `removeEncoding({ channel: "angle" })`
- Non-negative area-only `stack/layout: "center"`
- Phase 1~6 순서, visual-first Gate와 explicit non-goal

Exact machine-readable 목록은 [`../PROPOSALS.json`](../PROPOSALS.json), 사람이 검토할 요약은
[`GATE_A.md`](./GATE_A.md)가 소유한다.

### Required evidence

- Current baseline: `npm run test:contracts`, `npm run test:unit`, `npm run test:package`
- Proposal가 `ACTION_INDEX.json` Planned/Current에 들어가지 않았다는 비교
- Current temporal, window, category-domain, point geometry와 area stack 근거
- 네 chart contract의 public flow, action hierarchy, stored-result와 non-goal
- Compatibility, architecture/state/materialization 영향
- Remote checkpoint

### 승인 전 차단

- Runtime action, grammar 또는 materializer 변경
- Public declaration과 package surface 변경
- `ACTION_INDEX.json` Planned/Current 승격
- Current contract/public docs 변경
- Phase 1 이후 구현

## Exit

사용자가 exact proposal을 명시적으로 승인하면 approved checkpoint를 기록하고 accepted subset만 Planned inventory로
승격한다. 그 뒤 Phase 1의 `createTimeUnitData` 구현을 시작한다.
