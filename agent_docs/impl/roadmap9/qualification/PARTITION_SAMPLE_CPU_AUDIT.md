# Partition 프레임의 반복 검사와 임시 좌표 할당

## 진행 상태

- [x] 현재 합산 source `4e1221058`의 원 1k size class CPU 표본
- [x] 1,000개 cell 전체 좌표·닫힌 path·semantic decision 검산
- [ ] 같은 호출에서 고정 frame/kernel 검사를 재사용하는 구체 후보
- [ ] 후보 오류·수학·tessellation·guard·불변성 동등성 및 제품 검증
- [ ] 합산 archive의 원 10k 기능·33ms preview·300ms layout·P95 검증

이 기록은 기존 [remainingApproval](../AUTHORIZATION.json#remainingApproval) 범위의 성능 원인 조사다.
새 승인 Gate나 공개 API/schema 제안이 아니며 제품 source 변경은 없다. Point/Geo 작업이
끝날 때까지 Partition을 잊지 않도록 현재 남은 실행 경로를 구체화한다.

## 실제 측정 경계

[profile.mjs](partition-sample-audit-evidence/profile.mjs)는 canonical native workload와 같은
root 포함 1,000-node star hierarchy 및 Canvas 폭400→600의 공개 plan/sample을 실행한다.
Node22 CPU profiler에서 완전한 중간 frame을10회 관측하고 마지막 frame의 모든 cell
꼭짓점과1,000개 partition decision을 독립 식으로 검산했다. 원 입력 hash, 실행한 source
hash, raw CPU profile은 [증거 폴더](partition-sample-audit-evidence/)에 보존한다.
재현 runner는 source hash를 먼저 검산하며 선택적인 첫 인자로 출력 directory를 받는다.
생략하면 `.artifacts/partition-sample-audit`에 쓰고 동봉된 증거를 덮어쓰지 않는다.

동시에 다른 기능 검사가 실행됐고 profiler overhead도 있으므로 **최종 시간/P95/SLO 자격이
아니다**. raw 10회는101–193ms이며 최종 원 workload의 warmup5/30회를 대신하지 않는다.
원 10k를1k로 축소해 완료한 것도 아니다. 이번 작업은 원래 정의된1k class의 병목 식별이다.

동일 stack이 중첩되는 inclusive 시간은 더하면 안 된다. sampleTransition 안의 표본
약1,324ms 중 `resolvePartitionAnimationGeometry`가약915ms이고, 그 아래 공유
`partitionBendCellGeometry`가약898ms다. `ownDataProperties`의 self 표본은약593ms,
`freezeOwned`는약174ms다. 결과적으로 이번 원인 조사에서는 endpoint plan의 재검사보다
**각 cell·각 꼭짓점의 동일 frame/kernel record 검사 및 임시 좌표 동결**을 먼저 다룬다.
prepared plan 재사용만으로 전체 병목을 해결했다고 볼 수 없다.

## 다음 최소 변경의 범위

현재 cell builder는 같은 basis/kernel에 대해 중점·depth·꼭짓점마다 공개 수학 owner를
다시 부른다. inset의64회 이분 탐색에서도 동일 옵션을 다시 검사하고 각 임시 좌표를
동결한다. 후보는 이 계산 순서와 반복 횟수 자체를 유지하면서 한 호출이 검증한 고정값을
지역 closure 안에서만 재사용해야 한다.

- 최초 입력의 descriptor/own-data/closed-field/finite/range/interval 검사를 남긴다.
  외부 mutable/shallow-owned/alias/getter 입력을 소유권만으로 신뢰하지 않는다.
- 기존 일반 wrapper는 원 결과와 오류 순서를 유지한다. 준비된 private 계산이 외부
  raw input을 검사 없이 받아들이는 새 우회 entry가 되면 안 된다.
- 반지름 정책·bend 극한·회전·반사·gap 역산·64회 탐색·정점 순서·.2px 보수 분할·4096
  segment 한도·finite output 및 실제 geometry work budget을 바꾸지 않는다.
- raw 좌표는 같은 호출 안에서만 소비하고 최종 commands/anchor/interval을 원처럼 깊게
  동결한다. 전역 강한 cache, 과거 frame 보존, registry rotation은 추가하지 않는다.
- 먼저 baseline/candidate로 ±0·subnormal·아주 큰 finite 값·양 radius policy·hidden cell·
  gap·방향·곡선·strict 오류를 비교한다. 그 뒤 실제 공개 native/current/rebase/offline
  frame 및 기존 renderer 결과를 검증한다.

원10k 기능과 최종33ms preview 의무는 이 조사 후에도 그대로 남는다. 완료 번호는
STEP056이며 이 기록으로057–070이나077을 완료 처리하지 않는다.

후속 [cell 내부 계산 제안](PARTITION_CELL_CALCULATION_PROPOSAL.md)은 c8bac0e77 기반의4파일 read-only diff와907건 exact A/B를 고정했다. 각 cell의 첫 검사를 유지하면서 그 호출 안의 반복 frame/kernel 검사·임시점 동결만 줄이며, 제품 적용 및 원10k/P95는 아직 별도다.
