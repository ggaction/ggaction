# v0.0.25: 결과 추종 overlay와 공유 scale 병치

## 진행 상태

- [x] 사용자 승인: 2026-10-24의 상세 계획 뒤 사용자가 “좋아. 그렇게 해서 … v0.0.25 … transition … autocomplete”라고 실행을 지시함.
- [x] v0.0.24(fd5c4073)까지 기존 feature branch를 fast-forward하여 이전 기능을 보존함.
- [ ] 기존 라이브러리 및 앱 baseline 검증.
- [x] 새 시각적 결과의 primitive와 실행 가능한 검증 패키지.
- [x] 시각적 결과 확인 후 overlay 및 병치 공개 action 구현.
- [x] 타입·inspection·Current 계약·영문 문서·생성 파일 동기화.
- [ ] 새 코퍼스 전체 수집, 구조 추출, 모델 재학습.
- [ ] 대상별 추천, All/패널/overlay 선택, 네 방향 +, 코드/History/transition 연결.
- [ ] release 검증 및 commit/push 원격 일치 확인.

## 승인 범위

API/구조 Gate: approved. 앞선 상세 계획의 createOverlay/editOverlay,
createAdjacentPlot/editCompositionScales, 기존 concat 확장, 명시적 target selector,
복수 대상 원자적 편집, 공유 domain과 plot 정렬, 명시적 rematerialization 계획을 재사용한다.
사용자는 상단바 All/차트/overlay selector와 차트 네 가장자리의 + UI를 추가 승인했다.
기존 semanticSpec/graphicSpec/renderer 경계 및 immutable 프로그램을 유지한다.

Visual Gate: approved. 사용자가 두 렌더에 대해 “이 기준으로 진행”이라고 명시적으로 답변했다.
검토 revision: 9e4d6d6d7b03ea5bbadde894b7a55fbe360a99e4.
새 mark primitive를 도입하지 않지만 결과 추종 bar+line 및 공유 Y
병치의 대표 렌더를 test/gates/linked-composition에서 준비해 명시적 확인을 받는다.
이 Gate는 해당 공개 chart flow 구현에만 적용하며 upstream 통합·코퍼스·범위 선택
기반 작업은 계속한다. 패키지 게시·사이트 배포의 정확한 릴리스 revision은 최종 검증 후 확정한다.

## 시각적 검토 증거

- 실행 원본·제안 호출: `test/gates/linked-composition/primitive.program.js`의 variants.
- focused: `node --test test/gates/linked-composition/primitive.test.js` 2/2 통과.
- 렌더: `node test/gates/linked-composition/png.render.js`; 두 PNG의 plot ink 검사.
- 출력: `.artifacts/test/png/review/linked-composition/{bar-line,shared-y}/primitive.png`.
- 의미: 첫 그림은 집계 Bar 중심의 값 끝점을 Line이 연결한다. 두 번째 그림은
  두 panel의 Y domain과 plot 상하 위치가 같다. 아직 source-follow/shared-domain
  동적 갱신은 구현하지 않은 기존 primitive 기준이며 새 API가 이미 실행된다고 주장하지 않는다.
- upstream의 library unit와 앱 전체 baseline은 별도 실행 중이며 API Gate 증거와 구분한다.

## 체크포인트 검증

변경 단계: 영향을 받는 numerical/geometry/unit/contract 테스트와 타입 및 inspection.
통합 단계: library unit/contracts, 앱 전체 테스트, 코퍼스 전체 accepted programs,
Canvas/transition 브라우저, 실행 가능한 코드·저장복원·내보내기.
릴리스 단계: package consumer/boundary, 문서 생성 및 build, 전체 필수 suite와 성능
반복 편집(20/50/100 actions), 원격 commit 일치. 실패를 제외하거나 완료로 표시하지 않는다.

### 결과 추종 overlay 체크포인트

- `createOverlay` / `editOverlay`의 공개 타입·inspection·계약·영문 문서·실행 예제를 구현했다.
- source의 최종 bar/bin/stack/group/point/line/area geometry를 사용한다. 원본 변경,
  facet, 색상 독립 편집, geometry 잠금, 명시적 detach, 저장·복원 경로를 검증했다.
- 승인된 primitive의 stable 위치는 `test/charts/linked-composition/`이다.
  공개 overlay와 primitive는 graphicSpec/SVG 및 decoded PNG pixels가 일치한다.
- library unit 전체 4,261/4,261 통과. contracts 656개 중 두 inventory/selector 문제를 수정하고
  해당 파일의 focused 검사를 다시 통과했다. overlay 추가 타입 검사 2/2, edge 검사 19/19,
  실제 Chromium 공개 Canvas 예제 1/1 통과. docs:generate 완료.
- Tick 수치 색상 회귀를 함께 발견·수정했고 관련 17개 기존 검사도 통과했다.
- 앱 v0.0.24 baseline은 369개 중 23개 실패하며 주로 자동 Canvas centering/replay 관련이다.
  앱 통합 단계에서 실제 replay와 저장 결과를 검증하여 해결할 예정이며 완료로 간주하지 않는다.
- 공유 축 병치, 대상 selector, 코퍼스 갱신, 앱/transition 연결 및 릴리스 검증은 아직 진행 전이다.

## Shared composition implementation checkpoint

- Added createAdjacentPlot and editCompositionScales, explicit Full action target selectors and atomic target lists. Native constructor options remain closed and Basic/primitives retain their original contracts. Adjacent views may select a prepared materialized dataset and receive an independent snapshot.
- Shared scale unions are derived from canonical children, never fed back as authored domains. Compatible mapping/measurement checks and final-state batch validation prevent partial edits. Plot alignment rematerializes unit, nested concat and facet snapshots without stretching glyphs/text.
- Added the approved shared-adjacent public example and exact primitive/SVG/Canvas pixel equivalence; Chromium example rendering passed.
- Unit suite: 4,275/4,275 passed. New 14-case composition suite covers four edges, domains growing/shrinking, ordinal union, independent reset, unequal margins, nested/faceted children, explicit data/theme inheritance, target atomicity and persistence.
- Full contract run found exact-signature/inventory expectations that needed the new public target grammar, plus an architectural import cycle. The cycle was removed by reading concrete facet placements; source-boundary checks pass. All affected focused contracts and strict TypeScript declaration compilation pass. Nested-scale witnesses execute the new constructor paths as actual adjacent charts, as well as the existing 699 native cases.
- Canonical package: 634 entries, 921,682 compressed bytes and 4,385,119 uncompressed bytes. Tight budgets updated for five composition/target modules and typed metadata.
- Documentation generation and executable examples are synchronized. Exact Git-linked source/provenance checks require the checkpoint commit, then regenerated immutable source links.
- App target toolbar, edge addition UI, full refreshed corpus/model training, transition integration and v0.0.25 release preparation remain in the authorized implementation scope.
