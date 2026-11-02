# Geo sample admission 구현 및 검증

## 진행 상태

- [x] exact proposal `e4ce7d2f3` Root 채택 기록 `f6b794673`
- [x] 채택된 세 파일의 exact diff 적용
- [x] capability owner의 입력/순서/diagnostics/aggregate work 회귀 및 critical coverage
- [x] 원 generic/restore와 v3/v4/v5 codec, package/discovery, source docs 검사
- [x] 같은 frozen archive의 Node20/22/24 runtime·strict types·문서·6 browser bundles
- [x] source-free minified Chromium DPR1/2 기능
- [x] built docs 186 pages / selective LLM artifacts1607
- [x] frozen archive 원100k native/current/rebase/offline 기능 완료
- [x] 추가 소형 Geo sampler lifecycle smoke
- [ ] source checkpoint와 metadata source pin
- [ ] 최종 합산 archive의 exclusive Geo P95 및 canonical memory100cycle

## 적용 경계

[채택 제안](GEO_SAMPLE_ADMISSION_PROPOSAL.md)의 patch 그대로 적용했다. `normalizeGeoAnimationPresentation`과 `resolveGeoAnimationPresentation`, 일반 geometry resolver, offline admission은 기존 검사를 수행한다. sampler의 combined helper는 full presentation/group 검사 뒤 local geometry closure를 같은 호출에서 즉시 소비한다. 실제 stream과 refinement·output·aggregate 과금, caller isolation, final concrete validation 및 deep-owned 반환은 유지한다. C2·retained cache·ownership registry·public API/schema/type/export 변경은 없다. 기존 선언과 current contract를 변경할 이유가 없으며 package export/strict TypeScript 검사로 불변성을 확인했다.

제품 테스트는 `test/unit/animation/geo-sample-admission.test.js`다. 임시 roadmap loader에 의존하지 않는다. mutable/shallow-owned/alias/null-prototype/getter/cycle 및 projection/style/frame의 첫 오류와 full diagnostics, 원 depth/2M array/10M work 거부, prepare closure의 snapshot 격리, hidden feature, default/capacity 각각의 두 group work와 timeline/callback 순서를 검산한다. 누적 callback 테스트는 작은 실제 stream work69+69를 기존 총10M 예산 잔량에 더해 정확한 두 번째 호출 오류를 확인하며 workload를 키우거나 제품 limit을 바꾸지 않는다.

## Source 및 문서

[증거 디렉터리](geo-sample-admission-product-evidence/):

- Geo animation **135/135 pass**. 수정 owner critical coverage(line/branch/function): geoState **100/98.02/100**, geoTracks **100/98.02/100**, geoPresentation **100/95.29/100**.
- column/numeric/envelope codec + public package boundaries/discovery **55/55 pass**. Package artifact **7/7**, 신규 admission tests Node20 **4/4**도 통과했다. 이전 v3/v4 및 explicit v5와 generic/offline validation을 유지한다.
- source docs **248/248 pass**. source provenance와 machine/LLM generated 문서를 owning generator로 재생성했다.
- Jekyll build 성공, built docs **186 pages**, selective LLM **1607** 검산. 사용자 UI/시각 디자인 변화는 없다.

## Frozen package

Archive SHA256 **`52ae6397eacbab02df8f7cae8978c426667cdd1b69dbddc683d6aac71be93d85`**. Node20와24 strict pack은 byte-identical이다. 1262entries / packed1,822,931 / unpacked8,192,955B. 이전cap packed1,822,600/unpacked8,191,600 초과의 원 사전 측정값을 보존하고, 독립 branch의 최소caps **1,823,000 / 8,193,000B**로 정합했다. Root integration cap은 별도 합산값을 따른다.

같은 archive 설치본에서 Node20/22/24 각각 Geo runtime(offline4renderers/current/native authority/explicit hit policy), strict exactOptionalPropertyTypes, 실행 문서, 6entry browser builds를 수행했다. source-free minified Chromium DPR1/2가 통과했다. Node20/24 animation gzip343,722B는 이전343,700B를22B 초과하므로 최소343,800B로 조정했다. 다른bundle/runtime 한도·수학·fixture·SLO는 바꾸지 않았다. Full788,965 / Basic426,250 / SVG25,672 / interaction140,073 / graph69,522B는 기존caps 안이다. [limit recheck](geo-sample-admission-product-evidence/limit-recheck.json)는 같은 측정값을 재검산한다.

## 원규모와 남은 자격

원100k portable helper는 exact archive checksum과 설치1262파일 전체 byte 일치를 확인한 뒤 committed 원 footprint oracle을 사용한다. raw100k / 모든199999commands / 모든stroke part와 네 scalar reference query / current·rebase·offline authority가 대상이다. 명시GC는 기존 기능/ref-only4096part batch 범위에만 있고 canonical timedworkload에 사용하지 않는다. 기능 결과는 아래 완료 기록으로 추가한다.

현재 Node/browser/source 결과는 원 canonical camera/hit P95 성공을 뜻하지 않는다. 최종 root 합산본에서 다른 CPU작업을 멈춘 구간의 1k/10k/100k, DPR1/2,5+30, 원 SLO를 그대로 유지한다. 원 memory100cycle은 기존 복합graph/image canonical workload이며 새Geo100k×100 의무로 바꾸지 않는다.

### 원100k 완료 기록

PID28930은2026-11-02T13:15:28.460Z 시작하여13:19:08.931Z에exit0으로끝났다. native/current/rebase 각각199999commands 전수와 원3CSS질의를 검산했다. 최대좌표오차는 native2.061e-13/current3.269e-13/rebase3.553e-13이다. Native339849parts/1939096footprintcommands 전체 ordered hash는 원`ed299020fa7f2b61130344c9f359aa59ffc13007c0c1453170aed5cd125b9284`와 같다. 네 scalar reference query가 모든part를 비교했고 current339791parts/rebase339697parts 및 native 권한 없는 offline format5 거부를 확인했다. No-hit에서 nearest 전수탐색의 기존 geometry work budget 오류는 그대로 명시적 제한이며 무제한 nearest 성공으로 집계하지 않는다. 원 로그와 [설치본 결과](geo-sample-admission-product-evidence/large-installed.json)를 보존했다. Preparation3518.01ms는 기능 실행의 진단값일 뿐 P95/성능향상 주장이 아니다.

같은 설치본의20vertex sampler/current-hit 갱신100회 추가smoke에서 scene WeakRef100개가 모두 회수됐다. 종료 뒤8macrotask/GC조건의 보조 수명 검사이며 canonical memory heap-slope나 원100k×100 결과가 아니다. [summary](geo-sample-admission-product-evidence/summary.json)는 source hashes와 이 checkpoint의 남은 범위를 고정한다.
