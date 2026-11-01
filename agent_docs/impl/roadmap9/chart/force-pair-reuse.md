# FDEB 대칭쌍의 동일 계산 재사용

## 진행 상태

- [x] `../AUTHORIZATION.json`의 remainingApproval 재사용. 원 fixed fixture·한도·표본·165회 반복·지원 분모를 유지한다.
- [x] 기본 native fixture의 첫 실패 비용을 diagnostic으로 분리 계측했다.
- [x] 대칭쌍 distance/attraction의 중복만 제거하고 scalar 순서를 유지했다.
- [x] source `aea5bd365`와 동일 archive3Node·문서51·built186/LLM1603·4폭 browser를 검증했다.
- [x] 독립 scalar oracle·기존 전체 small 결과·원 endpoint/typed order·signed zero·overflow·immutable·codec를 검증했다.
- [ ] 최종 combined archive의 전용 Chromium P95/100회 lifecycle 검사는 root와 CPU 슬롯 조율 후 한 번 실행한다.
- [ ] Density100/1000/10000, FDEB1000/10000 admission·SLO는 여전히 미완료다.

## 기본 fixture의 실제 첫 한도

Root `0bd402486:scripts/benchmarks/routes.browser.js`의 fixture 함수를 그대로 추출하고 기존 public prepare→compute에서 work 계측만 삽입했다. Guard와 제품 파일은 바꾸지 않은 별도 bundle이다. 모든 실행은 diagnostic 단일 호출이며 시간은 P95나 SLO 근거가 아니다. 원본 `costs.*.charged`는 실패한 마지막 **요청**도 포함하므로 실제 승인된 work는 `rejected.work`이고, 마지막 거부 요청은 `rejected.value`이다.

| 원 fixed 입력 | 최초 실패 | 확인한 비용 |
| --- | --- | --- |
| density100 | iteration0 field의 work | prep85,020 + base532,800 뒤 field9,382,182 요청에서10M 거부 |
| density1000 | iteration0 field의 work | prep875,020 + base5,352,000 뒤 field3,772,988 요청에서10M 거부 |
| density10000 | 첫 iteration 동시 active samples | work9,010,020 뒤 기존6배 live buffers가10M 초과 |
| FDEB1000 | 고정 반복 preflight work | 실제compatible pairs80,500; 반복139,845,000 |
| FDEB10000 | candidate pair bound |49,995,000 >10M |

최초 진단 harness가 일반 객체 executor를 전달한 것은 기존 authentic executor 계약에 어긋나 계산 전에 거부됐다. 다음 실행은 기본 public executor 경로를 그대로 사용했으며 두 시도를 구분해 보존한다.

## 정확한 변경

기존 solver는 동일한 대칭 neighbor 쌍의 sample 차이·거리·attraction을 양쪽에서 따로 계산했다. 이제 locally prepared symmetric 목록만 내부 fast 경로를 사용한다. Lower edge→upper edge 순서로 pair를 순회하면 각 edge가 받는 neighbor 누적 순서는 기존 ascending typed order와 같다. 대응 sample index의 reverse도 그대로다. 역방향 subtraction을 별도로 남겨 signed zero를 보존한다. 모든 force를 old route에서 읽고 별도 next buffer에 누적한 뒤 같은 buffer를 최종 position으로 바꿔 old/new 두 버퍼만 유지한다.

`advanceForceRoutes`의 기존 private 직접 caller는 기본 scalar 경로를 유지한다. 따라서 비대칭·비정렬 목록을 silently pair 처리하지 않는다. 새 flag는 solver의 명시 내부 호출에만 붙으며 public 옵션·schema·types·registry는 없다.

실제로 없어진 거리와 attraction 계산에 맞춰 고정 schedule의 `2 × pairs × internalSamples`만 `pairs × internalSamples`로 바꾼다. 다른 work·candidate·sample 한도와 모든 반복은 그대로다. 진단 work가 바뀌므로 그 값을 포함하는 resultHash도 바뀐다. 좌표·bounds·inputHash·algorithmVersion·compatibilityCount·displacementCaps·schedule·원 key는 그대로이며 저장 결과를 다시 solver로 계산하지 않는다.

## 독립 검증

- scalar oracle는 각 directed neighbor를 별도로 계산하며 source import가 없다. 실제 literal force·cap 검사와 연결했다.
- 모든6cycle의 전체165회, internal sample1/2/4/8/16/32, 정·역방향, 비선형 sample, 여러 neighbor 누적, signed zero·zero/cap/overflow·immutable을 exact 비교했다.
- 실제 Math.hypot 호출은 3edge×2internal에서18→12로 줄고 모든 반환값은 exact 같다.
- 변경 전 전체 native small fixture3/7/20/100을 보존했다. work 및 이에 종속된 resultHash를 제외한 모든 결과가 exact 같다. 20edge146,710→129,910, 100edge1,894,670→1,264,670이다. zero-compatible3/7은 hash까지 같다.
- FDEB1000의 반복 요청은72,225,000으로 줄었지만 여전히10M을 넘는다. FDEB10000 candidate guard와 density의 최초 실패들은 그대로다. 크기 지원을 확대했다고 집계하지 않는다.

검증 수치·첫 실패·same archive·source pin은 [qualification](force-pair-evidence/qualification.json)에 기록한다. 기존 density chord pruning, HEB span/job proof, edge-path predecessor/cycle 및 shared animation4는 변경하지 않았다.
