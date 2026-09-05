# R6-P3-A — Pie/Donut·Density·Horizon 계약 검토

상태: **approved contract**. 아래는 A 당시의 계약 제안 기록이며 현재 구현 진척은 [STEP1](STEP1.md)을 따른다. 2026-09-05 사용자가 Phase 3 A 승인 질문에 “승인한다”라고 답했다.
검토 package `bd18718a9c1aed5f91b485bc1aeab54616e9e5a3`, 승인 기준 HEAD `0f3531ae9c242190df9457b1ed4289491963ba77`의 P3-C01–C07을 승인했다.
승인 당시 세 action을 Planned owner에 등록했으며, 구현 후 [Current owner](../../../contract/current/COMPLETE_CHARTS.md)로 이관했다.
범위는 F01·F06·F07이며 F20은 제외한다. 원격 검토 ref와 승인 상태는 [GATES.md](GATES.md)가 소유한다.

## 이번에 확정할 결정

| 결정 | 제안 | 이유와 경계 |
| --- | --- | --- |
| P3-C01 / 진입점 | full entry에 `createPiePlot`, `createDensityPlot`, `createHorizonPlot` 3개 | 기존 Arc/Area·통계·guide owner를 조합하는 H0. 새 mark·renderer·계산 저장소를 만들지 않음 |
| P3-C02 / Donut | `createPiePlot({ arc: { innerRadius: 0.55 } })`를 canonical로 사용; 별도 `createDonutPlot` 미추가 | Partition·편집 owner가 같다. 검색에서 donut 동의어를 연결하면 이름 중복 없이 찾을 수 있음 |
| P3-C03 / Pie 의미 | Category 생략 불가, count 기본; value를 쓰면 `aggregate:"sum"` 필수 | 숫자 category도 nominal count. 중복 category 집계와 분모를 명시 |
| P3-C04 / Density | Baseline placement만; `densityChannel` 유지; group과 color 별도 명시 | KDE 계산·방향 vocabulary를 재사용. 원본 metadata join이나 새 grouping 추론을 추가하지 않음 |
| P3-C05 / Horizon | x/y 필수, 원래 x만 guide; coordinate는 기존 `createCoordinate` child로 지정 | Folded y·internal band key를 상위 기본 차트의 측정 guide로 노출하지 않음 |
| P3-C06 / Style와 guide | Pie 자동 category color; Density 자동 color 없음; Horizon palette가 color 소유. 호환 guide 재사용 | Constant fill 충돌을 숨기지 않음. Horizon의 explicit opacity는 encode 뒤 편집 child로 적용 |
| P3-C07 / package | 새 3개는 full 전용. Full 235,000 / Basic 125,000 / SVG 25,000 bytes gzip 상한 유지 | Basic의 기존 common Cartesian 경계를 보존. 측정상 초과하면 별도 B Gate 없이 상한을 올리지 않음 |

Donut 표현을 빼는 제안이 아니다. Hole·padding·weighted partition·하위 편집까지 W1에 포함한다.
차트별 최종 제안 signature, 실행 가능한 기존 lower chain, 저장 결과와 오류는
[Pie/Donut](../chart/pie-donut.md), [Density](../chart/density.md), [Horizon](../chart/horizon.md)에 함께 둔다.

## 정확한 기준과 실제 관측

- Baseline commit: [`9625e71c374868756652fb8dff8153dc61500c6e`](https://github.com/ggaction/ggaction/commit/9625e71c374868756652fb8dff8153dc61500c6e).
- Source tree: `9d3bd5e26b67634851e6009faac4b8c7c9e15002`; types tree: `25e66ad6bb83ea1481194255e3521d5f2911dbea`.
- Branch: `codex/roadmap6-hierarchical-actions`. Package 0.0.12, Node 22.23.1, macOS arm64.
- [실행 source](baseline.probes.mjs)와 [52건 결과](baseline-results.json): 모든 earlier program/trace 불변.
  성공뿐 아니라 현재의 의도된 거부·제약을 기록한다. 제안 facade를 실행한 결과가 아니다.
- 관련 기존 tests **176/176**, 27 files, fail/skip 0. [검증 명령과 acceptance](VALIDATION.md).
- Source/types가 Phase 2 검증본과 동일하다. 누적 2,432/2,432, realistic 167/167, installed consumer 및
  coverage/render 결과는 [Phase 2 승인 증거](../phase2/REVIEW.md)를 참조한다. 이번 A 준비에서 재실행한 결과로 세지 않는다.

| 관측 | 실제 현재 동작 | 제안에 반영할 내용 |
| --- | --- | --- |
| A01 | 새 3개 facade와 Donut alias는 full/basic 모두 없음 | Current로 미리 등록하지 않음 |
| P01–P04·P17–P19 | Count/sum, ratio, numeric category, mode 전환, scale domain/range 모두 기존 theta/arc가 처리 | 별도 Pie transform·`encodePie`·`editPiePlot` 불필요 |
| P05 | 0인 category는 sector가 없지만 color domain·legend에는 남음 | Legend는 category scale의 domain을 설명. Visible slice만 보여준다고 약속하지 않음 |
| P06–P11 | Invalid weight/category, all-zero, slice 안의 모호한 color를 거부 | Strictness 유지. 첫 값 선택·음수 절댓값·equal-slice fallback 금지 |
| P12–P16 | Scalar fill과 field color 충돌 거부; legend 재사용과 no-op 가능; foreign target 거부 | Pie constant fill은 `color:false`로 명시. Axes/grid는 facade 옵션에서 false만 |
| D01–D04 | KDE 기본 100 samples, area opacity .2; 방향 교환·group profiles·group field color 지원 | 자동 분석값·opacity 변경 없음. group만 지정해도 색을 추론하지 않음 |
| D05·D15 | Density는 color field가 기존 group과 같아야 함. Derived rows에는 group/value/density만 남음 | 원본 series-constant metadata도 자동 사용 불가. 일반 Area의 Phase 2 지원을 Density에 과대 적용하지 않음 |
| D06–D12·D16 | Invalid sample rows 제외; 빈 유효 표본·auto constant·잘못된 grid·zero 미포함 scale 거부 | Filtering·통계 제한 그대로 문서화. Singleton은 explicit bandwidth와 extent로 작성 |
| D13–D14 | Stats edit는 revision; orientation edit는 미지원 | `editDensity`의 역할을 확대하지 않음. 방향 전환 owner는 후속 Phase 6 |
| H01–H04 | 자동 guide는 x만; explicit lower y axis/legend는 internal 값을 표시할 수 있음 | 새 facade에서 y/legend 요청을 검증해 거부. 기존 lower API의 명시적 작성은 유지 |
| H05–H08 | All-baseline은 유효한 빈 결과; 좌표 모호성 오류; 기존 coordinate child로 해결 | 빈 그림을 모두 실패로 취급하지 않음. `encodeHorizon`에 새 coordinate 옵션 불필요 |
| H09–H10·H14 | Encoding은 이전 opacity를 1로 바꿈; 뒤에서 편집하면 값이 적용되고 stats edit에도 유지 | Facade의 explicit opacity는 encode 뒤 `editAreaMark`로 다시 적용 |
| H11–H16 | Timestamp provenance, false group, one-panel group overlay, revision, band/scale validation | 생략 x/y inference를 새 H0에 복사하지 않음. Small multiples를 약속하지 않음 |

초기 probe 초안의 두 추정을 실행 후 교정했다. Arc constant fill→color는 이미 오류였고, Horizon
explicit lower y/legend는 실제로 허용됐다. 최종 JSON은 이 실제 결과를 담는다. Production bug를
고쳤다고 보고하거나 기존 감사 원본을 덮어쓰지 않는다.

## 공통 완성·생략·실패 계약

세 facade는 `createCanvas`와 materialized dataset을 전제로 한다. 새 Canvas/data를 자동 생성하지 않는다.
`id` 기본값은 각각 `piePlot`, `densityPlot`, `horizonPlot`이며 중복되면 명시적 새 id가 필요하다.
`data`는 explicit → existing currentData → unique materialized dataset 순으로 기존 resolver를 사용한다.
선택된 data를 mark child에 명시적으로 전달하여 기존 mark의 position/group을 우연히 상속하지 않게 한다.

Coordinate는 explicit → 해당 layer의 binding → unique compatible coordinate → family default 순이다.
여러 compatible coordinate가 있고 binding/explicit 선택이 없으면 오류다. Pie는 Polar, 나머지는 Cartesian.
Explicit id가 아직 없으면 기존 coordinate owner가 해당 family로 생성한다. 다른 family의 동일 id는 오류다.
Facade의 `target`, nested encoding의 `target/coordinate`, 별도 `source` alias는 허용하지 않는다.

| 입력 상태 | 처리 |
| --- | --- |
| 필수 역할 생략, 알 수 없는 key, 잘못된 type/값 | 새 facade는 즉시 오류. 성공한 미완성 차트로 반환하지 않음 |
| Optional `undefined` | Create의 해당 옵션 생략과 같음. Edit의 기존 preserve/명시 undefined 규칙은 그대로 유지 |
| `guides` 생략 또는 `{}` | 자기 layer의 chart별 applicable guide 확보 |
| `guides:false` | 이 호출에서 guide를 확보하지 않음. 기존 guide를 제거하는 명령이 아님 |
| 기존 guide·scale와 충돌 | 기존 resource를 재해석하지 않고 오류. Explicit compatible id 또는 lower editor 사용 |
| 반복 create | 같은 id 재사용 오류. 새 id + compatible shared resources는 기존 규칙으로 작성 |
| 정당한 empty | Horizon all-baseline 허용. Pie denominator 없음·Density 유효 표본 없음은 거부 |

모든 성공/실패에서 earlier program, caller options/rows/arrays를 보존한다. Facade가 별도 aggregation,
KDE, folding, path materialization을 복제하지 않는다. 다른 작성 순서는 최종 semantic/graphic으로 비교하고,
trace는 실제로 수행한 wrapped child hierarchy를 별도로 검사한다.

## 저장·계층·수명주기

기존 `semanticSpec`·`graphicSpec`·mark config·derived provenance·guide config가 각 결과를 소유한다.
새 chart wrapper state, final-share cache, 자동 compiler, 새로운 renderer primitive는 없다.
Pie의 aggregateValue/share는 현재 derived sectors에서 계산 가능한 값이며 semantic layer에 중복 저장하지 않는다.
Graphic은 concrete path commands와 paint다. Start/end theta와 radii가 새 graphic schema 필드로 저장된다고 쓰지 않는다.

완성 facade 이후의 편집은 같은 하위 owner를 사용한다.

| Facade | 의미/통계 | 모양 | Scale/guide |
| --- | --- | --- | --- |
| Pie | `encodeTheta`, `encodeColor`, `removeEncoding` | `editArcMark` | `editScale`, 기존 legend editor |
| Density | `editDensity`, 허용된 group color assignment | `editAreaMark` | value/density scale, Cartesian guide editors |
| Horizon | `editHorizon` | `editAreaMark`; color는 transform palette | x scale/axis/grid editors |

이름 대칭만을 위한 새 `edit*Plot`은 만들지 않는다. Stored selection/highlight, resize, shared scales,
filtered data와의 조합은 현재 consumer가 지원하는 범위를 검증한다. 미지원 조합을 문서/타입에서 지원으로
표시하지 않는다. 새 generic bind/filter lifecycle·Density 방향 편집은 Phase 6 범위다.

## 구현·문서·검색 영향

1. A 승인 후 승인된 계약만 Planned owner에 올린다. 비시각 계약/type fixture 준비와 primitive target을 작성한다.
   새 public 시각 flow의 등록·실행 구현은 해당 V 승인 뒤 진행한다.
2. Full chart registrar에 세 methods를 연결한다. Basic은 기존 5 Cartesian facades와 entry boundary를 유지한다.
   최종 direct inventory 예상은 **174 → 177**이다. Donut alias는 추가하지 않으므로 178로 세지 않는다.
3. 각 coherent change에서 runtime/declarations/Current/action index·catalog·cards/option metadata/
   generated reference·LLM docs/examples를 동기화한다. A 승인 전 Current count와 Planned count는 변경하지 않는다. 승인 뒤에는 accepted subset만 Planned에 등록한다.
4. MCP chart intents의 Pie/Donut·Density·Horizon은 실제로 완성되는 facade 호출을 제공하도록 연결한다.
   Pie와 Donut은 같은 method를 쓰되 Donut의 inner radius를 explicit하게 표시한다.
   Raw arc/area 및 density/horizon transform 요청의 lower provider는 유지한다.
5. Group/weighted/guide의 unsupported 요청을 generic chart intent 하나로 덮어 완료 처리하지 않는다.
   새 search output은 반환 signature·code·required encodings·nonempty 또는 정당한 empty 의미를 실제 실행으로 검증한다.
   외부 모델 호출은 필요하지 않다.
6. 현재 architecture에 macro-state 변경은 없다. 구현 시 aggregate hierarchy와 full authoring route만 갱신한다.
   Basic 변경·새 통계 default·새 persisted state가 필요해지면 이 A에 포함된 것처럼 처리하지 않는다.

현재 검증된 gzip은 Full **234,258/235,000**, Basic **124,897/125,000**, SVG **6,418/25,000 bytes**다.
남은 Full 742 / Basic 103 bytes는 새 구현이 통과한다는 보장이 아니다. Package 검증에서 넘으면
동작을 유지하는 범위의 정리로 해결하거나, 측정된 변경과 검토 가능한 산출물을 갖춘 독립 B Gate를 요청한다.
상한 증가·출시·배포·새 PR은 이번 A의 승인 효과에 포함하지 않는다.

## V와 X에 남기는 작업

V 대상은 Pie count/weighted/donut 3종, Density vertical/grouped/horizontal 3종,
Horizon signed/temporal/baseline+style edit 3종의 **9개 target**이다.
A 검토 package에는 새 primitive render나 미래 public API 실행 결과가 없었다.
A 승인 뒤 실제 source/manifest/images를 작성·검증했으며 [V 검토](VISUAL_REVIEW.md)에 정확한 values·dimensions·public call과
기존 Density grid의 명확화·Horizon 7점 fixture를 기록했다. 이 V 준비 시점의 새 public API는 미구현이었다.

V 승인 뒤 public flow를 연결하고, 같은 실행의 concrete graphicSpec·draw order·Canvas calls·decoded PNG pixels와
독립 numeric oracle를 비교한다. 유효한 Horizon empty는 별도 numeric acceptance로 검증해 plot-ink 판정을 우회하지 않는다.
X에서 전체 consumer matrix와 package/docs/strict types/누적 regression을 닫는다.
미구현 후보나 후속 Phase 작업이 남으면 F01/F06/F07의 처분과 범위를 구체적으로 기록한다.
