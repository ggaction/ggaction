# Data 분할 실행 제안 — 2026-11-05

## 진행 상태

- [ ] 사용자 확인(새 공개 API).
- [ ] 구현·시험·benchmark 검증.

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
