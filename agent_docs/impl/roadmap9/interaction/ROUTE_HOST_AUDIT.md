# Route host 옵션과 후행 qualification 감사

## 진행 상태

- [x] AT82 원문과 기존 worker/cache/size guard owner 확인
- [x] 상속된 getter 실행 반례와 기존 own-data 계약 수리
- [x] native host/source/revision 20개 및 두 owner critical coverage 검증
- [x] package·source boundary·discovery 43개 검증
- [x] 새 고정 archive의 public own-host·실제 worker/cache 설치 검증
- [x] 설치·실측 및 source-pinned 문서 증거 마감
- [ ] AT82 Chromium production sizeclass/SLO·retained heap qualification

기존 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval 범위에서 기존 입력
계약을 보수한다. 새 API·저장 schema·지원 한도는 추가하지 않는다.

## 발견과 최소 수리

`ownRecord`는 own descriptors를 검사하지만 원 객체를 그대로 반환한다. 실행기/준비 owner가
생략한 `createWorker`, `signal`, `executor`와 필수 `requestToken`, `kind`를 일반 속성 읽기로
접근하면 Object.prototype의 getter를 실행할 수 있었다. `createGraphRouteExecutor({})`의
독립 최초 재현은 inherited getter 1회 후 예외였다.

입력 경계 네 곳에서 기존 ownRecord 검사를 먼저 수행하고 enumerable own 값을
null-prototype record에 얕게 복사한다. 함수·AbortSignal·authentic executor의 실제 own 값은
동일 객체를 유지한다. 새 validator나 registry를 만들지 않고 기존 unknown/descriptor/native
signal 검사를 그대로 사용한다. 생성 옵션, compute args, prepare request와 host만 수정한다.

회귀는 다섯 property 각각에 throwing inherited getter를 설치해 reads=0을 확인한다.
필수 own 값이 없으면 기존 오류로 거절하고, optional 값은 생략 의미로 처리한다. 정상 own
worker·AbortSignal의 취소/cleanup/cache·snapshot 검증은 기존 host suite에서 함께 실행한다.
이전 native program의 serialized snapshot도 불변이다.

## AT82에서 이미 있는 것과 남은 것

- `resources/graphRouteExecutor.js`: instance LRU8개/총1M samples, pending8개,
  exact job/result hash, cache eviction, 완료·오류·abort·dispose cleanup.
- `graph-route-host.test.js`: 실제 worker parity, stale/forged/ABA, LRU·late callback·
  cleanup 예외·construction 재진입. `interaction-update.test.js`와 기존
  [lifecycle evidence](lifecycle-matrix-evidence/qualification.json)는 100회 controlled
  worker/observer/asset lifetime 및 별도 실제 browser worker를 구분해 증명한다.
- 원 qualification 계약의 production Chromium DPR1/2 warmup5+30회 측정,
  bundling100/1k/10k edges 단계별 P95·메모리와 retained-heap slope는 이 작은
  수리의 범위로 완료했다고 집계하지 않는다. 기존 일반 benchmark-runtime은 다른 workload의
  Node 측정이며 그 증거로 대체할 수 없다.
- 원본의 budget error는 안전성 결과이며 해당 sizeclass 성능 성공과 구분한다.
  renderer parity와 worker/cache/runtime lifetime의 기존 검증을 재사용하되 AT82 전체,
  STEP070/074/077 종료는 여전히 후행이다.

## 검증 결과

Source `106f9ff30` 이후 런타임은 동결했다. [기계 판독 증거](route-host-evidence/summary.json)에
원본 실패와 최종 20개 source·43개 경계·15개 session·31개 문서 검사를 보존했다.
두 변경 owner는 line/function100%, branch97.18/100%로 현행 자동 floor를 통과했다.
동일 `b7a2808f…f860a` tar에서 Node20/22/24 각각 새 own-options와 기존 실제 worker/cache
2개 소비자 및6entry bundle가 통과했다. Node20 package packed1,667,969/unpacked7,534,812,
Full779,346/graph43,931 gzip bytes이며 기존 상한을 변경하지 않았다.
Session의100회 취소·100회 resize/worker/assets 종단 회귀도 새 owner에서 통과했다.
이것은 정확한 해제 counter의 증거이며 retained heap slope나 대형 SLO를 대신하지 않는다.

## 크기별 단발 사전 점검

[별도 사전 진단](route-size-preflight-evidence/summary.json)은 Node22에서 원 입력을 줄이지 않고
100/1k/10k edges의 네 method를 각각 한 번 실행했다. 이는 browser production P95나
memory/SLO 통과 증거가 아니다. 12셀 중4개 완료,8개 명시 resource-limit이며 SLO 통과는0개다.

| Edge 수 | hierarchical | force-directed | density | edge-path |
|---|---|---|---|---|
| 100 | 완료134ms | 완료199ms | work limit | 완료68ms |
| 1k | 완료916ms | work limit | work limit | work limit |
| 10k | work limit | candidate pair limit | active sample limit | work limit |

HEB는 실제 star hierarchy의 native tree anchors, 다른 세 방식은 circle nodes의 명시 offset edge
workload다. 10k HEB는 hierarchy root까지 기본 maxNodes10000을 유지하기 위해 graph nodes9999와
edges10000을 사용한다. No dropped edges이며 모든 mapping은 명시한다.

Density100에서 work10,000,024/limit10,000,000, FDEB10k에서 candidate pairs49,995,000,
density10k에서 active samples13,400,000으로 거절됐다. 현재 field owner는 각 반복마다
arc-length samples에 compact kernel을 누적하며 실제 비용을 guard로 제한한다. 성공시키려고
work charge를 낮추거나 수치·sample 정책을 바꾸지 않았다. 후속 optimization은 독립 수치 oracle와
현 guard를 보존하는 근거가 필요하며 이 기록으로 승인된 성능 요구를 축소하지 않는다.
