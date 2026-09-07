# 공통 계약 C01–C12

상태: Proposed. 각 기능 문서가 특별히 다른 동작을 명시하면 해당 규칙이 우선한다. 기존 API의 이미 보장된 기본값을 이 문서의 새 기본값으로 소급 변경하지 않는다. 이 문서는 현재 public contract가 아니다.

## C01 — 계층과 불변성

Chart facade → focused domain action → shared semantic operation → materializer → graphic primitives 순서를 유지한다. facade만 기능을 갖거나 모든 일을 generic raw mutation으로 처리하는 구현을 허용하지 않는다. 기존 action wrapper를 호출해 부모/자식 trace를 유지한다. semanticSpec는 의미, graphicSpec는 완전한 backend-neutral 결과다. renderer가 semanticSpec나 data를 읽어 통계를 다시 계산하면 안 된다.

새 action은 입력 program과 caller options를 변경하지 않고 새 ChartProgram을 반환한다. validation/runtime failure에서 입력 program의 semanticSpec, graphicSpec, context, materializationConfigs, trace를 모두 보존한다. action 호출의 반환값을 받기 전에는 외부 state를 바꾸지 않는다. 파일/네트워크/현재시각은 materialization의 입력이 아니다.

## C02 — 대상과 identity

기존 선택 추론은 현재 계약을 보존한다. 새로운 edit/remove는 feature에 예외가 없는 한 ID 필수다. '첫 번째 mark/scale/data' fallback 금지. stable semantic owner ID, revision dataset ID, materialized graphic ID를 구별한다. 표시명·배열 index는 stable identity가 아니다. R20 dimension=field, R38 block=channel set, R39 categories=typed scalar가 각 owner다.

R43 public `r`는 기존 encodeR의 사용자 표현이고 semantic channel은 `radius`다. alias resolver에서 한 번 normalize한다. 동일 API 객체 안에 r와radius를 동시에 받아 두 상태를 만들지 않는다. API 이름·타입 alias는 [API 계약 보충](API_DETAILS.md)을 따른다.

## C03 — 입력 정규화와 patch

모든 options는 plain object, unknown keys는 오류, field/id는 nonempty string과 기존 user ID validator. JSON-safe scalar=string|finite number|boolean|null이며 NaN/Infinity/symbol/function/object를 scalar로 허용하지 않는다. groupBy:string|readonly string[]는 중복 없는 배열로 normalize하고 생략은[]; source 생략은 현재 단일 currentData inference를 재사용한다. 새 create의 id는 명시 필수다.

새 partial edit의 omission은 기존 requested 값 유지다. undefined는 키 없는 호출로 normalize하되 현재 strict validator가 undefined를 거부하는 곳은 호환을 유지한다. null은 값 또는 feature가 명시한 reset일 때만 허용. false는 명시 toggle off일 때만. auto는 기능 문서의 열거된 필드에서만 reset/자동모드. 배열/AST/labelMap/as/object union은 전체 교체이며 재귀 merge 금지. 서로 배타적인 mode를 바꾸면 이전 mode 전용 필드를 제거하는 normalization 규칙을 타입 union과 동일하게 적용한다. 검증 없이 {...old,...patch}로 resolved 상태를 합치지 않는다.

## C04 — 수치와 순서

Quantitative input은 finite number. missing field 이름 오류와 값 null/undefined를 구별하며 nullable behavior는 R05/R06/R09에서만 명시적으로 확장한다. NaN/Infinity를 결측으로 silently drop하지 않는다. output field collision 금지; R05 impute의 지정 field 대체만 예외.

Stable sort는 동률에서 source order, typed scalar는 string"1"과number1을 구분. group key는 JSON 문자열 단순 join이 아니라 현재 scalar grouping helper를 사용한다. group순서는 first appearance, 출력 source order 보존 여부는 각 transform contract를 따른다. 통계는 compensated/scaled accumulation으로 finite range를 검증한다. tolerance는 계산 magnitude에 따라 명시하고 eps로 잘못된 결과를 통과시키지 않는다.

## C05 — requested와 resolved

사용자가 요청한 formula/frame/domain/weight/theme/labelMap은 canonical requested provenance로 저장. auto bandwidth/quantile threshold/selected item indices/effective frame/label anchor는 resolved result다. edit/facet/repeat가 resolved를 requested로 재사용하지 않는다. 현재 transforms의 requested extractor와 replayTransform policy를 하나의 owner에서 확장한다.

데이터 transforms는 plain canonical AST/definition; callbacks/eval/host function은 금지. row-preserving/statistical/final-item topology는 각 transform에 명시적으로 등록한다. statistical은 source grain partition 후 recompute; row-preserving도 실제 upstream source provenance를 보존한다.

## C06 — 명시적인 변경 계획

[STATE_AND_REPLAY.md](STATE_AND_REPLAY.md)의 순서를 사용한다. 기존 planner는 scales/marks/guides/layout/highlights stage를 가진다. 새 data stage를 자동 compiler로 숨겨 추가하지 않는다. data editor가 upstream부터 명시 계산하고 기존 planner를 호출한다. selection predicate 평가와 highlight drawing은 다른 시점이며 R32 labels가 이전 membership을 읽지 않게 한다.

최종 상태 전체를 검증한 뒤 commit하는 원자성이 필요하다. R19는 단일 encode를 즉시 반복 실행한 중간 상태를 최종처럼 검증하지 않는다. 일부 child를 성공 처리하고 실패한 child를 버리는 best-effort는 금지한다.

## C07 — ownership과 삭제

Chart facade-owned derived data, source-owned labels, legend child graphics, facet-generated children은 stable owner를 통해 편집/삭제한다. 같은 transform type이라도 독립 dataset과 chart-owned internal dataset의 editor 권한은 다르다. 삭제는 semantic/config/graphic/reference closure를 함께 계산한다. R25는 external refs가 있으면 reject하며 cascade 옵션을 추가하지 않는다.

일반 remove가 owner rule을 우회해서 기존 보호를 해제하면 안 된다. R31은 optional label subtree 삭제의 명시적 예외다. R02 revision release는 current live reference registry로 안전성을 확인한다. R25의 standalone owner 삭제에서는 owner.current 자기 참조만 제외하고 외부 consumer와 retained source를 모두 검사한다.

## C08 — 호환 행렬

각 기능은 unit chart, source-owned child, layered chart, concat, Cartesian facet/repeat, R43 이후 Polar/Parallel facet/repeat에 대해 적용/미적용/오류를 기록한다. R43 구현 전 각 feature는 그 새 family cell을 '후속 R43 통합 대기'로 남기고 자기 phase를 거짓 전체 완료로 표시하지 않는다. Roadmap12에서 모든 필수 cell을 닫는다.

신규 public API 기본 제공 범위는 Full entry다. basic의 고정 capability 범위에 자동 승격하지 않는다. 기존 basic가 공유하는 내부 renderer/schema에는 backwards-compatible 속성 표현만 확장하고 basic method inventory는 그대로 검증한다. Full-only method가 basic prototype에 leak하면 실패. extension primitive를 ordinary user-facing action card로 분류하지 않는다.

## C09 — style/guide precedence

Theme base → custom tokens → 기존 explicit user style override의 precedence. data encoding과 constant style의 precedence는 현재 해당 channel contract 유지. 새로운 channel stroke는 현재 color 역할을 바꾸지 않는다. legend root common style → block override; facet common header style → role-specific override. computed content/geometry를 style override registry에 넣지 않는다.

새 style/mapping이 재인코딩/resize/source edit 뒤 사라지는 것은 실패다. 명시적으로 제거한 label/block/override가 replay 후 부활해도 실패다.

## C10 — 오류와 성능

오류는 operation 이름, target/referrer, 문제 option/value 또는 row/field를 포함하되 전체 dataset을 출력하지 않는다. malformed 옵션은 TypeError, 유효 범위 위반은 RangeError, ownership/ambiguity/참조 충돌은 기존 Error family를 따른다. 기존 error text를 불필요하게 바꾸지 않는다. 테스트는 필요한 의미 정보를 검사하고 전체 한국어/영어 prose를 고정하지 않는다.

Complete output 상한10,000 rows는 preflight count로 적용. AST depth16/nodes128/work10M 유지. duration windows는 stable sort O(n log n)+scan O(n), weighted frequency는 W개 row 복제 금지. transform output 크기에 비례한 순회는 허용하되 source×source 무한 조합/재귀 replay를 피한다. 큰 입력 테스트는 wall time hard threshold 대신 operation count/출력 cardinality/메모리 전략을 검증하고 관측 시간은 참고 기록한다.

## C11 — public contract와 패키지

한 기능 완료 surface: Full method registry, internal wrapped actions, types와 exports, current contract, ACTION_INDEX, generated catalog/relations/cards, docs signatures/reference, MCP tools/resources/task resolver, runtime and strict type consumer, package installed Node/browser, renderer entries. capability only인 기존 option 확장은 direct method를 인위적으로 늘리지 않는다.

Proposed 후보는 이 Roadmap의 PROPOSALS.json 및 phase-local CANDIDATES.json에만 둔다. 세부 계약 승인 이전 Planned/current inventory 오염 금지. Gate 후 승인 범위만 Planned → Implemented/Current 이동. 문서/타입만 선언하고 함수가 없는 ghost API는 금지다.

## C12 — 검증과 종료

각 기능 문서의 수치/오류 tests + 이전 버전의 supported-control regressions + lifecycle integration + 해당 render/backend/package tests가 모두 필요하다. 실행하지 않은 테스트를 passed라고 적지 않는다. 시각 Gate는 primitive 먼저, public 후 same-run decoded pixel parity이며 서로 다른 backend간 pixel exact를 요구하지 않는다.

검증 명령과 결과 양식은 [VALIDATION.md](VALIDATION.md). 구현 phase는 사용자의 명시 승인이 없는 gate 이후 작업을 시작하지 않는다. 로드맵 작성 자체는 구현 승인을 기록하는 행위가 아니다. 이 규칙은 저장소 `agent_docs/impl/AGENTS.md`의 gate 요구를 적용한 것으로 새로운 임의 승인 절차가 아니다.
