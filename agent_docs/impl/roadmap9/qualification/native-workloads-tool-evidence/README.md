# 비경로 native 성능 작업의 실행 도구

## 범위와 승인

[기존 전체 승인](../../AUTHORIZATION.json#remainingApproval)과 2026-11-01 root 배정에 따라 STEP071/AT56의 원래 비경로 size class를 기존 `scripts/benchmark-native.js`에 연결했다. 원 요구의 정본은 [qualification-delivery](../../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/qualification-delivery.ko.md) 및 [oracle-fixtures](../../../../../study/coverage-expansion-2026-10-27/roadmap/oracle-fixtures.json)이다. 실행 도구와 정상 contract 시험은 이 이력/원안 파일을 import하지 않는다. 새로운 공개 API·schema·runtime·한도·SLO 변경은 없다.

기존 route/worker fixture와 memory lifecycle 본문은 byte-identical이다. `workloads.browser.js`는 public package imports만 사용하며, driver는 local archive를 별도 설치한 directory에서 production/minified Chromium bundle을 생성한다. native source checkout은 bundle에 들어갈 수 없다. 입력·harness·bundle·archive·실제 첫 결과의 SHA-256을 기록한다. 입력 생성은 난수 없는 seed 0 규칙이며, native opaque IDs는 원 owner가 생성한다.

## 실제 작업과 독립 검산

| Workload | 원 크기 | 공개 호출 / 검산 | 원 SLO |
| --- | --- | --- | --- |
| point | 1k / 10k / 100k rows | `createData/createPointMark/encodeX/encodeY`, scale domain 1→2의 `planTransition/sampleTransition`; 전체 rows와 circles가 동일하고 중간 `x=20+360*raw/1.5`, `y=380-360*raw`를 모두 검산. CSS affine `[1.5,0,0,1.5,7,11]`에 놓인 세 점의 실제 session inspect가 native row key를 포함. | hit 8/12/20ms, full-frame 16.7/33/50ms |
| partition | 100 / 1k / 10k nodes | root도 count에 포함하는 star hierarchy. `layoutHierarchy(method:partition)`의 모든 leaf interval `[i/(n-1),(i+1)/(n-1)]`, root total을 검산. 폭400→600의 완전 sample에서 중간 root width460, 모든 leaf path 꼭짓점을 독립 검산. | layout kernel 10/50/300ms, gesture preview 33ms |
| Geo | 1k / 10k / 100k source vertices | 단일 non-collinear geographic LineString을 입력 그대로 저장, equirectangular camera scale100→200. `sampleTransition`의 sqrt(20000) scale로 모든 원 좌표의 실제 projection을 순서대로 검산. Native subdivision이 추가한 command count도 기록하며 원 vertices를 제거하지 않는다. 세 segment 내부의 CSS inspect가 실제 Geo owner를 반환. | preview 16.7/33/50ms, hit20ms |
| load/revise | 1k / 10k / 100k point items | 완전 native chart의 `serializeProgram/deserializeProgram`, 같은 source의 `reviseData`로 raw x를 절반으로 바꾸어 모든 dependent circles 검산. 이전 input/program 유지. | load/revise100/500/3000ms, native synchronous blocking slice50ms |

Partition kernel 수치는 비공개 수학만 우회 호출하지 않고 public layout action의 immutable validation/commit 비용을 포함한다. 준비/scene/index/plan/serialization 비용은 별도 preparation으로 기록하고 stage latency와 섞지 않는다. Load/revise의 blocking slice는 yield 없는 해당 public call 전체의 동기 시간이며 브라우저 task 전체(독립 검산과 harness overhead 포함)의 별도 long-task 통계라고 주장하지 않는다. 입력/출력 검산 및 hash 계산은 timed call 밖이다.

## 실행과 판정

```sh
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/diagnostic --workload=workloads --diagnostic
node scripts/benchmark-native.js --archive=/absolute/candidate.tgz --output=/absolute/evidence --workload=points
```

`workload`는 기존 `all/routes/memory` 및 `workloads/points/partition/geo/data`를 지원한다. `all`은 모든 작업을 실행한다. Diagnostic은 **원 크기 12개 × DPR1/2 모두** warmup0/단1회로 실행한다. 기본 측정은 원 warmup5/30회이며 P50/P95를 함께 기록한다. 오류 발생 cell은 작은 input으로 교체하지 않는다. 준비 실패도 그 cell의 두 required stage에 남는다. 명시 native RangeError는 `explicit-limit / unsupported-not-success`; assertion/예상 밖 오류는 `failed`이며 diagnostic의 종료코드도 실패한다. Diagnostic에서 실행된 stage는 언제나 `not-qualified-diagnostic`이다.

최종 결과는 `diagnostic-final.json`이다. 24 size×DPR cells / 48 stages 중 26 measured, 22 explicit-limit, unexpected failure0, 각 networkRequests0. 측정된 단회값이 원 SLO보다 낮아도 pass 증거가 아니다. 전용 P95·AT56/G-PERF·최종 AT60·077 및 candidate pass는 변경하지 않았다.

## 드러난 후속 blocker

- 10k points: native CSS hit index work budget 및 background 포함 endpoint10001에 대한 guide endpoint10000 한도.
- 100k points/data consumer: Point mark item50000 한도. 전체 point consumer가 없는 raw-data 성능으로 대체하지 않았다.
- 10k partition: 원10000 node layout은 모두 계산하지만 preview endpoint10001의 guide 한도.
- Geo10k: 원 vertex10000와 native subdivision을 통과한 mark point count 한도. Geo100k: refined point30000 한도.
- 실행된 point/partition/Geo preview와 data blocking의 단회 관측값도 일부 원 SLO를 넘었다. 단회값으로 성능 지원/실패를 확정하지 않는다.

Root 요청에 따라 후속은 첫 stack/guard/Current의 정합성과 exact map/cache·검증된 scene length 재사용 등의 최소안을 별도 감사한다. 이 checkpoint는 어떤 guard도 늘리거나 우회하지 않는다.
