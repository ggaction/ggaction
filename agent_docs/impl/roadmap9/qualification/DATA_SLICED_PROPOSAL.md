# Data 분할 실행 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "1,2,3 승인"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105_PERF.json)
- [x] load 분할: `loadProgramInSlices` 구현·시험·설치본 검증(archive `7b3cec37…`). [증거](data-sliced-evidence/)
- [ ] 100k load 최장 구간 P95 50ms(현재 52 / 64ms, GC 꼬리).
- [ ] revise 분할: `reviseDataInSlices`.

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
