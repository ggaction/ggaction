# Roadmap 7 — 상세 구현 작업 패킷

작성 기준: 2026-09-13. 현재 branch `codex/roadmap7-authoring-refinement`, 마지막 제품 구현 checkpoint `20a25911`이다. 이 문서는 이미 승인된 Roadmap 7을 구현자가 기능 단위로 끝까지 실행하기 위한 **작업 분해와 종료 절차**다. Phase 8 이후의 함수·state·transition·test를 한 문서에서 기계적으로 실행하려면 [무추론 구현 명세](LOW_INFERENCE_IMPLEMENTATION_SPEC.md)를 함께 따른다. 공개 API의 정확한 의미·수식·기본값은 각 `features/*.md`가 canonical owner이며, 이 문서는 그 계약을 어느 파일에 어떤 순서로 구현하고 무엇으로 검증할지를 소유한다.

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
| R22 field stroke | Implemented-primary | `3fc40a66`, 기록 `0a2fed94` | R19/R43 통합 |
| R19 atomic encoding | Implemented-primary | `58d9e51a`, 기록 `13acb276` | R32/R36/R38/R43 새 consumer 통합 |
| R27 coordinate aspect | Implemented-primary | `ded3b073` | R33/R39/R43 소비 회귀 |
| R29 Polar frame | Implemented-primary | `4aa9da65` | R33 label anchor와 R43 local panel 소비 회귀 |
| R31 attached label removal | Implemented-primary | `73e3d53e` | R43 source-owned Text facet/repeat 소비 회귀 |
| R32 selected final-item labels | Implemented-primary | `ee3f3b02` | R43 facet/repeat 소비 회귀 |
| R33 semantic label anchors | Implemented-primary | `95968031` | R43 facet/repeat 소비 회귀 |
| R36 dynamic statistical references | Implemented-primary | `d7136174`, 통합 `5832228c` | R25 resource collector 통합 |
| R37 exact sampled legend values | Implemented-primary | `8760111d`, 시각 증거 `547eae1b` | R38 block selector와 R43/R47 소비 회귀 |
| R38 channel-targeted legend block edit | Implemented-primary | `7ffafe02` | R19/R39/R43/R47 소비 회귀 |
| R39 typed display names와 facet header strips | Implemented-primary | `20a25911` | R43/R47 소비 회귀 |

완료 checkpoint의 pure core나 public API를 다른 이름으로 다시 만들지 않는다. 후속 기능이 새 consumer를 추가할 때 기존 owner에 consumer path와 regression만 보강한다.

### 남은 구현 순서

순서는 의존성 계약이다. 같은 번호의 소단계는 위에서 아래로 수행한다.

1. Phase 9: R47 → R49 → renderer/style 통합. Phase 8은 완료 checkpoint다.
2. Phase 10: R43 family matrix 전체.
3. Phase 11: R25 reference registry와 안전 삭제.
4. Phase 12: 25개 기능의 전체 lifecycle·metadata·package closeout.

R19, R27, R29의 완료 checkpoint를 다시 구현하지 않는다. R43을 좌표·라벨·guide·theme보다 먼저 만들지 않는다. R25는 모든 새 reference schema가 생긴 뒤 구현한다.

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
| R19 | 원자적 다중 encoding | Implemented-primary (`58d9e51a`) | 완료 checkpoint + WP7/WP8/WP10/WP12 |
| R20 | Parallel focused scale edit | Implemented-primary | 완료 checkpoint + WP5.4/WP10 |
| R21 | x/y offset focused scale edit | Implemented-primary | 완료 checkpoint + WP5.4/WP10 |
| R22 | field stroke·stroke scale·legend | Implemented-primary (`3fc40a66`) | 완료 checkpoint + WP5.4/WP10 |
| R23 | nonlinear/discrete size scale | Implemented-primary | 완료 checkpoint + WP5.3/WP8.1/WP10/WP12 |
| R25 | 안전한 resource 삭제 | Proposed | WP11 |
| R27 | coordinate aspect | Implemented-primary (`ded3b073`) | 완료 checkpoint + WP7.3/WP8.3/WP10/WP12 |
| R29 | Polar frame | Implemented-primary (`4aa9da65`) | 완료 checkpoint + WP7.3/WP10/WP12 |
| R31 | attached labels 삭제 | Implemented-primary (`73e3d53e`) | 완료 checkpoint + WP10/WP12 |
| R32 | selected final-item labels | Implemented-primary (`ee3f3b02`) | 완료 checkpoint + WP10/WP12 |
| R33 | semantic label anchors | Implemented-primary (`95968031`) | 완료 checkpoint + WP10/WP12 |
| R36 | dynamic statistical references | Implemented-primary (`d7136174`, 통합 `5832228c`) | 완료 checkpoint + WP11/WP12 |
| R37 | exact sampled legend values | Implemented-primary (`8760111d`) | 완료 checkpoint + WP8.2/WP10/WP12 |
| R38 | combined legend block edit | Implemented-primary (`7ffafe02`) | 완료 checkpoint + WP8.3/WP10/WP12 |
| R39 | typed display names·header strips | Implemented-primary (`20a25911`) | 완료 checkpoint + WP9/WP10/WP12 |
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

### 저성능 구현 모델을 위한 무추론 실행 규약

아래 순서는 권장이 아니라 각 미완료 WP의 실행 절차다. 한 단계의 산출물을 만들지 않고 다음 단계로 넘어가지 않는다.

1. `git status`, 현재 Phase STEP, 해당 feature 상태를 확인한다. 완료 checkpoint source를 새 구현으로 덮지 않는다.
2. feature 문서의 public call을 `test/contracts/<capability>.test.js`에 실제 유효한 최소 fixture로 먼저 옮긴다. 구현 전에는 실패가 정상이다.
3. `ACCEPTANCE_CASES.json`의 해당 R번호 case를 모두 테스트 이름 옆 주석 또는 STEP evidence 표에 연결한다. JSON을 runtime test에서 import하지 않는다.
4. 가장 가까운 기존 action의 validator, semantic writer, materializer, remover를 각각 하나씩 식별한다. 하나의 함수가 네 역할을 섞고 있으면 pure 계산만 추출하고 기존 public signature는 유지한다.
5. 입력 key whitelist와 discriminated union을 먼저 구현한다. unknown key를 버리거나 `...rest`로 내부 state에 복사하지 않는다.
6. requested state와 resolved state를 별도 변수로 만든다. requested 객체에는 사용자 입력만, resolved 객체에는 domain·geometry·membership·sample 결과만 둔다.
7. 모든 대상과 참조를 읽기 전용으로 resolve한다. 이 단계에서는 `editSemantic`, `_nextId`, `_enterAction`, materializer를 호출하지 않는다.
8. final candidate를 plain immutable data로 만든다. shared consumer 전체, mode 전환 cleanup, detached owner를 이 candidate로 검사한다.
9. 실패 fixture를 실행해 원본 program과 frozen input이 그대로인지 확인한다. 이 단계가 통과하기 전에 성공 write 경로를 public registry에 노출하지 않는다.
10. 기존 wrapped primitive로 semantic/config patch를 commit한다. trace node를 직접 조립하거나 성공하지 않은 public action 이름을 child로 위조하지 않는다.
11. materialization plan을 canonical dependency 순서로 만들고 같은 `{op,args}`를 한 번만 실행한다. 한 owner를 여러 requested channel이 건드려도 scale/mark refresh는 중복하지 않는다.
12. focused action과 새 batch/edit action의 겹치는 호출을 비교한다. semantic, graphic, config, context 결과가 다르면 의도된 public 차이를 feature에 기록한 경우가 아니면 실패다.
13. 지원 consumer를 하나씩 연결하고 lifecycle fixture를 다시 실행한다. mark 성공만으로 legend, label, selection, facet, renderer가 된 것으로 간주하지 않는다.
14. runtime과 타입을 같은 diff에 연결한다. positive type fixture와 각 forbidden union의 `@ts-expect-error`를 같이 둔다.
15. current contract와 ACTION_INDEX owner를 갱신한 다음 generator를 실행한다. generated 파일을 먼저 고치지 않는다.
16. focused → affected cumulative → generated freshness → installed package 순서로 검증하고 실제 개수와 revision을 STEP에 적는다.
17. `git diff --check`와 변경 파일 목록을 검토한 뒤 coherent checkpoint를 commit/push한다. 그 뒤에만 다음 WP를 시작한다.

다음 다섯 문장은 구현 판단의 기본 분기다.

- 문서에 없는 public option은 추가하지 않는다.
- 생략은 유지, 명시된 `"auto"`나 remove action만 reset이다.
- 여러 요청이 같은 owner에 다른 명시 값을 쓰면 입력 순서로 고르지 않고 충돌 오류를 낸다.
- final-state API는 intermediate state를 public validator에 통과시키는 방식으로 구현하지 않는다.
- 오류가 난 private candidate는 버리며 원본의 trace, ID allocator, current pointer, resolved cache에 흔적을 남기지 않는다.

### 남은 기능의 구현 라우팅 표

이 표는 구현 위치를 찾는 라우터다. signature·기본값·수식은 링크된 feature가 유일한 owner다.

| 순서 | 기능 | 공개 표면 | requested owner | pure/transaction 중심 | 반드시 닫을 후속 경로 |
| --- | --- | --- | --- | --- | --- |
| 1 | [R19](features/19-atomic-encoding.md) | Full `encodeChannels` | target layer encodings + 기존 scale/config owner | canonical request map → final layer/scale plan → one commit | R20/R21/R22/R23, guide/label/highlight |
| 2 | [R27](features/27-coordinate-aspect.md) | Full `editCoordinate.aspect` | semantic coordinate `aspect` | effective bounds resolver; domain→aspect→range | resize, guide allocation, layer shared bounds |
| 3 | [R29](features/29-polar-frame.md) | `editCoordinate.polarFrame` | semantic coordinate `polarFrame` | effective bounds→center/available radius | polar mark/axis/grid/label/leader |
| 4 | [R31](features/31-remove-labels.md) | Full `removeMarkLabels` | attached label owner + replay recipe | reference closure→label/config/leader removal | selection/highlight, resize/theme/facet replay |
| 5 | [R32](features/32-selected-labels.md) | label create 확장 + `editMarkLabelSelection` | `labelAuthoring.selection` | final-item membership resolver | source edit, named selection, label geometry |
| 6 | [R33](features/33-semantic-label-anchors.md) | label create 확장 + `editMarkLabelPlacement` | `labelAuthoring.placement` | mark geometry→anchor/bbox/leader | signed/stacked Bar, Arc, resize/aspect |
| 7 | [R36](features/36-statistical-references.md) | reference line/band statistic union | `statisticalReference` config | population→summary→scale map | source/filter/reencode/scale/facet |
| 8 | [R37](features/37-legend-values.md) | legend `values` create/edit | legend sampling owner | explicit samples→actual channel mapper | domain edit rejection, R23 size, resize/theme |
| 9 | [R38](features/38-legend-blocks.md) | Full `editLegendBlock` | block descriptor override | channel set identity→merge/split preflight | reorder/removal/reencode, R22/R23 |
| 10 | [R39](features/39-display-names-headers.md) | `labelMap` + `editFacetHeaders` roles | guide/header recipe | typed identity formatter + occupied strips | raw key preservation, facet replay, aspect |
| 11 | [R47](features/47-custom-theme.md) | `applyTheme` 확장, `removeTheme` lifecycle | theme + provenance owner | closed tokens→precedence→postorder replay | nested concat/facet/repeat, explicit style |
| 12 | [R49](features/49-shape-style-details.md) | 기존 mark options 확장 | mark requested style | rounded path + stroke bounds | legend/highlight, Canvas/SVG/PDF state reset |
| 13 | [R43](features/43-polar-parallel-facets.md) | facet/facetGrid 지원 확장 + repeat roles | retained source/family resolution recipe | raw partition→family replay→local frame/range | 7 family matrix 전체, all prior consumers |
| 14 | [R25](features/25-remove-resources.md) | Full `removeData/Scale/Coordinate` | 각 named resource registry | typed live-edge collector→preflight→cleanup | 모든 새 owner/ref path, pixel invariance |

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

#### 공개 API와 타입을 먼저 고정한다

1. 새 public type은 `EncodeChannelsOptions`다. `target:string`과 nonempty plain object `channels`만 top-level key로 허용한다.
2. 각 channel payload는 대응 focused options에서 `target`과 `coordinate`를 제거한 **distributive union**이다. 일반 `Omit<Union,...>`으로 exclusive branch가 합쳐지면 안 된다. 문서 타입에서는 `type WithoutBatchTarget<T> = T extends unknown ? Omit<T,"target"|"coordinate"> : never` 형태를 사용한다.
3. 허용 channel key는 정확히 19개다: `x,y,x2,y2,theta,r,xOffset,yOffset,group,pathOrder,color,stroke,size,shape,opacity,strokeWidth,strokeDash,angle,text`.
4. `radius`, `yRange`, `xRange`, `barWidth`, `parallelDimensions`와 임의 문자열 key는 허용하지 않는다. `r`만 public alias이며 final semantic channel에서는 기존 vocabulary대로 `radius`가 될 수 있다.
5. channel payload `null`, 배열, primitive, empty object 중 focused action에서 유효하지 않은 shape는 오류다. `null`은 remove 의미가 아니다. 제거는 기존 `removeEncoding` owner다.
6. payload direct key의 `target`, `coordinate`, `id`는 오류다. `payload.scale.id`는 named scale binding이므로 허용한다. `scale` 아래의 unknown key는 기존 focused scale validator가 거부한다.
7. `ChartProgramActions`와 root export에 method/type을 추가하고 Full registrar에만 등록한다. `src/actions/encodings/basic.js`와 Basic declarations에는 method를 추가하지 않는다.

#### 내부 module과 자료구조

다음 이름은 private 권장 이름이다. 현재 code owner와 충돌하면 같은 역할의 기존 helper를 확장할 수 있지만 역할을 합치거나 생략하지 않는다.

1. **`src/actions/encodings/channels.js`**
   - `ENCODING_CHANNEL_ORDER`: 위 19개를 frozen array로 한 번 정의한다.
   - `normalizeEncodeChannelsArgs(program,args)`: top-level shape, target, key 집합, nonempty를 검증하고 canonical 순서의 request 배열을 반환한다.
   - `planEncodingAssignments(program,target,requests)`: write 없는 final plan을 반환한다.
   - wrapped `encodeChannels`: normalize → plan → commit → materialization plan 적용만 조정한다.
   - `registerAtomicEncodingAction(ProgramClass)`: Full registrar 연결만 담당한다.
2. **`src/core/action.js`와 기존 focused family owner**
   - `invokeWrappedActionImplementation(action,program,args)`: `action()`이 private WeakMap에 보존한 기존 implementation
     body를 wrapper node 없이 호출한다. `src/extension.js`에서는 export하지 않는다.
   - focused action은 기존 wrapper, 결과와 trace를 그대로 유지한다. Batch planning만 같은 implementation body를
     private immutable planning program에서 재사용한다. focused action이 `encodeChannels`를 호출하는 역의존은 금지한다.
   - planning subclass는 `rematerializeScale`에서 resolved preview/cache만 갱신하고 mark/legend materializer를 no-op한다.
     다른 public action surface에 transaction mode를 추가하거나 global mutable flag를 두지 않는다.
3. plan의 최소 논리 shape는 다음 정보를 모두 가져야 한다. 실제 property 이름은 private이지만 항목을 잃으면 안 된다.

```js
{
  target,
  originalLayer, finalLayer,
  state: {
    semanticSpec, graphicSpec, resolvedScales, materializationConfigs,
    children, compositionSpec, context, trace, actionStack, actionSequence
  },
  scaleIds
}
```

`originalLayer`, caller payload, 기존 scale definition을 직접 수정하지 않는다. plan 값은 deterministic frozen state data여야
하며 function, `ChartProgram` instance 또는 backend 객체를 저장하지 않는다. `state`는 성공한 planning program의 owned
branches만 참조하고 commit에서 원래 runtime class constructor로 다시 소유된다.

#### normalize 단계

1. target mark를 기존 exact target resolver로 한 번만 찾는다. missing/wrong resource/ambiguous inference는 focused action의 error family를 유지한다.
2. `Object.keys(channels)`를 whitelist와 대조한 뒤 `ENCODING_CHANNEL_ORDER.filter(key => hasOwn(channels,key))`로 순서를 만든다. 입력 enumeration 순서로 loop하지 않는다.
3. 각 request는 focused action과 같은 field existence, fieldType, datum/value exclusive union, temporal unit, aggregate, bin, stack, scale option 검증을 사용한다.
4. family whitelist는 target의 **기존 mark family와 coordinate**로 검사한다. batch가 mark family나 coordinate type을 추론해 바꾸면 실패다.
5. constant↔field 전환은 새 branch만 추가하는 merge가 아니다. old-only semantic binding, constant style, scale/legend dependency를 cleanup 목록에 넣는다.
6. normalizer는 scale ID를 발급하거나 semantic/graphic/config를 쓰거나 trace를 추가하지 않는다. implicit scale ID가 필요하면 기존 deterministic ID 정책에 필요한 요청만 plan에 기록하고 실제 ID 소비는 성공 commit에 한정한다.

#### final draft와 scale 병합

1. canonical requests를 materialization-deferred immutable planning program에 모두 적용해 pair/grain 검증을 한다.
   Public focused wrapper를 호출하지 않고 private implementation body만 호출한다. Bar의 x/y category-measure orientation이
   함께 뒤집히면 primitive boundary의 `withoutPreviewLayerEncodings`로 planning clone의 이전 x/y primary
   assignment를 trace 없이 먼저 분리하고 두 final request를 적용한다. Action module에서 `_clone`을 직접 호출하지 않는다.
   Original layer는 guide rebind와 detached-scale 판정을 위해 보존한다.
2. x/x2와 y/y2는 각 축의 final field type·scale family·secondary ownership으로 검사한다. primary를 바꿨을 때 secondary old binding이 final로 불가능하면 요청이 secondary를 함께 고친 경우 성공하고, 그대로 남아 불가능하면 오류다.
3. xOffset/yOffset은 final parent x/y가 band-compatible인지 확인한다. parent와 offset이 한 요청에서 함께 바뀌는 경우 final parent를 사용한다.
4. group/pathOrder는 final item grain과 series family로 검사한다. Line/Area의 color/stroke field도 final series 안에서 값 하나인지 확인한다.
5. theta/r은 existing polar role validator를 사용한다. Cartesian target에 request가 있거나 polar role이 incomplete/incompatible하면 write 전 오류다.
6. appearance channel은 R22 stroke와 R23 size를 포함한 현재 family matrix로 검사한다. Parallel target에서는 dimension topology를 바꾸지 않고 이미 지원하는 appearance만 허용한다.
7. 같은 explicit `scale.id`에 여러 request가 닿으면 property별 canonical explicit patch를 병합한다. 한 요청에서 생략한 property는 충돌이 아니다. 두 요청이 같은 property에 deep-equal 값을 주면 하나로 합친다. 서로 다른 `type/domain/range/reverse/clamp/base/exponent/padding/...` 명시 값은 `Error`다.
8. 기존 external consumer를 포함한 final consumer 집합으로 scale family/type/domain/range 호환성을 검사한다. batch target만 떼어 놓고 scale edit를 허용하지 않는다.
9. detached scale은 final live consumer가 0인 경우에만 cleanup한다. 다른 layer/guide/retained recipe가 쓰면 남긴다.

#### commit과 materialization

1. preflight가 모두 끝난 뒤 wrapped `encodeChannels` action 안에서 frozen plan state를 원래 runtime class에 적용한다.
   Public `encodeX`, `encodeY` wrapper를 연속 호출하지 않는다. Planning implementation body가 호출한 실제
   `editSemantic`/scale/config child trace는 `encodeChannels` subtree에 보존한다.
2. 기존 `editSemantic` 및 family-specific wrapped primitive를 재사용한다. child trace는 실제 실행된 의미 변경만 기록한다. `encodeX` 같은 가짜 child node를 직접 생성하지 않는다.
3. materialization은 `buildMaterializationPlan`의 stage order를 사용한다. affected ID set을 canonical 정렬한 뒤 `{op,args}`가 같은 step을 deduplicate한다.
4. 최소 dependency 순서는 final scale resolve/materialize → target와 dependent marks → labels/references → guides → occupied layout → highlights다. 현재 planner가 labels/references를 mark/guide 내부 owner로 실행한다면 그 owner action을 한 번만 계획하고 별도 중복 step을 추가하지 않는다.
5. combined legend는 channel별 중간 legend를 만들지 않는다. final channel binding과 final scale mapper를 읽어 한 번 재생성한다.
6. rebind가 필요한 axis/legend는 `originalLayer`의 old scale ID와 `finalLayer`의 new scale ID를 비교해 수행한다. final draft를 original인 것처럼 넘겨 old binding 정보를 잃지 않는다.
   이전 axis ticks와 labels가 같은 mode 및 values/count를 공유하면 coupled inferred recipe로 보고, final
   ordinal/band/point scale에는 final domain values를, final continuous scale에는 `count:5`를 설정한다.
   Component style/position/title은 보존한다. Explicit guide values와 새 domain의 충돌 및 continuous-only
   grid의 categorical 전환은 batch 전체 오류다.
7. 성공 결과에서 요청되지 않은 channel/config는 보존한다. one-channel batch는 대응 focused action과 `semanticSpec`, `graphicSpec`, `materializationConfigs`, `context`, resolved cache가 deep-equal이어야 한다.
8. trace 차이는 root `encodeChannels`와 그 아래 실제 wrapped operations뿐이다. 같은 key set의 permutation은 child op/args/order까지 동일해야 한다.

#### 금지 구현

- `requests.reduce((p,r) => p[focusedAction](...))`: intermediate validation과 반복 materialization 때문에 금지.
- `_clone({semanticSpec: staged})`로 전체 old binding을 덮고 original layer를 버리는 방식: detached scale/guide rebind의
  old owner를 잃으므로 금지. Bar orientation 전환에서 planning-only x/y 분리는 original layer를 plan에 별도 보존하고
  final guide/detached-scale 계산에 반드시 사용한다.
- `Promise.all`이나 mutable draft에 public actions를 적용: action/ID/trace 순서가 비결정적이므로 금지.
- 동일 scale patch의 object spread last-write: property 충돌을 숨기므로 금지.
- 실패 뒤 `_nextId`, trace 또는 cache를 되돌리는 보상 transaction: 사전 plan으로 write 자체가 없어야 한다.
- batch 전용 scale/mark mapper 복제: focused와 batch 결과 drift를 만들므로 기존 pure owner를 공유해야 한다.

#### `test/contracts/atomic-encoding.test.js`의 고정 fixture

| 묶음 | 설정 | 호출 | exact 판정 |
| --- | --- | --- | --- |
| one channel | Point `x:a` fixed scale | `channels:{x:{field:"b",scale:{domain:[0,10],range:[0,100]}}}` | focused `encodeX`와 state/config/graphic 동일 |
| permutation | 동일 base를 두 번 분기 | `{x,y,color,stroke,size}`와 역순 key 객체 | final fingerprint와 child trace 동일 |
| R19-N01 | rows `{a:2,b:8}`, x/y domain0..10 range0..100 | x=b,y=a | graphic x80,y20 |
| secondary | Rect/Rule에 x,x2,y,y2 final pair 동시 변경 | 네 channel batch | 각 endpoint가 새 scale과 field 사용 |
| offset | grouped Bar의 x parent와 xOffset 동시 변경 | x + xOffset | final band parent로 offset 배치 |
| axis family | axes가 있는 aggregate Bar category-x/measure-y | category/measure x/y transpose | x ticks+labels count, y ticks+labels final categorical domain, style/title 보존 |
| series | Line/Area group과 pathOrder 동시 변경 | group + pathOrder | final series partition/order exact |
| Parallel | existing Parallel line dimensions | color appearance batch | dimensions/scales unchanged, paths recolored once |
| polar | Polar Point/Arc | theta + r | 같은 final coordinate에서 angle/radius 갱신 |
| appearance | Point color+stroke+size | 세 channel batch | fill/stroke 독립, size area mapper, final legend symbols |
| atomic error | valid x + 없는 stroke field | batch throws | original 모든 state branch/trace/ID context 동일 |
| guide error | continuous grid를 가진 position을 categorical로 변경 | x/y batch throws | grid 자동 삭제 없음, original 전체 동일 |
| shared conflict | 두 channel이 scale ID `s`에 다른 explicit domain | batch throws | last-write 없음, original 동일 |
| external consumer | 다른 layer가 `s`를 계속 사용 | incompatible batch | 전체 오류; 외부 layer/guide도 동일 |
| input safety | 모든 payload와 nested scale/domain deep-freeze | success/error 양쪽 | caller object 변경 없음 |

추가 integration은 `shared-scale-refresh`, scale consumer unit, R20 parallel scale, R21 offset scale, R22 stroke, R23 size, combined legend 회귀를 실행한다. refresh-count 검사는 trace 이름만 세지 말고 동일 target `{op,args}` materialization step이 한 번인지 검사한다.

#### 완료와 기록

R19-N01/N02/E01/E02/L01/L02 각각에 실행 test path와 current revision을 기록한다. Full runtime/types/current encoding contract/ACTION_INDEX/intent taxonomy/generated catalog·relations·cards/API reference/MCP task resolution/package consumer가 모두 통과해야 한다. Phase 5 STEP W4에 focused와 누적 test 수, package tarball hash를 기록하고 WP5.4 통합을 닫은 뒤 Phase 6으로 이동한다.

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
6. **`src/actions/coordinates/edit.js`**에 Full action `editCoordinate`를 추가한다. target은 coordinate ID이며 유일 추론을 새로 만들지 않는다. 현재 `registerCoordinateActions`가 Basic에도 쓰이므로 `registerBasicCoordinateActions`에는 `createCoordinate`만 두고 Full registrar가 basic registrar+`editCoordinate`를 등록하게 분리한다. `src/actions/basic.js`는 basic registrar를 import해야 한다.
7. **`src/materialization/coordinateBounds.js`, `src/materialization/dependencies.js`, `src/actions/scales/preview.js`**에서 domain → aspect → range 순서를 고정한다. 기존 Canvas allocation owner는 `src/layout/canvas.js`를 그대로 사용한다.
8. shared scales가 있어도 각 coordinate의 pixel range는 자기 effective bounds다.
9. 타입/current contract/registry/docs/package를 동기화한다.
10. 신규 `test/contracts/coordinate-aspect.test.js`에 frame/data 수식, align, reverse, resize, categorical/zero-span/overflow atomic error를 둔다.

### WP6.2 — R29 Polar frame

Canonical behavior: [R29](features/29-polar-frame.md).

#### 공개 입력과 저장 계약

1. `EditCoordinateOptions`를 다음 **적어도 하나 필수** union으로 바꾼다. 별도 `editPolarFrame` action을 만들지 않는다.

   ```ts
   type EditCoordinateOptions = { target: string } & (
     | { aspect: CoordinateAspect; polarFrame?: PolarFrameOptions }
     | { aspect?: CoordinateAspect; polarFrame: PolarFrameOptions }
   );
   type PolarFrameOptions = "auto" | {
     center?: { x: number; y: number };
     radius?: { unit: "fraction" | "px"; value: number };
   };
   ```

2. `src/actions/coordinates/edit.js`의 closed key는 정확히 `target,aspect,polarFrame`다. target은 기존 coordinate ID를 명시해야 하며 추론하지 않는다. aspect와 polarFrame이 모두 빠지면 runtime/type 양쪽에서 오류다.
3. omission은 해당 기존 property 유지, `"auto"`는 해당 semantic coordinate property 제거, object는 전체 교체다. `polarFrame:{}`은 허용하며 `center:{x:.5,y:.5},radius:{unit:"fraction",value:1}`로 정규화해 저장한다. center만 주면 radius 기본값으로, radius만 주면 center 기본값으로 돌아간다.
4. `normalizePolarFrameOptions`은 `src/grammar/polar.js`가 소유한다. root/center/radius의 unknown key를 모두 거부하고 caller object를 변경하지 않으며, 아래 normalized object를 clone+freeze한다.
5. center x/y는 각각 finite `0 <= value <= 1`; radius fraction은 finite `0 < value <= 1`; px는 finite `value > 0`다. boolean, numeric string, NaN, Infinity, sparse object를 coercion하지 않는다.
6. polarFrame patch는 Polar coordinate만 허용한다. Cartesian/Parallel target은 requested state를 쓰기 전에 오류다. aspect patch도 같은 호출에 있으면 최종 candidate에서 aspect → polarFrame → radial range 순서로 검증하며 어느 단계든 실패하면 두 patch 모두 노출하지 않는다.

#### 단일 계산 owner와 scale 순서

7. `src/grammar/polar.js`의 기존 `resolvePolarFrame(bounds)`를 `resolvePolarFrame(bounds, requestedFrame = "auto")`로 확장한다. auto/undefined는 기존 pixel parity를 보존한다.
8. effective bounds `(L,T,W,H)`, normalized center `(x,y)`에 대해
   `cx=L+W*x`, `cy=T+H*y`,
   `maximum=min(cx-L,L+W-cx,cy-T,T+H-cy)`다.
   fraction이면 `R=maximum*value`, px이면 `R=value`다. 반환의 기존 `availableRadius` 필드는 모든 현행 consumer가 radial maximum으로 사용하므로 **선택된 R**을 담는다.
9. `maximum <= 0`이거나 px R이 maximum보다 크면 오류다. 자동 clamp, center 이동, Canvas 확대, theta span을 근거로 한 반원 확대를 하지 않는다.
10. `src/materialization/coordinateBounds.js`에 program state를 해석하는 `resolveCoordinatePolarFrame(program,target,options?)`를 둔다. 이 함수만 semantic coordinate의 requested polarFrame과 R27 effective bounds를 결합한다. pure grammar resolver는 program을 읽지 않는다.
11. radius scale은 domain → R27 effective bounds → R29 frame → range 순서다. `src/actions/scales/preview.js`, `src/materialization/scales/resolve.js`, `src/grammar/scales/continuous.js`가 resolved frame을 range resolver에 전달한다. auto range는 `[0,R]`; explicit range의 모든 값은 `[0,R]` 안이어야 한다.
12. 하나의 radius scale을 여러 coordinates가 공유하면 각 coordinate의 resolved R이 같을 때만 허용한다. 다르면 하나의 global resolved range를 만들 수 없으므로 쓰기 전에 오류다. theta range/reverse는 변경하지 않는다.

#### 반드시 바꿀 consumer 목록

13. 구현 시작 때 `rg -n 'resolvePolarFrame\\(' src` 결과를 고정하고 아래 직접 호출을 모두 program helper 또는 explicit requestedFrame 입력으로 바꾼다.
    - `src/actions/marks/point/materialize.js`: Polar point x/y.
    - `src/actions/marks/line/materialize.js`: Polar line/Radar path commands.
    - `src/actions/marks/arc/actions.js`: Arc/Pie/Rose sector paths.
    - `src/materialization/selection/items/arc.js`: Arc final-item selection 위치.
    - `src/actions/guides/polar/resolve.js`: theta/radius axes, ticks, labels, titles, grids가 공유하는 frame.
14. `src/grammar/polarPaths.js`, `src/grammar/polarGuides.js`, `src/grammar/polarLineCommands.js`는 전달받은 resolved frame을 사용한다. 이 pure geometry 파일들이 semantic coordinate를 다시 찾게 만들지 않는다.
15. `src/actions/primitives/semanticValidation/index.js`와 semantic path schema에 coordinate.polarFrame validation을 연결한다. raw `editSemantic`도 invalid stored state를 만들 수 없어야 한다.
16. `planCoordinateRematerialization`은 coordinate의 theta/radius scales → source marks → dependent labels/selections → Polar guides → layout/highlights 순서를 유지한다. 이미 projection된 graphic의 사후 translate/scale은 금지한다.

#### 고정 테스트와 완료 순서

17. `test/unit/grammar/polar.test.js`에 normalizer closed-key/default/freeze와 pure resolver auto/fraction/px/boundary를 추가한다.
18. 신규 `test/contracts/polar-frame.test.js`는 아래 literal oracle을 계획 코드와 독립된 숫자로 assert한다.

| case | input | exact result |
| --- | --- | --- |
| R29-N01 | bounds(0,0,400,200), center(.25,.5), fraction .8 | center(100,100), R80 |
| R29-N02 | 위 frame, theta0/r80와 theta90/r80 | (100,20), (180,100) |
| R29-N03 | bounds(20,30,400,200), 같은 요청 | center(120,130), R80 |
| R29-E01 | center(.9,.5), px80 | maximum40, 전체 호출 오류 |
| R29-E02 | fraction0, boundary center, Cartesian target, nonfinite center | 각 입력 사전 오류, 원본 state/trace 동일 |
| R29-L01 | frame edit 뒤 point/line/arc/axes/grids/selection/labels | 모두 동일 center/R 사용; auto 복구 parity |

19. lifecycle 묶음은 fraction Canvas 확대·축소 비례, px Canvas 확대 후 값 유지, px가 새 bounds를 넘는 resize 전체 오류, aspect+polarFrame 한 호출, polarFrame object replacement, auto reset을 포함한다.
20. `test/contracts/coordinate-aspect-types.test.js` 또는 별도 type test에서 combined/각 단독 patch positive, empty patch/잘못된 unit/Basic method negative를 검증한다.
21. runtime/types/current CORE/ACTION_INDEX는 기존 `editCoordinate` 한 action을 확장한다. 새 action-card 수를 늘리지 않고 signature/options/callPatterns를 재생성한다. API docs, intent taxonomy, relationship observation, installed Node/TypeScript/MCP consumer를 함께 갱신한다.
22. focused unit+contract → 전체 unit/contracts/docs → package pack/installed consumer/bundle 순서로 실행한다. 그 뒤 WP6.3에서 R27/R29 결합 Canvas/SVG/PNG/PDF 증거와 Phase 6 상태를 닫는다.

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

상태: **완료**. 제품 구현은 `8760111d`, primitive/public decoded-PNG parity는 `547eae1b`다. 아래 절차는 회귀와 후속 consumer 연결을 위한 기록이며 다시 구현하지 않는다.

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

상태: **Implemented-primary (`7ffafe02`)**. 아래 항목은 완료된 구현 경계이며 R39·R43·R47·Phase 12에서 새 consumer regression만 추가한다.

구현자는 feature의 [현행 코드에 대조한 무추론 구현 명세](features/38-legend-blocks.md#현행-코드에-대조한-무추론-구현-명세)를 그대로 따른다. override owner는 각 `guides.legend[kind].blockOverrides[key]`이며 별도 `guides.legendBlocks` state를 만들지 않는다.

1. **`src/actions/guides/legends/target.js`**에 merged legend의 canonical block descriptor를 만든다. identity는 sorted channel set과 channel role이며 배열 index가 아니다.
2. `editLegendBlock({target,channel,...})`은 target legend 안에서 해당 channel이 속한 block을 정확히 하나 resolve한다.
3. R38에서는 title/text/symbol/gap을 block override owner에 저장한다. R39가 추가하는 labelMap도 이후 같은 owner를 사용한다. values/count/order는 각 canonical content owner로 전달하고 override에 복제하지 않는다.
4. 같은 block에 대한 순차 edit는 정상 전체 patch 적용이다. 서로 다른 기존 block을 merge하는 transition에서만 incompatible overrides를 충돌로 본다.
5. 한 old categorical block의 membership만 바뀌면 compatible style은 새 key로 이동하고 block-local title은 거부한다. 기존 categorical order는 semantic order owner에서 새 kind로 옮기며 domain을 다시 검증한다. 실제 split에서는 content title/order를 자동 분배하지 않는다. Merge는 모든 유입 override와 order가 동일하고 새 block에 유효할 때만 합친다.
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
