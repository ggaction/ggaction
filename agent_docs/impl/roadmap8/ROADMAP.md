# Roadmap 8 — 조합 가능한 차트 저작의 정확성과 실행 계약

상태: **구현 및 통합 검증 완료 — flatten 제외**. 계획 기준은 `v0.0.16`, commit
`2b930177793a41a76ef3d664f3803f24d29ba67b`였으며, 후속 사용자 승인에 따라 F01–F05와
F07–F12를 구현했다. F06과 V23–V25는 제외 기록만 보존한다. npm publish, release tag,
문서 배포는 이 완료 상태에 포함되지 않는다. [ROADMAP_INDEX.json](../ROADMAP_INDEX.json)이
완료 위치를 소유한다.

## 목표

ggaction의 핵심인 **고수준 사용자 결정 → 도메인 연산 → 하위 materialization → graphic primitive**
계층을 유지하면서, 생성·편집·재인코딩·데이터 변경·composition·저장 복원에서 의미가 일관되게
이어지도록 한다. 자동 후보 탐색을 사용하는 애플리케이션도 같은 실행·검증 계약을 활용할 수 있게 한다.
특정 앱의 추천 알고리즘을 ggaction에 내장하는 계획은 아니다.

성공 기준은 액션 수의 증가가 아니라 **잘못된 입력을 정확히 거절하고, 정상적인 빈 결과를 표현하며,
계산 정책과 변경 범위를 조회하고, 동일한 연산을 반복해도 사용자의 기존 결정을 보존하는 것**이다.

## 읽는 순서와 문서 책임

1. 이 문서: 범위, 순서, Phase 의존성, 전체 완료 조건.
2. [BASELINE.md](BASELINE.md): 0.0.16에서 실제로 확인한 동작과 과장하지 말아야 할 한계.
3. [FEATURES.md](FEATURES.md): F01–F05·F07–F12별 이유, 동작, API 후보, 구현 위치, 완료 조건.
4. [DECISIONS.md](DECISIONS.md): 새 public/persisted/architecture 결정과 호환성 제안.
5. [VALIDATION.md](VALIDATION.md): 43개 인수 사례와 통합·성능 검증. 구조화된 결과와 증거는 [ACCEPTANCE_CASES.json](ACCEPTANCE_CASES.json).
6. [구현자 시작 문서](IMPLEMENTER_START_HERE.md): 상세 명세·타입·작업 지도·재개 순서.
7. [Phase 0 목표](phase0/GOAL.md): 계획 기준과 완료된 구현으로의 전환 기록.

현재 public API의 권위는 [ACTION_INDEX.json](../../contract/ACTION_INDEX.json), `types/`, `src/`다.
이 디렉터리의 상세 명세는 설계 이유와 재현 절차를 보존하며, 현재 동작과 충돌하면 public source와
검증된 current contract를 따른다.

## 범위와 원래 목록의 대응

| 원래 번호 | ID | 작업 | 우선순위 | Primary Phase |
| --- | --- | --- | --- | --- |
| 1 | F01 | 필드 존재·출력 schema 검증 | P0 | 1 |
| 2 | F02 | 빈 결과·nullable 소비의 일관성 | P0 | 1 |
| 3 | F03 | 결측값·빈 집계 정책과 제외 정보 | P0 | 2 |
| 4 | F04 | 회귀 적합·구간 분리와 예측 grid | P0 | 3 |
| 5 | F05 | 원본을 추적하는 파생 표현 관계 | P0 | 3 |
| 7 | F07 | 범위 경계·제외·null 필터 계약 | P1 | 2 |
| 8 | F08 | 독립적인 안정적 행 정렬 | P1 | 4 |
| 9 | F09 | 기계적으로 조회 가능한 액션 capability | P1 | 5 |
| 10 | F10 | 변경 범위·효과 조회 | P1 | 5 |
| 11 | F11 | 실제 graphic 결과 검사와 coverage | P1 | 5 |
| 12 | F12 | 후보 반복 실행 성능·자원 계약 | P1 | 6 |
| 조건부 확장 | E01 | 지리 의미·투영·geometry | 별도 범위 결정 | 확장 설계 |
| 조건부 확장 | E02 | 이미지 mark·asset·renderer/export | 별도 범위 결정 | 확장 설계 |

핵심 범위는 **11개: F01–F05, F07–F12**다. 사용자 요청으로 F06(flatten)은 제외했다.
기존 ID를 재사용하거나 뒤 번호를 당기지 않는다. 제외 결정 D08 및 V23–V25는 번호만 보존하며 구현 의무가 없다. E01/E02도 삭제하지 않고 아래 확장 구간에 기록한다.
앞선 설명에서 두 항목은 Full 표현 범위를 선택할 때의 조건부 확장이었으므로 이번 계획에서
자동으로 구현 승인·첫 릴리즈 의무로 바꾸지 않는다. 이후 사용자가 포함하면 별도 Phase와 전체
consumer matrix를 추가하고 해당 작업까지 끝나기 전에 확장 포함 로드맵 완료를 선언하지 않는다.

### 앱이 소유할 범위

추천 점수·공동출현 corpus·taxonomy·경로 sampling·parameter의 explicit/defaulted 상태·UI preview
우선순위·stale 요청·commit transaction·세션 history·완전한 command log는 앱이 소유한다.
ggaction은 유효 조건, 계산 결과, 리소스 관계, 변경 사실과 검사 근거를 제공한다.
기존 trace는 lightweight 계층 기록으로 유지하며 전체 데이터나 사용자 의도 ledger로 확장하지 않는다.

## 공통 구현 원칙

- `ChartProgram`의 불변성과 caller input 보존을 유지한다. 실패한 복합 변경은 원본 전체를 보존한다.
- semantic 의미는 `semanticSpec`, 재계산 가능한 graphical intent는 `materializationConfigs`,
  concrete 결과는 `graphicSpec`에 둔다. 같은 정보를 독립적으로 여러 곳에 저장하지 않는다.
- schema·source-follow 갱신도 **변경을 소유한 domain action이 명시적으로 계획하고 실행**한다.
  observer, renderer compiler, 무조건 전체 재계산을 새로 만들지 않는다.
- 데이터 필터와 final mark-item 필터의 계산 grain을 유지한다. 서로 같은 기능으로 대체하지 않는다.
- 새로운 연산은 create만 만들지 않는다. edit → descendants 재계산 → source revision → facet/repeat →
  snapshot → remove의 닫힌 lifecycle을 같은 Phase에서 완성한다.
- 의미 정책이 바뀌는 기존 기본값은 무단 교체하지 않는다. 호환성 또는 migration을 D 결정으로 검토한다.
- 지원하지 않거나 검사하지 않은 경우를 성공·0개·빈 목록으로 위장하지 않는다.

## 실행 순서

| Phase | 결과물 | 선행 | 관련 결정/Gate |
| --- | --- | --- | --- |
| 0 | 기준 증거, 범위, 구체 계약·호환성 검토 | 없음 | G0 |
| 1 | 필드/schema 및 빈 결과의 공통 기반 | 0 | G1: D01–D03 |
| 2 | 필터와 통계 결측 정책 | 1 | G2: D04–D05 |
| 3 | 회귀와 추적 관계 | 1, 2 | G3: D06–D07 |
| 4 | sort 및 전체 데이터 lifecycle | 1, 2 | G4: D09 |
| 5 | capability·changes·inspection 조회 | 1–4 | G5: D10–D12 |
| 6 | 후보 실행 workload와 자원/성능 개선 | 측정은 0부터, 최종 판정은 5 이후 | G6: D13의 새 경계 변경만 |
| 7 | 전 기능 통합·문서·배포 후보 closeout | 1–6 | G7: D14의 별도 배포 결정 |

### Phase 0 — 기준과 계약 검토 (완료)

- BASELINE의 소규모 재현을 고정된 0.0.16에서 다시 실행하고 raw 값과 오류를 구분한다.
- 제안 API, canonical state 예시, v1 snapshot 복원 전략, 기존 호출의 영향표를 D01–D14로 검토한다.
- 검증은 source/tree/pixel/numeric/package를 나누고, 측정하지 않은 것은 `not_run`으로 둔다.
- 이 단계의 제안은 후속 사용자 승인으로 확정됐고 Phase 1–7 구현의 기준이 됐다.

### Phase 1 — F01/F02: 빈 데이터도 설명 가능한 실행

1. source와 모든 transform의 input/output field signature를 현재 policy registry에 연결한다.
2. 필드 참조 검증을 데이터의 실제 행 탐색 전에 수행한다. 0행에서 검증을 생략하지 않는다.
3. 명시 schema와 파생 schema를 revision/복원에 연결한다. schema 없는 과거 빈 데이터는 unknown이다.
4. 빈 그래픽 materialization과 domain 유지·명시 domain·미결정 domain의 상태를 정의한다.
5. 일반 dataset 필터와 mark-filter의 같아야 할 결과/달라야 할 grain을 검증한다.
6. nullable 통계 출력을 받는 mark의 명시적 missing 정책과 inspection 정보를 연결한다.

완료: 없는 필드 오류와 정상 0행이 구별되고, source가 비었다가 다시 채워져도 owner·스타일이 유지된다.

### Phase 2 — F03/F07: 통계와 필터의 계산 의미

1. per-family 현재 missing/empty 동작표를 작성하고 새 옵션의 omission 호환성을 고정한다.
2. 필터 normalize/evaluate와 schema 검사, 양 끝 포함 여부·exclude를 한 계약으로 구현한다.
3. bin·summary·density·regression 등 대상 수치 family에 명시적 결측 정책과 제외 count를 연결한다.
4. weighted/unweighted, facade/standalone transform의 동등한 정책이 같은 pure kernel을 사용하게 한다.
5. edit/revise/facet에서 정책과 제외 정보가 실제 최신 입력을 반영하는지 확인한다.

완료: null을 0으로 바꾸지 않고 수치 oracle와 행 membership이 일치한다. 정책 없이 global row 삭제하지 않는다.

### Phase 3 — F04/F05: 회귀와 파생 의미의 연결

1. 모델 적합과 구간 계산의 필요 표본 수를 분리하고 interval 없는 결과 schema를 정의한다.
2. 평가 grid의 입력, domain 밖 예측 표시, numerical limits를 구현한다.
3. source target을 따라갈 역할과 고정할 역할을 기록하는 관계를 추가한다.
4. reencode/data-filter/revise/editDerivedData에서 source-follow 대상의 재계산을 명시적으로 계획한다.
5. fixed↔follow 전환, 실패 rollback, style 보존, 공유 scale·facet·concat·삭제를 검증한다.

완료: 두 점 직선, 독립 회귀, 원본을 따르는 회귀를 구분하고 잘못된 예전 곡선을 최신 결과로 남기지 않는다.

### Phase 4 — F08: 독립 행 정렬

1. ordered multi-key sort의 pure kernel·출력 schema·lineage를 작성한다.
2. 기존 derived creator/materializer와 edit/revision registry에 sort family를 연결한다.
3. 기존 fold/pathOrder/category order/window sort의 의미를 바꾸지 않는다.
4. 파생 연산 소비자, facet partition, dataset 삭제 안전성, persistence를 완성한다.

완료: 정렬 생성 함수만 있는 상태가 아니라 생성·수정·재계산·복원의 전체 경로가 통과한다.

### Phase 5 — F09/F10/F11: 라이브러리가 아는 사실을 공개

1. read-only browser-safe entry 제안과 반환 schema를 확정한다.
2. validator/normalizer/capability 정보를 재사용하며 별도 문자열 기반 규칙 엔진을 만들지 않는다.
3. 전 built-in action의 coverage를 inventory하고 지원 범위·조건·미검사를 명시한다.
4. resource/role 단위 변경과 graphic inspection을 분리해 제공한다.
5. 조회는 program/trace를 바꾸지 않으며, 빠른 preflight가 계산 성공까지 보증하지 않음을 타입에 표현한다.

완료: 앱이 runtime source를 복제하지 않고 전제조건, 변경 대상, 실제 검사한 결과를 조회할 수 있다.

### Phase 6 — F12: 후보 반복 실행 성능

1. 0.0.16에서 공통 기능 baseline을 측정하고 새 기능은 첫 올바른 구현을 별도 baseline으로 둔다.
2. 입력 행 공유·파생 결과·materialization·inspection·snapshot 비용을 분리한다.
3. 20개 후보/다단계 후보/parameter 반복/빈 결과 복구/장기 source revision workload를 측정한다.
4. hotspot만 수정한다. 캐시 identity에는 입력·정책·revision을 포함하고 stale 결과를 재사용하지 않는다.
5. Node/browser의 실행 시간과 retained memory, p95, bundle 크기를 고정 환경에서 비교한다.

완료: 성능 수치는 [VALIDATION.md](VALIDATION.md)의 측정 프로토콜로 증명한다. UI 시간 목표를
라이브러리 단독 SLA로 쓰거나 500,000행을 모든 연산의 지원 크기라고 선언하지 않는다.

### Phase 7 — 전체 통합과 인계

- 모든 F의 최소 사례와 실패 사례, create/edit/revise/serialize/facet/consumer matrix를 닫는다.
- types, current contracts, action catalog/cards, MCP 조건, docs/examples, installed package를 동기화한다.
- deliberate architecture 변경은 실제 결과가 확정된 때 SECOND_ARCHITECTURE의 해당 owner에 기록한다.
- 모든 사용자 선택 범위가 Current이거나 명시적인 scope 결정으로 해결되어야 core 완료다.
- 이 계획은 새 버전 번호·PR·main merge·npm publish·문서 deploy를 승인하거나 예약하지 않는다.

## 확장 설계 E01/E02

E01은 지리 데이터를 단순 x/y로 취급하지 않고 coordinate reference, projection, geometry 종류,
경계 횡단·clipping, 지도 영역과 scale 관계를 정해야 한다. 먼저 지원할 geometry/projection 목록을
제안하고 native concrete path primitive와 대응하는 public call을 검토한다.

E02는 image mark뿐 아니라 immutable asset identity/content hash, 크기·fit/crop, SVG embedding,
Canvas/PNG/PDF 호환, 실패·해제·persistence까지 묶는다. 비동기 asset 획득은 host가 소유하고
동기 action이 네트워크를 숨겨 실행하지 않는 안을 우선한다. 두 확장 모두 source-neutral이다.

두 확장은 요구 범위가 정해지기 전에는 새 renderer/state schema를 성급하게 구현하지 않는다.
기존 AGENTS의 새 visual target 검토 규칙이 적용되며, 보이지 않은 이미지에 대한 승인을 기록하지 않는다.

## 승인·진행 기록

G0–G7의 구현 결정과 승인 근거는 [DECISIONS.md](DECISIONS.md)에 있다. 구현·타입·문서·패키지
검증은 완료됐다. 외부 npm publish, release tag, 문서 배포는 별도 운영 작업이며 실행되지 않았다.
