# Roadmap 6 — 공통 설계 결정과 호환성

각 항목은 연결된 Gate의 승인·구현 범위를 따른다. 후속 범위는 별도 표시가 없으면 Proposed 권고안이다. 현재 동작의 근거는 [감사 보고서](audit/REPORT.md),
구현 순서는 [로드맵](ROADMAP.md), finding별 원장은 [TRACEABILITY.md](TRACEABILITY.md)다.
같은 API의 모든 default 숫자를 통일하는 것이 목적이 아니다. 같은 의도인데 분석 결과나 작성 가능성이
달라지는 차이를 우선 해결한다.

K01–K06과 K08의 Phase 2 적용 범위를 [구체 계약 검토](phase2/CONTRACT_REVIEW.md)에서 상세화했다.
그 문서의 Phase 2 범위는 구현·검증하고 R6-P2-X 승인을 기록했다. 후속 metadata schema·layout·chart API는 함께 승인하거나 Current로 승격하지 않는다.

K02–K06의 Phase 3 적용은 [P3-C01–C07 계약 제안](phase3/CONTRACT_REVIEW.md)에 구체화했으며 2026-09-05 R6-P3-A 사용자 승인을 기록했다.
새 3개 full-only facade, 별도 Donut alias 미추가, count/explicit sum, Density group-field color, Horizon x-only
guide와 existing coordinate child·post-encode opacity, 현행 bundle 상한 유지가 승인된 범위다. Public 시각 flow는 V 승인 전까지 차단한다.

## 결정 원칙

- Explicit → current 또는 unique compatible resource → 문서화된 default → 명확한 오류 순서를 따른다.
- Create는 missing resource, edit는 existing resource, assignment는 명시적 교체를 기본으로 한다.
- Create 생략은 infer/default, edit 생략은 preserve. {}와 false, auto의 의미는 option별로 명시한다.
- Geometry 없이 판정할 수 있는 유효한 incomplete intent는 저장할 수 있다. H0 complete facade는 필요한
  의미가 없는 빈 graphics를 완성이라고 반환하지 않는다. 정당한 empty dataset/view는 별도 계약으로 표현한다.
- Immutable source와 이전 ChartProgram을 보존한다. 실패한 호출은 기존 program과 trace를 바꾸지 않는다.
- Renderer는 concrete graphicSpec만 읽는다. 자동 compiler, generic observer, 새로운 primitive를 도입하지 않는다.
- 공통 grammar와 consumer planner를 재사용하되, 의미 없는 editFoo facade나 거대한 범용 옵션 객체는 늘리지 않는다.

## K01 — Exposure, authoring role, lifecycle 분리

연결: D04, D20, B08. Owner: Phase 1·2·11.

Direct/internal, basic/default/extension, H0–H4는 서로 다른 분류다. 새 metadata는 authoringRoles,
wraps, editableVia, supports, units, inference, completionRequirements의 개념을 구분한다.
정확한 field 이름과 schema는 A Gate에서 확정한다. 173개 기존 action을 사람이 분류하고 executable
registration·types·contract와 대조한다. Internal 16개 누락은 public 승격 없이 원장만 완성한다.

Box/Gradient는 현재 deferred composite 호출을 보존한다. “Plot이니까 무조건 즉시 complete”로 바꾸지 않는다.
독립 작성 가치가 입증되면 하위 composite 진입점을 추가하고 H0를 그 위에 둔다.
selectMarks 설명도 editMarkSelection과 연결한다.

대안 기각: 모든 user-facing을 H0로 분류하거나 모든 create에 edit를 추가하면 소유권을 설명하지 못한다.

## K02 — Facade는 얇고, 역할 쌍은 원자적

연결: B01, B07, D04, D14, F01–F08. Owner: Phase 1·2·3·4·7.

Facade preflight가 target/data/coordinate와 서로 의존하는 역할 쌍을 확정하고 기존 child를 호출한다.
Bar의 category/measure는 x/y 방향과 분리하여 같은 type union과 validation vocabulary를 사용한다.
현재 mean default는 B01 수정에서 유지한다. mean→sum 변경은 별도의 분석 계약이다.

유효한 lower measure-first, width-first 호출은 필요한 의미를 저장하고 나머지가 주어질 때 수렴하도록 한다.
잘못된 field/type/음수 width까지 incomplete라는 이유로 보류하지 않는다.

검증: facade와 canonical child chain의 semantic/graphic 결과, trace의 실제 child 호출, 양방향 순서 permutation.
새 facade가 별도 aggregation이나 geometry 계산을 복사하면 수용하지 않는다.

## K03 — Guide 확보와 low-level 생성 구분

연결: D05, D07, F01, F17. Owner: Phase 2·5.

H0의 guides 생략은 해당 chart에 적절한 compatible guide를 확보한다. Existing guide가 정확히 compatible이면
재사용하고, 없으면 생성하며, 다른 scale/coordinate를 이미 설명하면 자동 교체하지 않고 conflict를 설명한다.
의미 있는 guide 확보 orchestration은 trace에 드러나야 하지만 새 public ensure API가 반드시 필요한 것은 아니다.

Low-level createXAxisLine 등은 기존 missing-resource 규칙을 유지한다.
새 Pie는 axes/grid off, category color legend on. Horizon은 original x만. Radar는 실제 theta/radius 의미를 사용한다.
Box의 기존 guides omission=off를 바꿀지 여부는 breaking 결정으로 남긴다. 초기 권고는 기존 호출 유지다.

## K04 — Group identity와 appearance grain 분리

연결: D02, D10. Owner: Phase 2.

group은 path·series identity를 정한다. Color/dash/width는 final series의 appearance다.
country로 group하고 continent로 color하면 series 안에서 appearance가 유일한 경우 허용한다.
하나의 series에 여러 color가 있으면 자동 분할이나 첫 값 선택 대신 명시적 의미 또는 오류를 요구한다.

Multi-field group은 structured key로 저장한다. String concatenation으로 충돌하는 identity를 만들지 않는다.
기존 color에서 암묵적으로 group을 얻는 호출은 유지·명시적 opt-in·migration 중 결정한 경로로 다룬다.
새 통계 facade는 style 변화가 fit partition을 바꾸지 않도록 explicit semantic group을 우선한다.

groupBy:false를 JSON에 보존되는 ungrouped로 권고한다. 기존 explicit undefined opt-out은 호환 경로를 설명하고
생략/false/undefined/auto의 create와 edit matrix를 types와 함께 고정한다.

## K05 — Constant style과 field encoding

연결: B06, D06. Owner: Phase 1·2.

Point/Bar의 이미 동작하는 stroke:false를 declarations와 prose에 맞춘다.
Area/Arc까지 false를 넓히는 것은 별도 지원 결정이며 B06의 사실에 섞지 않는다.
Mark create/edit는 같은 appearance normalizer를 사용한다. Field와 constant mode가 같은 mark에서 의미를
가질 수 있다면 target matrix를 일치시킨다. Line constant width/opacity와 Scatter radius가 우선 사례다.

기본 권고: 이미 field encoding이 있는 채널의 일반 scalar edit는 충돌을 명시한다.
사용자가 field assignment를 제거하거나 명시적으로 constant assignment로 교체하면 scale/legend를 함께 갱신한다.
ErrorBand의 현재 fill override는 의미와 legend가 불일치하므로 기존 호출 migration을 마련한다.
Highlight의 의도적인 temporary override와 일반 스타일 변경은 구분한다.

Rule editor는 width/stroke/dash/opacity를 실제 child encoder에 위임할 때만 추가한다.
새 editor가 다른 style vocabulary를 만들면 기존 owner의 범위 보강을 우선한다.

## K06 — 분석 default와 데이터 type

연결: D09, D10, D11. Owner: Phase 2·6.

Numeric color shorthand의 nominal, Bar mean, 숫자 temporal의 year 추론은 현재 의미다.
새 기능의 이름을 추가하는 김에 기존 숫자 출력을 바꾸지 않는다.

권고 순서:
1. Explicit field type와 unit/aggregate를 우선한다.
2. 선택적 source schema가 있다면 타입 해석에 사용한다. 분석 의도를 schema에서 자동 결정하지 않는다.
3. 남은 inference는 현재 호환 default를 적용하고 semantic result와 설명 가능한 trace/card에 기록한다.
4. 여러 해석이 충돌하면 explicit option을 요구한다.

Temporal year와 epoch timestamp는 unit을 명시할 수 있게 한다. Invalid/mixed timezone 문자열을 locale 추측으로
수용하지 않는다. Numeric category를 일괄 continuous로 바꾸지 않는다.
Source schema의 저장 위치·공개 이름은 Phase 2 A에서 확정할 결정이며 새 framework를 선행 도입하지 않는다.

## K07 — Baseline, radius-length, area, midpoint

연결: D01, D18, F04, F05. Owner: Phase 4.

Area baseline은 data-space constant endpoint다. Lower owner가 domain 포함과 nonlinear compatibility를 소유한다.
가짜 zero field를 source에 삽입하거나 renderer가 baseline을 추론하지 않는다.
Zero가 log domain에서 유효하지 않으면 명시적인 양수 baseline을 요구하거나 조합을 거부한다.

Radial bar의 기본 의미는 zero에서 시작하는 radius-length다. Rose는 일정 angle sector의 area다.
고정 inner radius r0와 최대 radius R에서 normalized value t라면 area 모드는
r = sqrt(r0² + t × (R² − r0²))를 사용한다.
Angle이 다른 sector에서는 같은 식만으로 총 area 비례가 보장되지 않으므로 초기 Rose는 equal-angle categories를
전제로 하고 weighted-angle 조합은 명시적으로 거부한다. 모든 encodeR의 default를 sqrt로 바꾸지 않는다.

Diverging color는 palette 이름 외에 midpoint 의미를 저장한다. 비대칭 domain에서도 neutral이 명시적 midpoint를
가리켜야 한다. Shared consumers와 legend kind를 같은 preflight에서 바꾸며 순차적 반쪽 변경을 허용하지 않는다.

## K08 — Layout과 order의 독립 owner

연결: D03, D14, F05, F15. Owner: Phase 2·4·6.

Color는 appearance이고 stack/group/fill/overlay/diverging은 layout 의미다.
Phase 4 A의 제안 이름은 `encodeLayout`이다. 하나의 owner가 baseline, offset, normalization과
group/stack order를 원자적으로 바꾸게 한다. 기존 color.layout은 호환 adapter로 위임한다.

Group→stack→group에서는 stale offsets가 없어야 한다. Negative 값과 normalized stack의 분모, missing series의
공백, centered layout의 지원 범위를 명시한다. 현재 non-negative centered area 제한을 무심코 넓히지 않는다.

Category order, path vertex order, stack order, drawing order는 각각 유지한다.
Theta category와 legend-domain order를 추가하되 같은 sort라고 합치지 않는다.
Stable first appearance와 explicit tie-break를 문서화한다.

Phase 4의 [P4-C01–C09 검토](phase4/CONTRACT_REVIEW.md)는 K07–K08을 구체화한 **미승인 제안**이다.
새 sequential midpoint, measured radius, legend item order의 canonical 위치와 color/stack/offset migration을 포함한다.
Generic radius 기본값 유지, Area missing opt-in, shared consumer 원자성, Basic layout 확장과 기존 bundle 상한을 명시한다.

## K09 — Guide와 legend lifecycle

연결: D07, D08, F17. Owner: Phase 5.

Cartesian/Polar/Parallel × axis line/ticks/labels/title × create/edit/remove/recreate 표를 만든다.
Polar focused 생성 8개는 validation·type·trace 경계를 확인한 뒤 공개 후보로 다룬다.
edit는 없는 title을 몰래 만들지 않는다. 복원은 공개 create 또는 명시적 aggregate enable 경로로 제공한다.
Parallel은 dimension field/stable key를 target으로 삼고 내부 graphic ID를 요구하지 않는다.

Legend는 categorical/continuous/size/interval/width의 content recipe와 four-edge layout을 분리한다.
Combined color+shape에서 color 제거는 남은 shape의 recipe를 재작성하는 atomic operation이다.
Legacy bottom placement는 명시적 compatibility mode로 보존하거나 versioned migration한다.
Unrelated option 하나의 유무로 layout mode가 바뀌는 새 API는 만들지 않는다.

## K10 — Final-item labels, references, format와 unit

연결: D13, F14. Owner: Phase 5.

createMarkLabels는 source mark를 명시하거나 current/unique로 선택한다.
Raw field, final encoded/aggregated value, partition share를 서로 다른 content mode로 표현한다.
Aggregate Bar/Pie의 label은 source row가 아니라 final item과 동일한 key/grain을 사용한다.

ReferenceLine/Band는 raw rule/rect를 재사용하며 data-space value와 plot-space anchor를 구분한다.
Reference가 domain을 확장할지는 명시적인 policy다. Annotation은 고정 datum·mark anchor·plot anchor 중 하나를
선택하고 모호한 nearest-mark 추론을 하지 않는다.

Formatter는 number/percent/scientific/UTC 지원을 label/axis/legend에서 공유한다.
Rotation은 기존 radians/degrees 사용처를 inventory에 적고 새 API에서 unit을 드러낸다.
기존 rotation 수치의 의미를 일괄 바꾸지 않는다. Guide wrap/overlap과 mark-label layout owner도 분리한다.

## K11 — Theme과 fitting

연결: D17, F18. Owner: Phase 5.

스타일 우선순위는 explicit local override > program theme > library default다.
Theme은 statistics, category order, field type, semantic grouping을 바꾸지 않는다.
기존 객체에서 inherited 값과 explicit 값을 구분하여 theme 재적용 뒤 local 선택을 유지한다.
해제는 library default로 돌아가되 사용자의 explicit style을 지우지 않는다.

Fitting은 opt-in action이다. Deterministic text metrics, iteration 상한, 최소 plot 크기, 실패/overflow 설명을
계약으로 둔다. 기본 Canvas가 자동 확장되지 않으며 같은 입력의 반복 fitting은 수렴해야 한다.
Canvas/SVG/PNG/PDF의 metric 차이는 공통 layout 기준과 renderer evidence로 다룬다.

## K12 — Dataset snapshot과 logical owner revision

연결: B05, D12, F15, F16. Owner: Phase 1·6.

Definition-only createDerivedData는 현재 advanced 경계로 설명하고 consumer는 concrete values를 확인한다.
새 일반 transform은 source+parameters+provenance+사용 가능한 values까지 completion을 책임진다.

create-once immutable dataset과 편집 가능한 logical owner를 구분한다.
Owner edit는 새 deterministic revision을 만들고 downstream bindings를 preflight한 뒤 한 번에 교체한다.
Orphan revision만 새 program에서 정리하며 이전 program의 snapshot을 유지한다.
Bin2D의 같은 ID create reauthor는 기존 호환 경로로 남기되 새 문서는 edit-owner를 권장한다.

bindMarkData는 internal rebindLayerData의 단순 public alias가 아니다.
Field 존재, type, grain, shared scales, guides, labels, composite, selection/highlight까지 검증한다.
Compatible하지 않은 consumer가 하나라도 있으면 전체 edit를 거부한다.

## K13 — Statistics와 composite role edit

연결: D11, D16, F10, F12, F13, F16. Owner: Phase 6·8·9.

CI는 method와 level을 저장한다. 기존 ciLower/ciUpper는 normal approximation, Interval 기본은 Student-t임을
먼저 설명하고 단일 명칭 뒤에 다른 공식을 숨기지 않는다. Confidence/level 호환 alias의 conflict 규칙도 필요하다.
n=0/1, constant data, missing, grouped sample의 수치·오류를 별도로 검증한다.

Violin은 source/category/value/split/orientation을 owner edit에서 함께 바꿀 수 있어야 한다.
ErrorBar/ErrorBand도 source와 position/interval role을 원자적으로 바꾼다.
Regression의 point-owner 의존성을 제거할지와 standalone derived fit은 구별한다.
이미 lower edit로 충분한 Scatter/Line에 이름만 대칭인 editPlot을 추가하지 않는다.

## K14 — Filter와 empty 결과

연결: D15, F16. Owner: Phase 6.

filterData의 raw-row grain과 filterMarks의 final-item grain은 유지한다.
Filter owner는 기준 source를 기록하고 replace/compose/remove를 구분한다.
같은 target 반복 호출이 generated ID 충돌로 실패하거나 이전 filter를 암묵적으로 누적하지 않게 한다.

Empty view는 기존 또는 explicit domain을 유지하는 정책으로 시작하는 것을 권고한다.
처음부터 domain을 정할 수 없는 empty chart와 필터 후 empty view를 구분한다.
Empty 선택·label cleanup·legend 설명을 정의하며 독립된 통계 layer를 암묵적으로 재계산하지 않는다.

## K15 — Deterministic placement와 composition

연결: D19, F08, F09, F11, F12, F19. Owner: Phase 7–10.

Rug/Strip의 plot-edge/constant anchor와 Beeswarm의 collision packing은 별도 의미다.
Packing은 glyph bounds, category slot, stable input identity, 재실행/해제와 overflow를 소유한다.
Packing이 raw value나 group을 바꾸어서는 안 된다.

Raincloud는 common source와 slot recipe를 소유하고 density·summary·points를 독립 child로 유지한다.
Facet은 canonical child recipe에서 재파생한다. Concat의 자유로운 child edit와 facet child override를
같은 mutation으로 처리하지 않는다. Shared scale와 guide 승격은 scale 의미가 compatible한 경우만 허용한다.
Source chart의 legend가 기본 false라는 이유로 설명 없이 사라지는 경로를 해소한다.

## K16 — Discovery는 실제 completion을 설명

연결: B02–B04, D20. Owner: Phase 1·11, 모든 단계에서 동기화.

Chart intent와 mark intent를 분리한다. Specific radial-bar가 generic bar substring을 shadow한다.
One-call closure는 실행 오류 없음뿐 아니라 필요한 channels, expected final grain/item count, coordinate family,
unrequested extra layer 부재, 분석 의미를 확인한다.

Nonempty 그림만을 universal oracle로 쓰지 않는다. Legitimate empty result는 explicit completion contract와
unresolved/empty explanation을 구분한다. Cards에 모든 transitive type을 넣지 않고 질의에 필요한 계층 관계를 전달한다.
기존 read-only local MCP boundary와 payload/browser/package budget을 유지한다.

## 호환성 분류와 migration 순서

| 종류 | 예 | 권장 처리 | 검증 |
| --- | --- | --- | --- |
| 기존 정상 runtime에 맞춘 additive type/prose | B06/B07 | 선언·계약 보강 | positive와 negative type cases |
| 실패하던 유효한 호출 교정 | B01/B05 | 기존 유효 입력 결과 유지 | before/after fixture, domain error |
| 잘못된 지원 주장 교정 | B02–B04 | unresolved 또는 정확한 provider | 실행 closure + negative matching |
| 새 opt-in API | Pie, theme, fold | 신규 이름/option을 명시 승인 | 기존 chain 동등성·bundle |
| 의미가 바뀌는 default | aggregate, group, radius, CI, temporal | 기존 유지 + explicit 새 mode 우선 | 양쪽 결과·provenance 비교 |
| strictness·lifecycle 변화 | fill conflict, guide ensure, filter replace | migration example·compatibility branch | old→new 작업 chain |
| alias/rename | confidence/level, Donut, layout | 하나의 canonical owner, 양쪽 충돌 오류 | declarations·trace·docs |
| 세부 capability 보류 | 조건부 guide/compose | 이유·dependency·재검토 기준 유지 | 실행 범위의 미해결 누락 0 |

각 A Gate에는 기존 호출, 새 호출, 결과 차이, 권장 migration을 최소 한 쌍 포함한다.
현행 behavior를 유지하기로 결정한 항목도 해결로 셀 수 있지만, 혼란을 막는 명시적 문서·type/card·검증이 있어야 한다.
단순한 “나중에”는 완료 상태가 아니다.

## 승인 때 확정할 결정 목록

| 결정 | 추천 방향 | 확정 owner |
| --- | --- | --- |
| Donut 별도 이름 | Pie arc.innerRadius로 작성, 별도 alias 미추가 제안 | Phase 3 A / P3-C02 |
| Pie weighted aggregate | value를 쓰면 aggregate를 명시 | Phase 3 A |
| Box/Gradient 이름·deferred 유지 | 유지 + authoring role 설명; 하위 facade는 수요 기반 | Phase 2 A |
| Baseline/layout public 이름 | 기존 datum/range 확장 + encodeLayout, [P4-C01–C03 제안](phase4/CONTRACT_REVIEW.md) | Phase 4 A |
| Rose negative/unequal-angle | 첫 범위는 non-negative equal-angle만 | Phase 4 A |
| Style override conflict | explicit assignment 교체 전까지 오류 | Phase 2 A |
| Source schema·temporal unit 표면 | 기존 계약 위의 opt-in | Phase 2 A |
| Label anchor/content 이름 | final grain을 명시하는 typed union | Phase 5 A |
| Polar leaf public 범위 | 실제 create/restore에 필요한 것만 | Phase 5 A |
| Program theme 저장·해제 | 기존 config/semantic 책임과 일치하는 persisted owner | Phase 5 A |
| Transform revision·filter 편집 이름 | create/edit/remove와 source identity 분리 | Phase 6 A |
| CI 공통 method/level | 기존 계산 유지 + explicit method | Phase 6 A |
| Packing overflow | explicit error 또는 structured best effort를 mode로 구분 | Phase 9 A |
| Polar/Parallel facet·per-cell override | family별 capability 확인 후 별도 승인 | Phase 10 A |
