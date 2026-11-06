# Data 분할 실행 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "1,2,3 승인"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105_PERF.json)
- [x] load 분할: `loadProgramInSlices` 구현·시험·설치본 검증(archive `7b3cec37…`). [증거](data-sliced-evidence/)
- [ ] 100k load 최장 구간 P95 50ms(현재 52 / 64ms, GC 꼬리).
- [x] revise 분할: `reviseDataInSlices` 구현·시험.
- [x] revise 설치본 검증·Chromium benchmark(archive `ba10ee33…` 측정, `a8867ce6…` 검증). [증거](data-sliced-evidence/)
- [ ] 100k 최장 구간 P95 50ms(최근 probe: load 69 / 47ms, revise 99 / 106ms): 코드 단계는 끝, 남은 것은 GC 정지. 알려진 한계로 기록(아래 "현재 상태").

## 왜 필요한가

Native workload의 data 기준은 load와 revise 모두 한 번에 막히는 시간이 50ms 이하다. 지금 `deserializeProgram`과 `reviseData`는 한 번의 동기 호출이다. Node 10k 기준으로 load는 약 71ms이고, 그중 30%가 snapshot `JSON.parse`이며 나머지는 신뢰할 수 없는 입력의 전체 재검증이다. revise는 약 266ms다. 검증을 줄이지 않는 한 CPU 최적화로는 닿지 않는다([CAPACITY_AUDIT](native-workloads-tool-evidence/CAPACITY_AUDIT.md) 6항: promise로 한 번 감싼 것은 분할이 아니다).

## 제안

`ggaction/persistence`와 Full에 실제로 쪼개 양보하는 비동기 함수를 둔다.

```js
const program = await loadProgramInSlices(text, { sliceMs: 40, signal });
const next = await reviseDataInSlices(program, { source, id, values }, { sliceMs: 40, signal });
```

1. **같은 결과**: 결과 program은 `deserializeProgram(text)`, `program.reviseData(args)`와 저장 bytes·trace·오류가 같다. 검증 항목·순서·한도는 그대로다.
2. **진짜 분할**: 각 동기 구간이 `sliceMs`를 넘지 않게 행 단위 작업 사이에서 양보한다. 양보는 route의 `drainRouteStages`와 같은 host turn이다.
   - load는 JSON 문자열을 직접 순회하는 증분 parser로 `JSON.parse` 한 번의 블로킹을 없앤다.
   - decode·검증·row identity·materialization은 행 묶음 단위 stage로 바꾼다.
   - revise는 개정 계획, 파생 dataset, 의존 mark 재물질화를 같은 stage로 나눈다.
3. **취소**: `signal` 취소는 원 program을 바꾸지 않고 거부한다.
4. **Benchmark**: `blockingSliceMs`는 이 API의 가장 긴 동기 구간을 잰다. 전체 시간(load/revise 기준)도 그대로 잰다.

## 위험

`JSON.parse` 대체 parser와 stage 분할은 persistence·materialization 핵심 경로를 넓게 건드린다. 기존 동기 API는 그대로 두고, 두 경로가 같은 결과를 내는지 전수 동치 시험으로 묶는다. 규모가 커서 여러 checkpoint로 나눈다.

## 1단계 — 동기 비용 축소 (2026-11-05)

분할 전에 같은 결과를 내는 동기 비용부터 줄였다. 100k revise CPU profile에서 graphic identity ID(`graphicIdentityId`)의 행별 SHA-256이 revise 1회당 약 1초였다.

- `compress`가 블록마다 하던 배열 구조분해·`forEach`를 지역 변수로 바꿨다.
- 완성된 bytes 한 번에 대한 digest(`digestSha256Bytes`)는 module scratch block을 재사용하고, 호출 전에 초기화·호출 뒤 0으로 지운다. 상태가 호출 밖으로 나가지 않는다. 스트리밍 API(`createSha256State`…)는 그대로다.
- `contentDigest`는 TextEncoder 하나를 재사용한다.
- 검산: 길이 0..399의 임의 bytes·분할 스트림·비 ASCII 문자열·5MB 입력에서 `node:crypto`와 같은 hex. digest 관련 시험 438개 통과.

| Node 중앙값 | 이전 | 이후 |
| --- | --- | --- |
| 10k revise | 265 ms | 209 ms |
| 100k revise | 3,069 ms | 2,568 ms (전체 기준 3,000ms 안) |
| 10k / 100k load | 74 / 927 ms | 75 / 914 ms |

남은 기준은 모든 크기의 한 동기 구간 50ms다. 다음 단계는 load 분할이다.

## 2단계 — load 분할 (2026-11-05)

`ggaction/persistence`에 `loadProgramInSlices(text, { sliceMs?, signal? })`를 추가했다.

1. **같은 코드**: envelope 읽기, tagged decode, 소유 표시, 상태 복원·검증을 stage generator로 바꿨다. 동기 `deserializeProgram`은 같은 iterator를 `drainStages`로 한 번에 끝까지 돌린다. 양보 지점은 행 묶음(1,024) 사이뿐이고 검사 항목·순서·한도는 그대로다.
   - `decodeValueStages`: 재귀 대신 명시 frame. 오류 경로·reference 가시성·hole 처리가 이전 재귀 구현과 같다(이전 구현과 8만 건 대조, 오류 1.8만 건 포함).
   - `ownDecodedStateStages`: 자식 다음 부모 순서의 명시 stack.
   - `validateProgramStateStages`·`validateGraphicStages`·`validateSourceIdentityStages`: graphic item, item lineage, row key 반복에서만 양보한다.
2. **JSON**: 분할 경로만 `parseJSONStages`를 쓴다. 64K 문자 이하 값·문자열·원시 token은 host `JSON.parse`가 읽고, 큰 배열·객체의 구분자만 직접 읽는다. 수락/거부·값·키 순서·`__proto__` own member가 `JSON.parse`와 같다(chunk 1..64로 10만 건 fuzz). 동기 load는 계속 `JSON.parse` 한 번이다.
3. **양보**: `drainTimeSlicedStages`가 sliceMs가 지나면 host turn을 하나 준다. 취소는 각 slice 전후에 검사한다.
4. **Benchmark**: `editable-load`는 `sliceMs: 20`으로 부르고, `blockingSliceMs`는 호출 중 host message turn 사이의 최장 간격(GC 정지 포함)이다.

| Chromium P95 (DPR1) | load 전체 (기준) | 최장 동기 구간 (기준 50ms) |
| --- | --- | --- |
| 1k | 9.4 ms (100) | 9.4 ms |
| 10k | 77.9 ms (500) | 22.8 ms |
| 100k | 817 ms (3000) | 32.3 ms |

위 표는 첫 probe(진단 모드) 값이다. 정식 30회 측정에서는 100k의 30회 중 약 6회가 110–250ms로 튀어 P95가 184ms였다. 원인 분석:

- 튀는 회차는 전체 시간도 함께 늘어난다. Node `--trace-gc`에서 긴 구간은 Mark-Compact·Scavenge 정지와 겹쳤다.
- 쪼개지지 않던 구간 세 곳(소유 표시 단계의 방문 `WeakSet` 재해시 약 17ms, 행 key `dense`·`unique` 약 23ms, `keyedRows`부터 dataset 검사까지 약 40ms)을 행 묶음 단계로 나눴다. 해독 결과는 순환이 없는 새 트리이므로 방문 기록은 소유 표시 자체로 대신한다.
- GC 정지를 길게 만든 것은 graphic 속성 검증 캐시였다. item마다 process-wide `WeakMap` 항목(값은 `Set`)을 만들어 100k load마다 10만 개의 ephemeron이 쌓였다. 캐시를 `OwnedMark`와 같은 방식의 private field(`ValidatedTypes`)로 옮겼다. 검증 결과·순서는 같고, field를 붙일 수 없는 record는 매번 다시 검증한다.
- 결과(Node, 100k 10회): 최장 구간 26–136ms → 첫 회 제외 32–35ms, GC 최대 42ms → 7ms, 전체 load 980–1,380ms → 917–1,001ms.

시험: `test/unit/persistence/sliced-load.test.js`(전 action corpus·legacy fixture가 동기 load와 같은 bytes, 같은 오류, host turn·취소·옵션, JSON 분할 동치), `test/unit/core/sha256.test.js`(one-shot digest 경계).

### 정식 측정 (archive `7b3cec37…`)

`node scripts/benchmark-native.js --workload=data`, Chromium, 5 warmup + 30 측정. [report](data-sliced-evidence/report-data.json.gz)

| 크기 | load 전체 P95 DPR1 / DPR2 (기준) | 최장 동기 구간 P95 DPR1 / DPR2 (기준 50ms) |
| --- | --- | --- |
| 1k | 8.0 / 7.7 ms (100) | 8.0 / 7.7 ms |
| 10k | 75.5 / 77.2 ms (500) | 24.2 / 22.4 ms |
| 100k | 903 / 867 ms (3000) | **52.2 / 64.1 ms** |

100k 표본 30개 중 대부분은 22–30ms이고 DPR1 두 개(52·74ms), DPR2 세 개(55·64·97ms)가 GC로 길다. 행 수에 비례하는 weak table은 더 남지 않았고, 남은 압력은 JSON 조각·해독 객체의 일반 할당이다. revise 분할과 함께 줄인다.

검증: 전체 시험 10,596개, coverage 97.45/95.58/99.33%(critical floor 788), browser 531/531, render 513/513, Node20/22/24 consumer 통과. 크기 상한은 Node20/24 최댓값으로 갱신했다.

## 3단계 — revise 분할 설계 메모

- `reviseData`는 같은 적용을 두 번 한다(`apply(this); return apply(this);`). route replay가 preview·actual 두 pass를 순서대로 검사하므로 둘 다 유지하고 둘 다 나눈다.
- 경로: `reviseUnitData` → `createData`(action) → `detachDataSourceBindings` → `withGuideLayoutTransaction` → `applyRevisionPlan`(edit.js) → `applyMaterializationPlan`(planner/dependencies) → mark materializer(point: `resolvePointItems`) → `materializeMarkOutput` → `editGraphics`(action, `validatedCollectionItems`) → 선택 상태 확인.
- 100k 비용(Node, SHA 개선 후 약 2.5s): `materializeMarkOutput`·`editGraphics` item 검증, `withPreparedDatasetIdentity`, `resolvePointItems`.
- 중첩 action 호출이 양보하려면 action 실행기에 stage 구현을 받는 경로가 필요하다. 동기 wrapper는 같은 stage를 끝까지 돌리고, 분할 경로는 `yield*`로 같은 enter/exit·trace·결과 검증을 거친다.
- 동적 문맥: `materialization/revisionIdentity.js`의 `activeReplacements`는 호출 동안만 켜지는 모듈 전역이다. 양보할 때마다 닫고 재개할 때 다시 열어야 다른 host 작업이 그 문맥을 보지 않는다. `routeReplay.active`, `graphRoutes.invocation`도 같은 규칙을 따른다(최상위 사용자 revise에서는 꺼져 있다).

### 변환 대상 (100k, revise 1 pass 약 890ms의 행 반복)

- `editGraphics` item 검증(`validatedCollectionItems`) 327ms: identity ID digest, `cloneAndFreeze`, identity 검사.
- point identity(`resolvePointItems` → `finalizeItems` → `identifyItems`) 180ms, point 속성 행(point.js:30) 65ms.
- `materializeMarkOutput` item 구성 37ms, `editItems` 40ms, point 위치 mapping 25ms, scale preview 필드 읽기 38ms.
- `createData` 203ms: source identity 검사 75ms(이미 stage), `editSemantic` 값 기록의 identity 재검사 73ms와 `cloneAndFreeze`.
- 위 반복과 `reviseData` 사이의 호출 사슬: `reviseUnitData` → `withGuideLayoutTransaction`(stage 있음) → `applyRevisionPlan` → `withLogicalDataReplacements`(양보 때 문맥 닫기) → `applyRevisionPlanWithIdentity` → data resource handler(`reviseSource`) → `reviseSourceResourceInputs` → `applyMaterializationPlan`(dependencies·planner) → `materializePointMark` action.
- action 실행기: 동기 wrapper와 분할 호출이 같은 generator(`run`)를 공유하고, private `stagedClosedAction`만 행 묶음 사이에서 양보한다. 묶인 invocation scope(`applyGraphEdgeRoutesUpdate`)는 양보 없이 끝까지 돈다. 초안은 같은 경로의 시험과 함께 커밋한다.
- SHA hex 변환을 표 조회로 바꿔 100k digest 174 → 82ms(결과 동일, node:crypto 대조).

### revise 분할 구현 (2026-11-05)

- action 실행기가 동기·분할 공용 generator(`run`)를 갖고, private `stagedAction`/`stagedClosedAction`이 stage 구현을 등록한다.
- 단계화한 함수: `reviseData`(두 pass), `reviseUnitData`, `createData`, `editSemantic`(값 기록), `withPreparedDatasetIdentity`, source identity 생성·개정·검사, `cloneAndFreeze`(공용 step), `applyRevisionPlan`, data resource handler(`reviseSourceStages`), 재물질화 plan 실행(step마다 경계), `rematerializeScale`, `rematerializePointMark`, `materializeMarkOutput`, point identity(`resolvePointItems`·`finalizeItems`·`identifyItems`), `editGraphics` item 검증·교체·편집.
- `readQuantitativeField`의 숫자 열은 소유 표시된 행 배열에 기억한다. preview·actual 두 pass와 scale preview·point 위치가 같은 열을 다시 계산하지 않는다.
- Node 100k(sliceMs 20): 최장 step 1st 350ms → 34ms, host turn 최장 간격 361ms → 42–47ms. 전체 2.3초.
- 동기 결과와의 비교는 namespace 생성(UUID)을 같은 순서로 고정해 저장 bytes 전체를 비교한다. 파생 dataset allocation ID도 namespace digest이기 때문이다.

### revise 정식 측정 (archive `ba10ee33…`)

`node scripts/benchmark-native.js --workload=data`, Chromium, 5 warmup + 30 측정. load·revise 모두 `sliceMs: 10`. [report](data-sliced-evidence/report-data-revise.json.gz)

| 크기 | revise 전체 P95 DPR1 / DPR2 (기준) | revise 최장 구간 P95 (기준 50ms) | load 최장 구간 P95 |
| --- | --- | --- | --- |
| 1k | 22.2 / 22.6 ms (100) | 17.1 / 12.0 ms | 8.0 / 8.4 ms |
| 10k | 245 / 245 ms (500) | **19.3 / 15.7 ms** (이전 204ms 한 덩어리) | 15.4 / 13.8 ms |
| 100k | 2,510 / 2,586 ms (3000) | 107 / 121 ms (이전 2,094ms) | 75 / 60 ms |

100k 표본: load는 30개 중 대부분 19–23ms이고 75·133ms 등 GC 꼬리가 있다. revise는 대부분 32–40ms(남은 가장 긴 단계는 scale preview 약 25–30ms)이고 55–110ms 꼬리가 6개 있다. 남은 일은 scale preview 내부 단계화와 100k 할당(GC) 축소다.

이 측정 뒤의 변경은 쓰이지 않는 동기 구현 함수 제거와 action 정의 정리뿐이며(`a8867ce6…`), 같은 archive로 전체 검증을 다시 돌렸다.

검증(archive `a8867ce6…`): 전체 시험 10,602개, coverage 97.45/95.61/99.32%(critical floor 789), browser 531/531, render 513/513, Node20/22/24 consumer 통과. [증거](data-sliced-evidence/revise/)

### 100k 꼬리 줄이기 (2026-11-05)

- scale preview(`resolveScalePreviewStages`)를 consumer 값 읽기·scale 결정·provisional/최종 bounds 사이에서 나눴다.
- `createData`의 schema 추론·행 schema 검사, `editSemantic` 값 기록의 schema 추론·검사, point 위치의 x·y 채널 사이에 양보 지점을 두었다.
- 계측(임시, 커밋 안 함): 각 yield 위치에 표시를 남기고 15ms 넘는 step의 표시 순서를 출력해 위치를 찾았다.
- Node 100k revise: 최장 step 25–27ms → 10–12ms, host turn 최장 간격(sliceMs 10) 20–24ms.

Chromium(같은 소스의 probe archive, sliceMs 10, [report](data-sliced-evidence/report-data-tail.json.gz)):

| 크기 | revise 최장 구간 P95 DPR1 / DPR2 | load 최장 구간 P95 DPR1 / DPR2 |
| --- | --- | --- |
| 1k | 11.6 / 17.4 ms | 8.4 / 8.0 ms |
| 10k | 15.4 / 17.3 ms | 15.5 / 12.5 ms |
| 100k | 105 / 113 ms | 56 / 60 ms |

100k revise 표본 30개 중 18개가 15–19ms(이전 32–40ms)이고 12개가 58–121ms다. load는 대부분 19–24ms이고 51–73ms 꼬리가 있다. 튀는 회차는 전체 시간도 같이 늘고 Node 코드 단계는 최장 12ms이므로 Chromium major GC 정지로 귀속한다. revise는 같은 개정을 preview·actual 두 번 계산하고(route replay 계약), 행마다 dataset 복제·schema 검사·point item·identity·선택 정의를 만든다. 남은 방법은 행당 할당 수를 줄이는 것(예: 소유 표시된 원시값만 가진 item 속성의 재복제 생략)이며, 다음 단계로 둔다.

검증(archive `1c283df4…`): 전체 시험 10,602개, coverage 97.45/95.61/99.32%(critical floor 789), browser 531/531, render 513/513, Node20/22/24 consumer 통과. [증거](data-sliced-evidence/tail/)

### 행당 할당 축소 (2026-11-05)

- `ownWhenMembersOwned`: 새로 만든 record의 모든 member가 원시값이거나 소유 표시된 값이면 그 record를 소유 표시한다. 하나라도 소유 표시 안 된 객체 member가 있으면 그대로 두어 이후 `cloneAndFreeze`가 복사한다. mark output의 item 속성·identity·lineage와 identity 전용 경로의 행 key·역할·graphic ID 배열에 쓴다. editGraphics item 검증이 같은 값을 다시 복제하지 않는다.
- point identity만 필요한 mark output(선택 결과·앞으로 가져오기 강조가 없음)에서는 선택 정의의 필드·채널·속성 객체를 만들지 않는다. 그 값은 identity 결과에 쓰이지 않고, 앞으로 가져오기 강조가 있으면 그대로 만든다.
- Chromium(probe, [report](data-sliced-evidence/report-data-alloc.json.gz)): 100k revise 전체 2.51 → 2.19초, 최장 구간 P95 DPR1 105 → 112ms, DPR2 113 → 78ms. 30회 중 50ms 초과가 DPR1 9회, DPR2 5회로 GC 꼬리가 남는다(P95 통과에는 1회 이하가 필요). 1k·10k는 계속 통과한다.

검증(archive `5255a5f4…`): 전체 시험 10,602개, coverage 97.45/95.59/99.32%(critical floor 789), browser 531/531, render 513/513, Node20/22/24 consumer 통과. [증거](data-sliced-evidence/alloc/)

### 현재 상태와 시도한 것 (2026-11-06)

- 최근 probe(Chromium, 30회): 1k·10k load·revise는 DPR1·DPR2 모두 통과. 100k load는 DPR2 47ms 통과, DPR1 69ms(30회 중 2회 GC 꼬리). 100k revise는 99 / 106ms다. revise 표본 대부분은 15–19ms이고 30회 중 8–9회가 36–120ms로 튄다.
- 시도 후 되돌림: 개정 행 배열을 분할 시작 시 한 번 복제·동결하는 snapshot. 복제 자체도 여러 slice에 걸쳐 실행되므로 "host turn 사이 호출자 변경과 무관"을 보장하지 못했다(복제 도중 길이를 줄이면 행 검사 오류). 보장할 수 없는 성질이라 코드에서 뺐다. 대신 공개 문서(`docs/data-updates.md`)와 CORE 계약에 "인자는 여러 slice에 걸쳐 읽으므로 promise가 끝날 때까지 바꾸지 않는다. 그 사이 변경의 결과는 보장하지 않는다"를 적었다. load의 snapshot은 문자열이라 변하지 않는다.
- 남은 꼬리는 Node 코드 단계(최장 약 12ms)가 아니라 Chromium major GC 정지다. revise는 route replay 계약에 따라 preview·actual 두 번 계산하므로 그 할당을 없앨 수 없다. 기준(50ms)·표본 수·seed는 바꾸지 않고, 100k revise와 100k load DPR1은 STEP-076에서 알려진 한계(AT-56)로 보고한다.
