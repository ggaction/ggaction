# ggaction 테스트 개선 순서

이 계획의 목표는 테스트 개수를 늘리는 것보다 **잘못된 결과를 정확히 거부하고, 실행한 범위와 실패 원인을 재현할 수 있게 만드는 것**이다. 현재 감사의 수정 제안이며 코드 변경이나 배포를 수행한 기록이 아니다. 항목 번호는 [상세 결과](/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/FINDINGS.ko.md)에 연결된다.

## 1 검증기의 잘못된 합격을 막는다

대상: **T01–T06, T26, T30**.

| 소유 영역 | 작업 | 반드시 실패해야 할 반례 |
|---|---|---|
| 공유 PNG/ink helper | 실제 배경과 alpha-aware foreground를 분리하고 기대 색상을 엄격히 검증 | 투명한 빈 PNG, 배경만 있는 출력, 오타 난 색상 |
| 문서 consumer | 안정적 snippet ID로 경로·case·receipt 연결 | 같은 파일의 두 코드가 서로 덮어써지는 fixture |
| 독립 수치 oracle | 지원 범위, overflow-safe 계산, tick 진행/상한 검증 | 1e16 인접 tick 루프, ±MAX midpoint/median |
| 회귀 통계 assertion | 규모에 맞는 기대 계수와 허용오차 | 미소 slope를 0으로 변경 |
| graphic/SVG integrity | geometry 타입과 XML/속성 문법 검증 | null/문자열 좌표, 잘못된 XML, single-quote NaN |
| coverage parser | metric 완전성과 finite/range 검증 | 비어 있는 branch/functions 행 |

먼저 현재 반례를 실패 테스트로 고정하고 helper를 수정한다. production 구현을 그대로 oracle에 복사하지 않는다. 정상 통계·투명 배경·합법적 SVG text를 유지하는 양성 대조군도 함께 둔다. 완료는 새 테스트가 통과하는 것뿐 아니라 **확인한 잘못된 출력이 실제로 거부되는 것**으로 판단한다.

## 2 실제 출력과 실행 범위를 보장한다

대상: **T07–T12, T16, T31**.

- 공개 browser 예제의 보이는 Canvas에 작은 paint witness를 추가한다. geometry와 상태 assertion은 유지한다. 모든 차트의 전체 screenshot baseline을 추가할 필요는 없다.
- page/context를 닫기 전에 실패를 capture하는 공통 lifecycle을 둔다. 원래 error와 screenshot이 남고 자원이 정리되는지 검증한다.
- engine-aware case 목록과 Firefox/WebKit 실행을 연결한다. 현재 빠진 facet content-header 케이스를 포함하고 case×engine×DPR receipt를 남긴다.
- 전체 source inventory와 coverage 파일 목록을 대조하고, 고위험 family의 자동 floor 정책을 명시한다. 현재 비율을 더 높이는 일보다 누락된 분모와 경계를 먼저 다룬다.
- workflow를 구조로 검사하며 필수 step 삭제·skip·echo·continue-on-error 변이를 거부한다. source grep에 command 문자열이 있다는 사실을 실행 증거로 사용하지 않는다.
- 모든 selector를 파일 선택 전에 검증한다. 결과가 비어 있거나 오타가 섞인 요청의 정책을 명시한다.
- coverage는 성공·실패 모두 raw/structured report를 저장한다. console은 짧게 유지해도 된다.

**완료 기준:** 파일/케이스/engine의 계획 목록과 실행 receipt가 일치한다. 앞선 selector, 파일명 충돌, source 미로드, step 비활성화가 누락을 숨기지 못한다.

## 3 환경 재현성과 실패 정리를 안정화한다

대상: **T13–T15, T17–T18**.

| 실행 환경 | 필요한 검증 |
|---|---|
| 깨끗한 로컬 checkout | browser 설치 전제와 안내한 명령의 일치, 명확한 preflight |
| Windows | slash key normalization, Node로 실행하는 TypeScript compiler, focused discovery/sharding/types |
| native package | 고정 baseline과 latest peer compatibility 분리, resolved version 영수증 |
| timeout/cancel | suite별 deadline, child 종료 escalation, 원래 실패 보존 |
| 준비 중 실패 | pack/install/manifest 실패 시 임시 경로·child 정리 |

resource-missing을 조용히 skip하는 방식으로 green을 만들지 않는다. Playwright의 기존 action/readiness timeout과 일반 runner의 suite deadline을 구분한다. 대형 realistic suite에는 실제 시간과 메모리에 맞는 별도 기준을 둔다.

**완료 기준:** 성공한 동일 baseline을 재현할 수 있고, 실패·timeout·취소를 의도적으로 주입해도 필요한 진단만 남고 자원은 회수된다.

## 4 계약과 fixture를 읽고 고치기 쉽게 만든다

대상: **T19–T25, T29**.

- 문서 snippet을 complete/continuation/expected failure/generated typecheck/prose-only로 구분한다. 현재 405개 exception을 일괄 성공 예제로 변환하지 않는다. 기존 별도 테스트에 code-hash witness를 연결하는 방법도 사용한다.
- Markdown parser는 site grammar에 맞추거나 지원하지 않는 코드 fence를 명시적으로 거부한다. 환경 metadata는 schema로 검증한다.
- product contract의 기대값을 한국어 문장이나 과거 계획이 아니라 현재 structured contract·types·runtime에 둔다. canonical public anchors와 link integrity는 유지한다.
- architecture regex는 필요한 구문을 AST로 제한해 검사하고 alias/dataflow의 한계를 기록한다.
- consumer를 entry/renderer/persistence/extension/MCP/types 같은 계약 소유자별 실제 module과 독립 case로 나눈다. 설치된 package로 검증하는 경계를 유지하고 설치 fixture는 공유한다.
- 타입 검사는 공통 compiler harness와 일반 fixture 파일을 사용하되 negative @ts-expect-error 사례를 보존한다. phase 번호는 capability 이름으로 바꾼다.
- baseline manifest에는 API 동등성·독립 geometry·renderer parity 중 무엇을 증명하는지 짧게 표시한다. 공통 계산을 검증하는 별도 literal/oracle 링크를 둔다.

**완료 기준:** 동등한 문구·formatting 수정은 불필요하게 실패하지 않는다. 행동 변화는 원래 계약을 소유한 case에서 정확한 결과·원인·fixture 위치를 보여준다. refactor 후 discovery와 기존 counterexample가 모두 유지된다.

## 5 corpus의 오류 종류를 늘리고 시간을 측정한다

대상: **T27–T28, T32**, readiness·PDF evidence·formatting의 추가 개선 후보.

현재 deterministic seed, pairwise 조합, factor 효과 검사, shrinking, provenance를 유지한다. 새 corpus를 무작정 늘리기 전에 다음을 작은 고정 표본으로 적용한다.

| 축 | 예 | 기대 관계 |
|---|---|---|
| 이름 변경 | field rename | 대상 field만 바꾸면 의미·geometry 보존 |
| 수치 scaling | 양수 배율, 작은/큰 범위 | 계약에 맞는 normalized geometry 또는 통계 관계 |
| missing/rare data | 결측, singleton, 상수, rare category | 문서화한 missing 정책·빈 그룹·안정성 |
| 크기 | 행수·그룹수·facet수·path수 tier | 구체적 자원 제한과 결과 보존 |
| label/ordering | 긴 label, typed category collision, 순서 변경 | 정확한 identity·순서·layout 정책 |

각 관계가 유효한 domain과 기대 오류를 먼저 정한다. 잘못된 구현을 검출하는 witness가 없는 relation을 coverage 개수로만 추가하지 않는다. 실패 시 original/transformed input과 seed가 함께 남아야 한다.

CI에서 동일 환경의 per-file wall time·memory·failure rate를 수집해 median/p95 기반 timing을 갱신한다. 기존 945,678ms weight를 현재 실측으로 사용하지 않는다. 큰 파일은 임의 줄 수가 아니라 capability/isolation 경계로 분리한다. shard의 exhaustive/disjoint/deterministic 성질을 유지한다.

## 검증 단계의 역할

| 단계 | 확인할 것 | 구별해야 할 것 |
|---|---|---|
| 변경 중 focused check | 해당 helper/contract와 재현 반례 | 이 결과만으로 전체 qualification을 선언하지 않음 |
| 통합 | canonical default/coverage와 영향받는 browser/render/realistic/package 경로 | code coverage와 현실 corpus의 역할은 별개 |
| 문서/예제 변경 | exact snippet·canonical result·packed consumer·built docs/browser | 생성 파일 freshness와 실행 정확성은 별개 |
| release qualification | 기존 candidate/matrix/aggregate gate와 artifact identity | baseline dependency와 최신 compatibility를 구별 |

최종 check 목록은 현재 저장소 지침과 실제 변경 범위에 맞춰 선언한다. 불필요한 중복 실행을 줄이려면 먼저 phase별 비용과 입력 identity를 측정한다. 단순히 default 또는 coverage를 삭제해서 시간을 줄이지 않는다.

## 개선 결과를 평가할 지표

1. 이번 보고서의 negative controls가 의도한 검사에서 거부되는가.
2. 계획한 unique case/source/engine과 실행 receipt가 누락·중복 없이 일치하는가.
3. 실패가 발생했을 때 원래 assertion·입력·화면/파일 증거·runtime identity를 다시 열 수 있는가.
4. clean setup과 지원 platform에서 동일 baseline을 재현할 수 있는가.
5. 의미가 같은 문서/구조 변경에 불필요한 failure가 줄었는가.
6. corpus 개수와 별도로 pathology·size·semantic relation의 검증 범위가 늘었는가.
7. 동일 CI 환경에서 wall time·메모리·실패 진단 시간이 개선됐는가.

coverage 비율, assertion 수, chart 수 하나만으로 이 결과를 대체하지 않는다.
