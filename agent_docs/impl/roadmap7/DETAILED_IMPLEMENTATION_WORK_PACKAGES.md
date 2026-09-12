# Roadmap 7 — 상세 구현 작업 패킷

작성 기준: 2026-09-13. 현재 branch `codex/roadmap7-authoring-refinement`, 마지막 검증 완료 checkpoint `68843532`. 이 문서는 이미 승인된 Roadmap 7을 구현자가 기능 단위로 끝까지 실행하기 위한 **작업 분해와 종료 절차**다. 공개 API의 정확한 의미·수식·기본값은 각 `features/*.md`가 canonical owner이며, 이 문서는 그 계약을 어느 파일에 어떤 순서로 구현하고 무엇으로 검증할지를 소유한다.

## 1. 현재 상태와 실행 경계

### 다시 구현하지 않을 완료 checkpoint

| 범위 | 상태 | 근거 revision | 후속 작업 |
| --- | --- | --- | --- |
| R06 계산식·R07 정규화 | Implemented-primary | `b891d1d5` | 후속 composition 소비 회귀만 추가 |
| R05 complete/impute·R08 달력·R09 기간 window | Implemented-primary | `9d4d0840` | 후속 composition 소비 회귀만 추가 |
| R10 가중 통계 | Implemented-primary | `da0ca4e2`, `276c8318`, `32ddfcdd` | R36/R43 소비 회귀 추가 |
| R02 파생 데이터 편집 | Implemented-primary | `d29287c9` | 새 owner/reference/composition 경로 통합 |
| R20 Parallel scale | Implemented-primary | `eaea2b8b` | R19/R43 통합 |
| R21 offset scale | Implemented-primary | `335ce4f0` | R19/R43 통합 |
| R23 size scale types | Implemented-primary | `1b68a8ba` | R19/R37/R43 통합 |

완료 checkpoint의 pure core나 public API를 다른 이름으로 다시 만들지 않는다. 후속 기능이 새 consumer를 추가할 때 기존 owner에 consumer path와 regression만 보강한다.

### 남은 구현 순서

순서는 의존성 계약이다. 같은 번호의 소단계는 위에서 아래로 수행한다.

1. Phase 5: R19 → Phase 5 통합. R22와 R23은 완료 checkpoint다.
2. Phase 6: R27 → R29 → 좌표 통합.
3. Phase 7: R31 → R32 → R33 → R36 → 라벨/참조 통합.
4. Phase 8: R37 → R38 → R39 → guide 통합.
5. Phase 9: R47 → R49 → renderer/style 통합.
6. Phase 10: R43 family matrix 전체.
7. Phase 11: R25 reference registry와 안전 삭제.
8. Phase 12: 25개 기능의 전체 lifecycle·metadata·package closeout.

R19를 R23/R22보다 먼저 만들지 않는다. R43을 좌표·라벨·guide·theme보다 먼저 만들지 않는다. R25는 모든 새 reference schema가 생긴 뒤 구현한다.

### 선택 25개와 이 문서의 작업 owner

| ID | 결과 | 현재 상태 | 이 문서의 owner |
| --- | --- | --- | --- |
| R02 | 파생 데이터 정의 편집·revision | Implemented-primary | 완료 checkpoint + WP12 |
| R05 | Complete·Impute | Implemented-primary | 완료 checkpoint + WP12 |
| R06 | typed computed expression | Implemented-primary | 완료 checkpoint + WP12 |
| R07 | 그룹 정규화 | Implemented-primary | 완료 checkpoint + WP12 |
| R08 | week/weekday/timeZone bucket | Implemented-primary | 완료 checkpoint + WP12 |
| R09 | duration window | Implemented-primary | 완료 checkpoint + WP12 |
| R10 | 가중 통계 | Implemented-primary | 완료 checkpoint + WP7.4/WP10/WP12 |
| R19 | 원자적 다중 encoding | Proposed | WP5.3 |
| R20 | Parallel focused scale edit | Implemented-primary | 완료 checkpoint + WP5.4/WP10 |
| R21 | x/y offset focused scale edit | Implemented-primary | 완료 checkpoint + WP5.4/WP10 |
| R22 | field stroke·stroke scale·legend | Implemented-primary (`3fc40a66`) | WP5.2 |
| R23 | nonlinear/discrete size scale | Implemented-primary | 완료 checkpoint + WP5.3/WP8.1/WP10/WP12 |
| R25 | 안전한 resource 삭제 | Proposed | WP11 |
| R27 | coordinate aspect | Proposed | WP6.1 |
| R29 | Polar frame | Proposed | WP6.2 |
| R31 | attached labels 삭제 | Proposed | WP7.1 |
| R32 | selected final-item labels | Proposed | WP7.2 |
| R33 | semantic label anchors | Proposed | WP7.3 |
| R36 | dynamic statistical references | Proposed | WP7.4 |
| R37 | exact sampled legend values | Proposed | WP8.1 |
| R38 | combined legend block edit | Proposed | WP8.2 |
| R39 | typed display names·header strips | Proposed | WP8.3 |
| R43 | Polar/Parallel facet·repeat | Proposed | WP10 |
| R47 | custom theme·descendant propagation | Proposed | WP9.1 |
| R49 | corner/cap/join style | Proposed | WP9.2 |

## 2. 모든 작업 패킷의 공통 절차

각 기능은 아래 10개 결과를 하나의 coherent checkpoint로 만든다. 일부만 끝내고 기능 상태를 Current로 바꾸지 않는다.

1. **현행 계약 고정**: 가장 가까운 현재 action, 타입, current contract, existing regression의 실제 동작을 읽는다.
2. **입력 정규화**: closed keys, union, default, omission, reset, mode 전환을 pure validator로 만든다.
3. **독립 계산**: 통계·mapping·geometry·layout 계산을 action state write와 분리한다.
4. **읽기 전용 plan**: target, owner, affected consumers, release 후보를 수집한다. ID/trace/revision을 소비하지 않는다.
5. **private candidate**: final requested state를 immutable candidate에 적용한다.
6. **final-state preflight**: shared consumers, guide, selection, labels, references, composition ancestor까지 최종 상태로 검사한다.
7. **결정적 재물질화**: data → domain → effective bounds/range → marks → label membership/reference → guides/layout → highlights 순서다.
8. **public surface 동기화**: Full registry, strict declarations, Current contract, action index, catalog/card/relation/MCP/docs/package를 함께 갱신한다.
9. **검증**: literal oracle, 오류 원자성, lifecycle, applicable renderer, installed package를 실행한다.
10. **기록**: feature/Phase STEP/PROPOSALS/IMPLEMENTATION_MAP/TRACEABILITY/ACCEPTANCE_CASES를 실제 증거와 맞춘 뒤 commit/push한다.

오류 경로에서는 입력 `ChartProgram`의 `semanticSpec`, `graphicSpec`, `materializationConfigs`, `context`, `trace`, `resolvedScales`, `children`, `compositionSpec`이 모두 같아야 한다. options와 nested arrays/AST/data rows는 deep-freeze한다. 테스트 expected는 production 함수를 호출해 만들지 않는다.

### 구현자가 작업 패킷을 소비하는 정확한 방법

한 번에 하나의 `WPx.y`만 활성 작업으로 잡는다. 작업을 시작할 때 아래 표를 로컬 메모나 해당 Phase `STEP1.md`에 채우고, 빈 칸이 있으면 코드를 쓰기 전에 owning 문서와 source에서 답을 찾는다. 공개 계약을 임의로 보완하거나 비슷해 보이는 다른 action의 기본값을 복사하지 않는다.

| 필드 | 반드시 적을 내용 | 권위 |
| --- | --- | --- |
| Feature | R번호, Primary Phase, 선행 기능의 실제 완료 revision | ROADMAP, IMPLEMENTATION_MAP |
| Public call | 최소 호출 1개와 모든 옵션을 쓴 호출 1개 | 해당 `features/*.md`, IMPLEMENTATION_TYPES.d.ts |
| Existing control | 가장 가까운 현행 action 호출과 보존해야 할 결과 | current contract, source, 기존 test |
| Requested owner | 요청을 장기 보존할 semantic/config의 정확한 path | feature의 구현 고정 명세, STATE_AND_REPLAY |
| Resolved output | 매번 다시 계산할 값과 graphic path | feature, materializer source |
| Cleanup | mode 전환·remove 때 지울 old-only key/resource | feature의 전환표 |
| Consumers | scale/mark/guide/selection/label/facet/theme/renderer 중 required 항목 | IMPLEMENTATION_MAP, 해당 WP |
| Oracle | production helper를 쓰지 않은 literal expected | ACCEPTANCE_CASES, feature |
| Failure proof | 오류 class와 호출 전후 동일해야 하는 state | COMMON_CONTRACT, 해당 WP |
| Public surface | runtime/type/current contract/generated/package 변경 목록 | 아래 공개 surface 표 |

작업 중 문서의 파일 경로가 현재 source와 다르면 이름이 같은 새 파일을 즉시 만들지 않는다. `rg`로 현재 registrar, state writer, reader, materializer, remover를 찾아 역할 owner가 이동했는지 확인한다. 이동했다면 이 문서의 경로도 같은 checkpoint에서 고친다. 문서의 **행동 계약**과 source의 **현재 구조**가 충돌하면 임시 compatibility registry나 중복 state를 만들지 않고, 이미 승인된 동작을 현재 구조의 한 owner에 구현한다.

### 패치의 네 구간과 통과 조건

각 WP의 diff는 아래 네 구간을 모두 포함해야 한다. 구간을 여러 commit으로 나눌 수 있지만 네 구간이 닫히기 전에는 feature 상태를 `Implemented-primary`나 `Current`로 바꾸지 않는다.

1. **Core**: closed validator, canonical normalizer, pure 계산과 독립 unit oracle. 이 구간은 trace/ID/program write를 하지 않는다.
2. **Transaction**: public action, owner write, final-state preflight, deterministic materialization, cleanup. 실패 fixture에서 이전 program과 caller input이 그대로여야 한다.
3. **Consumers**: 지원행렬의 mark/guide/selection/labels/composition/render 경로. 한 대표 mark만 성공한 상태로 family 전체를 완료 처리하지 않는다.
4. **Surface**: Full registry, declarations, Current contract, generated inventories/docs, installed package. 런타임만 있거나 타입만 있는 상태를 공개 완료로 간주하지 않는다.

다음 조건이면 해당 구간은 실패다.

- 요청 omission과 reset을 같은 뜻으로 처리한다.
- auto/requested 값을 resolved 숫자·배열로 덮어쓴다.
- 입력 key 순서, object insertion order, 첫 resource 순서에 결과가 의존한다.
- public action을 내부에서 순차 호출해 중간-invalid 상태를 외부 계약처럼 검증한다.
- 오류 뒤 trace 길이, current pointer, cached scale, generated child ID 중 하나라도 달라진다.
- mark와 legend/highlight가 서로 다른 mapper·formatter·style resolver를 사용한다.
- facet/repeat가 retained source 대신 이전 child graphic이나 partitioned snapshot을 복제한다.
- generated 문서를 직접 편집하거나 roadmap JSON을 제품/test 실행 의존성으로 import한다.

### 테스트 구현 형식

각 기능의 새 capability test는 최소한 아래 다섯 묶음을 분리한다. 같은 happy-path 프로그램을 약간 바꿔 숫자만 늘리지 않는다.

1. **Normal**: 최소 호출, 모든 옵션 호출, explicit target, 독립 literal 수치·geometry.
2. **Boundary**: 최소/최대, empty/nullish, zero, reverse, repeated category, mode별 유효 경계.
3. **Error atomicity**: malformed shape, unknown key/field/target, ambiguous owner, incompatible consumer. 호출 전 program 전체와 deep-frozen options를 비교한다.
4. **Lifecycle**: create → edit → reset 또는 field/value 전환 → source/Canvas replay → remove. 오래된 owner·graphic·legend가 부활하지 않는지 확인한다.
5. **Integration**: 해당 feature의 required mark/guide/composition/renderer/package cell. 후속 R43 소유 cell이면 현재 STEP에 `pending(R43)`로 남기고 R43/Phase12에서 반드시 닫는다.

수치 expected는 상수나 별도 oracle 함수로 작성하고 구현 mapper를 호출해 expected를 만들지 않는다. renderer 검증은 backend끼리 pixel exact를 요구하지 않지만, 한 backend 안에서 같은 실행의 primitive/public 의미와 decoded output을 비교한다. `assert.throws`만으로 원자성을 증명하지 말고 호출 전 program의 모든 canonical state branch를 `deepStrictEqual`로 확인한다.

### 체크포인트 기록 규칙

기능 checkpoint를 닫을 때 다음 순서를 지킨다.

1. focused unit/contract/type tests를 실행하고 정확한 pass/fail/skip 수를 기록한다.
2. 영향받은 기존 regression과 renderer를 실행한다.
3. owner source를 갱신한 뒤 generator를 실행하고 check 명령으로 stale output이 없는지 확인한다.
4. packed tarball을 설치한 소비자에서 runtime과 strict TypeScript를 실행한다.
5. feature status, `IMPLEMENTATION_MAP.json`, `ACCEPTANCE_CASES.json`, Phase STEP, Current contract를 동일 사실로 맞춘다.
6. `git diff --check`, 예상 파일만 바뀌었는지, caller-owned 입력을 mutate하는 코드가 없는지 확인한다.
7. coherent checkpoint를 commit/push한 뒤 다음 WP로 이동한다.

테스트를 실행하지 못했으면 원인과 미실행 범위를 적고 `passed`로 기록하지 않는다. 한 인수 case의 일부 경로만 통과하면 `partial`이며, 후속 owner와 닫을 Phase를 함께 적는다. 과거 revision의 green 결과는 그 뒤 관련 source가 바뀌었으면 현재 checkpoint의 누적 증거가 아니다.

### 공개 surface의 정확한 동기화 위치

새 action이나 기존 action option이 생길 때 아래를 모두 확인한다.

| surface | canonical 수정 위치 | 확인 사항 |
| --- | --- | --- |
| Runtime registration | `src/actions/<family>/index.js` 또는 현재 family registrar, 전체 조립은 `src/actions/index.js` | Full-only action을 `src/actions/basic.js`나 basic registrar에 등록하지 않음 |
| Runtime declaration | `types/program.d.ts` | options closed union, method signature, readonly input |
| Root type export | `types/index.d.ts` | 새 public option/result 이름 export |
| Basic boundary | `types/basic.d.ts`, `src/actions/basic.js` | 기존 action option 확장은 의도한 범위에 반영, 신규 advanced method는 제외 |
| Current contract | `agent_docs/contract/current/<domain>.md` | signature/default/inference/effects/errors/lifecycle/coverage를 한 owner에 기록 |
| Machine inventory | `agent_docs/contract/ACTION_INDEX.json` | direct action은 정확히 한 Current owner와 executable evidence를 가짐 |
| Knowledge source | `knowledge/intent-taxonomy.json`, action 관계의 기존 owner source | 새 action intent·relation·runnable sample 추가 |
| Public docs | 해당 `docs/api`/recipe owner와 example source | 구현된 동작만 영어로 문서화 |
| Generated outputs | package.json의 `contracts:*`, `docs:*` generator | owner를 고친 뒤 생성하며 결과 파일을 직접 편집하지 않음 |
| Package evidence | `scripts/package-consumer.js`와 strict type fixture | packed artifact에서 runtime/type/MCP 소비 확인 |

## 3. Phase 5 — scale·stroke·원자적 encoding

### WP5.1 — R23 size scale type 확장

Canonical behavior: [R23](features/23-size-scale-types.md). `ordinal`은 지원하지 않는다. 허용 type은 `linear | log | sqrt | pow | quantize | quantile | threshold`다.

#### 파일별 구현

1. **신규 `src/grammar/scales/size.js`**
   - `SIZE_SCALE_TYPES`, `CONTINUOUS_SIZE_SCALE_TYPES`, `DISCRETE_SIZE_SCALE_TYPES`를 닫힌 집합으로 정의한다.
   - `normalizeSizeScaleDefinition(previous, patch)`를 구현한다. 같은 type omission은 보존하고 type-family 전환은 R23 전환표를 적용한다.
   - `resolveSizeScale({definition, values})`를 구현한다. requested `"auto"`와 resolved domain/thresholds를 분리한다.
   - `mapSizeValues(values, resolvedScale)`를 구현한다. 반환값 단위는 항상 px² 면적이다.
   - quantile cut은 sample duplicate를 유지하고 `i/k` linear quantile을 사용한다. bucket 선택은 upper-bound, 즉 `value >= cut`이면 오른쪽이다.
2. **`src/grammar/scales/index.js`**에서 size pure API를 내부 export한다.
3. **`src/grammar/scales/appearance.js`**
   - continuous range는 정확히 두 개의 finite nonnegative area를 허용한다.
   - discrete range는 최소 두 개, finite, nonnegative, nondecreasing을 요구한다.
   - 기존 `[24,196]` auto area range를 보존한다.
4. **`src/actions/scales/definitions.js`**
   - size consumer를 shape와 분리해 `resolveSizeScaleDefinition`으로 보낸다.
   - 일반 appearance resolver가 size type을 linear로 축소하지 않게 한다.
5. **`src/actions/scales/create.js`**
   - resolved consumers가 모두 `channel === "size"`일 때 size normalizer를 사용한다.
   - quantile sample domain과 threshold cut domain을 일반 numeric pair validator로 보내지 않는다.
6. **`src/actions/scales/editPolicy.js`**
   - size 전용 final-state normalizer를 generic scale transition보다 먼저 적용한다.
   - continuous↔discrete 전환의 domain/range 명시 의무와 stale key 제거를 구현한다.
7. **`src/actions/scales/channels.js`**
   - `editSizeScale` whitelist에 `type`, `domain`, `range`, `unknown`, `clamp`, `reverse`, `base`, `exponent`를 둔다.
   - `nice`, `zero`, `constant`는 size scale에서 거부한다.
8. **`src/materialization/scales/resolve.js`**
   - consumer channel이 size면 values 수집 후 size resolver로 일찍 분기한다.
   - quantile `domain:"auto"`는 최신 source values로 매 materialization마다 thresholds를 다시 만든다.
9. **`src/materialization/scales/map.js`**에서 size channel을 `mapSizeValues`로 보낸다.
10. **`src/actions/guides/legends/size.js`**
    - continuous는 실제 size mapper로 sample area를 구한다.
    - discrete는 모든 interval label과 `scale.range` area symbol을 만든다.
    - discrete size legend에 R37 `values`가 있으면 명시 오류다.
11. **`types/program.d.ts`**의 `SizeScaleOptions`를 승인된 discriminated union으로 교체한다. `types/index.d.ts` 공개 연결과 Full method 타입을 확인한다.

#### 수식과 validator

- continuous: `t=(f(x)-f(d0))/(f(d1)-f(d0))`; clamp 후 reverse면 `t=1-t`; `area=A0+t*(A1-A0)`.
- log: `d0,d1,x > 0`, `base > 0 && base !== 1`, base 기본 10.
- sqrt/pow: domain과 입력이 nonnegative. pow exponent는 positive finite이며 신규 pow 요청에 필수다.
- quantize: finite `min < max`; upper endpoint는 마지막 bucket.
- threshold: cut 최소 1개, strictly increasing; range 길이 `cuts.length+1`.
- mapped area나 unknown area가 negative/nonfinite면 `RangeError`다.
- circle만 `r=sqrt(area/π)`다. square와 기존 symbols는 `src/grammar/pointShapes.js`의 equal-area 경로를 사용한다.

#### 필수 테스트

- 신규 `test/contracts/size-scale-types.test.js`: R23-N01..N05, E01, L01.
- `test/contracts/channel-scale-editor-types.test.js`: reverse를 유효 호출로 바꾸고 type별 `@ts-expect-error`를 추가한다.
- 회귀: `test/contracts/size-legend-edges.test.js`, `test/unit/grammar/scales/transformed.test.js`, point mark·highlight·legend 동일 mapper.
- exact 숫자: log midpoint area `52π`, radius `7.211102550927978`; pow 사례 area 24; sqrt 사례 area 50; threshold `[2,4,4,8]`; quantile x=0 area 3.

#### 종료 조건

mark, legend, highlight가 하나의 area mapper를 사용하고, type edit·source edit·Canvas·theme 후 requested type/domain 의미가 보존돼야 한다. runtime/types/current contract/generated docs/installed consumer가 모두 통과한 뒤에만 R23을 Implemented-primary로 바꾼다.

### WP5.2 — R22 field stroke channel

Canonical behavior: [R22](features/22-stroke-color.md).

#### 파일별 구현

1. **`src/core/vocabulary.js`**와 scaled-channel vocabulary에 `stroke`를 독립 channel로 추가한다. `color` alias를 만들지 않는다.
2. **`src/actions/encodings/ruleAppearance.js`**의 기존 `encodeStroke({value})` 호환 동작을 pure constant branch로 보존한다.
3. **신규 `src/actions/encodings/stroke.js`**
   - value/field exclusive union을 정규화한다.
   - field branch는 color의 fieldType·temporalUnit·scale validation을 재사용한다.
   - field→value는 semantic binding과 stroke legend dependency를 제거한다. value→field는 constant owner를 제거한다.
4. **`src/actions/encodings/index.js`**와 Full registry에서 하나의 `encodeStroke`가 두 branch를 dispatch하게 한다.
5. **`src/actions/scales/definitions.js`, `src/actions/scales/quantitativeColor.js`, `src/actions/scales/consumers/common.js`, `src/actions/scales/consumers/families.js`, `src/actions/scales/consumers/seriesLayout.js`, `src/actions/scales/consumers/index.js`, `src/materialization/scales/resolve.js`, `src/materialization/scales/map.js`**를 channel parameterized color mapper로 연결한다.
6. **`src/actions/scales/channels.js`**에 `editStrokeScale`을 추가하고 color-compatible patch만 허용한다.
7. **`src/grammar/pathSeries.js`**에서 Line/Area final series마다 stroke field value가 하나인지 검사한다. final item filter 뒤 eligible items를 사용한다.
8. `src/actions/marks/point/materialize.js`, `src/actions/marks/bar/materialize.js`, `src/actions/marks/rect/actions.js`, `src/actions/marks/arc/actions.js`, `src/actions/marks/rule/actions.js`, `src/actions/marks/tick/actions.js`, `src/actions/marks/line/materialize.js`, `src/actions/marks/area/materialize.js`에 해당 item/series stroke를 전달한다. Text는 사전 오류다.
9. **`src/actions/guides/legends/creation.js`, `src/actions/guides/legends/categorical/options.js`, `src/actions/guides/legends/categorical/layout.js`, `src/actions/guides/legends/categorical/symbols.js`, `src/actions/guides/legends/target.js`, `src/actions/guides/legends/transition.js`, `src/actions/guides/legends/lifecycle.js`**에 stroke binding과 symbol appearance를 추가한다. 실제 fill+stroke+strokeWidth를 보존하며 width 0을 자동 변경하지 않는다.
10. selector/facet/theme/highlight/rematerialization channel switch의 exhaustive branch에 stroke를 추가한다.
11. **`types/program.d.ts`**에 value/field never-union, `EditStrokeScaleOptions`, legend channel `"stroke"`를 반영한다.

#### 필수 테스트

- 신규 `test/contracts/stroke-color.test.js`: Point 독립 fill/stroke, Line series 일관성, quantitative endpoints/midpoint, field↔value cleanup, 오류 union, Rule legacy.
- 회귀: `test/unit/actions/marks/filled-mark-stroke.test.js`, `test/contracts/item-legend-stroke-spacing.test.js`.
- renderer: Canvas/SVG/PDF에서 동일 graphic stroke와 width 0 보존.
- shared scale: explicit same ID인 fill/stroke는 전체 consumer 호환 시 성공, type/palette 충돌 시 atomic error.

#### 종료 조건

지원 family 표의 모든 mark가 semantic→graphic→legend→highlight→facet 경로에서 같은 stroke를 사용해야 한다. Text 거부와 Line/Area grain 오류가 write 전에 발생해야 한다.

### WP5.3 — R19 atomic `encodeChannels`

Canonical behavior: [R19](features/19-atomic-encoding.md).

#### 구현 구조

1. **`src/actions/encodings/shared.js`**에 single-channel action이 사용할 `normalizeChannelRequest`와 `planChannelEncoding`을 추출한다. public method를 내부에서 연속 호출하지 않는다.
2. **신규 `src/actions/encodings/channels.js`**에 `encodeChannels({target,channels})`를 구현한다.
3. 입력 key와 무관하게 canonical 순서를 사용한다: `x,y,x2,y2,theta,r,xOffset,yOffset,group,pathOrder,color,stroke,size,shape,opacity,strokeWidth,strokeDash,angle,text`.
4. target mark를 한 번 resolve하고 모든 요청을 정규화한다. payload 내부 `target`, `coordinate`, top-level resource `id`는 거부하되 nested `scale.id`는 허용한다.
5. 모든 final bindings와 scale requests를 draft에 먼저 놓는다. x↔y swap처럼 중간-invalid/final-valid 조합을 허용한다.
6. 같은 scale ID 요청을 canonical definition으로 병합한다. 값이 다르면 last-write를 하지 않고 충돌 오류를 낸다.
7. secondary channel, offset parent, series grain, polar roles, shared external consumer를 final draft로 preflight한다.
8. semantic patch를 한 번 commit하고 affected scale/mark/guide를 ID별로 deduplicate해 한 번씩 rematerialize한다.
9. trace는 `encodeChannels` root 아래 deterministic child action order를 갖는다. 실패 trace는 0개 증가다.
10. one-channel 호출은 대응 focused action과 semantic/graphic/config가 deep-equal이고 root trace 이름만 다르다.
11. **`types/program.d.ts`**의 19-key closed payload와 Full registry/current contract/knowledge surface를 추가한다.

#### 필수 테스트

- 신규 `test/contracts/atomic-encoding.test.js`.
- key order를 바꾼 두 호출의 final state와 child trace 순서 equality.
- x↔y swap, x/x2·y/y2, band+offset, group+pathOrder, theta+r, color+stroke+size, combined legend.
- 하나의 잘못된 channel, shared scale conflict, unsupported target에서 전체 program/trace 원자성.
- 회귀: `test/contracts/shared-scale-refresh.test.js`, `test/unit/actions/scales/scale-consumers.test.js`.

### WP5.4 — Phase 5 closeout

R20/R21을 R19 one/batch 경로에서 다시 검증한다. R23 size와 R22 stroke를 같은 point에 묶고 combined legend가 최종 mapper를 읽는지 확인한다. `phase5/STEP1.md`의 W2–W4를 각 revision과 실제 pass count로 나누어 기록한다. R43에 남기는 것은 non-Cartesian composition integration뿐이며 Phase 5의 자체 lifecycle을 pending으로 두지 않는다.

## 4. Phase 6 — coordinate aspect와 Polar frame

### WP6.1 — R27 `editCoordinate`와 aspect

Canonical behavior: [R27](features/27-coordinate-aspect.md).

1. **`src/grammar/coordinates.js`**에 aspect closed union과 validator를 추가한다. `"auto"`는 requested property 제거다.
2. **신규 `src/layout/aspect.js`**에 `resolveEffectiveBounds(allocatedBounds, aspect, domains)` pure 함수를 둔다.
3. frame ratio는 `width/height=ratio`. data ratio는 `(pixelsPerXUnit)/(pixelsPerYUnit)=ratio`가 되도록 domain span을 사용한다.
4. `alignX/alignY`로 leftover 공간을 배치한다. allocated bounds는 보존하고 effective plot bounds를 별도로 반환한다.
5. data mode는 Cartesian linear quantitative x/y만 허용한다. nice가 반영된 resolved domain의 절대 span을 사용하며 reverse는 span에 영향을 주지 않는다. temporal/log/sqrt/pow/band/categorical, zero/nonfinite span, 서로 다른 scale pair는 사전 오류다.
6. **`src/actions/coordinates/actions.js`**에 Full action `editCoordinate`를 추가한다. target은 coordinate ID이며 유일 추론을 새로 만들지 않는다. 현재 `registerCoordinateActions`가 Basic에도 쓰이므로 `registerBasicCoordinateActions`에는 `createCoordinate`만 두고 Full registrar가 basic registrar+`editCoordinate`를 등록하게 분리한다. `src/actions/basic.js`는 basic registrar를 import해야 한다.
7. **`src/materialization/planner.js`, `src/actions/scales/materialize.js`, `src/layout/canvas.js`**에서 domain → aspect → range 순서를 고정한다.
8. shared scales가 있어도 각 coordinate의 pixel range는 자기 effective bounds다.
9. 타입/current contract/registry/docs/package를 동기화한다.
10. 신규 `test/contracts/coordinate-aspect.test.js`에 frame/data 수식, align, reverse, resize, categorical/zero-span/overflow atomic error를 둔다.

### WP6.2 — R29 Polar frame

Canonical behavior: [R29](features/29-polar-frame.md).

1. R27의 `editCoordinate`에 `polarFrame` patch를 연결한다. Cartesian coordinate에 쓰면 오류다.
2. **`src/grammar/polar.js`**에 하나의 `resolvePolarFrame(effectiveBounds, requestedFrame)` pure owner를 둔다.
3. center fraction은 effective local bounds의 normalized 좌표다. radius fraction은 `0 < value <= 1`, px는 positive finite다. polarFrame 객체와 그 안의 center/radius 객체는 모두 전체 교체이며, center만 다시 주면 radius는 기본 fraction 1로 돌아간다.
4. radius는 center에서 네 frame edge까지 최소 거리 안에 있어야 한다. 범위를 넘으면 축소하지 않고 atomic error다.
5. **`src/grammar/polarPaths.js`, `src/grammar/polarGuides.js`, `src/actions/charts/polar.js`**의 mark/axis/grid/label 경로에 동일 center/radius를 전달한다.
6. `polarFrame:"auto"`는 property를 제거하고 current auto center/radius 정책으로 복귀한다.
7. Canvas resize와 aspect 이후 frame을 재계산한다. requested fraction/px 객체를 resolved 숫자로 덮지 않는다.
8. 신규 `test/contracts/polar-frame.test.js`와 polar unit tests에 moved center, fraction/px, guide 일치, overflow, wrong coordinate, lifecycle을 둔다.

### WP6.3 — Phase 6 closeout

Cartesian frame/data aspect, Polar moved frame, aspect+polarFrame 조합을 Canvas/SVG/PDF에서 검증한다. primitive/public same-run parity가 필요한 시각 variant는 승인된 Gate V target을 사용한다. 좌표 requested state와 effective geometry를 contract에서 분리해 기록한다.

## 5. Phase 7 — label lifecycle와 statistical reference

### WP7.1 — R31 `removeMarkLabels`

Canonical behavior: [R31](features/31-remove-labels.md).

1. **`src/actions/marks/text/index.js`**에서 attached-label owner를 source mark ID와 양방향으로 resolve하는 pure helper를 추출한다.
2. `removeMarkLabels({target})`와 `{source}`는 exclusive union이다. target은 label ID, source는 원본 mark ID다.
3. 삭제 plan은 label semantic layer, label graphic, label materialization config, collision layout entry, leader graphic, label-only selection dependency를 포함한다.
4. source mark와 source data/scale/guide는 보존한다. source에 여러 label owner가 있고 source selector를 사용하면 모두를 deterministic ID 순서로 제거한다.
5. unknown/wrong-owner/ambiguous target은 write 전에 오류다.
6. replay recipe에서 label 생성 항목도 제거해 source/Canvas/facet 재실행 후 부활하지 않게 한다.
7. 신규 `test/contracts/remove-labels.test.js`: target/source, multiple owners, leader cleanup, selection 공유/전용, source replay, 제거된 target 재호출 오류, labels가 0개인 기존 source 재호출 성공 no-op.

### WP7.2 — R32 selected labels

Canonical behavior: [R32](features/32-selected-labels.md).

1. `createMarkLabels`에 `select | selection | all` exclusive membership을 추가한다. omission은 all이다.
2. **`materializationConfigs.marks[labelId].labelAuthoring.selection`**이 requested owner다. raw row index나 resolved IDs를 영구 owner로 저장하지 않는다.
3. inline selector는 source mark의 final items에서 평가한다. named selection은 current selection definition을 참조한다.
4. source mark filtering과 path/series aggregation이 끝난 뒤 label membership을 평가한다. highlight 생성 전이다.
5. **`editMarkLabelSelection({target,...})`**은 selection 객체 전체 교체다. `all:true`는 `{kind:"all"}`로 바꾼다.
6. named selection removal은 참조 label이 있으면 거부하거나 같은 final transaction에서 label을 all/다른 selection으로 rebind한 경우에만 허용한다.
7. data edit, scale edit, Canvas, named selection edit 뒤 membership과 geometry를 다시 만든다.
8. 신규 `test/contracts/selected-labels.test.js`: top-k/final-item grain/no-match/named/inline/edit/remove/cycle/error 원자성.

### WP7.3 — R33 semantic label anchors

Canonical behavior: [R33](features/33-semantic-label-anchors.md).

1. placement union을 `createMarkLabels`와 신규 `editMarkLabelPlacement`에 추가한다.
2. requested placement는 labelAuthoring에 저장한다. `"auto"`는 placement property만 제거하고 selection은 보존한다.
3. **`src/layout/labels.js`**에 mark-family별 anchor resolver를 두고 **`src/actions/marks/text/layout.js`**가 program state를 해석해 pure 입력으로 변환한다. pure resolver는 좌표만 받고 graphic state를 쓰지 않는다.
4. signed bar는 baseline→value 방향, stacked bar는 segment start/end, arc는 angle bisector와 inner/outer radius를 사용한다. Point는 center만 허용하고, Line/Parallel series는 기존 endpoint label API를 유지하며 새 placement 객체를 거부한다.
5. gap은 text bbox edge와 mark boundary 사이 거리다. outside anchor는 bbox support distance를 반영한다.
6. `overflow: hide|outside|allow`와 fit fallback 순서를 고정한다. leader는 실제 anchor boundary부터 text boundary까지 별도 owned graphic이다.
7. zero-length mark 방향, donut hole, narrow sector, negative stack, reversed scale을 독립 geometry oracle로 검증한다.
8. 신규 `test/contracts/semantic-label-anchors.test.js`와 existing label layout unit tests를 갱신한다.

### WP7.4 — R36 statistical references

Canonical behavior: [R36](features/36-statistical-references.md).

1. 기존 literal `createReferenceLine/Band` union을 보존하고 dynamic branch를 추가한다.
2. requested owner는 `materializationConfigs.marks[referenceId].statisticalReference`다. resolved 숫자를 요청 객체에 저장하지 않는다.
3. source mark를 resolve하고 `population:"boundData"`는 transparent markFilter 이전 authoring dataset, `visibleItems`는 filter/series 이후 final eligible items를 사용한다.
4. field omission은 axis role field를 사용한다. explicit field는 source grain에서 존재와 numeric/temporal 호환성을 검사한다.
5. mean/median/min/max/quantile과 band lower/upper를 pure summary adapter로 계산한다. quantile public 키 `p`를 aggregate 내부 `probability`로 명시 변환한다.
6. dynamic reference는 auto scale domain에 기여하지 않는다. source scale로 resolved datum을 map한 뒤 Rule/Rect를 materialize한다.
7. source data revision, filter/selection, reencode, scale edit, Canvas/facet replay 뒤 재계산한다.
8. source mark 삭제 시 reference dependency를 거부하거나 명시 owner closure로 함께 제거하는 기존 정책을 적용한다.
9. 신규 `test/contracts/statistical-references.test.js`: 두 population 차이, quantile/band, explicit field, weighted-derived source, no rows/nonfinite/error, lifecycle.

### WP7.5 — Phase 7 closeout

한 프로그램에서 source edit → final-item selection → semantic placement → dynamic band → scale/aspect → leader/highlight 순서를 검증한다. labels와 references가 source domain을 역으로 바꾸거나 selection/highlight 순환을 만들지 않아야 한다.

## 6. Phase 8 — legend content·blocks·display names

### WP8.1 — R37 exact legend values

Canonical behavior: [R37](features/37-legend-values.md).

1. sampled continuous legend config를 `{mode:"auto",count?}` 또는 `{mode:"values",values,count?}`로 정규화한다. values mode의 count는 비활성 상태로 보존한 이전 auto count이며 한 public 요청에서 values와 count를 함께 받지 않는다.
2. requested owner는 각 legend kind config의 `sampling` 하나다. legacy count는 accessor에서 읽고 신규 write 후 중복 count를 제거한다.
3. size/opacity/strokeWidth continuous legend만 explicit numeric values를 지원한다. R23 discrete size와 categorical legends는 오류다.
4. values는 길이 1..100, finite, strictly increasing이어야 한다. 자동 정렬하지 않는다. `-0`과 `0`은 중복이다. 현재 scale domain 안에서 map 가능한지 final preflight한다.
5. `editLegend({values:"auto"})`는 values mode를 제거하고 auto sampling으로 복귀한다.
6. mapper와 formatter는 해당 channel의 실제 resolved scale을 사용한다. symbol size/stroke width/opacity를 값 그 자체로 재사용하지 않는다.
7. scale type/domain edit로 기존 explicit values가 invalid해지면 scale edit 전체가 atomic error다.
8. 신규 `test/contracts/legend-values.test.js`: exact order, mapper 결과, auto reset, invalid-after-scale-edit, R23 area samples, Canvas/theme/source replay.

### WP8.2 — R38 `editLegendBlock`

Canonical behavior: [R38](features/38-legend-blocks.md).

1. **`src/actions/guides/legends/target.js`**에 merged legend의 canonical block descriptor를 만든다. identity는 sorted channel set과 channel role이며 배열 index가 아니다.
2. `editLegendBlock({target,channel,...})`은 target legend 안에서 해당 channel이 속한 block을 정확히 하나 resolve한다.
3. title/text/symbol/gap/labelMap은 block override owner에 저장한다. values/count/order는 각 canonical content owner로 전달하고 override에 복제하지 않는다.
4. 같은 block에 대한 순차 edit는 정상 전체 patch 적용이다. 서로 다른 기존 block을 merge하는 transition에서만 incompatible overrides를 충돌로 본다.
5. split에서 compatible style만 새 block들로 복사한다. 기존 title/order/values가 있으면 자동 분배하지 않고 transition 전체를 거부한다. merge에서는 모든 유입 override가 동일하고 새 block에 유효할 때만 합친다.
6. **`src/actions/guides/legends/transition.js`, `src/materialization/legends.js`**에서 merge/split/reorder 뒤 descriptor로 다시 resolve한다.
7. 신규 `test/contracts/legend-blocks.test.js`: merged channel targeting, sequential edits, merge conflict, split/reorder persistence, removal, invalid channel.

### WP8.3 — R39 display names와 facet header

Canonical behavior: [R39](features/39-display-names-headers.md).

1. `DisplayLabelMap`은 `{value: DatasetScalar,label:string}[]`의 typed identity map이다. 같은 typed value의 중복만 오류다. 서로 다른 raw value가 같은 display label을 갖는 것은 허용하며 category를 합치지 않는다.
2. axis/legend/header formatter는 raw value를 먼저 identity lookup하고 match가 없으면 기존 formatter를 사용한다. raw domain/selection key/data는 바꾸지 않는다.
3. `"auto"`는 labelMap property 제거다.
4. facet headers는 legacy `mode:"cell"`을 읽어 기존 top cell 동작을 보존한다. explicit role 요청은 `mode:"roles"`로 전환한다.
5. row role은 left/right, column role은 top/bottom만 허용한다. strip의 text measurement 후 occupied bounds를 child plot allocation 전에 차감한다.
6. common style과 role override precedence를 한 accessor로 해결한다. empty panels도 typed header identity를 유지한다.
7. **`src/materialization/facets.js`, `src/actions/facets/guides.js`, `src/grammar/facets/index.js`**에서 row/column strip을 별도 materialize한다.
8. 신규 `test/contracts/display-names-headers.test.js`: number/string identity 차이, unmatched fallback, legend/axis/header, four sides/align, occupied bounds, replay.

### WP8.4 — Phase 8 closeout

R22 stroke+R23 size combined legend에 exact values와 block override를 함께 적용한다. merge/split, labelMap, header side가 theme/Canvas/facet source replay 뒤 동일 requested state를 사용해야 한다.

## 7. Phase 9 — custom theme와 shape style

### WP9.1 — R47 custom theme

Canonical behavior: [R47](features/47-custom-theme.md).

1. **`src/theme/defaults.js`**가 소유하는 token key 전체를 closed schema로 export한다. unknown token, non-string value, invalid color/font를 key별 validator로 거부한다.
2. `applyTheme`은 built-in name 또는 `{base,tokens}`를 받는다. partial tokens는 base 위에 merge한다.
3. precedence는 explicit mark/guide style > current unit custom tokens > inherited tokens > built-in base다.
4. `scope:"self"|"descendants"`를 구현한다. unit 기본은 self, composition 기본은 descendants다. descendants는 child와 retained source recipe에 origin owner를 기록한다.
5. child에 직접 applyTheme하면 inherited origin을 제거하고 explicit owner가 된다.
6. parent removeTheme는 자기 origin인 descendants만 제거한다. 독립 child theme은 보존한다.
7. nested composition은 postorder로 text metrics, occupied guides, child placement를 다시 계산한다.
8. palette/data-driven color는 theme mark token으로 덮지 않는다.
9. 신규 `test/contracts/custom-theme.test.js`: partial merge, precedence, descendants, explicit child, remove, nested replay, invalid keys.

### WP9.2 — R49 rounded corners·cap·join

Canonical behavior: [R49](features/49-shape-style-details.md).

1. mark create/edit option whitelist에 family별로 `cornerRadius`, `lineCap`, `lineJoin`, `miterLimit`을 추가한다. 지원하지 않는 family/property는 오류다.
2. `cornerRadius`는 finite nonnegative. 각 corner radius는 실제 rect width/height 절반으로 clamp한다.
3. rounded rect를 backend별 roundRect 호출에 맡기지 않고 shared concrete `M/L/C/Z` cubic path로 materialize한다.
4. negative/reversed bars도 normalized bounds에서 같은 path를 만든다. zero width/height 경계를 결정적으로 처리한다.
5. cap/join은 graphic attrs에 concrete value로 저장한다. 기본은 lineCap butt, lineJoin miter, miterLimit 10이다. `miterLimit`은 항상 positive finite이며 round/bevel join과 함께 저장할 수 있다. join 전환 때 임의로 삭제하지 않는다.
6. painted bounds는 strokeWidth와 cap/join/miter 확장을 포함한다. clipping/layout이 fill bounds만 읽지 않게 한다.
7. Canvas/SVG/PDF renderer는 graphic attrs를 그대로 번역하고 mark 의미를 재추론하지 않는다.
8. legend symbol/highlight/facet cloned item도 같은 attrs/path를 사용한다.
9. 신규 `test/contracts/shape-style-details.test.js`: radius clamp, negative bar, round/square cap, miter/bevel/round join, invalid combinations, edit/theme/Canvas/facet persistence.

### WP9.3 — Phase 9 closeout

custom theme의 token과 explicit R49 style precedence를 한 fixture에서 검증한다. Canvas/SVG/PDF의 path command·attrs·painted bounds와 raster 결과를 확인한다.

## 8. Phase 10 — R43 Polar·Parallel facets/repeat

Canonical behavior: [R43](features/43-polar-parallel-facets.md), canonical matrix: [polar-parallel-facets.md](chart/polar-parallel-facets.md).

### WP10.1 — dependency와 replay

1. `src/grammar/facets/dependencies.js`에 theta/r/stroke/parallel dimension scale, local coordinate, labels, references, legend recipe, theme/style refs를 구조화해 수집한다.
2. `src/actions/facets/derive.js`와 `replay.js`에서 raw source partition → row-preserving transforms → statistical transforms 순서를 사용한다.
3. retained source recipe와 child provenance map을 보존한다. graphic crop/clone으로 구현하지 않는다.

### WP10.2 — family domain resolver

1. `src/grammar/facets/scales.js`에 theta/r/stroke/parallelDimensions shared/independent를 추가한다. 기본은 shared다.
2. shared numeric domain은 각 panel의 local effective values union, categorical은 typed-key ordered union이다.
3. Parallel domain은 dimension field별이다. 서로 다른 dimension의 값을 한 extent로 합치지 않는다.
4. shared 의미 domain과 child-local pixel range/coordinate frame을 분리한다.

### WP10.3 — family별 replay

다음 각 family에 facet과 facetGrid fixture가 모두 필요하다.

- Polar Point: theta category union, r shared/independent, R29 local frame.
- Polar Line: series/path order와 local selection labels.
- Arc: angular/radial bounds, empty panel.
- Pie: 각 partition 내부 합을 360° 요청 span에 배분한다.
- Rose: angular categories와 radial aggregate를 따로 계산한다.
- Radar: dimension order와 closed path 보존.
- ParallelCoordinates: 같은 dimension list/order/type/scale compatibility, field별 domain.

각 family는 source edit, scale policy edit, Canvas, label/header/theme/style 재생성까지 검증한다.

### WP10.4 — repeat 확장

1. `repeatCharts.channel`에 theta, r, `{parallelDimension:string}`을 추가한다.
2. fields는 nonempty unique이고 모든 field/type compatibility를 child 생성 전에 검사한다.
3. theta/r는 직접 field-bound role을 가진 Polar Point/Line/Arc/Rose에서만 교체한다. Pie/Radar semantic role 변환은 거부한다.
4. `parallelDimension:a`를 c,d로 반복하면 `[a,b,…]`가 `[c,b,…]`, `[d,b,…]`가 된다. 다른 dimension은 그대로다.
5. AST나 임의 문자열에서 field명을 전역 치환하지 않는다.

### WP10.5 — guides와 empty panel

1. non-Cartesian axis 기본은 per-panel internal이다. explicit outer/shared axis는 오류다.
2. compatible categorical/size/stroke legend shared는 지원한다.
3. empty panel은 header와 panel을 보존한다. explicit/shared domain은 사용할 수 있다. independent auto domain에 값이 없으면 오류다.
4. 모든 error는 child ID allocation/trace/state write 전에 preflight한다.

### WP10.6 — 테스트와 종료

신규 `test/contracts/polar-parallel-facets.test.js`에 R43-N01..N04, E01, L01/L02를 둔다. 기존 `test/unit/actions/composition/facet-derived-families.test.js`, `facet-grid-repeat.test.js`를 회귀한다. chart matrix의 각 required cell은 primitive/public/render/type/package 증거를 가져야 하며 `not-applicable`과 `explicitly-rejected`에는 이유를 기록한다.

## 9. Phase 11 — R25 안전한 named resource 삭제

Canonical behavior: [R25](features/25-remove-resources.md).

### WP11.1 — reference registry

1. 신규 `src/core/resourceReferences.js`에 `collectResourceReferences(program,{kind,id})`를 둔다.
2. 각 owner module은 known schema의 typed reference edge만 반환한다. semantic 전체 문자열 검색은 금지한다.
3. edge는 `kind,id,ownerKind,ownerId,path,strength`를 포함한다. 정렬은 ownerKind→ownerId→canonical path다.
4. historical trace는 제외한다. replay용 retained source/template는 live다. context current pointer는 context strength다.
5. data, scale, coordinate 외 mark/selection edges도 registry에 포함해 기존 remove action preflight가 재사용할 수 있게 한다.

### WP11.2 — public remove actions

1. `removeData`, `removeScale`, `removeCoordinate`를 Full registry와 types에 추가한다.
2. kind와 exact ID를 resolve한다. unknown/wrong kind/chart-owned internal은 오류다.
3. standalone logical data owner는 owner.current 자기 edge만 제외한 뒤 외부 live edge 0일 때 registry와 current snapshot을 함께 제거한다.
4. live edge가 하나라도 있으면 sorted referrer 목록을 포함한 오류를 낸다. cascade는 없다.
5. live 0이면 semantic resource, resolved cache, 해당 config, 자기-owned unused graphics만 제거한다.
6. context-only pointer는 unset한다. 임의 다른 current resource를 선택하지 않는다.
7. 삭제 전후 visible graphic과 decoded pixels가 같아야 한다.

### WP11.3 — 필수 reference fixtures

- data: layer.data, dataset.source, standalone current, chart-private owner, retained facet/repeat source, statistical population.
- scale: x/y/x2/y2/theta/radius(public r)/color/stroke/size/shape/opacity/strokeWidth/strokeDash/angle, x/yOffset, parallel dimension, axes, legend binding/recipe.
- coordinate: layer, annotation space, guide placement, composition child/local recipe.
- selection: highlight와 named label recipe; public removeSelection은 추가하지 않는다.

신규 `test/contracts/remove-resources.test.js`에서 각 path를 **그 edge 하나만 남긴 fixture**로 검증한다. unused 삭제, context-only, trace-only, wrong kind/internal, deterministic error, 마지막 mark 삭제 후 logical data 삭제를 포함한다.

## 10. Phase 12 — 전체 통합과 closeout

### WP12.1 — 기계적 대조

1. `PROPOSALS.json`의 선택 25개와 `IMPLEMENTATION_MAP.json.features`를 ID set으로 exact 비교한다.
2. 각 feature는 Current source, executable test, type, current contract, ACTION_INDEX owner, public docs, installed package evidence를 모두 가져야 한다.
3. `ACCEPTANCE_CASES.json`의 `passed`는 실제 test path와 implementation revision이 있을 때만 허용한다.
4. Planned/partial/pending required cell이 하나라도 남으면 Roadmap completed로 바꾸지 않는다.

### WP12.2 — 네 개의 복합 프로그램

1. complete → impute → computed → normalize → window → summary → source revision.
2. atomic x/y/color/stroke/size → combined legend values/block map → selected labels → dynamic reference → theme.
3. Polar frame/aspect → facet → source replay → theme → Canvas resize.
4. Parallel dimension scale → repeat substitution → facet shared domains → resource removal.

각 프로그램은 before/after immutable state, deterministic trace, graphic result, applicable renderers, packed-package 실행을 검증한다.

### WP12.3 — 공개 surface 생성 순서

Owner source를 먼저 수정한 뒤 아래 순서로 생성한다.

```sh
npm run contracts:catalog
npm run contracts:relations
npm run contracts:cards
npm run docs:generate
```

생성 파일을 직접 고치지 않는다. Full에 새 advanced action을 등록하되 Basic surface는 명시된 기존 범위 그대로다.

### WP12.4 — 최종 검증 순서

Focused failure를 먼저 해결하고 다음 명령을 순차 실행한다.

```sh
npm run test:unit
npm run test:contracts
npm run test:charts
npm run test:gates
npm run test:render
npm run test:browser
npm run test:realistic
npm run contracts:catalog:check
npm run contracts:relations:check
npm run contracts:cards:check
npm run docs:capabilities:check
npm run docs:reference:check
npm run docs:signatures:check
npm run docs:metadata:check
npm run docs:search:check
npm run docs:machine:check
npm run test:docs
npm run package:check
npm run test:package
npm run package:bundle
npm test
```

`docs:verify`와 realistic audit는 환경 preflight가 성공할 때 추가 실행한다. 실패·skip을 성공으로 기록하지 않는다. browser gzip budget 변화는 원인을 설명하고 새 기능의 필수 코드만 포함됐는지 확인한다.

### WP12.5 — 완료 판정

아래가 모두 참이어야 Roadmap 7을 완료로 표시한다.

- 선택 25개가 모두 Implemented/Current이며 사용자 승인 없는 scope drop이 없다.
- 모든 required integration/renderer/composition/package cell이 passed다.
- public type positive/negative tests와 Full/Basic boundary가 통과한다.
- generated contracts/docs/knowledge가 source와 일치한다.
- ignored artifact를 완료 근거로만 사용하고 stale output을 재사용하지 않았다.
- coherent final revision이 remote branch에 push돼 있다.

PR 생성·main merge는 저장소 authorization에 따라 실행한다. 이미 사용자가 Roadmap 7 구현과 main merge를 승인한 이 작업에서는 최종 검증이 끝난 같은 revision으로 PR/merge하고 관련 이슈를 닫는다. package publish와 docs deploy는 별도 명시가 없으면 수행하지 않는다.

## 11. 구현자가 보고할 최소 형식

각 checkpoint 보고에는 다음만 사실대로 채운다.

```text
기능/Phase:
구현 revision:
변경된 canonical owner:
공개 API·저장 schema 변화:
독립 수치/geometry 결과:
focused test 명령과 pass/fail 수:
cumulative test 명령과 pass/fail 수:
renderer/package 결과:
Current로 승격한 문서:
후속 owner에 남긴 integration cell:
다음 작업 패킷:
```

명령을 실행할 예정이라는 설명은 증거가 아니다. source 구현만 있고 types/current contract/package가 없으면 완료가 아니다. 첫 PNG만 있고 primitive/public parity와 semantic oracle가 없으면 시각 기능 완료가 아니다.
