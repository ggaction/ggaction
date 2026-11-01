# 큰 route 입력과 bounded 실행 정책 감사

## 진행 상태

- [x] [전체 잔여 승인](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.
- [x] 원 fixed fixture의 첫 실패와 실제 query/gradient 중복을 계측했다.
- [x] 공통10M과 density의 sample×24가 뜻하는 비용 단위를 소스·원 계약과 대조했다.
- [x] 수치 결과를 바꾸는 algebraic shortcut을 exact 개선으로 채택하지 않았다.
- [ ] 아래의 구체 실행 정책은 제안이며 제품에 구현하지 않았다.
- [ ] Density100/1000/10000, FDEB1000/10000의 실제 완료·SLO·100회 lifecycle는 미완료다.

수치 원본과 재현 harness는 [audit](density-budget-evidence/audit.json)에 있다. Runtime 기준은
`aea5bd365`, FDEB 검증 마감은 `1b91a9fed`다. 이번 감사는 source rewrite가 없는 별도 bundle에서
실제 public prepare/compute가 첫 field를 만들기 직전에 멈추도록 했다. 원 guard를 비활성화하여
전체 solver를 완료한 결과가 아니며, 후속20회 실행이나 성공 성능으로 집계하지 않는다.

## 확인한 충돌

원 [edge 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/edge-bundling.ko.md)의
100000 nodes/1000000 edges/10000000 candidate pairs/10000000 active samples는 memory/resource
reference guard이고 성능 약속이 아니다. 구현은 여기에 `core/validation.js`의10M cumulative work도
적용한다. [Current](../../../contract/current/EDGE_ROUTES.md)는 두 경계를 모두 공개한다.

`validateWorkLimit`는 number를 제한할 뿐 JS 연산을 계측하지 않는다. 각 owner가 scalar/key work,
`n*ceil(log2(n))`, byte·block work 등 다른 단위를 공급한다. Density의 `sampleCount*24`는 최초
`17c646406`부터 존재하지만24의 phase별 분해나 primitive 명령 개수 증명이 없다. 실제 undirected
interior sample 하나에서 gradient4개, 그 안의 Map.get16개, 차분8개와 나눗셈8개가 있고, 이 밖에
bilinear·norm·advection·smooth·weight·length·입력 검증이 있다. 따라서24를 실제 명령24개라고
설명할 수 없으며, 캐시 추가 뒤 임의의 상수를 빼는 근거로도 사용할 수 없다.

| 첫 반복 | Density100 | Density1000 |
| --- | ---: | ---: |
| 실제 sampled points | 22,200 | 223,000 |
| interior points | 22,000 | 221,000 |
| gradient 호출 / 고유 grid node | 88,000 / 25,212 | 884,000 / 32,344 |
| 실제 scalar field 조회 | 352,000 | 3,536,000 |
| padded chord 후보 sample-cell | 10,115,328 | 101,634,772 |
| 실제 query 셀에 속하는 후보 | 8,879,176 | 91,294,704 |
| 미조회 후보 비율 | 12.22% | 10.17% |

독립 생성한 query key 집합을 실제 `sampleRouteGradient`의 모든 Map.get key와 대조했다.
원 endpoint 거리만으로 계산한 첫 resample 수는 위 point 수와 같다. 그 수를 기존24와20회에
단순 대입하면10,656,000/107,040,000이다. 이는 이후 iteration의 실측이나 floating-point 경로
길이에 대한 형식 증명이 아니라, field만 개선해서는 충분하지 않다는 비용 진단이다.

Density10000은 첫 sample×6 live buffer preflight에서 먼저 실패한다. FDEB1000은 대칭쌍 중복
제거 뒤에도 fixed schedule72,225,000 work를 요청한다. FDEB10000의 이론적 nC2는49,995,000으로
candidate10M 자체를 넘는다. 어느 경우도 현재 성공 지원으로 집계하지 않는다.

## 현재 채택하지 않은 변경

1. Lazy field는12% 정도의 첫 후보만 제거하며 fieldCells 진단과 전역 overflow 검사도 별도로
   보존해야 한다. 구조를 크게 바꿔도 최초/누적 한도를 닫지 못하므로 구현하지 않는다.
2. Undirected gradient cache는 실제 중복을 크게 줄일 수 있지만 현재 첫 실패는 그 전에 난다.
   새 Map의 수명·메모리 비용과 mutable private helper의 기존 동작을 함께 다뤄야 한다.
   이번에는 제품 캐시나 registry를 추가하지 않는다.
3. `hypot(dx,dy)/h`의 제곱을 `(dx²+dy²)/h²`로 바꾸면 실수 수학은 같아도 binary64는 다르다.
   dx=.001, dy=.03, h=.05에서 kernel이.4090881600000002→.4090881600000001로 달라진다.
   이를 density-v1의 exact 성능 개선이라고 기록하지 않는다.
4. Worker 수를 늘리거나 per-tile counter만 초기화하는 것은 총 작업·메모리 안전을 보장하지
   않는다. Cache가 이미 채워진 결과만 측정하거나 sample/edge/iteration을 줄이지 않는다.

## 최소 실행 정책 제안 — 아직 미구현

첫 단계는 수학을 바꾸지 않는 **명시 budget version2**다. 수치 algorithmVersion과 별도로
`budgetPolicyVersion:'route-work@2'`를 job/result 검증에 넣는 편이 정확하다. AlgorithmVersion을
바꿨다고 기존 scalar 계산이 빨라지는 것은 아니다. 아래 선택은 root가 remainingApproval과
대조해 확정할 구체안이며, 현재 Current·타입에 지원값으로 추가하지 않았다.

### 비용·메모리

- 정렬/key 검증, compatibility 후보 검사, pair attraction, sample preparation, field contribution,
  gradient node evaluation, advection/smoothing, resampling, output 검증을 별도 counter로 정의한다.
  각 counter는 해당 loop에서 실제 처리한 항목과 연결하며 기존24를 작은 상수로 교체하지 않는다.
- 입력별 phase 상한을 먼저 계산한다. FDEB는 실제 compatibility pair 수와 기존6cycle/165회 및
  Σ(iterations×internalSamples)=840을 사용한다. Density는 edge별4096 sample 상한,256² grid,
  directed8channel,20회 schedule로 최대값을 계산하고 매 반복 실제 counts와 allocation을 검사한다.
- 총 work의 안전 상한이 없는 per-tile reset은 금지한다. 예상 total과 실제 누적 counter를 모두
  보관하고 phase가 예상을 넘으면 atomic failure다. 입력별 최대 산식은 여전히 큰 수일 수 있으므로
  이것만으로 CPU 자원 제한이 충분하다고 주장하지 않는다.
- Typed buffer를 통해 resident bytes를 allocation 전에 실제 byteLength로 계산한다. Old/new route,
  immutable input, compatibility adjacency, weighted samples/index, grid, resample scratch, transfer와
  completion의 동시 수명을 모두 센다. Streaming으로 제거한 버퍼만 live sample 수에서 제거한다.
  기존 candidate/sample 상한을 제거하지 않는다. 임의의 새 MiB 기본값은 여기서 정하지 않는다.

### 공개 호출·동기 및 worker 경계

후보 signature는 기존 host의 추가 명시 옵션이다:

```js
prepareGraphEdgeRoutes(program, request, {
  requestToken,
  signal,
  executor,
  execution: {
    profile: 'bounded',
    maxResidentBytes,
    deadlineMs
  }
})
```

`maxResidentBytes`와 `deadlineMs`는 positive finite own-data 값이다. 이 안에서는 large 실행에
둘을 필수로 두며, 아직 계측되지 않은 default를 합성하지 않는다. Executor는 실제 worker의
terminate와 listener 해제를 제공해야 한다. Request의 graph/layout/options와 원100/1k/10k
데이터는 그대로다. 기존 호출이 자동으로 새 large profile이 되는 것으로 설명하지 않는다.
AT82의 원 default 호출과 새 opt-in profile 결과도 따로 기록해야 한다. Default 지원 승격은
측정한 메모리·시간 상한을 근거로 추가로 결정해야 하며, opt-in 성공을 기존 default 성공으로
바꿔 집계하지 않는다.

- 동기 domain action의 기존10M preflight는 유지한다. Large profile은 prepared complete를 적용하는
  기존 action만 사용하며 worker partial state를 semanticSpec에 저장하지 않는다.
- Worker에서 bounded tile을 수행하고 현재 generation/AbortSignal을 확인한다. Host의 독립 timer가
  deadline에 worker를 terminate한다. 종료·오류·abort·dispose 모두 result commit0과 pending
  listener/buffer 해제를 보장한다. Synchronous fallback으로 large 작업을 실행하지 않는다.
- Tile 크기는 취소 응답 시간 실측으로 정한다. Arbitrary tile size를 새로운 성능 성과로 기록하지
  않는다.10M은 기존 동기 경계이며 total worker work가10M을 넘을 수 있다는 변경은 Current와
  architecture에 명시해야 한다. 이는 기존 guard 그대로라는 설명과 함께 도입할 수 없다.
- Job의 실행 한도는 structured-clone closed data로 전달하되 program에 host timer/callback을 저장하지
  않는다. Exact input hash/revisions/receiver/token·complete result validator·stale lease 해제는 유지한다.
- 같은 계산 입력은 host 시간/byte ceiling에 따라 geometry나 resultHash가 바뀌지 않는다. 새 budget
  version의 counters가 hash에 포함된다면 sync·worker 모두 같은 version/정의로 계산한다.
  이전 version의 저장 result는 재계산 없이 기존 strict validator로 읽는다.

### 큰 입력을 실제 처리하기 위해 더 필요한 계산

FDEB10k는 먼저 원 compatibility의 확실한 upper bound로0이 되는 영역을 가지치기하는 후보 index가
필요하다. 각 factor≤1, angle/scale/position/visibility bound를 보수적으로 사용해 threshold 미달을
증명한 pair만 제외한다. 경계는 원 scalar compatibility로 확인하고 neighbor 누적 typed 순서는
유지한다. Index 검색·bounding test·남은 실제 candidate도 모두 budget에 센다. 이는 아직 구현·
측정되지 않았으며10M candidate 안에 들어갈 것이라고 선결하지 않는다.

Density의 sample-major kernel 누적은 여전히 큰 비용이다. Typed buffers/중복 query·길이 계산 제거는
동일 arithmetic 순서를 유지할 수 있다. Polynomial moments, convolution 근사, fixed-point/GPU
방식은 다른 floating 결과나 error contract가 필요하므로 density-v1에 숨겨 넣지 않는다. 그러한
후속을 선택하면 별도 numerical algorithmVersion과 error bound·독립 reference·codec가 필요하다.
FDEB attraction을 근사 tree/cluster로 대체할 때도 같은 원칙을 적용한다.

### 검증과 실제 미완료

먼저 작은 입력에서 원 scalar 결과의 endpoint/모든 coordinate/typed order/provenance exact와
새 counters의 실제 loop accounting을 검증한다. Formula overflow·allocation 직전 byte limit·
phase total 초과·timer abort·late reply·dispose·100회 lifecycle를 포함한다. 원 fixture는 모든 edge와
fixed iteration을 유지하며 같은 archive, DPR1/2, warmup5+measured30을 사용한다.

이 정책은 안전한 장기 실행을 가능하게 하는 제안이며500ms/5s/30s의 달성 증거가 아니다.
특히 수천만~수십억 pair/sample 연산이 남으면 deadline은 안전하게 실패시킬 뿐 SLO를 통과시키지
못한다. 알고리즘 변경·실제 계측 없이 STEP071/AT82 또는 STEP077을 완료로 표시하지 않는다.

## 검증 owner 목록 보정

Root 통합에서 FDEB 새 설치 사례가 실행되지만 canonical module manifest에는 빠진 것을 발견했다.
`edge-routes/symmetric-force-pairs`의 실제4statements를 같은 위치에 추가한다. 기존 fixed archive
실행 증거는 그대로이며 manifest 발견성만 수리한다. 원 통합 실패는 root가 보존하고 이 branch는
수리 후 owning discovery 검사를 실행한다.
