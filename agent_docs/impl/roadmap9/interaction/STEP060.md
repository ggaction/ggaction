# STEP060 — Linked direct controls

## 진행 상태

- [x] 원 STEP060/interaction/core와 현재 session·action 소유자 확인
- [x] 전체 승인 AUTHORIZATION 재사용, 아래 공개 최소안 기록
- [x] A: filter/reorder 직접 명령과 원자 lifecycle 연결
- [x] B: linked filter의 origin/closure, hidden/drop 및 host focus 인수
- [x] C1: categorical legend sample/label의 typed selection binding
- [ ] legend visibility/selection, scale visible-data/all-data 정책
- [ ] parameter controls, context action targets
- [ ] annotation anchor/offset 편집
- [ ] node drag, partition focus/breadcrumb, geo navigation 및 keyboard
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
