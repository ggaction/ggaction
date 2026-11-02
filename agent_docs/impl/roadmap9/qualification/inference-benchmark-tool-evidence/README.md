# 그래프 추론 진단 도구

## 범위와 승인

[기존 remainingApproval](../../AUTHORIZATION.json#remainingApproval)과 2026-11-01 root 배정을 재사용한다. 원 성능 계약은 [qualification-delivery](../../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/qualification-delivery.ko.md)의 그래프 추론 100/1k/10k nodes, k10, exact result, medium 1s·large worker 10s이다. 이번 변경은 실행 도구·독립 oracle·발견 가능한 contract 시험뿐이다. 제품 runtime/API/schema/한도/SLO/수치 정책을 바꾸지 않는다. shared animation owner도 변경하지 않는다.

기반은 `317de21f8`이며 [기존 비경로 도구](../native-workloads-merged-evidence/README.md)의 point/partition/Geo/data **24 size×DPR cells와 48 stages**의 fixture·실행 본문·크기·threshold는 유지한다. 추론만 **6 size×DPR cells / 8 stages** 추가한다. route browser/worker 원본도 동일하다. 현재 체크포인트에서 기존 24셀 브라우저 전수를 다시 측정했다고 주장하지 않으며, 기존 normal contract 7개와 source diff로 보존을 확인했다.

## 고정 입력과 독립 검산

- 100 / 1,000 / 10,000개 정수 격자: `side=ceil(sqrt(n))`, 숫자 ID `i`의 위치는 `(i % side, floor(i/side))`. 원행은 ID 역순이다. 난수 없이 seed0 입력을 생성하고 전체 입력 SHA-256을 기록한다.
- 공개 `createData({id:'rows',keyField:'id',values})` 후 `createInferredGraphData`를 실행한다. `nodeKey:'id'`, features `['x','y']`, Manhattan 거리, directed k10, 명시 `{mode:'exact',algorithm:'kd-tree'}`이다. 생략·sample·k 축소가 없다.
- [독립 oracle](../../../../../test/oracles/inference-grid.js)은 제품 검색/거리/identity 코드를 import하지 않는다. Manhattan 거리 shell 전체를 방문한 뒤 거리·숫자 ID로 정렬하므로 미방문 shell은 항상 더 멀다. 동일 거리의 낮은 ID를 우선하며, 최종 edge는 source/target ID 순서로 검산한다.
- literal corner/tie 기대값 및 별도 exhaustive all-pairs 알고리즘으로 n=11/16/31/100/1k의 양방향 원행 순서에서 oracle를 교차 검증했다. 10k에서도 예상 100,000개 edge 전체를 생성하고 source별 정확히10개, self-edge 없음, 고유 target을 확인했다. 이 10k 예상값은 제품이 성공했다는 증거가 아니다.
- 성공한 공개 결과의 모든 node·edge를 비교한다. 누락, pair/order/weight/direction/typed tie, 원행 index, actual dataset logicalId/revision/rowKey provenance, 실제 resource inputs, 기존 program/graphic identity를 확인한다. source ref 및 결과를 변조한 negative도 있다.
- native 논리 데이터 ID는 실제 owner가 생성한다. 전체 resource hash에는 해당 fixture의 UUID가 포함되므로 다른 DPR/새 fixture 사이에 같은 hash를 요구하지 않는다. 실제 ID를 가짜 값으로 정규화하지 않았으며 수치·전체 edge 검산과 immutable 입력 hash를 별도로 유지한다.

## 시간 경계와 Worker 결손

source 작성, 독립 oracle 계산, fixture 준비, 출력 검산 및 해시는 timed call 밖이다. `inferenceMs`는 오직 기존 동기 공개 추론 액션 전체(validation/materialization/immutable commit 포함)이다. 첫 독립 preflight 실행도 기록된 measured sample 수에 포함되지 않는다. 기본 warm5+30은 유지하지만 이번 실행은 **warm0/측정1회 diagnostic**이다. report의 p50/p95 필드는 단일 sample의 통계 컨테이너이며 정식 P95 증거가 아니다. 당시 다른 작은 owning 작업이 병행됐고 CPU 독점 슬롯이 아니었다. hardware/OS/브라우저/load는 원 report에 보존했다.

`src/actions/graphs/inference.js`의 public action은 동기이며 `src/graph.js`의 async/worker entry는 GraphRoute 전용이다. 현재 inference용 public async/worker executor는 없다. 따라서 10k에는 `large-worker`를 별도 required stage로 기록하고 상태를 **`required-worker-unavailable / unsupported-not-success`**로 둔다. harness Worker를 만들어 공개 library 지원으로 위장하지 않는다.

medium 1k의 threshold는 1,000ms, large worker는 10,000ms 그대로다. 원안에 별도 small 수치가 없으므로 100의 threshold는 null이며 새100ms 기준을 만들지 않는다. large 동기 시간이 산출되더라도 `synchronous-not-worker-qualified`이지 worker 통과가 아니다. 예산오류는 `explicit-limit / unsupported-not-success`이며 대형 성능 지원으로 집계하지 않는다.

## 실제 진단과 한계

고정 archive `6234764d952d5c42e1c93e6344a47eecbb44c088934ca7c322deb49220e3c297`를 외부 consumer directory에 설치하고 production/minified bundle을 만들었다. 공개 runtime은 그 archive만 사용한다. oracle 한 파일만 consumer의 `test/oracles/`로 복사하며 그 bytes도 별도로 pin한다. esbuild input guard가 checkout runtime 유입을 거부한다.

| Nodes / 요구 edge 수 | DPR1 단1회 | DPR2 단1회 | 판정 |
| --- | --- | --- | --- |
| 100 / 1,000 | 22.5ms | 22.1ms | 전체 oracle 일치, diagnostic |
| 1,000 / 10,000 | 210.8ms | 209.6ms | 전체 oracle 일치, diagnostic; medium SLO 확정 아님 |
| 10,000 / 100,000 | 명시 간선 한도 | 명시 간선 한도 | `Graph neighbor edges must not exceed 10000.`; 성공 지원 아님 |
| 10,000 worker | executor 없음 | executor 없음 | `required-worker-unavailable` |

최종 6셀/8stage: measured4, explicit-limit2, required-worker-unavailable2, 예상 밖 failure0, networkRequests 모두0. node100/1k의 actual kd-tree work는 172,331 / 2,451,722이며 distance evaluations 2,560 / 34,397이다. 10k의 첫 거부는 검색 완료 전에 k10 output cardinality가 기본10k guard를 넘기기 때문이다. guard를 올리지 않았다.

최초 도구 시험은 ID99 하나를 제거한99점 격자가 그 자체로 유효하므로 'invalid grid' assertion이 틀렸던1건이다. ID0 누락으로 회귀 입력을 고쳤고 제품 수정은 없다. 초기 diagnostic 및 resource hash 감사 중간 diagnostic도 삭제하지 않고 보존했다. 마지막 결과가 `diagnostic-final.json.gz`이다.

## 재현과 검증

```sh
node --test test/contracts/native-benchmark-inference.test.js test/contracts/native-benchmark-workloads.test.js test/contracts/test-discovery.test.js test/contracts/source-boundaries.test.js
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/inference-diagnostic --workload=inference --diagnostic
```

Node22 owning/discovery/boundaries 42/42, Node20/24 owning 각11/11. native source/package inputs 변경0이라 새 package나 cap을 만들지 않았다. 공통 driver의 memory 분기는 다른 agent 소유이며 변경하지 않았다. 기본 full run의 warm5+30과 대형 공개 worker 지원·전체 성능·100cycle 합산·STEP071/AT56/AT82·077 완료 판정은 남아 있다.
