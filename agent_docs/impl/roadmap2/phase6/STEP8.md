# Roadmap 2 — Phase 6 Step 8: Integration and Closeout

## 목표

Cars error-bar vertical slice를 public package, documentation, gallery and action catalog에 통합하고 Phase 6를
machine-verifiable하게 종료한다.

## 진행 상태

- [x] Canonical `examples/cars-error-bar/program.js`
- [x] Primitive/public/reference/chart/render vertical slice tests
- [x] Unit, contract, package/declaration and source-boundary coverage
- [x] Tutorial, API/reference, navigation and LLM docs
- [x] Generated docs images, action catalog and Roadmap 2 gallery
- [x] Phase 6 Planned actions/capabilities promoted or intentionally retained
- [x] Phase closeout contract with no stale Phase 6 inventory
- [x] Full test, coverage, render and built docs/browser verification
- [x] Desktop/mobile gallery visual verification
- [ ] GOAL/ROADMAP status, final conceptual commit and push
- [ ] Remote CI and Pages completion

## Closeout evidence

- `examples/cars-error-bar/program.js`가 canonical vertical flow와 encoded-layer inference flow를 소유하고,
  chart tests와 generated documentation image가 같은 public program을 사용한다.
- Six approved variants는 primitive/public semantic state, concrete graphics, drawing order, Canvas calls와
  decoded pixels가 exact match다. 각 variant는 실행 가능한 target call chain과 두 PNG를 함께 보존한다.
- Independent interval fixtures가 Student-t summary와 containment를 검증하고 focused action tests가
  vertical/horizontal, statistical/explicit, cap/style, ambiguity, immutability와 rematerialization을 고정한다.
- `ACTION_INDEX.json`에는 Phase 6 direct action이나 capability가 Planned로 남아 있지 않다.
  `test/contracts/action-catalog.test.js`가 이 completed boundary를 기계적으로 검증한다.
- Tutorial, API/reference, supported-features, LLM bundle, action catalog와 documentation image manifest는
  canonical generator로 갱신되었고 source documentation contract가 통과했다.
- Roadmap 2 gallery는 55 variants를 재생성했다. Cars Error Bar의 6 variants와 12 images를 Chromium에서
  1440×900과 390×844로 확인했으며 image loading, call-chain/status, horizontal overflow, responsive
  two-column→single-column layout와 console/page error 검사가 통과했다.
- Local verification: 818 tests, 275 render tests, line 95.13%, branch 90.93%, function 98.68% coverage.
- Stored schema와 materialization boundary 변경은 Step 7에서 `SECOND_ARCHITECTURE.md`에 반영했다.
- Final closeout commit의 remote CI와 Pages evidence는 push 후 기록한다.

## 완료 조건

Phase 6 behavior is public only where implemented, all six visual pairs are reproducible, no Phase 6 capability is
silently left in Planned, and local/remote quality gates pass.
