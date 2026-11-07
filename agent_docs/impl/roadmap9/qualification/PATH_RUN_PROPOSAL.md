# Format6 path-run 제안 — 2026-11-05

## 진행 상태

- [x] 사용자 확인: "1,2,3 승인"(2026-11-05). [승인 기록](PUBLIC_APPROVAL_20261105_PERF.json)
- [x] 구현: `path-batch` primitive, scene v3 `path-run`, partition sampler 묶음, 네 renderer·hit·codec·rebase.
- [x] 전체 시험·설치본 검증·partition 10k benchmark(archive `7c95c11e…`). [증거](path-run-evidence/)

## 왜 필요한가

Partition 10k gesture preview는 frame당 66–70ms(기준 33ms)다. 남은 비용이 셀마다 반복되는 node 조립, 속성 검증, freeze, canvas compile, frame 의미 기록에 고르게 퍼져 있어서 국소 수리로는 2배를 얻을 지점이 없다([기록](PARTITION_PREVIEW_PERFORMANCE.md)). Points 100k도 같은 문제를 format6 `circle-run`(같은 칠의 연속 점을 열 배열 한 행으로 묶음)으로 풀었다. Partition 셀 경로에 같은 방식을 쓴다.

## 제안 (opt-in, 기존 동작 불변)

1. **Concrete primitive `path-batch`**: `{ x: number[], y: number[], starts: number[], closed: boolean, appearance }`.
   - 각 행은 하나의 경로 ring이다. 점들은 `x/y`의 `[starts[i], starts[i+1])` 구간이다.
   - `closed`면 Z로 닫는다. `appearance`는 circle-batch와 같은 공유 칠이다.
   - 열은 `createCircleBatchColumn`과 같은 소유 구성 증명을 갖고, caller 배열은 전체 검사를 거친다.
   - 행 수 1..10000, 점 수는 기존 path command 상한 안이다.
2. **Scene v3 entry `path-run`**: `{ kind: "path-run", keys, topology, offset, clip, clips, properties, decisions }`. 구조는 `circle-run`과 같다.
   - `decisions`는 `{ kind: "semantic-kernel", kernel: "partition", ownerKey, role, sourceIndices, targetIndices, itemKeys }`다.
   - Partition frame 의미(group/item)는 행 순서를 그대로 따른다.
3. **Sampler**: `planTransition({ options: { formatVersion: 6 } })`에서 `semantic-partition` body track이 같은 칠·appearance·frame으로 이어지면 `path-run`으로 묶는다. 나머지는 지금과 같은 node다. `formatVersion` 없이는 아무것도 바뀌지 않는다.
4. **소비자**:
   - Canvas, SVG, PNG, PDF가 각 행을 같은 경로 명령으로 그린다. 출력은 행별 `path`와 pixel 동등이다.
   - Hit는 행별 fill/stroke 판정이다.
   - Batch codec·오프라인·rebase·timeline은 `circle-run` 규칙을 그대로 따른다.
   - 공개 선언 `BatchedTransitionScene`에 `path-run` 변형을 추가한다.
5. **Benchmark**: partition 10k는 points 100k처럼 `formatVersion: 6`로 잰다. 검산은 행별 4 꼭짓점 좌표를 같은 기준으로 비교한다.

## 기대 효과와 위험

- 셀 1만 개의 node·속성 객체·freeze·compile이 행 열 몇 개로 줄어든다. Points 100k가 같은 변경으로 132ms에서 20ms가 된 전례가 있다.
- 공개 scene 스키마가 늘어난다. 네 renderer, hit, codec, 저장 형식이 모두 새 변형을 알아야 한다. 이 작업은 여러 checkpoint로 나눈다.

## Geo 100k와의 관계

Geo 100k camera(228ms, 기준 50ms)는 한 경로에 명령이 10만 개 있는 경우다. 비용의 대부분이 투영 수학 자체라 path-run만으로는 닿지 않는다. 이 제안 범위에 넣지 않는다.

## 구현 기록 (2026-11-05)

1. **Primitive**: `src/grammar/schemas/pathBatch.js`가 `{x, y, starts, closed, appearance}`를 검증한다. 제안의 `starts`는 행 수와 같은 길이이며 마지막 행은 점 끝까지다. 점은 1..1,000,000, 행은 1..10,000, 행마다 최소 두 점과 기본 path 명령 상한 30,000을 지킨다. appearance는 기존 concrete path paint 검증을 그대로 쓰고 commands·maxCommands·length를 거부한다.
2. **행 전개 단일화**: `batchGraphic.js`의 `isBatchGraphicType`·`batchGraphicRow`를 graphic source 방문, paint frame, transition scene, Canvas·native preflight·SVG, bounds가 함께 쓴다. 행 명령(`pathBatchRowCommands`)은 core 계층 제약 때문에 `core/sceneRows.js`에 두고 grammar가 가져다 쓴다.
3. **Sampler**: `prepareBatchSampling`이 같은 pair·owner·role·topology·paint·appearance track·placement인 `semantic-partition` body track을 `path-run`으로 묶는다. Frame마다 pair당 한 번 `samplePartitionPairGroup`으로 sample하고, `partitionAnimationOutlineColumns`가 per-node 경로와 같은 `outline` 함수로 좌표를 column에 쓴다. 숨겨진 셀이 하나라도 있으면 그 frame은 기존 per-node 경로를 쓴다. Frame partition 의미(groups·items)는 per-node 경로와 같다.
4. **소비자**: canvas scene은 `path-run`을 한 `path-batch` object로 compile한다. Hit는 행 key를 그대로 쓴다. Rebase·offline은 행 전개(`pathRunNode`)와 `{kind:"path-run"}` 위치(행마다 `sampled-concrete`)를 쓴다. Codec은 x·y·starts·decision index를 numeric column으로 옮기고, 논리 work는 행별 M/L/Z 명령을 펼친 legacy node 비용과 같게 센다.
5. **시험**: `test/unit/renderers/path-batch.test.js`(검증 거부, 저장, DPR1/2 Canvas·SVG·PNG·PDF와 개별 path 동등성, 그림자, bounds, scene 배치), `test/unit/animation/batched-partition.test.js`(행·결정·frame 의미·native·pixel이 per-node frame과 같음, 저장·rebase, fallback, hit 동등성).

## 측정 (archive `7c95c11e…`)

`node scripts/benchmark-native.js --workload=partition`, Chromium, 5 warmup + 30 측정. 10k는 `formatVersion: 6`로 재고, 검산은 모든 행의 네 꼭짓점을 이전과 같은 기준으로 비교한다. [report](path-run-evidence/report-partition.json.gz)

| 크기 | layout DPR1 / DPR2 | gesture preview DPR1 / DPR2 (목표 33ms) |
| --- | --- | --- |
| 100 | 1.6 / 1.6 ms | 1.1 / 1.1 ms |
| 1k | 12.0 / 12.2 ms | 6.1 / 7.1 ms |
| 10k | 119.8 / 118.8 ms | **13.4 / 13.4 ms** (이전 67.3 / 66.2 ms) |

Node 중앙값 10k는 64.7 → 16.4ms다. 전체 시험 10,590개(문서 예제 판정 목록에 path-batch 추가 후 통과), coverage 97.45/95.6/99.33%(critical floor 786), browser 531/531, render 513/513, Node20/22/24 consumer 통과. 크기 상한은 Node20/24 최댓값으로 갱신했다.
