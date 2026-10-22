# 독립 content bounds facet 배치

## 진행 상태

- [x] 기존 격자 track으로 표현되지 않는 실제 두 입력의 경계와 좌표 재현
- [x] 원본 전체 경계에서 일곱 plot origin을 재현하는 순수 계산 kernel
- [x] 불변성·ragged row·간격 단조성·경계 겹침·잘못된 입력 검사
- [ ] 실제 child graphic의 mark/guide/header 경계를 소유권별로 수집
- [x] 논리 마지막 cell 소유권을 보존한 shared footer 순수 위치 계산
- [ ] 전체 facet materialization과 shared footer 배치 연결
- [ ] public option·persistence·type·문서·설치 consumer 검증
- [ ] 실제 입력 두 개의 School 번역과 source/native/cold 검증

현재 checkpoint는 순수 kernel만 구현했다. Public API나 package runtime에 연결하지 않았고,
기존 출력, 문서의 Current 상태, 설치된 번역 runtime은 바꾸지 않았다. 이슈 #258은 열린 상태다.

## 승인과 범위

사용자는 번역에 필요한 ggaction/파이프라인 수정을 계속하라고 요청했고,
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함”으로 이 작업 범위의 설계 결정을 승인했다.
다음 1,350개 checkpoint에서 관련 branches/fixes/PRs/issues 통합과 정리도 명시적으로 요청했다.
이 근거를 재사용하므로 같은 범위의 반복 승인 질문을 하지 않는다. 이미지/VLM 검사 금지와
단일 School 요청 규칙을 보존한다. 외부 배포는 1,350개 동기화 release에서 한다.

관련 요구: https://github.com/ggaction/ggaction/issues/258

## 문제와 목표

현재 plot spacing은 한 행의 공통 Y origin과 scalar gap을 사용한다. Full child bounds를
기준으로 배치한 원본은 같은 논리 행에서도 plot Y가 다르고, 한 행의 이웃 X 간격도 다르다.
원본을 소폭 수정하거나 absolute graphic 위치를 직접 나열해서 해결하지 않는다.

순수 kernel의 요구 입력은 child마다 plot 원점을 기준으로 한 `left/right/top/bottom` 경계다.
출력은 원래 논리 순서를 유지한 `id/row/column/x/y/bounds`와 전체 경계다. Paint 순서나
row-major dataset 순서를 실제 Y 좌표 순으로 재정렬하지 않는다. Canvas/title/legend 여백은
호출 materializer가 한 번만 적용하고 renderer는 concrete graphic만 읽는다.

## 구현된 kernel

`src/layout/facetContentFlow.js`는 불변 입력을 받아 각 열의 trailing X extent와 각 행의
trailing Y extent를 계산한다. 다음 cell의 음수 leading extent를 바깥 방향으로 정수 올림한
clearance와 gap을 더한다. X는 행별, Y는 열별로 누적한다. 따라서 full bounds는 안전하게
분리되면서 plot origin을 같은 row track에 강제로 맞추지 않는다. 요청 columns는 실제 cell
수까지 줄이며 ragged 마지막 행에 가상의 cell을 만들지 않는다. 유한 입력의 합이 overflow해도
거부한다. 공개 action, 새로운 상태 owner, renderer 의존성은 없다.

`test/unit/layout/facet-content-flow.test.js`는 source-neutral literal case와 불변식을 검사한다.
독립적인 로컬 원본 replay는 다음 결과를 확인했다.

| 입력 | 원본 plot origins | Kernel 결과 |
| --- | --- | --- |
| 세 cell / 한 행 | (0,0), (199,0), (393,0) | 정확히 동일 |
| 네 cell / 두 행 | (0,0), (208,0), (0,192), (208,187) | 정확히 동일 |

공유 footer도 각 column의 마지막 논리 cell을 유지하며 전체 trailing edge에 놓는다.
두 입력의 footer 좌표 (0,206)/(199,206)/(393,206)과 (0,338)/(208,338)
다섯 쌍이 정확히 일치한다. Ragged row에서 마지막 cell이 없는 column은 해당 column의
관측된 마지막 cell을 사용하며, 입력에 없는 column은 만들지 않는다.

이 표는 원본 full bounds를 입력한 순수 계산의 검증이다. 현재 native child graphics의 경계를
측정해 같은 결과를 얻었다는 증거로 사용하지 않는다.

## 다음 public surface 후보

새 action을 만들지 않고 기존 facet `spacing`의 opt-in `"content"`를 검토한다.
`editCompositionLayout({spacing:"content",gap:20})`은 전체 child content 사이의 간격을 뜻하며,
기존 `"canvas"`와 `"plot"`의 출력과 저장 상태는 그대로 둔다. 필요하면 기존 header `anchor`에
`"view"`를 추가해 mark만을 뜻하는 현재 `"content"`와 축/guide까지 포함한 extent를 구분한다.
이 이름과 full measurement 정책은 아직 Current/public 구현으로 승격하지 않았다.

필요한 연결은 다음과 같다.

1. Child 의미와 데이터 partition/order는 기존 facet/replay가 계속 소유한다.
2. Mark, 유지된 Y guide와 cell header 경계만 packing에 넣고, 공유 X footer는 한 번 따로 배치한다.
3. Shared footer는 각 column의 마지막 논리 cell만 보지 않고, 전체 해당 content union의 trailing
   edge를 기준으로 배치한다. Ragged row에서도 phantom footer를 만들지 않는다.
4. Parent title과 shared legend 예약은 full content union 바깥에 한 번 적용한다.
5. 공통 top lane, header collision, source/scale/guide/theme/text-metric edits, persistence replay,
   parent nesting과 SVG/PNG/PDF concrete 출력까지 검증한다.

## 아직 해결해야 하는 측정 결정

기존 native full graphic bounds와 원본의 layout bounds는 같은 painted text/line이라도 다를 수 있다.
현재 text baseline 보정과 path stroke extent 정책은 이미 검증된 공개 계약이다. 새 기능을 위해
기존 marks/axes의 geometry, 원본 rows, 글자 크기나 전역 tolerance를 바꾸지 않는다.
순수 kernel 결과를 native source 일치로 과장하거나, 원본에서 측정한 경계 배열을 public API에
그대로 전달하는 우회는 채택하지 않는다. Native measurement와 footer 연결이 자체 근거로
검증되기 전에는 해당 source를 번역 완료로 세지 않는다.

## 검증 checkpoint

- 이 kernel checkpoint: 순수 layout tests와 일곱 독립 원본 좌표, package entry/크기 실측.
- API 연결 checkpoint: focused grammar/action/persistence/types/renderer tests와 normal 전체 suite,
  두 실제 source의 정확한 data/guide/text/plot 검증.
- 번역 runtime 활성화: 기존 1,334개 family / 9,750개 accepted program의 실제 native 호환 replay,
  exact package-source 증거와 일치하는 documentation snapshot. 그 후에만 새 School authoring.
- 공개 릴리즈: 다음 1,350개에서 모든 관련 통합·테스트·문서·registry/GitHub/Pages 검증.
