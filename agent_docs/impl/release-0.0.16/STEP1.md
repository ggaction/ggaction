# 0.0.16 전체 개선 구현 및 릴리즈

## 진행 상태

- [x] v0.0.15 기준 감사와 구현 범위 확인
- [x] 31개 항목 구현 및 계약 동기화
- [ ] 통합·패키지·문서·realistic·coverage·브라우저·렌더 검증
- [ ] PR 정상 통합 및 0.0.16 exact candidate 릴리즈

## 승인 근거와 경계

사용자의 2026-09-14 요청: “싹다 고치고, 0.0.16으로 릴리즈”. 직전 31개 항목 보고서의 수정과 기능 방향, main 통합 및 0.0.16 공개 릴리즈를 범위로 삼는다. 반복 확인하지 않는다. 아직 구체화되지 않은 package 설치 정책과 versioned persistence/source revision 등 중요한 공개 계약은 검토 가능한 명세와 검증 자료를 완성해 root AGENTS의 material-decision 규칙에 따라 다룬다. 일반 오류 수정과 독립 작업은 계속 진행한다. 기존 승인·보호 규칙을 우회하지 않는다.

## 항목별 추적

| 번호 | 항목 | 상태 | 검증 |
| --- | --- | --- | --- |
| 01 | 함수가 포함된 데이터는 외부에서 저장 후 변경할 수 있다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 02 | 희소 데이터 배열이 통과한 뒤 엉뚱한 그래픽 오류를 낸다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 03 | createAxes가 명시한 좌표계·채널 선택을 무시한다 | 구현·검증 완료 | 3×3 family/ID assertion, 이종 channel 및 기존 axis lifecycle; 관련 계약 45개 통과 |
| 04 | 세 저수준 primitive는 알 수 없는 최상위 옵션을 조용히 버린다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 05 | PNG만 renderer 옵션 검증 정책이 다르다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 06 | createData TypeScript 선언이 런타임보다 지나치게 넓다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 07 | MCP가 복합 요청의 일부를 누락하고도 미해결 사항이 없다고 말한다 | 구현·검증 완료 | 85개 MCP·카드·문서·패키지 계약, installed consumer 및 15개 의미 평가 통과 |
| 08 | focused scale editor 6개의 padding 단위가 잘못 생성된다 | 구현·검증 완료 | canonical scale unit registry; 카드·계층·문서·패키지 15개 통과 |
| 09 | MCP requiredOptions가 필수 옵션과 예제에 등장한 옵션을 혼합한다 | 구현·검증 완료 | 85개 MCP·카드·문서·패키지 계약, installed consumer 및 15개 의미 평가 통과 |
| 10 | 현재 아키텍처 문서에 존재하지 않는 구현 경로가 남아 있다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 11 | 테마가 무관한 액션에도 전체 그래픽을 순회한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 12 | preview가 관계없는 원본 데이터까지 다시 복사한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 13 | 긴 trace의 append 비용이 누적된다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 14 | SVG가 매번 전체 graphicSpec을 직렬화·해시한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 15 | 최소 산점도 번들이 예산 상한에 거의 도달했다 | 구현·검증 완료; Full 여유 제한 기록 | 같은 로컬 runtime에서 권장 Basic gzip 약 5.2% 감소. CI Node 22.23.2 installed Full/Basic/SVG 359,670/166,182/6,961 bytes; 기존 browser 상한 유지 |
| 16 | 브라우저 전용 사용자도 MCP·네이티브 렌더 의존성을 설치한다 | 구현·검증 완료 | renderer/package/MCP 38개, docs/package 33개, 실제 bare→optional 설치·Full/Basic/타입/전체 package consumer 통과 |
| 17 | 런타임 성능 회귀를 검출하는 공식 workload가 필요하다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 18 | 실제 폰트와 저작용 text bounds 차이를 줄일 선택지가 필요하다 | 구현·검증 완료 | exact-font profile, fallback, wrapped rematerialization, composition/Basic adoption, persistence, 타입 및 installed consumer 통과 |
| 19 | 릴리즈의 단일 순차 검증 경로가 약 59분 걸린다 | 구현·로컬 검증; 릴리즈 실행 대기 | canonical candidate를 병렬 source/coverage/package/docs/7 realistic shard에 전달; strict fan-in |
| 20 | realistic 테스트가 main의 필수 merge check에 포함되지 않는다 | 구현·실제 보호 규칙 검증 완료 | realistic-required strict aggregate 및 main ruleset 20421930의 required check에 추가; 기존 required checks·strict·bypass actor 유지 확인 |
| 21 | 자동 검증이 Ubuntu·Chromium에 집중되어 있다 | 구현·로컬 검증 완료 | macOS native smoke, Chromium/Firefox/WebKit DPR 1·2 및 installed consumer 통과; Windows/Ubuntu matrix는 실제 CI 대기 |
| 22 | 실패한 렌더·문서 테스트의 진단 artifact를 자동 보존해야 한다 | 구현·실제 CI artifact 검증 완료 | 의도적 실패의 로그/status·이미지 보존, 실제 run 34825970866의 Windows failure artifact 다운로드 및 원인 확인; 한도와 실패 상태 유지 |
| 23 | 높은 coverage를 보완할 공통 음성 계약·교차층 테스트가 필요하다 | 구현·검증 완료 | Current catalog 전체 valid-call corpus → unknown/null/array/scalar rejection 및 source snapshot; generic/focused·atomic/sequential 동치 |
| 24 | 실행 계약과 생성 메타데이터의 의미 원본을 좁혀야 한다 | 구현·검증 완료 | scale 단위·impute 필수값 공유; architecture의 중복 API/지원 목록을 Current owner 링크로 통합, 경로·anchor·package 계약 검증 |
| 25 | MCP 평가는 실행 성공과 요구 충족을 분리해야 한다 | 구현·검증 완료 | 85개 MCP·카드·문서·패키지 계약, installed consumer 및 15개 의미 평가 통과 |
| 26 | 원본 데이터의 불변 revision을 유지한 갱신 흐름 | 구현·검증 완료 | 전체 corpus 원본 revision의 SVG 동치, derived/owner/selection/facet/repeat 갱신, 타입·음성·불변성 및 실제 installed consumer 통과 |
| 27 | 저장·복원을 위한 버전 있는 snapshot/recipe 경계 | 구현·검증 완료 | 139개 corpus state/graphic round trip, malformed/extension/Basic/불변 편집, 46개 영향 검사와 실제 installed package 통과 |
| 28 | 구조화된 진단과 실제 한도 안내 | 구현·검증 완료 | 진단·불변성·selectors·타입·bare 및 installed package; 일반 3690개 중 문서 목록 1개 수정 후 해당 계약 재통과 |
| 29 | PNG/PDF 메모리 출력과 비동기 비용 경계 | 구현·검증 완료 | renderer/package/MCP 38개, docs/package 33개, 실제 bare→optional 설치·Full/Basic/타입/전체 package consumer 통과 |
| 30 | 접근성 보조 출력을 최종 시각적 데이터 단위와 연결한다 | 구현·검증 완료 | 집계·histogram 보존·오차 구간·UTC line·Parallel·facet/concat·음성·browser graph, 전체 corpus 및 installed consumer 통과 |
| 31 | 릴리즈 준비를 하나의 검토 가능한 변경으로 생성한다 | 구현·실제 version 준비 검증 완료 | package/lock/runtime/README/Jekyll/MCP/Context7 동기화, generator·음성·재실행 동치; 최종 19개 계약 및 docs 120개 통과 |

## 검증 checkpoint

첫 checkpoint는 입력 소유권·dense row·primitive/renderer 옵션·Full/Basic row 타입이다. 해당 테스트와 현재 계약 및 생성 문서를 함께 검증한 뒤 commit/push한다. 다음 checkpoint를 완료로 기록해도 전체 릴리즈 완료와 구분한다.

### 입력 경계 checkpoint

- `input-boundaries-tests.log`: 82/82 통과.
- 일반 suite 3,677개 중 새 generic signature로 영향을 받은 계약·메타데이터 기대 9개를 발견해 수정했다. 수정 후 해당 85개 중 84개 통과, 마지막 package 크기 한도는 추가 renderer validator 및 row 타입의 실제 unpacked 크기 3,550,202 bytes에 맞춰 3,555,000으로 조정하고 package suite를 재검증했다. 파일 개수 상한은 공유 validator 1개 추가에 맞춰 522다. 브라우저 gzip 상한은 유지한다.
- `docs:generate` 완료, generic action의 발견·카드·provenance·realistic type inventory를 동기화했다.
- 다른 26개 항목과 최종 통합·릴리즈는 아직 완료하지 않았다.

### Axis assertion checkpoint

명시한 좌표계 ID/type과 이종 channel option을 하위 axis action 전에 검증한다. Cartesian 생략 추론과 기존 Polar/Parallel flow는 보존한다. `axes-validation-tests.log`, `axes-validation-contracts.log`, `axes-validation-package.log` 및 docs 생성 결과를 확인했다.

### Scale metadata checkpoint

Scale의 band padding 단위를 grammar registry에서 공유한다. Parallel을 포함한 모든 create/edit scale 카드가 band-fraction을 표시하는지 검증했다. `scale-metadata-tests.log` 15/15와 docs 생성을 확인했다. 공개 계약 Gate 전체 승인도 DECISIONS에 기록했다.

### Immutable performance checkpoint

Owned subtree 재사용, data-only theme fast path, persistent trace children, immutable SVG hash cache를 도입했다. 공개 Array trace·순서·ID·직렬화와 mutable renderer input의 재계산을 보존한다. `benchmark:runtime`은 환경 및 7개 sample을 남기고 같은 환경 baseline 대비 회귀를 검출한다. 실제 10k themed data 50개 추가 median 0.63ms, SVG 반복 14.83ms, trace 16k append 71.41ms를 기록했다. 감사의 각각 467.94/22.53/218.61ms보다 낮다. 서로 다른 실행의 측정이라 절대 성능 보장으로 취급하지 않는다. Architecture의 오래된 ranged encoding 경로를 고치고 현재 source link test를 추가했다.

### Optional backends and memory output checkpoint

PNG/PDF Buffer API와 async PNG encoding을 추가하고 파일 출력이 같은 경로를 사용하게 했다. Optional peer 누락 상태에서 browser/entry import·명확한 오류를 실제 tarball 설치로 검증한 뒤 두 peer를 설치해 Node/MCP/type/tutorial/브라우저 bundle 전체 consumer를 통과했다. Package 상한은 backend loader 1개 및 API/type/docs 증가를 위해 523 files/3,565,000 unpacked bytes로 맞췄으며 packed/gzip 상한은 유지한다. Browser full/basic gzip 358,817/174,478 bytes로 통과했으나 항목 15의 여유 확보는 아직 남아 있다.

### Structured diagnostics checkpoint

Error identity/class를 보존하는 WeakMap metadata와 browser-safe entry를 추가했다. 공통 option/value/ID/resource/live-reference/limit validator가 의미를 직접 분류하고 wrapper는 미분류 실패에 action-failed만 부여한다. 원본 행을 저장하지 않는다. 35개 focused test 및 전체 package consumer 통과. 일반 suite 3,690개 중 package visibility 문서 목록 1개가 실패해 README/architecture를 고쳤고 관련 계약을 재검증했다. 최종 full/coverage/release 검증은 남아 있다.

### Built-in tree shaking checkpoint

239개 top-level built-in action declaration에만 pure call annotation을 적용했다. 등록 함수와 extension author의 action() 검증은 그대로 실행된다. 실제 bundled subset에서 미사용 wrapper 제거 및 invalid extension metadata 예외 보존을 검증했고 18개 계약과 전체 installed package consumer가 통과했다. Basic은 기존 175,000-byte 상한 대비 6,816 bytes 여유를 확보했다. Full은 모든 action을 등록하므로 감소가 48 bytes에 그쳤고 항목 15의 최종 budget 검토를 남긴다.

### MCP requirements checkpoint

Packet v5에서 requiredOptions와 sample/configured options를 분리했다. Impute conditional rule은 runtime validator·card callPatterns·resolver가 같은 pure registry를 사용한다. Red/log/rotation explicit options와 derived creator→focused editor의 known owner 연결을 실제 실행한다. 해석된 phrase/option source coverage의 union을 제외한 유의미한 원문은 미해결로 보존한다. 새 평가 15개는 execution 15/15, fulfillment 10/15, 예상한 unresolved 5개, false completion 0이며 package/contract/taxonomy/card/resolver/case hash를 기록한다. 기존 LLM 실험 기록은 변경하지 않았다. 85개 영향 계약과 실제 installed package consumer가 통과했다.

### Catalog-wide negative input checkpoint

실행 가능한 action relationship corpus에서 모든 Current direct action의 성공한 입력·source를 수집해 malformed/unknown option과 원본 보존을 검사한다. 테스트의 capture wrapper도 정식 action()으로 만들어 내부 speculative invocation의 metadata 경계를 보존했다. 실패한 fixture를 오류 검증 성공으로 잘못 계산하지 않도록 원본 valid args의 재실행을 먼저 요구한다. Generic/focused scale와 atomic/sequential encoding의 semantic/graphic 동치를 함께 통과했다. 기존 sparse rows·family assertion·Full/Basic boundary 검사는 그대로 유지한다.

### Persistence checkpoint

승인된 schema 1 tagged JSON과 browser-safe persistence entry를 구현했다. Full/Basic을 editable Full로 복원하며 trace replay 없이 constructor가 상태를 소유한다. Codec의 값·hole·prototype key 보존과 잘못된 tag/key/type/cycle, open stack, unknown extension/subclass, dangling reference/owner, malformed concrete tree를 검증했다. 전체 139개 action corpus의 canonical state 동치, drawable program의 SVG exact equality, partial state의 동일한 renderer failure를 통과했다. 이 과정에서 nested facet editing의 child actionStack이 한 단계만 닫히던 문제를 고쳐 후속 child action이 정상 root에 붙게 했다. Optional outlier/boundary/ungrouped regression의 예약 ID는 live reference와 구분한다.

- 일반 suite 3,708개 중 3,707개 통과; 신규 test capability 등록 누락 1개 수정 후 46개 영향 검사를 재통과했다. 이후 추가 browser graph/version test도 이 46개에 포함된다.
- 실제 installed package의 persistence runtime/positive·negative types와 기존 전체 consumer 통과. Full/Basic/SVG gzip은 359,621/168,315/6,973 bytes이며 기존 상한을 유지한다.
- 집중 codec/validation coverage: line 98.39%, branch 96.97%, function 100%; 새 snapshot critical family/entry floor를 추가했다.
- Packed audit는 532 files, 718,359 packed, 3,591,260 unpacked bytes다. 새 5개 배포 파일을 위해 entries 532, unpacked 상한 3,600,000으로 맞추며 packed 720,000은 유지한다.
- 최종 모든 기능 완료 후 전체 coverage/realistic/render/browser/docs/release 검증은 별도로 남아 있다.

### Parallel release verification checkpoint

릴리즈를 candidate pack/upload → 독립 source/coverage/package/docs/7 realistic shard → strict verify → protected publish로 분리했다. 모든 package/browser consumer job은 같은 tarball을 download하고 digest·tag·commit을 검증한 뒤 GGACTION_PACKAGE_SPEC으로 지정한다. 기존 workflow는 candidate를 만들었으나 package consumer가 이 환경 변수를 받지 않아 다시 pack하는 경로였으므로 정확한 artifact 검증 누락도 고쳤다.

245개 이전 successful realistic test의 duration 합을 22개 파일별 scheduling weight로 기록했다. 단순 round-robin 최대 합 1,301,299ms 대비 greedy weighted 최대 합 945,678ms이며, 이는 병렬 실행의 실제 벽시계 시간 보장이 아니다. File 전체가 정확히 한 shard에 포함되고, 신규 파일은 median weight로 빠짐없이 배정된다. 실행 전 파일과 추정치를 출력한다.

실패·취소·skipped·누락·추가 prerequisite를 strict aggregate가 거부하는 테스트, partition exhaustive/disjoint/determinism·unknown file·입력검사, 기존 discovery/release contract 23개가 통과했다. YAML parsing과 실제 작은 realistic shard/empty shard 실행도 통과했다. Main의 실제 required rule 변경 및 전체 실제 release pipeline 성공은 이후 통합·릴리즈 단계에 남긴다.

### Failure evidence checkpoint

CI/release test command는 출력 streaming을 유지하며 마지막 2MiB log와 exit/status/환경을 기록한다. Failure collector는 checks/failures/docs의 명시된 진단 폴더만 수집하고 개별 10MiB, 전체 payload 50MiB/300파일로 제한하며 생략 수를 manifest에 남긴다. 이전 collection output을 재사용하지 않는다. 실패한 PNG assertion은 case ID·기대 조건·실제 PNG를 남기고 primitive/public mismatch는 두 이미지와 4백만 pixel 이하 diff를 보존한다. Browser readiness/열린 실패 page와 docs exception은 screenshot·URL·오류를 보존한다.

의도적으로 exit 7/9, 없는 실행파일, 쓰기 불가, 이미지 mismatch, 브라우저 mismatch, oversized/aggregate-budget 사례를 실행해 원래 오류가 유지됨을 확인했다. Critical job에 continue-on-error를 넣지 않고 failure-only 수집/upload 단계만 허용한다. 25개 초기 영향 검사와 추가 budget 검사, 기존 브라우저 84개, 대표 렌더 3개 및 실제 run-check→test runner smoke를 통과했다. GitHub artifact의 실제 다운로드 확인은 최종 CI/release 관찰 단계에 남긴다.

### Platform and browser compatibility checkpoint

macOS/Windows Node 22 installed-package smoke와 Firefox/WebKit representative browser jobs를 CI 및 exact-candidate release fan-in에 추가했다. Native PNG/PDF memory/files, SVG, persistence와 공통 scene의 clip/gradient를 검증한다. Browser 3종의 Canvas/SVG text alignment, resize, DPR 1·2, labels와 download 6개가 로컬에서 통과했다. macOS arm64 native smoke, 22개 release/discovery 검사, npm invocation 단위 검사와 전체 installed consumer도 통과했다. Windows npm CLI와 TypeScript 실행은 npm run 환경의 실제 CLI 경로를 Node로 호출하여 공백과 .cmd shell 문제를 피한다. Linux/Windows runner 결과는 최종 CI에서 확인하며 환경별 범위를 공개 rendering 문서에 구분했다.

### Architecture contract ownership checkpoint

Architecture에서 primitive signature, encoding/scale/coordinate 값 목록, transform 옵션, mark별 지원 조건, guide spacing/default와 facade 세부 call chain 등 중복된 계약을 Current owner 및 실행 corpus 관계로 연결했다. 약 1,080줄을 줄이고 state ownership, immutable revision/retained composition, domain→graphic 흐름, final grain, pure policy, package/renderer 및 검증 경계는 보존했다. 특히 histogram step/explicit boundary를 미구현으로 표시한 오래된 설명이 별도 계약으로 남지 않게 했다. 현재 지원 현황도 example/index로 연결한다. 11개 architecture 경로·anchor·문서 package surface 검사를 통과했다.

### Source revision checkpoint

새 원본을 만들고 기존 DAG planner와 typed reference collector로 dependent chain을 갱신한다. 원본 snapshot, owner identity/style, retained facet/repeat recipe를 보존하고 stored selection까지 speculative transaction에서 검증한다. 동일 문자열의 data/mark ID를 구분해 statistical reference의 mark source를 잘못 바꾸지 않는다. 전체 action corpus의 원본을 같은 rows로 갱신하여 SVG exact equality와 trace closure를 확인했다. 이 검사에서 발견한 inferred grid가 tick edit 뒤 stale 상태로 남는 문제도 고쳤으며 explicit grid values/count는 유지한다.

Data capability 209개, 최종 source/catalog/input/type/boundary/grid 36개, theme/architecture 61개와 실제 전체 installed package consumer를 통과했다. Consumer의 고정 action 개수는 canonical Current index를 읽도록 수정했다. Theme override의 중복 처리와 data 등록을 합쳐 browser gzip 상한을 유지했다. Source probe Full gzip은 359,986 bytes이며 항목 15의 추가 여유 확보는 여전히 남아 있다. Package 파일은 신규 source module 1개를 반영해 533개, packed 상한 725,000 bytes로 조정했고 browser 상한은 변경하지 않았다.

### Text metrics and shared bundle checkpoint

승인한 immutable profile의 정확한 text/font tuple을 저작용 폭 계산에 연결했다. Title·axis·legend·label·facet·composition과 selection bounds가 같은 profile을 사용하며 renderer에는 callback이나 profile을 전달하지 않는다. Theme font 변경과 profile 변경은 같은 wrapped typography rematerialization을 사용한다. Full composition은 Basic child를 editable Full snapshot으로 채택하며 원래 Basic은 보존한다. Exact match가 없으면 기존 추정을 유지하고 remove는 추정으로 복구한다.

전체 일반 suite 3,742/3,742, 최종 typography/theme/tree-shaking/architecture 등 72/72, 문서·catalog 52/52 및 실제 installed package consumer를 통과했다. 새 핵심 metrics 60개 coverage 검사는 line 99.02%, branch 99.21%, function 100%다. 마지막 theme Parallel 중복 재계산 제거 후 영향 검사를 다시 통과했다. 생성 문서를 갱신했다.

공통 closed-option wrapper와 gradient color/stroke geometry/materialization, 기존 built-in factory의 pure annotation으로 중복을 줄였다. Extension action 검증과 각 domain의 trace를 보존한다. 실제 installed browser gzip은 Full 359,795, Basic 165,806, SVG 6,956 bytes로 기존 상한을 유지한다. 새로운 runtime module 4개의 package entry 상한은 537이며 packed/unpacked 상한은 유지했다. 전체 suite가 드러낸 violin orientation 변경 중 grid rematerialization 순서도 고쳐 explicit tick 변경과 내부 dependency plan을 구분했다.

### Accessible final data checkpoint

Browser-safe 별도 entry에서 final item adapter와 pure path series를 읽는다. Mark removal과 stable owner 관계를 공유하고 composite component를 한 owner view 아래 보존한다. Column role·field·aggregate·UTC unit, series와 ordered facet/repeat/concat hierarchy를 immutable schema 1 출력에 담는다. Standalone text/지원 불가능한 owner는 ID를 명시해 전체 거부하며 일부 성공 결과를 조용히 반환하지 않는다.

집계 평균 3/8, interval bounds 2–4/6–10, histogram count conservation, filtered row, UTC aggregate line, Parallel dimension, facet 계층 및 원본 보존을 검증했다. 141개 relationship corpus 중 134개 지원, 7개 standalone text의 명시적 오류를 확인했다. Runtime/package/boundary 23개, 별도 package/tree-shaking 18개, 문서 120개 및 installed package의 runtime/types 전체 consumer 통과. 접근성 entry coverage line 98.73%, branch 94.12%, function 100%. Source-only browser graph는 Full action 등록이나 Node dependency를 포함하지 않는다.

새 배포 파일 3개로 entries 540, unpacked 3,601,724 bytes를 확인하고 unpacked 상한을 3,610,000으로 맞췄다. Packed/browser 상한은 유지한다. Installed Full/Basic/SVG gzip은 359,782/165,806/6,956 bytes다.

### Release preparation checkpoint

`release:prepare`는 clean tree에서 package/lock/runtime/README version 및 Unreleased notes를 먼저 검증하고 변경안을 생성한다. 같은 버전의 재실행은 노트/날짜를 보존하며 committed runtime의 provenance를 재생성한다. Release contract hash·canonical documentation generators·local notes·preparation manifest를 연결하고 publish/tag/push/commit은 실행하지 않는다. 발전 중인 코드가 바로 published provenance로 잘못 표시되지 않도록 기존 dirty-state 정책을 유지한다. API/package/MCP tests의 과거 version literal은 canonical runtime identity와 실제 package를 비교하게 바꿨다.

순수 plan의 동치·보존·음성 입력과 기존 candidate/notes/MCP/package 경계를 검증했다. 전체 문서 120개 통과. Jekyll은 로컬 Ruby 3.2.11에서 build와 preflight를 통과했으며 CI의 고정 Ruby 3.2.6 결과를 별도로 확인한다. 실제 version 준비 및 통합 검증은 다음 단계다.

### 0.0.16 integration preparation

전체 일반 suite 3,755/3,755와 실제 0.0.16 installed package consumer가 통과했다. 최초 version 변경 검사에서 Jekyll version, MCP taxonomy/resources version, Context7 pinned version 누락을 찾아 preparation 입력·검증·출력에 추가했다. Accessibility의 architecture package inventory와 capability 정렬도 고쳤다. 영향 검사 69개, 최종 docs 120개 및 package/MCP/preparation 등 19개 통과.

권장 Basic entry의 최소 산점도 gzip은 165,806 bytes로 감사 기준보다 9,161 bytes 작다. Full은 모든 등록 action을 유지하므로 신규 기능과 함께 359,782 bytes이며 상한 대비 여유가 작다는 제한을 기록한다. 큰 Full 축소를 달성했다고 주장하지 않는다. SVG는 6,956 bytes다. Browser 한도는 변경하지 않았다. 최종 tarball audit는 540 files, packed 725,076, unpacked 3,606,432 bytes다. Packed 상한은 새 API와 릴리즈 설명 증가를 반영해 730,000으로 맞췄고 unpacked 3,610,000을 유지했다.

실제 release:prepare 재실행은 버전 0.0.16과 source contract를 보존하고 committed runtime의 문서 provenance 및 local notes를 생성했다. 이 기록은 PR 전 snapshot이다. CI의 coverage/realistic/platform/browser 및 exact-candidate release 검증, main 보호 규칙 추가와 실제 배포는 다음 단계에 남긴다.

### First CI closeout

PR #131의 첫 run `34825970866`에서 source/render/browser, coverage, documentation, macOS, Firefox와 WebKit은 통과했다. Windows의 `spawn npm ENOENT`, Node 22.23.2의 gzip 차이, 변경된 axis 계약과 동기화되지 않은 realistic fixture, 신규 action coverage inventory, 긴 CSV 문자열로 인한 메모리 초과를 실제 실패 원인으로 분리했다.

- Windows는 Node 설치 옆의 npm CLI를 직접 실행한다. 공백 포함 경로·npm wrapper·startup error의 retained log 등 9개 검사를 통과했다. 실제 Windows failure artifact도 다운로드해 원인과 보존 결과를 확인했다.
- Item legend와 interval revision의 중복을 줄이고, 여러 property 편집은 기존 wrapped primitive를 순서대로 호출한다. Fixture 변경 전 141개 corpus의 semantic/graphic/config/trace와 SVG가 모두 일치했다. Interval·legend 254개 검사를 통과했다.
- Role과 statistics를 함께 편집할 때 이전 CI-only method/level이 남는 오류도 발견했다. 단독 statistics 편집과 같은 partial merge를 공유하며 median/IQR의 숫자 경계와 입력 불변성, grouped temporal band 및 CI 복원을 검증했다. Current 계약과 공개 API 설명을 동기화했다.
- Cartesian fixture에서 Polar-only false 옵션을 제거했다. 120/216/360 strict 생성 격리 검사가 모두 통과했고, 직접 사용자 action 272개와 option inventory/ledger를 동기화했다. `reviseData`, `applyTextMetrics`, `removeTextMetrics`는 실제 생성 시나리오의 root call로 실행된다.
- CSV의 문자별 string concatenation을 field 단위 join으로 바꾸었다. 긴 quoted description 40개는 이전 parser에서 64 MiB heap OOM을 재현하고 수정 parser에서는 완전 동일한 값으로 통과한다. 기존 parser 동치·fixture 19개 및 신규 통계/CSV 회귀 26개가 통과했다. 50개 maximal regression 데이터셋은 기존 row/group/fallback 기대를 유지하고 최대 RSS 270,368 KiB로 통과했다. Disposable child heap은 256 MiB, RSS 상한은 기존 512 MiB다.
- 최종 전체 source coverage는 line 95.14%, branch 91.92%, function 98.78%이며 99개 critical floor를 모두 통과했다. 중간 일반 suite의 생성 문서 3개 freshness 실패는 generator 실행 뒤 docs 120개 및 최종 전체 coverage 실행에서 재검증했다.
- CI와 같은 Node 22.23.2의 실제 installed package 전체 consumer 통과: Full/Basic/SVG gzip 359,670/166,182/6,961 bytes. Native Node 22.23.1과의 압축 수치를 같은 runtime의 결과처럼 비교하지 않는다. Browser 상한은 유지했고, 공유 runtime 2개 파일 추가로 package entries 상한만 542로 맞췄다. 최종 local audit는 packed 725,084, unpacked 3,597,570 bytes다.
- Main ruleset `20421930`에 `realistic-required`를 추가하고 기존 checks, strict mode와 bypass actor가 그대로임을 확인했다. 두 번째 PR CI 및 exact-tag release의 성공은 아직 이 checkpoint의 완료 주장에 포함하지 않는다.

### Windows checkout byte parity

두 번째 CI `34829264505`에서 Node 20/22/24 package와 macOS·Firefox·WebKit 검사는 통과했다. Windows는 npm 실행 이후 package 검사까지 진행했으며 자동 CRLF checkout으로 packed size가 730,787 bytes가 되어 상한을 넘었다. 배포 대상 source/types/knowledge 및 package metadata에만 LF checkout을 지정했다. 원본 CSV와 binary asset의 checkout 정책은 바꾸지 않는다.

`core.autocrlf=true`의 별도 checkout으로 554개 파일이 원본과 byte-identical함을 확인했다. Node 22.23.2의 해당 checkout에서 실제 compact package를 만들고 542 entries, packed 726,464, unpacked 3,597,570 bytes를 확인했다. 크기 상한을 올리지 않았다. 최종 quiet benchmark는 이전과 같은 Node 22.23.1/Apple M4에서 7회 sample median으로 trace 16k append 70.25ms, 10k themed data-only 50개 action 0.73ms, 10k SVG 재출력 15.46ms다. 장치별 절대 성능 보장은 아니다.
