# STEP-070 현재 프레임과 세션 통합

## 진행 상태

- [x] 기존 사용자 전체 승인과 remainingApproval 재사용, 원 카드의 후행 의무 유지
- [x] 공개 animation source4d7664861 + 최종 caf731f73 및 private hit13be5912f 병합
- [x] 작은 geometry의 반복 중단에서 이전 계획 연쇄가 256단계를 넘는 실제 실패 재현
- [x] Sample 의미·native 출처 평탄화와 100/1000회 public interruption/hit 검증
- [ ] 세션 authentic frame command, atomic hit/keyboard/current-frame publication
- [ ] current native final-item 교집합 activation과 frame transient asset lease
- [ ] source/update/gesture/cancel/destroy/reentry 및 100/1000회 focus/lease 검증
- [ ] 실제 Canvas/SVG 현재 프레임, reduced motion, source-free 설치 교차
- [ ] 원 카드 AT34/65/80/81/82의 나머지 partition/routes/Geo/LOD/worker 통합

원본은 [STEP-070 카드](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-070-cross-feature-integration.ko.md)다.
계산 checkpoint나 통과한 일부 사례를 카드·전체077 완료로 표시하지 않는다.

## D0 — 반복 중단의 유한 출처

Root의 명시 지시와 기존 포괄 승인을 재사용한다. 공개 옵션·frame 모양·저장 schema는
바꾸지 않는다. 정확한 현재 동작은 Current ANIMATION이 소유한다.

초기 재현은 keyed continuous point 한 개를 1000회 중단한다. 실제 geometry는 Canvas와
circle 두 node이고 모든 값이 finite지만 기존 hit는 과거 sample→plan 연쇄를 따라가다
256 ancestry 제한에 실패했다. 처음 unkeyed fixture는 실제 weighted clip 제한에 먼저
걸렸으므로 그 로그도 분리 보존한다. 서로 다른 원인이다.

`frameProvenance`는 이전 plan 대신 작은 plan identity token을 보존한다. `frameEndpoint`가
sample 시점에 확정한 identity/background/semantic value와 node별 exact native program/index,
weighted source별 metric 출처를 저장한다. `exactFrames`가 현재 시작 frame을 보존해도 그 frame은
이전 plan을 가리키지 않는다. Native hit는 평탄한 source를 소비하며 누적 preparation work를
한 budget으로 검사한다. 서로 같은 값의 다른 program은 원 program의 권한을 얻지 않는다.

Root와 확인한 권한 범위는 현재 표시 출처 및 직접 native from/to다. 이전의 모든 조상 program을
끝없이 저장하지 않는다. 실제 weighted source가 남는 경우 그 source의 원 native metric은 유지한다.
Offline 복원에는 native program 권한이 없으므로 현재 이 경로의 hit는 명시 거부한다.
별도 resolver나 값/ID 추정으로 권한을 만들어내지 않는다.

100/1000회 공개 player 중단은 매번 시작 객체 동일성, 실제 위치의 독립 재귀 expected,
finite geometry, 단일 scoped hit와 row resource 출처를 검사한다. 이전 program 권한 제거,
가짜 frame/동일값 다른 program/오프라인 frame 거부, 반복 이후 export/restore, dispose 이후
callback0도 포함한다. 실제 session focus/asset lease 검증은 D 후속으로 남아 있다.

현재 증거는 `frame-retention-evidence/`에 고정한다. 새 테스트는 runtime에 roadmap을 import하지
않으며 `test/unit/animation/retention.test.js`와 source-free consumer가 durable owner다.
