# Phase 2 — 복합 경로와 공통 geometry

상태: **STEP-010–012 제품 통합과 AT-11/12 검증 완료**. 승인된 D1–D6를 구현했다.
전체 확장 로드맵은 계속 열려 있으며 다음 우선 작업은 STEP-013이다.

## 승인과 완료 범위

사용자 “네” (2026-10-27)가 검토 commit `e0fc08c8bd339e6c57ff2154adb36bfefc0a77d4`의
D1–D6와 여섯 시각 출력을 승인했다. [G-PATH](G-PATH.json)에 정확한 질문과 응답을 보존한다.
[DESIGN](DESIGN.md)은 승인 당시 원문과 hash를 유지한다.

- M/L/C/Z 복합 topology, nonzero/evenodd fill rule, path owner clip과 불변 편집
- exact cubic extrema, adaptive flatten·arc·winding·distance 및 subpath별 stroke/clip bounds
- SVG·Canvas·PNG·PDF 출력과 Canvas/SVG JSON scene 재생
- editable4/graphic1 저장 및 구버전1–3의 기존 경로 호환성·신규 grammar 거부
- declarations, current PRIMITIVES 계약, public extension 문서, 생성 예제·이미지·패키지 소비자

새 semantic mark family는 이 Phase의 범위가 아니다. Hit testing·animation runtime 연동은
원안 STEP-047 이후에 남는다. Geometry 제공과 후속 runtime 연동을 구별한
[consumer matrix](consumers.json)에 모든 항목을 명시했다.

## 최종 통합 검증

제품·테스트 기준 commit은 `53f251a336b1a0e3764fed115d9ec4c35d8cfdfc`다.
모든 필수 receipt는 실행 시작·종료가 같은 clean commit임을 확인했다.
이후 완료 기록 commit은 제품·테스트 source를 바꾸지 않는다.

| 검사 | 결과 |
|---|---|
| 동일 commit의 전체 CI | 20 jobs passed; Node 20/22/24, macOS/Windows, Firefox/WebKit, 7개 실데이터 shard와 최종 집계 포함 |
| CI 누적 source coverage | 6,392 tests: 6,391 passed, 1 host-font skip, 0 failed; 1,051 files |
| CI에서 생략된 native font fallback의 로컬 보완 | 3 passed, 0 skipped, 0 failed; 한글 PNG와 PDF vector text 포함 |
| 실데이터 shard1 / shard2 | 178 / 97 passed; 29 files의 완전하고 겹치지 않는 분할 |
| Browser | 297 passed, 0 failed; 35 files |
| Render 및 전체 gallery | 272 passed, 0 failed; 108 files |
| Installed package | 187 consumer cases passed |
| Package artifact / generated metadata | exit 0 / exit 0 |
| Documentation | source 158 passed; built 150 pages, selective artifacts 1,175개 및 desktop/mobile 검사 통과 |

Coverage는 line **95.90%**, branch **93.46%**, function **98.74%**다.
기존 global 및 critical family/file 기준을 모두 유지했다. 로컬 원시 계측 파일이 storage 한도를
넘어 같은 commit의 [CI coverage job](https://github.com/ggaction/ggaction/actions/runs/40582876460/job/122466957559)을 사용했다.
`ci-coverage`는 성공한 job·artifact의 commit, ZIP digest, clean source receipt, 전체 test discovery를
대조하고 원본 보고서에 현재 coverage 정책을 다시 적용했다. CI의 한글 font skip은 같은 commit의
로컬 검사에서 실제로 실행해 통과했으며 skip을 passed로 바꾸어 기록하지 않았다.
원본 ZIP·receipt·metrics·report·조회 identity와 검증 코드는 integration-evidence에 보존한다.
전체 CI의 성공 상태는 [workflow 조회 기록](integration-evidence/ci-workflow.json)에 보존했다.
누적 coverage 실행 환경은 Node `v22.23.3` Linux x64이며, 로컬 artifact 검증 환경은 Node `v22.23.1`이다.

[통합 집계](integration-results.json), [완료 검증](completion-validation.json),
[공개 출력 검증](integration-evidence/compound-render-results.json),
[실데이터 분할 증거](integration-evidence/realistic-partitions.json)를 확인할 수 있다.
STEP별 완료 증거는 [010](progress/STEP-010.json), [011](progress/STEP-011.json), [012](progress/STEP-012.json)이다.
완료 범위에 Planned action이나 미해결 consumer는 없다.

## 재현과 후속 작업

안정 예제는 `examples/compound-path/`, 제품 검사는 `test/charts/compound-path/`가 소유한다.
여섯 변형의 public/primitive exact pixels, 독립 native reference, 네 backend와 두 scene 재생을 검증한다.
출력은 `.artifacts/test/png/charts/path-geometry/compound-path/`에 재생성된다.

```sh
node scripts/run-tests.js render charts/compound-path/png.render.js charts/compound-path/backends.render.js
node scripts/verification-evidence.js agent_docs/impl/roadmap9/execution-plan.json agent_docs/impl/roadmap9/phase{0,1,2}/progress/*.json
```

실데이터 입력은 canonical corpus manifest의 hash로 검증한 50개 CSV다. 새 checkout에서는
`npm run datasets:sync` 뒤 두 `npm run test:realistic -- --shard=1/2`, `--shard=2/2`를 실행한다.
이번 로컬 실행은 기존 검증된 캐시를 `GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT`로 지정했다.
실행계획상 STEP-001–012가 complete이며 STEP-013과 STEP-017이 ready다.
다음 우선 순서는 STEP-013의 안전한 expression AST와 typed function registry 계약 검토다.

## 승인 전 검토 준비 이력

검토 code commit은 `ebc63915af5837d7a7500bae420500b4f5c2d68c`였고, 그 시점에
unit15·gate2·contract36·누적6,360·native render1 및 package/metadata 검사가 통과했다.
이 검토 준비를 제품 완료 증거로 재사용하지 않았다.
[검토 준비 집계](evidence/summary.json), [preparation](preparation.json),
[당시 검증](preparation-validation.json), [검토 계획](review-plan.json)을 역사 자료로 보존한다.
승인된 slice는 stable chart owner로 옮겼고 활성 Gate subtree와 review 이미지는 제거했다.
