# Roadmap 6 — 전체 항목 추적 원장

이번 범위의 B01–B08, D01–D20, F01–F19 총 47개 항목을 추적한다. Phase 1의 실행 상태와 검증 결과는
[실행 증거](phase1/RESULTS.md)에 기록하며, 나머지 항목은 별도 표시가 없으면 Proposed / 미구현이다.
사용자는 2026-09-05 F20 제외와 나머지 19개 액션군 구성을 선택했다. F20은 실행·연구·완료 대상이 아니며
원래 관측은 고정된 감사 기록에만 남긴다.
Primary owner는 누락 방지를 위한 책임 단위이며, 관련 작업이 여러 단계에 있으면 함께 닫아야 한다.
각 항목의 원래 관측·코드 근거는 [감사 보고서](audit/REPORT.md), 모든 기존 액션과의 연결은
[173개 전수표](audit/ACTION_INVENTORY.md)에 있다. 기계 판독본은 [PROPOSALS.json](PROPOSALS.json)이다.

## 재현 오류·계약 불일치 8건

| ID | 항목 | Primary owner | 관련 작업 |
| --- | --- | --- | --- |
| B01 | 가로 Bar shorthand의 순서 의존 실패 | [R6-P1-W1](phase1/GOAL.md) | R6-P1-W1, R6-P2-W5 |
| B02 | MCP Area의 빈 chart 거짓 완료 | [R6-P1-W4](phase1/GOAL.md) | R6-P1-W4 |
| B03 | MCP Strip의 unpositioned Tick 거짓 완료 | [R6-P1-W4](phase1/GOAL.md) | R6-P1-W4 |
| B04 | MCP Radial bar의 Cartesian layer 혼입 | [R6-P1-W4](phase1/GOAL.md) | R6-P1-W4 |
| B05 | 미완성 derived data 소비의 internal TypeError | [R6-P1-W2](phase1/GOAL.md) | R6-P1-W2 |
| B06 | Point/Bar stroke:false의 runtime·type·prose 불일치 | [R6-P1-W3](phase1/GOAL.md) | R6-P1-W3 |
| B07 | 가로 temporal Bar의 type 누락 | [R6-P1-W1](phase1/GOAL.md) | R6-P1-W1 |
| B08 | Internal wrapped inventory 16개 누락 | [R6-P1-W5](phase1/GOAL.md) | R6-P1-W5 |

### B01 — 가로 Bar shorthand의 순서 의존 실패

- Rationale: 동일한 category/measure 의미는 x/y 방향이나 child 작성 순서에 따라 성공 여부가 달라져서는 안 된다.
- 수정·추가 방향: Facade에서 x/y category·measure를 함께 preflight하고 기존 position owner를 호출한다. 수평 temporal category type을 공통 role union으로 표현한다. Mean default는 유지한다.
- 완료 검증: 가로/세로 shorthand, explicit aggregate, temporal category가 runtime와 strict TS에서 일치. 잘못된 양쪽 category/measure 조합은 명확히 거부.
- 근거: audit/probe-results.json: P35–P37. [원래 조사](audit/REPORT.md)
- 처분: W1에서 facade의 양방향 shorthand를 교정하고 검증했다. P37의 lower measure-first 작성은 D14 / R6-P2-W5에 남아 있으므로 B01 전체는 아직 닫지 않는다. [실행 증거](phase1/RESULTS.md#w1--bar-pair-role와-temporal-선언)

### B02 — MCP Area의 빈 chart 거짓 완료

- Rationale: 필수 baseline이 없는 area는 함수 호출 성공만으로 chart 요구를 충족하지 않는다.
- 수정·추가 방향: Area/Strip의 complete-chart provider를 실제 완성 경로 또는 unresolved로 바꾼다. Radial-bar가 generic bar를 shadow하게 한다. Raw mark 요청은 별도 provider로 유지한다.
- 완료 검증: 7개 probe를 실행해 필수 encoding·item grain·coordinate·extra layer를 검사. 지원 안 된 요구를 unresolved=[]로 반환하지 않음. 비용 드는 모델 호출 불필요.
- 근거: audit/mcp-execution.json: area chart. [원래 조사](audit/REPORT.md)
- 처분: generic Area scaffold의 baseline을 unresolved로 표시해 거짓 완료를 교정했다. 완성 Area API는 F05에 남는다. [실행 증거](phase1/RESULTS.md#w4--mcp-chart-closure와-phrase-우선순위)

### B03 — MCP Strip의 unpositioned Tick 거짓 완료

- Rationale: Tick 하나의 생성과 완성된 1D chart를 구분해야 한다.
- 수정·추가 방향: Area/Strip의 complete-chart provider를 실제 완성 경로 또는 unresolved로 바꾼다. Radial-bar가 generic bar를 shadow하게 한다. Raw mark 요청은 별도 provider로 유지한다.
- 완료 검증: 7개 probe를 실행해 필수 encoding·item grain·coordinate·extra layer를 검사. 지원 안 된 요구를 unresolved=[]로 반환하지 않음. 비용 드는 모델 호출 불필요.
- 근거: audit/mcp-execution.json: strip plot. [원래 조사](audit/REPORT.md)
- 처분: Strip chart를 raw Tick intent에서 분리하고 Point placement를 unresolved로 표시했다. 완성 Strip/Rug API는 F08에 남는다. [실행 증거](phase1/RESULTS.md#w4--mcp-chart-closure와-phrase-우선순위)

### B04 — MCP Radial bar의 Cartesian layer 혼입

- Rationale: 구체적인 chart 요청에 다른 coordinate의 layer가 추가되는 것은 과잉 매칭이다.
- 수정·추가 방향: Area/Strip의 complete-chart provider를 실제 완성 경로 또는 unresolved로 바꾼다. Radial-bar가 generic bar를 shadow하게 한다. Raw mark 요청은 별도 provider로 유지한다.
- 완료 검증: 7개 probe를 실행해 필수 encoding·item grain·coordinate·extra layer를 검사. 지원 안 된 요구를 unresolved=[]로 반환하지 않음. 비용 드는 모델 호출 불필요.
- 근거: audit/mcp-execution.json: radial bar chart. [원래 조사](audit/REPORT.md)
- 처분: 겹친 일반 Bar/Area phrase만 shadow하며 별도 요청한 chart는 유지한다. D01 radius default와 Rose 의미 정리는 Phase 4에 남는다. [실행 증거](phase1/RESULTS.md#w4--mcp-chart-closure와-phrase-우선순위)

### B05 — 미완성 derived data 소비의 internal TypeError

- Rationale: 공개 definition-only 결과의 제한은 소비 시 domain error로 설명되어야 한다.
- 수정·추가 방향: Definition-only dataset과 materialized dataset을 구별한다. Scatter뿐 아니라 같은 consumer selection owner를 쓰는 진입점에 domain precondition을 적용한다.
- 완료 검증: createDerivedData 자체 계약 유지. 후속 action이 internal TypeError 대신 필요한 materialized data를 설명하고 원래 program/trace는 보존.
- 근거: audit/probe-results.json: P18–P19. [원래 조사](audit/REPORT.md)
- 처분: 공통 selector에서 chart/mark의 materialized values를 검증하도록 교정했다. 정의·internal rebind·빈 배열·불변성을 검증했고 Phase 1 X 검토를 기다린다. [실행 증거](phase1/RESULTS.md#w2--definition-only-data-소비)

### B06 — Point/Bar stroke:false의 runtime·type·prose 불일치

- Rationale: JavaScript에서 이미 허용하는 호출을 TypeScript와 문서가 잘못 거부한다.
- 수정·추가 방향: Point/Bar의 실제 허용 범위를 declarations, shared alias, Current prose에 맞춘다. Rect 비교 사례를 유지하고 Area/Arc 확장은 이 수정과 분리한다.
- 완료 검증: JS·TS의 동일 positive/negative case 결과, unknown style option 거부, 기존 render 유지.
- 근거: audit/probe-results.json: P08; audit/type-results.txt. [원래 조사](audit/REPORT.md)
- 처분: Point/Bar create/edit와 관련 facade의 shared stroke 선언을 runtime과 맞췄다. Rect 비교와 Area/Arc의 기존 제한, strict installed consumer를 검증했고 Phase 1 X 검토를 기다린다. [실행 증거](phase1/RESULTS.md#w3--strokefalse-정합성)

### B07 — 가로 temporal Bar의 type 누락

- Rationale: category/measure 역할이 같으면 타입의 수평·수직 지원도 같아야 한다.
- 수정·추가 방향: Facade에서 x/y category·measure를 함께 preflight하고 기존 position owner를 호출한다. 수평 temporal category type을 공통 role union으로 표현한다. Mean default는 유지한다.
- 완료 검증: 가로/세로 shorthand, explicit aggregate, temporal category가 runtime와 strict TS에서 일치. 잘못된 양쪽 category/measure 조합은 명확히 거부.
- 근거: audit/probe-results.json: P38; audit/type-results.txt. [원래 조사](audit/REPORT.md)
- 처분: runtime에 이미 있던 temporal y 지원을 선언에 반영했고 strict positive/negative와 모든 nested scale 경로 실행이 통과했다. 구현·검증 완료, Phase 1 X 검토 대기. [실행 증거](phase1/RESULTS.md#w1--bar-pair-role와-temporal-선언)

### B08 — Internal wrapped inventory 16개 누락

- Rationale: 부분적인 이름 패턴 검사는 전체 wrapped surface의 누락을 보장하지 못한다.
- 수정·추가 방향: 등록 wrapped method = direct ∪ internal, 교집합 없음, manifest orphan 없음의 전체 집합 대조를 만든다. 누락 16개를 internal에 기록한다.
- 완료 검증: 현재 기준 direct173/internal111/registered284와 일치하며 임의 internal method 누락을 탐지한다. Public promotion 없음.
- 근거: audit/inventory-reconciliation.json. [원래 조사](audit/REPORT.md)
- 처분: 16개를 internal manifest에 보완하고 wrapper metadata 기반 전체 집합과 문서 owner를 검사한다. 173 direct + 111 internal = 284 registered이며 public promotion은 없다. [실행 증거](phase1/RESULTS.md#w5--internal-inventory-전체-집합)

## 설계 문제 20건

| ID | 항목 | Primary owner | 관련 작업 |
| --- | --- | --- | --- |
| D01 | Radius default와 Rose area 의미 | [R6-P4-W3](phase4/GOAL.md) | R6-P4-W3 |
| D02 | Group identity와 appearance field 결합 | [R6-P2-W2](phase2/GOAL.md) | R6-P2-W2 |
| D03 | Color에 종속된 layout과 전환 제한 | [R6-P4-W2](phase4/GOAL.md) | R6-P4-W2 |
| D04 | Complete facade와 deferred composite의 역할 혼합 | [R6-P2-W1](phase2/GOAL.md) | R6-P2-W1 |
| D05 | Guide default와 facade 중첩 비대칭 | [R6-P2-W1](phase2/GOAL.md) | R6-P2-W1 |
| D06 | Constant/field/create/edit style의 비대칭 | [R6-P2-W3](phase2/GOAL.md) | R6-P2-W3 |
| D07 | Cartesian/Polar/Parallel 축 lifecycle 공백 | [R6-P5-W1](phase5/GOAL.md) | R6-P5-W1 |
| D08 | Legend kind별 edge·recipe·편집 차이 | [R6-P5-W2](phase5/GOAL.md) | R6-P5-W2 |
| D09 | Type·aggregate·temporal inference의 분석 의미 | [R6-P2-W4](phase2/GOAL.md) | R6-P2-W4 |
| D10 | 통계 grouping inference와 JSON opt-out | [R6-P2-W4](phase2/GOAL.md) | R6-P2-W2, R6-P2-W4 |
| D11 | CI method와 level 어휘 불일치 | [R6-P6-W3](phase6/GOAL.md) | R6-P6-W3 |
| D12 | Data snapshot·revision·소비 lifecycle | [R6-P6-W1](phase6/GOAL.md) | R6-P6-W1 |
| D13 | Label source·content·format·angle 단위 | [R6-P5-W3](phase5/GOAL.md) | R6-P5-W3 |
| D14 | Order와 incomplete width의 부분 지원 | [R6-P2-W5](phase2/GOAL.md) | R6-P2-W5, R6-P4-W4 |
| D15 | 반복 filter와 empty view 공백 | [R6-P6-W4](phase6/GOAL.md) | R6-P6-W4 |
| D16 | Composite source·position·orientation 편집 공백 | [R6-P6-W5](phase6/GOAL.md) | R6-P6-W5 |
| D17 | Program theme와 명시적 fitting 부재 | [R6-P5-W4](phase5/GOAL.md) | R6-P5-W4, R6-P5-W5 |
| D18 | Diverging midpoint와 scale/legend 전환 | [R6-P4-W5](phase4/GOAL.md) | R6-P4-W5 |
| D19 | Facet/repeat/child 구조 편집의 한계 | [R6-P10-W1](phase10/GOAL.md) | R6-P10-W1, R6-P10-W2, R6-P10-W3 |
| D20 | Discovery hierarchy·lifecycle·status metadata | [R6-P11-W1](phase11/GOAL.md) | R6-P11-W1 |

### D01 — Radius default와 Rose area 의미

- Rationale: Radius-length와 sector area는 서로 다른 측정이다. 양수 최솟값을 보이지 않게 하는 size-chart default도 구분해야 한다.
- 수정·추가 방향: Equal-angle area mode와 zero-baseline radius-length mode를 구분한다. Arc·theta/radius owner를 재사용하고 inner radius를 포함한 area mapping을 확정한다.
- 완료 검증: 값2·3·4가 모두 표현됨. Area 비율·radius-length 비율 각각 독립 수치 검증. Polar scatter 기본 encodeR는 바뀌지 않음.
- 근거: audit/REPORT.md: D01. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D02 — Group identity와 appearance field 결합

- Rationale: Series identity가 같은 field의 color만 허용할 이유는 없다. Appearance는 final-series grain에서 검증한다.
- 수정·추가 방향: encodeGroup의 identity와 color/dash/width의 final-series appearance를 분리한다. Multi-key group을 충돌 없는 구조로 다룬다. Existing inferred grouping의 호환 경로를 유지한다.
- 완료 검증: country group+continent color 성공; 한 series의 모호한 appearance 거부; field 작성 순서와 group edit 뒤 수렴.
- 근거: audit/REPORT.md: D02. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D03 — Color에 종속된 layout과 전환 제한

- Rationale: 색을 바꾸지 않고도 배치를 바꿀 수 있어야 하며 서로 의존하는 offset·scale을 함께 전환해야 한다.
- 수정·추가 방향: Group/stack/fill/overlay/diverging을 atomic owner에 모은다. 기존 color.layout/measure.stack/offset 경로가 owner에 위임하도록 migration한다.
- 완료 검증: group→stack→group에서 scale, offset, normalization, guides, selections에 stale 상태 없음. Negative/missing/group conflict atomic.
- 근거: audit/REPORT.md: D03. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D04 — Complete facade와 deferred composite의 역할 혼합

- Rationale: 이름보다 완료 조건과 이후 edit owner를 정확히 알려야 한다. 기존 deferred 작성 가능성도 유지한다.
- 수정·추가 방향: Box/Gradient deferred 역할을 metadata에 명시한다. H0는 compatible guide를 재사용하고 missing만 생성한다. Low-level create strictness는 유지한다. Box guides default는 초기에는 유지하는 안을 확정한다.
- 완료 검증: Scatter→Line 기본 조합 성공, incompatible scale guide는 atomic conflict. omitted/{} /false matrix가 facade와 child별로 명시됨.
- 근거: audit/REPORT.md: D04. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D05 — Guide default와 facade 중첩 비대칭

- Rationale: 상위 facade를 쌓을 때 중복 guide 때문에 실패하거나 차트에 부적합한 축을 자동 생성하면 계층 조합성이 깨진다.
- 수정·추가 방향: Box/Gradient deferred 역할을 metadata에 명시한다. H0는 compatible guide를 재사용하고 missing만 생성한다. Low-level create strictness는 유지한다. Box guides default는 초기에는 유지하는 안을 확정한다.
- 완료 검증: Scatter→Line 기본 조합 성공, incompatible scale guide는 atomic conflict. omitted/{} /false matrix가 facade와 child별로 명시됨.
- 근거: audit/REPORT.md: D05. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D06 — Constant/field/create/edit style의 비대칭

- Rationale: 같은 시각 속성이 mode·생성 경로에 따라 다른 지원 범위와 충돌 규칙을 가져서는 안 된다.
- 수정·추가 방향: Line constant width/opacity, Scatter point radius, Rule style 경로를 공통 owner로 연결한다. ErrorBand fill의 semantic color/legend 충돌을 명시적 assignment 교체로 정리한다.
- 완료 검증: create/edit/field/constant 지원 matrix 일치. Override 뒤 scale·legend가 거짓 의미를 설명하지 않음. Local highlight override 별도 유지.
- 근거: audit/REPORT.md: D06. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D07 — Cartesian/Polar/Parallel 축 lifecycle 공백

- Rationale: 완성 chart가 있는 좌표에서도 public component style과 복원 경로가 필요하다.
- 수정·추가 방향: Cartesian/Polar/Parallel component create/edit/remove/recreate matrix를 완성한다. Polar focused 생성의 공개 경계를 정리하고 dimension-key 기반 editParallelAxis를 설계한다.
- 완료 검증: title:false→create title→edit→remove→recreate가 public chain으로 가능. Font/format/tick count가 resize·scale edit 뒤 유지.
- 근거: audit/REPORT.md: D07. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D08 — Legend kind별 edge·recipe·편집 차이

- Rationale: Legend 내용과 위치의 책임을 분리해야 지원 matrix와 recipe 변경을 일관되게 설명할 수 있다.
- 수정·추가 방향: Standalone/combined size, categorical/continuous/interval/width legend의 edge 지원과 recipe 편집을 공통 layout owner로 연결한다. Legacy bottom mode를 명시한다.
- 완료 검증: 지원하는 각 kind×edge×lifecycle 검증, unsupported 셀 이유 명시. Combined color/shape 일부 제거 뒤 설명과 graphics가 일치.
- 근거: audit/REPORT.md: D08. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D09 — Type·aggregate·temporal inference의 분석 의미

- Rationale: Numeric라는 이유만으로 type·집계·time 해석까지 자동 결정하면 사용자가 의도하지 않은 분석이 된다.
- 수정·추가 방향: Explicit type/schema/temporal unit/aggregate를 우선하는 선택표를 확정한다. groupBy:false의 JSON round trip을 제공하고 create omission과 edit preservation을 구분한다.
- 완료 검증: numeric nominal color, mean Bar, year/timestamp 기존 결과 비교. 생략·false·undefined·auto의 source/trace/serialization 의미를 검사.
- 근거: audit/REPORT.md: D09. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D10 — 통계 grouping inference와 JSON opt-out

- Rationale: 시각 appearance가 fit partition을 암묵적으로 바꾸거나 JSON 전송이 opt-out을 잃어서는 안 된다.
- 수정·추가 방향: Explicit type/schema/temporal unit/aggregate를 우선하는 선택표를 확정한다. groupBy:false의 JSON round trip을 제공하고 create omission과 edit preservation을 구분한다.
- 완료 검증: numeric nominal color, mean Bar, year/timestamp 기존 결과 비교. 생략·false·undefined·auto의 source/trace/serialization 의미를 검사.
- 근거: audit/REPORT.md: D10. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D11 — CI method와 level 어휘 불일치

- Rationale: 동일한 CI라는 말로 서로 다른 결과를 설명하지 않도록 method·level·provenance가 필요하다.
- 수정·추가 방향: Normal approximation과 Student-t를 method로 구분한다. ciLower/Upper와 Interval/Regression 어휘·계산 owner·provenance를 정리하되 기존 결과를 migration 없이 바꾸지 않는다.
- 완료 검증: [1,2,3]의 두 기존 upper를 각각 재현. n0/n1/constant/grouped/missing과 method·level 오류를 독립 oracle로 검사.
- 근거: audit/REPORT.md: D11. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D12 — Data snapshot·revision·소비 lifecycle

- Rationale: 재사용 가능한 data와 편집되는 logical owner의 identity를 나눠야 안전한 변경이 가능하다.
- 수정·추가 방향: Definition-only와 materializing transform을 구분한다. create/edit-owner/snapshot 관계와 Bin2D legacy reauthor를 정리하고 public bindMarkData의 full preflight를 만든다.
- 완료 검증: Immutable 이전 program 유지. Field/type/grain/coordinate/scale/guide/selection incompatibility에 atomic failure, compatible revision은 orphan cleanup.
- 근거: audit/REPORT.md: D12. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D13 — Label source·content·format·angle 단위

- Rationale: Label은 최종 표시된 mark의 grain과 anchor를 알아야 집계값과 share를 정확히 설명한다.
- 수정·추가 방향: 명시적 source mark와 category/aggregate/share content, data/plot anchor reference, annotation을 text/rule/rect owner 위에 제공한다. Axis/legend/text formatter·rotation unit을 정리한다.
- 완료 검증: 집계 Bar/Pie에 final item당 label 하나, percent 분모 검증. Multiple eligible marks에서 explicit source가 작동. Scale/data/filter 후 label과 anchor 수렴.
- 근거: audit/REPORT.md: D13. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D14 — Order와 incomplete width의 부분 지원

- Rationale: 미완성 작성과 명시적 order는 아래층에서 시작하는 workflow의 핵심이다.
- 수정·추가 방향: Bar width와 measure-first encoding 중 geometry 없이 검증 가능한 intent를 보존한다. Missing positions 완료 시 원래 requested width와 role을 적용한다.
- 완료 검증: width-first/last, category-first/measure-first의 semantic/graphic 동등성. Invalid field/width는 즉시 거부, placeholder graphics 없음.
- 근거: audit/REPORT.md: D14. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D15 — 반복 filter와 empty view 공백

- Rationale: 필터는 일회성 생성 외에 수정·해제·empty 상태로 돌아가는 workflow가 있어야 한다.
- 수정·추가 방향: Final-item filter의 기준 source와 active recipe를 저장한다. 반복 ID collision을 없애고 명시적 해제와 domain 유지 empty view를 제공한다.
- 완료 검증: 같은 filter 반복 idempotent, replace/compose 서로 다른 기대 결과. Empty item cleanup과 이전 program 보존, 독립 통계 layer 비의도 변경 없음.
- 근거: audit/REPORT.md: D15. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D16 — Composite source·position·orientation 편집 공백

- Rationale: 사용자가 생성할 때 지정한 역할은 이후에도 같은 의미 단위로 수정할 수 있어야 한다.
- 수정·추가 방향: Violin의 source/category/value/split/orientation, ErrorBar/Band의 source/position/interval roles를 atomic owner edit로 제공한다. Box/Gradient/Regression의 vocabulary와 비교한다.
- 완료 검증: 생성→source 교체→방향 전환→style edit가 한 owner identity를 유지. Scale/guide/labels downstream이 수렴하고 부적합 변경은 전부 실패.
- 근거: audit/REPORT.md: D16. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D17 — Program theme와 명시적 fitting 부재

- Rationale: Theme과 text fitting은 재사용 가능한 스타일·layout 결정이며 raw graphic 수동 변경으로 대신하기 어렵다.
- 수정·추가 방향: Theme owner를 추가하고 기존 font/color token과 mark·guide default를 연결한다. Explicit local/inherited 구분과 reset을 저장한다.
- 완료 검증: Light/dark와 override/reset에서 axes·legend·text·Parallel까지 갱신. Theme 변경 전후 statistical values/group/domain/order 동일.
- 근거: audit/REPORT.md: D17. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D18 — Diverging midpoint와 scale/legend 전환

- Rationale: Diverging palette만으로 의미 중심값이 생기지 않는다. Scale과 legend가 같은 의미를 공유해야 한다.
- 수정·추가 방향: 명시적 semantic midpoint를 추가하고 sequential/discretized/diverging recipe transition을 shared consumers 전체와 함께 preflight한다.
- 완료 검증: 비대칭 domain에서 midpoint의 neutral color 검증. Legend 유무·복수 mark에서 전환 동일. Incompatible consumer 하나면 전부 rollback.
- 근거: audit/REPORT.md: D18. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D19 — Facet/repeat/child 구조 편집의 한계

- Rationale: 반복 비교 chart의 data·scale·guide 책임을 canonical recipe에서 관리해야 편집 뒤 일관성이 유지된다.
- 수정·추가 방향: Row×column facet과 field repeat를 목적별로 제공한다. Observed vs full category combinations, empty cells, order와 shared domain을 명시한다.
- 완료 검증: 2D facet identity/order, empty-cell policy, shared/independent scale 결과, legend 설명 보존. 전체 source edit 후 cell들이 같은 recipe로 재생성.
- 근거: audit/REPORT.md: D19. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### D20 — Discovery hierarchy·lifecycle·status metadata

- Rationale: 발견 가능한 계층·편집 경로·실제 completion을 metadata가 설명해야 API의 설계 철학이 사용자와 MCP에 전달된다.
- 수정·추가 방향: 변경 후 모든 direct/internal action, declarations, Current, card, public docs를 재분류한다. Wraps/editableVia/supports/units/inference/completion과 실제 public trace를 대조한다.
- 완료 검증: 미분류 direct action 0, supported 주장과 runtime/type 불일치 0. Proposed/Planned/Current 잔여 문장과 selectMarks lifecycle drift 정리.
- 근거: audit/REPORT.md: D20. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

## 추가 액션군 19개

| ID | 항목 | Primary owner | 관련 작업 |
| --- | --- | --- | --- |
| F01 | Pie / Donut | [R6-P3-W1](phase3/GOAL.md) | R6-P3-W1 |
| F02 | Polar Scatter / Line | [R6-P7-W1](phase7/GOAL.md) | R6-P7-W1 |
| F03 | Radar | [R6-P7-W2](phase7/GOAL.md) | R6-P7-W2 |
| F04 | Rose / Radial bar | [R6-P4-W3](phase4/GOAL.md) | R6-P4-W3 |
| F05 | Area / baseline / range | [R6-P4-W1](phase4/GOAL.md) | R6-P4-W1 |
| F06 | Density | [R6-P3-W2](phase3/GOAL.md) | R6-P3-W2 |
| F07 | Horizon | [R6-P3-W3](phase3/GOAL.md) | R6-P3-W3 |
| F08 | Rug / Strip | [R6-P7-W3](phase7/GOAL.md) | R6-P7-W3 |
| F09 | Beeswarm / point packing | [R6-P9-W1](phase9/GOAL.md) | R6-P9-W1 |
| F10 | Interval / Regression complete plot | [R6-P8-W1](phase8/GOAL.md) | R6-P8-W1 |
| F11 | Dot / Lollipop / Dumbbell | [R6-P8-W2](phase8/GOAL.md) | R6-P8-W2 |
| F12 | Raincloud | [R6-P9-W2](phase9/GOAL.md) | R6-P9-W2 |
| F13 | ECDF data / plot | [R6-P8-W3](phase8/GOAL.md) | R6-P8-W3 |
| F14 | Mark labels / reference / annotation | [R6-P5-W3](phase5/GOAL.md) | R6-P5-W3 |
| F15 | Summary / bin / fold / computed / stack data | [R6-P6-W2](phase6/GOAL.md) | R6-P6-W2 |
| F16 | Data binding / transform revision / role edit | [R6-P6-W1](phase6/GOAL.md) | R6-P6-W1, R6-P6-W4, R6-P6-W5 |
| F17 | Polar component / Parallel axis / guide edit | [R6-P5-W1](phase5/GOAL.md) | R6-P5-W1 |
| F18 | Theme / typography / format / fitting | [R6-P5-W4](phase5/GOAL.md) | R6-P5-W3, R6-P5-W4, R6-P5-W5 |
| F19 | Facet grid / repeat / child structure | [R6-P10-W1](phase10/GOAL.md) | R6-P10-W1, R6-P10-W2, R6-P10-W3 |

### F01 — Pie / Donut

- Rationale: Arc/theta는 이미 있으므로 가장 직접적인 H0 공백을 작은 facade로 메운다.
- 수정·추가 방향: Category count, 명시적 weighted sum, arc options, Pie guide defaults를 연결한다. Donut은 동일 owner의 alias 여부만 결정한다. Labels는 Phase 5 후속 opt-in으로 분리한다.
- 완료 검증: category count·중복 category sum·donut hole·no axes/grid·하위 edit chain이 chart 계약과 일치. Facade-child semantic/graphic 동등성.
- 근거: audit/REPORT.md: F01. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F02 — Polar Scatter / Line

- Rationale: Cartesian과 같은 추상화 수준에서 Polar chart를 시작할 수 있게 한다.
- 수정·추가 방향: Point/line→theta/radius→group/color→Polar guides를 연결한다. Radial position과 glyph size, theta unit, seam/closure를 구분한다.
- 완료 검증: 기존 lower chain과 동일, theta/radius scale edit 후 수렴. Cartesian과 Polar consumer가 잘못 혼합되지 않음.
- 근거: audit/REPORT.md: F02. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F03 — Radar

- Rationale: Closed Polar line의 재사용 경로를 제공하되 wide-form과 normalization 의미를 숨기지 않는다.
- 수정·추가 방향: Closed line, categorical theta order, series와 radius contract를 연결한다. Wide data는 explicit Fold provenance를 통해 long-form으로 만든다.
- 완료 검증: 다른 단위 measure의 자동 정규화 없음. 명시적 per-dimension normalization 또는 same-unit 경로를 구분. Missing/tie/order/closed path 검증.
- 근거: audit/REPORT.md: F03. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F04 — Rose / Radial bar

- Rationale: 비슷한 radial 외형의 서로 다른 측정 의미를 명확한 chart intent로 분리한다.
- 수정·추가 방향: Equal-angle area mode와 zero-baseline radius-length mode를 구분한다. Arc·theta/radius owner를 재사용하고 inner radius를 포함한 area mapping을 확정한다.
- 완료 검증: 값2·3·4가 모두 표현됨. Area 비율·radius-length 비율 각각 독립 수치 검증. Polar scatter 기본 encodeR는 바뀌지 않음.
- 근거: audit/REPORT.md: F04. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F05 — Area / baseline / range

- Rationale: 단순 x/y area의 lower baseline 계약이 먼저 있어야 실제 완성 facade를 만들 수 있다.
- 수정·추가 방향: Constant data endpoint를 lower owner에 추가하고 simple area, ranged ribbon, stacked area를 구분한다. Nonlinear scale과 missing path break를 명시한다.
- 완료 검증: simple x/y 입력이 실제 area를 그림. Baseline/domain/zero/log·range edit 수렴. 가짜 source field와 renderer inference 없음.
- 근거: audit/REPORT.md: F05. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F06 — Density

- Rationale: 이미 완성된 density owner를 상위 의도에 연결한다.
- 수정·추가 방향: createAreaMark→encodeDensity→compatible guides를 연결한다. KDE bandwidth, grouping, densityChannel과 orientation은 기존 owner가 소유한다.
- 완료 검증: 세로/가로·grouped density의 값과 영역이 기존 chain과 동일. editDensity/editAreaMark/editScale 후 owner 유지.
- 근거: audit/REPORT.md: F06. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F07 — Horizon

- Rationale: 이미 완성된 Horizon owner와 guide 제한을 안전한 facade로 제공한다.
- 수정·추가 방향: Area→encodeHorizon→x guide를 연결한다. Baseline, bands, grouping, negative amplitude의 의미를 기존 folded owner에 위임한다.
- 완료 검증: signed data와 editHorizon의 revision 검증. Folded y를 원래 양적 축처럼 표시하거나 internal band color legend를 자동 생성하지 않음.
- 근거: audit/REPORT.md: F07. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F08 — Rug / Strip

- Rationale: 하나의 측정값을 표현할 anchor를 semantic placement로 제공해 dummy field를 없앤다.
- 수정·추가 방향: Rug는 tick+plot edge, Strip은 point+constant/category slot으로 제공한다. Jitter를 explicit optional 배치로 재사용하고 placement 의미를 저장한다.
- 완료 검증: Dummy field 없이 drawable output. Tick/point 구별, x/y 방향, scale/Canvas edit·filter 후 anchor 유지. MCP complete-chart provider가 이 경로를 사용.
- 근거: audit/REPORT.md: F08. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F09 — Beeswarm / point packing

- Rationale: Jitter와 구별되는 실제 glyph collision 문제를 재사용 가능한 layout owner로 해결한다.
- 수정·추가 방향: Glyph bounds, fixed quantitative coordinate, category slot과 stable order를 사용하는 packPoints 후보를 설계한다. 해제·replay·overflow 정책을 함께 제공한다.
- 완료 검증: Feasible fixture에서 actual glyph collision 0, quantitative value 불변, deterministic output. Resize/radius change 때 재배치, remove 뒤 base position 복구.
- 근거: audit/REPORT.md: F09. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F10 — Interval / Regression complete plot

- Rationale: 통계 layer와 독립 chart 작성의 두 층위를 함께 제공한다.
- 수정·추가 방향: Interval center point와 error bar, scatter와 regression line/band를 조합한다. Source와 group, method/level을 기존 statistical owner에 위임한다.
- 완료 검증: Center/interval 같은 grain·scale, explicit group:false serialization, confidence method provenance. Child style와 role editor로 수정 가능.
- 근거: audit/REPORT.md: F10. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F11 — Dot / Lollipop / Dumbbell

- Rationale: Point/rule/tick 조합의 endpoint와 baseline을 원자적인 role로 관리한다.
- 수정·추가 방향: Summary/raw mode를 구분한 point, baseline stem rule, two endpoints connector를 ordinary child로 만든다. Atomic role edit와 final-item label anchor를 정의한다.
- 완료 검증: Horizontal/vertical, zero/nonzero baseline, endpoint swap, negative/equal values, source edit 후 geometry·guide 수렴.
- 근거: audit/REPORT.md: F11. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F12 — Raincloud

- Rationale: Half distribution·summary·raw sample이 같은 source와 slot을 공유하는 composite이 필요하다.
- 수정·추가 방향: Half violin+box/interval+raw point child를 같은 source와 category slot recipe에서 만든다. Points mode strip/beeswarm을 명시하고 child IDs와 owner relation을 안정화한다.
- 완료 검증: Summary/KDE/raw sample source 일치, slot overlap policy 검증. Source/filter/orientation edit는 정의된 child 범위만 원자적으로 갱신.
- 근거: audit/REPORT.md: F12. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F13 — ECDF data / plot

- Rationale: 누적 분포의 ties·분모·step topology를 Window cumulative sum과 구별해 제공한다.
- 수정·추가 방향: Sorted values와 tie grouping, denominator, missing/weight policy를 materialized derived data로 정의한다. Step line은 기존 path owner로 표현하고 generic cumsum은 Window에 남긴다.
- 완료 검증: 관측점 우연속 cumulative probability, ties/count/weights와 0..1 bounds 독립 oracle. Group와 filter/source edit 후 분모·steps·labels 일치.
- 근거: audit/REPORT.md: F13. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F14 — Mark labels / reference / annotation

- Rationale: 차트 설명이 final mark와 같은 의미를 읽도록 explicit source·content·anchor를 제공한다.
- 수정·추가 방향: 명시적 source mark와 category/aggregate/share content, data/plot anchor reference, annotation을 text/rule/rect owner 위에 제공한다. Axis/legend/text formatter·rotation unit을 정리한다.
- 완료 검증: 집계 Bar/Pie에 final item당 label 하나, percent 분모 검증. Multiple eligible marks에서 explicit source가 작동. Scale/data/filter 후 label과 anchor 수렴.
- 근거: audit/REPORT.md: F14. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F15 — Summary / bin / fold / computed / stack data

- Rationale: 집계·bin·fold를 특정 chart 내부에 가두지 않고 여러 mark와 label이 같은 derived grain을 공유한다.
- 수정·추가 방향: Group+multi-aggregate summary, reusable 1D bin bounds/count/member, selected-field fold를 먼저 만든다. 제한된 serializable arithmetic와 Phase4 stack grammar의 data projection을 후속 소단위로 작성한다.
- 완료 검증: 명시적 input/output grain, alias collision/missing/type error, concrete values+provenance. Window/Histogram/stack 수학 복제 없음. Callback/eval transform language 없음.
- 근거: audit/REPORT.md: F15. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F16 — Data binding / transform revision / role edit

- Rationale: 다시 만드는 것 외에 source와 주요 semantic role을 안전하게 교체하는 아래층 경로를 완성한다.
- 수정·추가 방향: Definition-only와 materializing transform을 구분한다. create/edit-owner/snapshot 관계와 Bin2D legacy reauthor를 정리하고 public bindMarkData의 full preflight를 만든다.
- 완료 검증: Immutable 이전 program 유지. Field/type/grain/coordinate/scale/guide/selection incompatibility에 atomic failure, compatible revision은 orphan cleanup.
- 근거: audit/REPORT.md: F16. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F17 — Polar component / Parallel axis / guide edit

- Rationale: Polar/Parallel에서도 chart 생성 후 축의 leaf style까지 내려갈 수 있게 한다.
- 수정·추가 방향: Cartesian/Polar/Parallel component create/edit/remove/recreate matrix를 완성한다. Polar focused 생성의 공개 경계를 정리하고 dimension-key 기반 editParallelAxis를 설계한다.
- 완료 검증: title:false→create title→edit→remove→recreate가 public chain으로 가능. Font/format/tick count가 resize·scale edit 뒤 유지.
- 근거: audit/REPORT.md: F17. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F18 — Theme / typography / format / fitting

- Rationale: 여러 mark·guide의 style을 persistent owner로 다루고 local 선택을 보존한다.
- 수정·추가 방향: Theme owner를 추가하고 기존 font/color token과 mark·guide default를 연결한다. Explicit local/inherited 구분과 reset을 저장한다.
- 완료 검증: Light/dark와 override/reset에서 axes·legend·text·Parallel까지 갱신. Theme 변경 전후 statistical values/group/domain/order 동일.
- 근거: audit/REPORT.md: F18. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

### F19 — Facet grid / repeat / child structure

- Rationale: 완성 chart의 위층에서 비교·반복·구조 편집을 다룬다.
- 수정·추가 방향: Row×column facet과 field repeat를 목적별로 제공한다. Observed vs full category combinations, empty cells, order와 shared domain을 명시한다.
- 완료 검증: 2D facet identity/order, empty-cell policy, shared/independent scale 결과, legend 설명 보존. 전체 source edit 후 cell들이 같은 recipe로 재생성.
- 근거: audit/REPORT.md: F19. [원래 조사](audit/REPORT.md)
- 처분: 구현 또는 명시적인 계약 유지·migration 결정의 제안. 아직 완료·승인 상태가 아니다.

## 원장 운영

이름 변경이나 phase 재배치에도 B/D/F ID는 바꾸지 않는다. 관련 작업 전체가 완료되기 전 primary 작업 하나만 보고 항목을 닫지 않는다.
새 발견은 기존 근거를 고치지 않고 새 ID로 추가한다. 보류에는 이유, 남은 dependency, 재검토 조건과 명시적 처분을 기록한다.
승인된 Planned 항목은 사용자의 결정 없이 누락시키거나 Proposed로 되돌리지 않는다.
