# Roadmap 4 Phase 15 — Public docs verification and release readiness

## 진행 상태

- [x] Phase 14 completed와 Phase 15 진입 조건 확인
- [x] D-001 sticky header/fragment baseline 감사
- [x] Public docs와 release-readiness 검증 범위 설계
- [x] D-001 CSS/TOC/browser regression 구현
- [x] Runtime stabilization과 8-facade public docs 누적 감사
- [x] P15-A public docs preview와 사용자 승인
- [ ] Release-readiness report와 누적 검증
- [ ] P15-Exit 사용자 승인

## 목표

새 runtime capability를 추가하지 않고 Phase 1~14의 Current public surface가 README, task docs, generated
references, examples, package declarations와 built site에서 일치함을 증명한다. D-001 deep-link obstruction을
수정하고 release 가능한 상태를 checksum까지 기록하되 version/tag/publish/deploy는 수행하지 않는다.

## D-001 계약

- Sticky topbar와 heading fragment offset은 하나의 CSS custom property chain을 공유한다.
- Direct URL hash, heading permalink와 page TOC link가 desktop/mobile의 h2/h3를 topbar 아래에 둔다.
- Offset은 topbar 높이를 하드코딩한 중복 pixel 값이 아니며 TOC current-section 계산도 computed offset을 사용한다.
- JavaScript disabled navigation과 ordinary document flow는 유지한다.

## Public docs 감사 범위

1. Point materialized default radius `3`, layered rule datum/full-span precedence와 direct quantitative line의
   x/y 양방향 authoring 결과
2. 8개 Basic Chart facade의 shortest call, field shorthand, inference, guide lifecycle와 edit handoff
3. Heatmap pre-gridded/binned mode, observed-row-only cells, color ownership와 text overlay escape hatch
4. Current action signatures, formal values, errors, lifecycle/non-goals와 package entry-point classification
5. Canonical examples/gallery, generated signatures/capabilities/action metadata/reference/search/images/LLM bundle

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단 |
| --- | --- | --- | --- |
| P15-A | approved | D-001 desktop/mobile h2/h3 behavior, docs audit changes와 built preview | release-readiness report |
| P15-Exit | planned | Current commit/version/tarball checksum과 cumulative verification | Phase 15 completed |

모든 Gate는 hard pause다.

## 실행 순서

1. [STEP1](./STEP1.md) — baseline과 누적 docs matrix
2. [STEP2](./STEP2.md) — D-001 shared offset와 browser regression
3. [STEP3](./STEP3.md) — public content/generated reference 감사
4. [STEP4](./STEP4.md) — built preview와 P15-A
5. [STEP5](./STEP5.md) — release-readiness report와 P15-Exit

## Non-goals

- Runtime action, semantic/graphic schema, renderer 또는 chart visual 변경
- Version bump, release tag, npm publish, PR 또는 GitHub Pages deployment
- Historical roadmap 문서를 현재 계약에 맞춰 다시 쓰기
- Public docs에 private implementation helper나 roadmap phase identity 노출
