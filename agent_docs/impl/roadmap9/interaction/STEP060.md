# STEP060 — Linked direct controls

## 진행 상태

- [x] 원 STEP060/interaction/core와 현재 session·action 소유자 확인
- [x] 전체 승인 AUTHORIZATION 재사용, 아래 공개 최소안 기록
- [x] A: filter/reorder 직접 명령과 원자 lifecycle 연결
- [x] B: linked filter의 origin/closure, hidden/drop 및 host focus 인수
- [x] C1: categorical legend sample/label의 typed selection binding
- [x] C2: categorical legend visibility, 사용자 filter 합성 및 visible-data/all-data 정책
- [ ] continuous/interval legend 조작의 원 카드 후행 범위
- [x] D: 기존 setParameter host controls와 context semantic targets
- [ ] annotation anchor/offset 편집
- [x] E1: native partition focus 명령과 host breadcrumb/button keyboard 연결
- [ ] node drag, geo navigation 및 일반 session keyboard/focus·coordinate morph
- [ ] AT35/38/65/80 consumer matrix와 STEP074/077 전달

[전체 승인](../AUTHORIZATION.json)의 남은 public API/저장/시각 결정 승인과 재질문 금지 지시를 재사용한다.
기반은 nested responsive+angular 통합 `6c95fb858`이며 기능 인수와 전체 로드맵 완료를 구분한다.

## A 공개 최소안

기존 advanced `ggaction/interaction` command envelope(type,target,payload,transactionId,origin,
causeTransactionId)를 유지한다. 새 program action이나 저장 schema를 만들지 않는다.

- `filter`: payload `{select:MarkSelector,mode?:"replace"|"compose",recompute?:boolean}` 또는
  `{clear:true}`. Selector는 기존 inline MarkSelector이고 AST/region metadata는 수락하지 않는다.
  기존 filterMarks/removeMarkFilter가 final grain→원행→scale/mark/guide closure와 저장 recipe를 소유한다.
  Clear는 필터만 제거한다. 초기 session이나 다른 편집으로 reset하지 않는다.
- `reorder`: payload `{channel:"x"|"y"|"theta",values}` 또는 `{channel,by,direction?}` 또는
  `{channel,clear:true}`. 기존 orderCategories/removeCategoryOrder의 native schema·검증·domain·guide
  소유권을 그대로 사용한다. Source row order는 바꾸지 않는다.

둘 모두 explicit root/child/facet source owner를 요구한다. Basic의 실제 editor 지원 여부를 receiver에서
검사하고 불가 기능은 명시 실패한다. Inactive clear와 다른 payload의 혼합, false, unknown keys,
잘못된 selector/order는 atomic error다. 입력은 기존 bounded own-data snapshot을 거친다.
기존 session의 candidate program→selection reconciliation→linked closure→hit frame을 모두 준비한 뒤
commit1/settled1을 발행한다. 실패 시 old program/trace/frame/revision이 유지된다. Reentrant FIFO와
동일 transaction 재진입 차단을 재사용한다. 구현 후 타입·Current·public recipe·installed/browser와
실제데이터 증거를 동기화한다. 별도 history/focus 또는 native widget을 구현했다고 주장하지 않는다.

## 후행 요구 보존

원 카드의 linked filter, legend visibility(visible-data/all-data), parameter control, context callback,
reorder handles, annotation, node drag, partition focus, geo navigation, keyboard는 A만으로 종료하지 않는다.
기존 equivalent owner를 먼저 찾아 연결하며 새로운 domain schema가 필요하면 구체안을 같은 문서에
기록한 뒤 기존 포괄승인 범위에서 진행한다. AT65/80의 route/partition current-frame 및 accessibility는
동료의 layout/route owner와 조율한다. STEP074 qualification과077 전체검증은 별도 의무다.


## A 검증 및 소비자 행렬

기존 active filter와 explicit category order의 교차가 최초 실패했다. 저장된 order를 현재 filtered
rows로 검증한 원인이며, 공통 scale consumer가 원 source에서 검증한 후 현재 domain으로 투영한다.
새 order 입력의 unknown category 거부는 그대로다. 최초 실패와 수정 증거는 direct-controls-evidence에 보존한다.

| 소비자 | 결과 / 의무 |
|---|---|
| 명시 root/child/facet source, namespaced item keys | native action scope, 형제 참조 보존, facet cell 재생성 통과 |
| source/derived rows·stats·scale·marks·guides | 기존 native filter/order closure 재사용. 행 순서 보존, 축/명시 연결 범례 동기화 통과 |
| filter/order 교차 | explicit order 보존→visible domain 투영→clear 복원. typed key와 invalid stored order 포함 |
| selection/highlight/linked projection | keep-hidden/drop, 원행 projection, commit1/settled1 및 중복 transaction 차단 통과 |
| immutable trace/revision/scene | 오류 시 이전 program·scene·revision 보존; 성공 한 번에 갱신 |
| codec / inspection | 기존 native intent와 concrete graphics 저장/복원, getMarkItems 일치 |
| browser / keyboard | host button click·Enter·Space, Canvas/SVG 동일 program, DOM focus 유지; session focus 모델은 후행 |
| Full / Basic | 기존 Full editors만 사용, Basic 명시 거부, interaction→Full 정적 import 없음 |
| 타입/Current/docs | strict payload union, 실행 가능한 공개 snippet, 설치·source/built·responsive 검증 |
| PNG/PDF | renderer·primitive 변경 없음. 기존 native geometry/mark renderer 증거 재사용; 새로운 backend 지원 주장은 없음 |
| graph recompute/routes/resource 전용 조작 | 해당 native action 범위 그대로. drag/unbundle/focus/navigation은 후행 |

Source qualification은 집중134, source/type/discovery34, 실제5datasets×3recipes16,
브라우저1이며 selection.js100/99.12/100, scale consumers98.17/93.48/100이다.
전수 coverage를 다시 실행하거나 전체 STEP060/074/077을 완료했다고 주장하지 않는다.


A source는 `c6cff82ab`이고 [최종 qualification](direct-controls-evidence/qualification.json)에
동일 archive `ee8c7d3c`의 Node20/22/24 runtime3·strict TS·4bundle 및 공개 snippet1씩을 기록했다.
Source docs 최초186/189 실패를 보존했고 owning50·source-pinned21·snippet1·built168pages/1435LLM·4폭
Axe가 통과했다. 새로운 시각 target이나 API action inventory 증가는 없으며 기존 rendered primitive를 사용한다.


## B linked filter 구현

`type:"linkFilter"`는 기존 linkSelection과 같은 `id,sources,target,selection,resolve`를 사용한다.
Source별 projection은 기존 original rows 또는 명시 field tuple이며 target selection은 원 final-item
universe와 grain을 명시한다. Binding이 target의 native filter writer를 독점하고 selection 자체는 소유하지 않는다.
Pre-existing filter는 초기 생성에서 바꾸지 않지만 이후 source transaction에서는 binding의 replace 결과가 된다.
동일 target의 direct filter 명령은 거부한다. Empty-none은 빈 view, empty-all은 전체 투영을 의미한다.

Target의 숨겨진 항목은 기존 removeMarkFilter로 만든 immutable 후보에서 읽으며 같은 후보에
filterMarks를 적용한다. 두 후보 사이 상태/trace는 host로 발행하지 않고, 최종 closure가 준비된 뒤 한 번 교체한다.
기존 canonical active-filter lookup을 공유 selector로 추출하고 추가 semantic schema는 만들지 않는다.
Projection 중의 복원 후보는 한 계산의 WeakMap에서 재사용한 뒤 폐기한다. 필터 후 원 selection records로
keep-hidden/drop을 재평가하고 그 결과를 downstream DAG에 넘긴다. Cycle/duplicate writer/unknown data와
누적 projection work 제한을 유지하며 실패 시 committed program·scene·trace·selection은 그대로다.

외부 updateProgram은 기존 revalidation 정책을 유지하고, selection membership/availability의 변화가
linked filter에 영향을 주면 같은 동기 closure에서 다시 적용한다. 삭제된 owner는 재생성하지 않는다.
기존 linkedSelections inspection에 filter record만 `effect:"filter"`를 추가하여 source별 투영과 최종keys를 구분한다.


B 공개 source와 [qualification](linked-filter-evidence/qualification.json)을 동기화했다. 집중381,
공유 native89, contracts34, source transaction/origin10, 실제5datasets×3recipes+inventory16,
Canvas/SVG DPR2 실제 brush1이 통과했다. 빈 native bar/line selection의 grammar 재호출 결함을
수리했고, empty stack grain 검증 및 Graph induced-edge no-op은 원 소유자 정책으로 보존했다.

동일 archive `e477eeb1`로 Node20/22/24 각각 runtime3·strict TS·4bundles·공개 snippet1이 통과했다.
Source docs189/191 최초 search cap 실패와 보정31, build168pages/1435LLM·4폭Axe를 구분했다.
원본 오류/최종 수치·source hashes·독립 expected/actual/diff가 evidence에 있으며 원 trace와 input은
변경하지 않는다. Source-pinned metadata 최종 검사는 source commit 뒤 별도 기록한다.

B는 original row/field tuple source별 projection, native target filter 독점, 기존 필터의 초기 보존과
다음 propagation 교체, keep-hidden/drop 뒤 downstream closure 및 runtime/codec 경계를 구현한다.
Legend/parameter control/context/annotation/drag/focus/navigation/keyboard 및 전체AT/077 완료는 아니다.

B source `da43755ef` 이후 provenance→machine→LLM을 고정하고 documentation29, provenance/machine18,
built168pages/1435LLM을 통과했다. Runtime/source hashes는 검증된 tar와 동일하며 source pin에 따른
revision label 변경만 있어 같은 interaction page의 앞선4폭Axe 증거를 재사용한다.


### B 안정 통합 기준선

`f2915cd17`의 qualified routes/region/direct-controls를 병합했다. 실행 코드 충돌 없이
capability witness 중복을 제거하고 linked-filter 증거를 유지했다. 집중55·설치 Node20
runtime3/strict TS/5bundle 측정을 완료했다. 문서47 중 최초45통과, 남은2는
미커밋 신규 example source ref와 search cap이며 source commit 뒤 owning 검사를 닫는다.
원본 로그는 linked-filter-merge-evidence에 보존한다. 전체077 완료로 보지 않는다.

병합 source `239a077d8` 고정 뒤 provenance→machine→LLM 및 문서47/47이 통과했다.
앞선 설치 결과의 동일5bundle 측정값도 최소 조정 cap 아래임을 별도 consumer.json으로 검사했다.


## C1 범례 선택 최소 계약

기존 승인에 따라 `{type:"legend",effect:"selection",target,channel,selection,mode?:"replace"|"toggle",slop?}` binding을 추가한다.
Target과 기존 public legend channel, authored selection은 모두 명시한다. 기존 resolveLegendBlock이 channel을 categorical block으로 해석하며 내부 kind를 공개하지 않는다. mode 기본값은 toggle이고
기존 native set semantics(해당 범주의 각 final item을 toggle)를 사용한다. Background/title/summary/
다른 legend는 선택을 바꾸지 않는다. Continuous/interval 및 visibility effect는 이 checkpoint에서
명시 거부하고 후행 C2 요구를 보존한다. 기존 한 개 editing gesture 한도를 그대로 적용한다.

Guide hit token과 composition namespace의 기존 소유자를 공유한다. 원 numeric/string category를
동일한 label text로 합치지 않는다. 현재 rendered legend의 실제 sample/label hit만 소비하고,
현재 selection grain의 own field값으로 대응한 visible final items를 native select 명령에 넘긴다.
숨김/overflow summary는 집합으로 임의 추정하지 않는다. Missing owner/selection/legend는 외부
update 후 dormant이고 owner mismatch·불명확 field projection은 원자 실패한다. Current scene,
capture/cancel, native selection closure, linked filtering, codec 및 immutable trace는 기존 경로다.

### C1 검증 및 소비자 행렬

범례 선택은 categorical block만 연결하고 visibility/continuous/interval을 완료했다고 주장하지 않는다.
[qualification](legend-selection-evidence/qualification.json)에 최초 오류, source hash와 실행 로그를 보존한다.

| 소비자 | 결과 / 후행 |
|---|---|
| typed category/final grain | numeric1/string1 분리, point item/line series, empty category·partial replace·live predicate 검증 |
| 실제 guide/current frame | symbol/label 공유 identity, summary/title/background 제외, opacity/clip 정책·nested transform 재사용 |
| transaction/linked closure | native toggle/replace, 한 commit/settled, keep-hidden/drop와 linked filter closure, 오류 시 이전 상태 보존 |
| composition/lifecycle | explicit child scope·형제 참조 보존, sampled frame·cancel·duplicate click, 제거된 owner dormant |
| codec/inspection | selection만 기존 program codec에 저장, typed rows와 restore 후 highlight 일치, binding은 session 수명 |
| Full/Basic/package | Full native selection만, Basic 명시 실패, 기존 entry 유지·interaction→actions 신규 정적 의존 없음 |
| 브라우저/문서 | Canvas/SVG DPR2 실제 클릭·Escape, 설치 패키지로 공개 snippet 실행, 네 폭 Axe0 |
| PNG/PDF | 새 geometry·renderer 없음. 기존 selection/highlight concrete 소비자 재사용 |
| visibility/도메인 | C2 미완료, opacity로 대체하지 않고 원 범주·선택·복원 정책을 후속 연결 |

집중 owner324, critical302, final source/type/boundary/discovery37, 실제5datasets×3recipes와 inventory16,
실제 browser1이 통과했다. 새 selection owner100/93.75/100, 공유 target와 overflow100/100/100이며
기존 canonical floor는 낮추지 않았다. 같은 최종 archive `c6d8c8cb`로 Node20/22/24 각각 runtime3,
strict TS와5bundle이 통과했고 Node22 설치 문서 예제는 클릭 결과a/c를 확인했다. 문서47 최초46통과의
원인은 마지막 소스 수정 뒤 stale provenance였으며 재생성 후47/47이다. 전수 coverage·전체060/077은 미완료다.

Source `b9bee2b48` 고정 뒤 provenance→machine→LLM, owning docs47, built170pages/1454LLM을
통과했다. Runtime/타입과 exact tar는 동일하고 source revision label만 바뀌므로 기존 네 폭 Axe0
화면 증거를 재사용한다. Final source-free snippet은 같은 최종 tar `c6d8c8cb`로 실행했다.

## C2 visibility 구현 계약

기존 [포괄 승인](../AUTHORIZATION.json)을 재사용한다. 원 interaction 계약의 `setVisibility`와
범례 visibility effect를 연결하며, 아래 구체안을 구현 전에 기록했다. 아래 행렬 범위의 구현과 검증을 마쳤다.

- Full advanced domain `setMarkVisibility({target?,channel,values,visible,scaleDomain})`는 명시한
  categorical legend block의 typed values를 숨기거나 복원한다. `visible`은 boolean,
  `scaleDomain`은 필수 `"visible-data"|"all-data"`다. Values는 비어 있지 않은 중복 없는
  원 범주 배열이다. Target 생략은 기존 유일 legend target 규칙만 재사용한다.
- `removeMarkVisibility({target?})`는 visibility intent만 제거한다. 사용자가 만든 native
  filter를 지우거나 다른 초기 상태로 reset하지 않는다. 기존 visibility가 없으면 오류다.
- Session `setVisibility` command는 동일 target과 payload `{channel,values,visible,scaleDomain}`
  또는 `{clear:true}`를 사용한다. `{type:"legend",effect:"visibility",target,channel,scaleDomain,slop?}`
  binding은 실제 current-frame category hit를 toggle한다. Authored selection 생성은 필요 없다.

기존 markFilter가 사용자 filter intent와 final grain을 소유한다. Visibility는 그 결과를 source로
갖는 별도 바깥 markFilter derived view다. Visibility recipe는 바깥 transform의 단일
`visibility:{channels,field,hidden,scaleDomain}`에 저장하고, refs/empty realization만 mark config에 둔다.
같은 row-provenance와 derived revision DAG를 재사용하며, hidden은 numeric/string을 합치지 않는다.
Visibility 제거는 바깥 view만 제거한다. Native filter 편집/제거는 visibility를 내부 immutable
후보에서 잠시 벗긴 뒤 원 filter를 수정하고 같은 visibility를 재적용한다. 중간 후보는 host로
발행하지 않으며 오류 시 이전 program·selection·trace를 유지한다. LinkFilter도 이 native filter
소유권을 유지하고 visibility와 합성한다. 사용자 filter가 제외한 항목을 visibility가 되살리지 않는다.

`all-data`는 visibility 직전의 사용자 filter 결과이고, `visible-data`는 숨김을 적용한 final-item
view다. 기존 explicit scale domain은 그대로 우선한다. 예외로 control legend의 categorical 채널은
visibility 직전 범주와 매핑을 항상 유지한다. 이는 숨긴 범주를 다시 켤 수 있고, 살아 있는 범주의
색상/shape/dash 의미가 숨김 때문에 바뀌지 않도록 하는 명시 정책이다. 다른 scale은 요청한 정책을
따른다. Empty visible view는 기존 empty-filter domain 보존 정책을 재사용한다.

새 renderer나 opacity 대체를 만들지 않는다. 실제 items/row membership을 제외하여 graphics,
hit/inspection, source-dependent marks가 같은 view를 읽는다. 기존 keep-hidden/drop selection
reconcile 뒤 linked closure가 한 번 닫힌다. Child snapshot/codec/data revision에서도 두 derived
단계·원래 filter·hidden categories·control mapping을 함께 검증한다. Resource-backed 또는 composite
target은 기존 final-item data-filter capability 경계를 넘지 않으며 미지원은 명시 거부한다.

검증은 typed category 원행, point/category/series grain, 기존 filter와 hide/restore 양방향 순서,
빈 view/unknown/new source category, all-data/visible-data의 literal domains, 동일 색상매핑,
revision/codec·nested child·linked selection/filter 및 실제 Canvas/SVG 입력을 포함한다.
공개 types/Current/action index/generated references와 fixed archive 소비자를 같은 checkpoint로 닫는다.


### C2 검증 및 소비자 행렬

[Qualification](legend-visibility-evidence/qualification.json)은 원본 실패와 수정 후 검사를 구분한다.
`setMarkVisibility`/`removeMarkVisibility` 두 Full action, explicit session command와 categorical
legend binding을 연결했다. Basic 및 non-independent/resource/composite final-item target은 원래
native filter capability 경계에서 거부한다. 전체 STEP060/074/077 완료 표시는 하지 않는다.

| 소비자 | 검증된 동작 |
|---|---|
| final grain / typed rows | point/category/line series, numeric1/string1/false 구분, 원 row order·identity와 행 lineage 보존 |
| native filter / control legend | 사용자 필터 결과를 all-data 기준으로 사용, 어느 단계 먼저 생성해도 합성, 양쪽 개별 제거, 숨긴 범주와 이전 매핑 유지 |
| domains / empty / bins | visible/all literal domain, explicit domain 우선, empty domain 보존, histogram partition·line gaps·stored category order 투영 |
| revisions / stale bindings | parameter→computed→native filter→visibility DAG, source revision, dormant hidden 범주 복원, 변경된 control encoding 원자 거부 |
| selections / linked closure | keep-hidden/drop, 원행/명시 fields projection, 숨김 중 native membership 변화도 commit, downstream closure·실패 trace 보존 |
| nested / current frame | child scope와 형제 참조, semantic no-op은 동일 program/trace/revision, 실제 symbol/label hit·capture·cancel |
| codec / consumers | 저장 recipe/ref/empty/provenance 검사, retained downstream snapshot, labels/highlights/hit 모두 같은 visible items |
| renderer | 독립 literal primitive omission과 Canvas calls·SVG·PNG bytes·PDF streams 일치, editable/graphic codec 및 flattened Canvas scene 확인 |
| browser / package / docs | Canvas/SVG DPR2 실제 toggle/cancel/restore, 동일 tar 세 Node runtime4·strict TS·5 bundles, 설치 공개 예제 실제 클릭 |

새6owner의 lines/functions는100%, branches90.48–100%로 새 canonical95/90/100 floor를 만족한다.
공유 owner 집중 coverage235와 새 owner56 이후 마지막 dormant hidden 보완은 owning22로 검증했고,
변경한 visibility owner는100/92.50/100이다. 최종 source/type/session/discovery 최초35/37에서
추가 render module의 잘못된 unit 위치2건을 발견해 기존 mark-selection-points slice로 옮겼다.
정식 render runner1과 discovery16을 다시 통과했다. 실제5datasets×3recipes와 inventory16,
실제 browser1, source docs47, built170pages/1458LLM, 320/390/768/1440 Axe0을 확인했다.

최종 archive `cb065aa8`는988entries, Node22 packed1,413,676/unpacked6,442,865bytes다.
Node20 pack 실측1,416,316으로 cap988/1,417,000/6,443,000을 설정했다. 동일 archive에서
Node20/24 Full690,277/Basic378,363/interaction111,865gzip bytes가 최대값이므로 해당cap만
690,300/378,400/111,900으로 최소 상향했다. Node20 runtime4/TS 성공 후 기존cap 실패를
보존하고 같은 bundle측정에 새cap을 검증했으며, Node22/24는 새cap 포함 전체명령이 성공했다.
Superseded `e582ecdc`는 dormant hidden 보완 전이므로 최종 증거로 세지 않는다.
전수 coverage는 반복하지 않았고 root의 전체 통합 qualification 의무를 유지한다.

C2 source `5b69d264c` push 뒤 provenance→machine→LLM을 source commit에 고정했고 owning docs47,
built170pages/1458LLM을 통과했다. Runtime/타입·같은 archive `cb065aa8`는 불변이며 기존 네 폭
Axe0 증거를 재사용한다. 최종metadata commit은 source/runtime scope를 확장하지 않는다.

## D parameter controls와 context request 최소 계약

C2 다음 원 STEP060 직접 조작을 기존 전체 승인 범위에서 이어 구현한다. `setParameter`는 이미
parameter editor·AST dependency closure·selection reconciliation과 연결되어 있으므로 새 program API나
DOM control 추상화를 추가하지 않는다. Host range/select/button가 typed value를 명시 dispatch하고
native keyboard/focus를 유지하는 실제 브라우저·source-free 예제를 추가한다.

Context 메뉴도 host가 소유한다. 명시 `{type:"contextMenu",slop?,hitInvisible?}` binding 한 개를
inspection/편집 binding과 함께 사용할 수 있다. Mounted surface의 `contextmenu`에서만 browser
기본 메뉴를 막고, 기존 CSS/current-frame hit pipeline으로 `{type:"contextMenu",state.hit}` 이벤트를
`subscribe`에 전달한다. Headless 및 host keyboard 호출은
`dispatch({type:"contextMenu",point,pointerType?,slop?,hitInvisible?})`를 사용한다. 후보의 기존
ownerId/role/childPath/itemKey/rowKeys/resourceRefs를 그대로 전달하며 raw DOM event나 callback을
program에 저장하지 않는다. Host가 메뉴 항목·활성 가능 여부·DOM focus/Escape와 후속 명령을 결정한다.
Empty/clip/singular hit는 기존 null+diagnostics이며 임의 첫 owner 선택은 없다. Menu request 자체는
program/trace/revision을 바꾸지 않는다. 동기 subscriber의 후속 dispatch는 기존 FIFO로 실행하고
unmount/destroy는 정확 listener를 해제한다. 메뉴 binding이 없으면 native contextmenu를 건드리지 않는다.

새 action/저장 schema/renderer는 없고 Basic도 읽기 전용 context hit를 지원한다. 실제 parameter 변경은
기존 Full-only editor 경계를 유지한다. 일반 session focus/history/drag/annotation/partition/geo와
AT35/38/65/80 전체 후행 요구는 이 작은 연결만으로 완료 처리하지 않는다.


### D 검증 및 인계

Context request는 기존 current-frame hit/subscribe 경로만 확장하고 parameter control은 기존
setParameter를 재사용한다. Read-only 요청에서 program·trace·revision 보존, 겹친 후보·typed rows,
Full/Basic, invalid own-data, headless/scaled CSS·sampled frame·empty viewport를 검증했다.
Subscriber가 remount를 먼저 queue한 뒤 이전 surface 이벤트가 들어오는 반례를 추가했고,
실행 시 lease를 다시 검사해 오래된 context/inspect callback이 새 surface를 건드리지 않도록 했다.

집중15 이후 최종 interaction159와 session owner100/95.14/100, source/type/discovery28이 통과했다.
실제5datasets×3recipes+inventory16은 guide context와 parameter-backed predicate selection을 함께
검증한다. 실제 browser1은 공개 snippet을 그대로 실행해 range Arrow/End, context 우클릭→Enter,
Escape·focus 복구, no-op/error 원자성·dispose를 확인한다. 기존 parameter renderer4를 통해
Canvas/SVG/PNG/PDF·graphic codec·scene endpoint 소비도 확인했다. 새 renderer나 DOM widget은 없다.

동일 최종 archive `5a1675aa`로 Node20/22/24 각각 runtime5·strict TS·5bundles가 통과했고,
source-free 공개 snippet도 실제 입력1→selection2 revision과 focus·cleanup을 확인했다.
README cap 설명 동기화 전의 `b8351339`는 superseded로 보존한다. Runtime/타입은 같아도 최종
archive 세Node 증거는 새 파일로 다시 실행했다. Node20 packed1,416,517/unpacked6,443,877,
988entries에 맞춰 unpacked cap만6,444,000으로 최소 증가했다. Interaction gzip111,970에112,000,
compact search987,568에987,600을 적용하고 최초 초과도 남긴다.

기존 canonical architecture bundle 표와 README가 실제 script cap보다 오래된 상태였음을 발견해
현재 전체표·Basic378,400 설명을 동기화했다. Owning documentation-truth3이 통과했다.
Docs source 최초46/47의 search budget 보정 후 owning2, built170pages/1458LLM·네 폭 Axe0이다.
Source 고정 뒤 provenance와 owning docs47을 다시 기록한다. 전체 normal/coverage 반복 없이
변경 owner와 실제 소비자를 검증했으며 annotation/drag/focus/geo/keyboard와 전체AT/077은 미완료다.

D source `176c76723` push 후 source-pinned provenance→machine→LLM, owning docs50 및
built170pages/1458LLM을 통과했다. 최종 archive `5a1675aa`와 runtime/타입은 그대로다.

## E1 partition focus 직접 명령 최소 계약

기존 승인과 현재 `editPartitionPlot`의 focus 저장/selection/pruning/revision 계약을 재사용한다.
`dispatch({type:"focusHierarchy",target,payload:{focus},transactionId?,origin?,causeTransactionId?})`는
명시 partition owner와 기존 `HierarchyNodeTarget|null`만 받는다. null은 현재 root 복귀이며
layout/paint/coordinate/pruning policy를 이 명령에서 수정하지 않는다. 다른 hierarchy mark 또는
Basic은 native editor capability 경계에서 거부한다. Scoped child/facet-source는 기존 target 경로다.

Native editor가 typed key/path 검증·stored focus·ancestor recovery·정확 concrete rematerialization을
소유하고, session은 selection reconcile/linked closure·current frame·한 commit/settled를 재사용한다.
새 focus binding·DOM breadcrumb widget·자동 keyboard focus를 만들지 않는다. Host는 기존
inspection breadcrumb/navigation과 자신이 선언한 typed node targets로 버튼/키보드 명령을 만들며,
자료에서 사라진 node는 native recovery 이후 새 inspection을 읽는다. Generic gesture/keyboard focus,
coordinate morph frame/AT65 전체는 이 명령만으로 완료하지 않는다.


### E1 검증 및 소비자 행렬

기존 partition domain action으로만 focus를 변경하며 session이 별도 layout이나 persisted focus schema를
만들지 않는다. Cartesian/polar, typed scalar와 grouped path, nested child 형제 보존, keep-hidden/drop,
source 삭제 후 nearest surviving ancestor recovery 및 stale sampled frame 거부를 확인했다.
기존 native action의 explicit-edit 의미를 그대로 유지하며 동일 focus의 임의 no-op 추정은 추가하지 않는다.

| 소비자 | 검증 범위 |
|---|---|
| graph/semantic/trace | 기존 hierarchy/layout resource는 공유, native editor와 concrete equality, 원 program/input 불변, 오류 atomic |
| selections / source revision | focus로 숨긴 key의 keep-hidden/drop, source 삭제 시 native ancestor 복구, root 재표시 후 동일 선택 |
| scope / scene / codec | explicit child target, sibling reference 보존, 현재 generation 갱신, editable codec 복원 |
| actual data | pinned5 datasets × observations/categories/series3, 원 row lineage·independent category counts·focus/root복원 |
| host controls | canonical snippet의 button click/Enter/Space, breadcrumb 표시, host focus·한 commit/settled·dispose |
| renderers | 기존 partition의 nativePNG/browserCanvas/browserSVG/vectorPDF 4backend와 independent literal sample 재검증 |
| installed | 동일 archive의 Node20/22/24 runtime6·strict TS·5browser entries, source-free canonical snippet |
| declarations/docs | closed payload, 기존 HierarchyNodeTarget 재사용, Full-only/native capability, Current·generated·built·responsive |

최초 native fixture2/4의 required hierarchy/layout ID와 layout options 위치를 바로잡은 뒤4/4통과했다.
최종 interaction 집중163/163과 변경 selection owner100/99.20/100, source/types/discovery28,
realistic16, canonical browser1, partition renderer1을 통과했다. Native renderer 구현은 바뀌지 않았다.
일반 focus 모델·navigation gesture·coordinate morph/reduced-motion/AT65 전체와 STEP074/077은 미완료다.
전수 normal/coverage를 반복한 결과로 보고하지 않고, root의 전체 합산 검증 의무를 유지한다.

[Qualification](hierarchy-focus-evidence/qualification.json)에 실패와 최종 증거를 구분했다.
동일 archive `440fe2ae`로 Node20/22/24 각 runtime6·strict TS·5bundles 및 설치 공개 snippet을
통과했다. Node20 packed1,416,610/unpacked6,444,435/988entries이며 unpacked만6,445,000으로
올림했다. Interaction112,019gzip에112,100, search988,257bytes에988,300을 적용했다.
최초 Node20 bundle 초과와 docs49/50을 보존하고, 보정 뒤 세 Node 전체 명령·owning search1 및
source docs50을 확인했다. Built170pages/1458LLM·네 폭Axe0와 모바일 실제 화면을 확인했다.

E1 source `e1924a6de` push 후 provenance→machine→LLM을 고정하고 source docs50 및
built170pages/1458LLM을 통과했다. Runtime/타입·archive `440fe2ae`는 불변이며
source revision 표기만 바뀌어 앞선 네 폭Axe0·화면 증거를 재사용한다.
