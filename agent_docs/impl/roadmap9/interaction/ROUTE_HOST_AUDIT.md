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

## 수치 옵션 own-data 보수

AT82 후속 감사에서 네 method normalizer와 공유 spline이 생략한 옵션을 상속 조회했다.
`normalizeDensityRouteOptions({})`에서 Object.prototype.zeroLength getter 1회 실행이
대표 반례다. Intent의 limits/mapping과 request의 graph/layout/options/coordinateSpace,
중첩 options의 hierarchy/hierarchyLayout/limits도 같은 원인이었다. Own accessor를 가진
edit limits는 merge spread가 먼저 값을 읽어 descriptor 검증을 건너뛰었다. 공개 prepare 경로를
검사해 result provenance의 optional hierarchy 조회도 함께 발견했다.

검증한 own data만 null-prototype snapshot으로 읽고, nested limits는 spread 전에 기존
ownRecord로 검사한다. 결과 검증기는 실제 own hierarchy가 있을 때만 사용한다. 필수 값,
기본값, null/undefined 거부, 정확한 revision, caller/program 불변성은 유지한다. 새 API,
저장 schema, 타입, algorithm, 작업 charge 또는 지원 한도는 없다. 별도 generic helper나
renderer 경계도 추가하지 않았다.

Source 회귀88개는 Node20/22/24에서 통과했다. 변경8 owner는 lines/functions100%,
branches100%(routeRequest96.83)로 기존95/90/100 floor를 만족했다. 경계43개와 source-free
동일 tar e52497df…7139의 공개2cases/6bundles×3Node도 통과했다. 최초 재현의 exponent0은
기존 positive 계약에 맞지 않은 fixture여서1로 교정한 원본과 실제 상속 조회 실패를 모두 보존한다.
추가 downstream hierarchy 최초 실패도 별도 보존한다.

Package 실측 unpacked7,535,326, packed Node20 1,668,120으로 최소 상한7,535,400 /
1,668,200을 적용했다. Full gzip779,421은 이전779,400을21bytes 초과하여779,500으로
조정했다. 나머지5entry는 기존 상한 그대로다. 최초 cap 실패와 같은 archive 측정 재검증을
분리한다. 상세 증거는 [수치 옵션 기록](route-own-options-evidence/summary.json)에 저장한다.
Chromium stage P95/retained heap은 여전히 별도 후속이며 이 기능 검사로 통과를 주장하지 않는다.

## Chromium production 측정 — 일부 크기만 완료

수리된 동일 `e52497df…7139` tar를 설치한 외부 consumer에서 minified browser bundle과
실제 Blob worker를 만들었다. Apple M4 10cores/16GiB, Darwin27 arm64,
Chromium153.0.8010.12, Node22.23.1의 한 desktop profile이다. 초기 localhost 번들을
읽은 뒤 browser context를 offline으로 두었고 측정 중 HTTP request는0이다. 고정 원형
입력과 star hierarchy를 그대로 쓰며 random/drop/sampling 변경은 없다. Canvas/SVG에
Text·label·guide를 만들지 않으므로 폰트 독립 fixture이며 font-bearing chart 성능을 대신하지 않는다.

성공 셀은 별도 첫 확인 뒤 warmup5+측정30회를 실행했다. `computeMs`는 worker의 공개
computeGraphEdgeRoutes, `prepareComputeValidateMs`는 worker 시작·전달·계산·검증을
포함한 prepare 호출, `applyMs`는 authentic prepared resource의 native commit이다.
Bundling P95는 두 latter stage 합의 개별 표본에서 계산한다. Native GraphPlot materialization,
Canvas 동기 명령, SVG serialization+DOM 삽입도 각각 기록했다. Browser compositor paint나
GPU 완료 시간은 측정하지 않았다. Source 준비는 단발 진단이며 P95에 섞지 않았다.

| Edges / method | DPR1 bundling P95 | DPR2 bundling P95 | 이 입력의 결과 |
|---|---:|---:|---|
| 100 hierarchical | 139.7ms | 139.3ms | 500ms 목표 이내 |
| 100 force-directed | 196.4ms | 194.0ms | 500ms 목표 이내 |
| 100 edge-path | 84.8ms | 86.2ms | 500ms 목표 이내 |
| 1k hierarchical | 1081.5ms | 1091.4ms | 5s 목표 이내 |
| 100 density | work limit | work limit | 성공 SLO 미측정 |
| 1k 나머지3방식 | work limit | work limit | 성공 SLO 미측정 |
| 10k 네 방식 | work/pair/sample limit | work/pair/sample limit | 성공 SLO 미측정 |

총24셀 중8셀만 성공 P95이며16셀은 명시 limit이다. Density grid256×256/방향8채널/20회
정책은 그대로이며 실패한 결과에 실제 fieldCells를 꾸며 넣지 않았다. FDEB candidate pair는
100에서4,950,1k에서499,500,10k에서49,995,000이다. 10k의 pair 한도10M은 그대로다.
따라서 AT82 전체 및 큰 크기 지원을 완료로 표시하지 않는다.

첫 DPR1 1k HEB 구간에 peer의 guide coverage가 잠깐 겹쳤다. 최초1221ms와 부하 기록을
보존하고, 해당 한 셀만 종료 후 같은5+30으로 보충하여1081.5ms를 얻었다. 첫 smoke의 잘못된
GraphPlot graph 옵션도 runtime 결함으로 오인하지 않고 harness 입력을 공개 layout 계약에
맞게 교정했다. 원본은 [별도 증거](route-browser-evidence/summary.json)에 남겼다.

새 페이지에서 실제 DOM inspect mount, native worker, 완료/update/render50회와 즉시
abort/dispose50회를 DPR마다 실행했다. Warmup5 뒤 기준점과 각 cycle 후 CDP 강제 GC 및
Runtime.getHeapUsage를 측정했다. Main renderer JS retained heap 기울기는 DPR1
4,227.10bytes/cycle, DPR2 4,552.79bytes/cycle이고 최종 증가772,000/798,684bytes다.
각각 제안한10KiB/cycle·2MiB 이내다. Backing storage 증가는0이며 embedder heap은
별도로 기록했다. 이는 전체 process RSS 측정이 아니다. Listener·worker·timer/RAF·capture 및
파괴 후 subscriber callback 카운터는 모든 회차0이고, abort acknowledgement P95는
두 DPR 모두 약0.2ms다. Native pointer drag/ResizeObserver/assets는 이 memory fixture가
새로 검증한 항목이 아니며 기존 별도 lifecycle 증거와 구분한다.

AT82 원문의 최종 all-size SLO·latest combined matrix, geographic GraphRoute binding과
STEP070/074/077 전체 종료 의무는 유지한다. 이번 기록은 성공한 입력과 명시 거절·미검증 범위를
분리한 측정 checkpoint다.
