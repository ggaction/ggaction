# Format6 path-run 제안 — 2026-11-05

## 진행 상태

- [ ] 사용자 확인(공개 scene/primitive 확장).
- [ ] 구현·시험·네 renderer·hit·codec 검증.

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
