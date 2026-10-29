# STEP060 — Linked direct controls

## 진행 상태

- [x] 원 STEP060/interaction/core와 현재 session·action 소유자 확인
- [x] 전체 승인 AUTHORIZATION 재사용, 아래 공개 최소안 기록
- [x] A: filter/reorder 직접 명령과 원자 lifecycle 연결
- [ ] linked filter의 origin/closure, hidden/drop/focus 인수
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
