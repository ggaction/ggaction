# Roadmap 2 — Phase 9 Step 12: Documentation and Closeout

## 목표

Mark selection/filter/highlight를 package, docs, catalog, architecture와 Roadmap gallery에 통합하고 Phase 9을 종료한다.

## 진행 상태

- [x] Canonical examples and typed package surface
- [x] Three approved primitive/public/reference/render slices and call chains
- [x] `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark` API/reference/tutorial docs
- [x] Selector value/applicability/error tables and concise LLM routing
- [x] Current contract promotion and generated action catalog freshness
- [x] Phase 9 inventory closeout contract
- [x] Second Architecture selection/materialization ownership update
- [x] GOAL/ROADMAP statuses and artifact gallery
- [x] Full test, coverage, PNG, package and generated-doc checks
- [x] Built Jekyll desktop/mobile browser checks
- [x] Conceptual commits/pushes and remote CI/Pages completion

## Closeout contract

Every Phase 9 direct action and `mark-item-selection-grammar` must be Current or intentionally removed. `selectRows`
must not remain a public Planned action, and singular `filterMark` must not remain in the current public surface.

## 완료 조건

Implementation, types, examples, exact pixels, public docs, architecture and machine-readable inventory describe one
selection system and every local/remote quality gate passes.

## 구현 결과

- Grouped maximum point, tallest histogram stack와 line-series highlight를 canonical browser example과 공개
  tutorial로 통합했다. 세 slice는 primitive/public/reference/render pair와 목표 call chain을 계속 보존한다.
- Selector source/operator, mark별 style applicability, empty/error behavior를 공개 API reference와 LLM routing에
  반영했다.
- `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark`와 `mark-item-selection-grammar`를 Current로
  닫고, `selectRows`와 singular `filterMark`가 공개 inventory에 남지 않음을 executable contract로 고정했다.
- Second Architecture에 stable item identity, clean-baseline highlight rematerialization, concrete default 복원과
  independent assignment ownership을 기록했다.

## 검증 결과

- Local: 965 tests, coverage floors, 335 render checks와 67-variant gallery가 통과했다.
- Canonical browser example: desktop 1280px와 mobile 390px에서 세 Canvas, overflow와 console/page error를
  검증했다.
- [Remote CI](https://github.com/hj-n/ggaction/actions/runs/29477366771): tests, coverage, PNG regression,
  Jekyll build, built-doc checks와 desktop/mobile browser checks가 모두 통과했다.
- [GitHub Pages deployment](https://github.com/hj-n/ggaction/actions/runs/29477366069): build와 deploy가 모두
  통과했다.
