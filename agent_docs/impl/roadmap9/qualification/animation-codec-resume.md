# Animation private codec 작업 중단·재개 기록

사용자가 2026-11-01 “일단 wrap하고 멈추자”라고 명시하여 중단했고,
2026-11-02 “재개하자”로 중단을 해제했다. 아래 중단 시점 증거와 미완료 구분은 보존한다.

## 검증된 checkpoint

- 원 안정 branch `codex/roadmap9-animation-capacity`: `4e399b325` partition exact-owned equality,
  `979065bbd` capacity/schema 진단 제안까지 commit/push 완료. 이 WT는 보존했다.
- 중단 시점 WT `/Users/hyeonjeon/.codex/worktrees/roadmap9-animation-codec/ggactionnewbrand`.
  branch `codex/roadmap9-animation-codec`, HEAD `6d3d0710ea300761aaf5a20931649659fab4120c`.
  root `93d1c1109`에서 설계 `9ff90cc6b`와 partition `6d3d0710e`를 이식해 push한 기준이다.
  generated docs 충돌은 이 기준에서 다시 생성했고 package cap은 root 값을 보존했다.

## 미검증 WIP — 완료 commit하지 않음

이 절 이하의 상태는 2026-11-01 중단 시점 기록이다. 2026-11-02 재개 후 private 제품 경로의
원100000 point 및10000 partition의 native/offline/sample/rebase 전수와 owning748/critical11개,
동일 archive3Node 소비자, capacity14/renderer1 및 문서 검증을 마쳤다. 현재 정책·최종 실측·정확한
검증 범위는 [private codec 기록](animation-codec-private.md)에 둔다. 공개v4는 아직 연결하지
않았고 전체 SLO/retained heap 완료로 세지 않는다.

- 수정: `src/animation/envelopeCodec.js` (기존 guard walk를 private 재사용하고 metrics 반환)
- 신규: `src/animation/columnCodec.js` (private closed lossless shape별 column/scalar runs)
- 신규: `test/unit/animation/column-codec.test.js`
- 이 재개 기록 자체도 미커밋이다. 공개 options/plan4/새 global limit은 연결하지 않았다.
- root는 remainingApproval 범위로 flat options/v4 방향, mixed null/undefined/hole shape,
  shape별 dense columns와 정확 scalar runs를 채택했다. 공개 연결은 full100k 전체
  payload·semantic restore·sample/rebase 및 현재 byte/work 한도 검증 뒤에만 가능하다.

## 완료된 부분 실측과 한계

- focused 15/15 통과: `.artifacts/animation-columns/focused.log` 및
  `.artifacts/checks/suite-unit.json`. 전체 owning/coverage/package 검증은 아직 안 했다.
- Node24 원100000 native 실제 export payload 전체가 private codec으로 deepEqual 왕복:
  logical7600057, descriptor7600056/cell7600004, decoded604540/encoded608452,
  envelope33703285B. 원 raw 행/좌표/ID/scale/family state를 줄이지 않았다.
  receipt `.artifacts/animation-capacity-audit/points-100000-without-rebase.json`.
  이 receipt는 이번 후속 진단의 partial 파일과 혼동하지 말아야 한다.
- Node24 진단 native prepare14355ms/sample2716ms; 기존 Node22의151초/113초와 구별한다.
  구형 guard를 임시 완화한 진단 번들의 결과이며 제품 capacity/SLO 완료가 아니다.
- full1000 sampled rebase에서 logical101086을 관찰해100k의10M expansion 경계에
  우려가 있었다. 정리 직전 자연 종료한 기존 진단 log에는 실제100k rebase
  payload logical10100086과 private codec의10M resource-limit 거부가 남았다.
  `.artifacts/animation-capacity-audit/points-100000-with-rebase.json` 참조.
  native rebase 단발11909ms였지만 offline/private roundtrip은 이 거부 때문에 미완료다.
  한도나 state를 줄여 통과시키지 않는다. 재개 시 root와 정확한 대안을 정리한다.
- scalar runs/count overflow/ref/shape/key-order/absent/undefined/hole의 작은 회귀는
  존재하나 critical coverage100 functions, worst-case bytes/descriptors/cells/expansion,
  source-free packed 소비자와 full100k native/offline/sample/rebase는 미완료다.

## 프로세스 정리

- 본인 Node24 진단 PID69728 (`audit-with-rebase.mjs points100000`)이 최초 확인 때 실행
  중이었으나 SIGTERM 직전에 자연 종료하여 kill은 no such process를 반환했다.
  후속 ps에서 본인 진단/테스트 프로세스가 없음을 확인했다. 최종 log는 보존하며
  중단 요청 뒤 새 검증이나 완료 판정을 수행하지 않았다.
- focused 테스트는 이미 종료했고 추가 실행하지 않았다.
- 본인 외 다른 WT/서비스/프로세스는 건드리지 않았다.

## 재개 시 순서

1. 현재 git diff와 ignored `.artifacts/animation-columns/` scripts/logs 및 receipt를 확인한다.
2. private 코드 보안·closed schema·의미 검증 owner 연결을 검토하고 독립 literal oracle,
   byte/physical/logical bounds를 보강한다. 일반 v3/literal 회계는 유지한다.
3. 원100k 전체 sampled/rebase payload의 실제 논리 count를 먼저 측정한다. 현재10M을
   넘으면 지원이라고 주장하지 않고 root와 정확한 resource-aware 정책을 정리한다.
4. 전체 family/timeline/style/clips/ID 포함 실제 의미 복원, coverage/owning/패키지 검증을
   통과한 뒤 private checkpoint를 commit/push한다. 그 후 공개v4/options에 연결한다.
