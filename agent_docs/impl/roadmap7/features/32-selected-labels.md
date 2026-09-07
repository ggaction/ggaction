# R32 — 선택된 final item만 라벨링

원래 감사 번호: **32**. Primary owner: **Phase 7**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

상위 값·특정 범주·이상치에만 라벨을 붙여 혼잡을 줄인다. mark filter로 본체를 지우지 않고 별도의 label membership을 유지한다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/text/index.js`
- `src/materialization/selection/state.js`
- `src/grammar/markFilter.js`
- `types/program.d.ts`

관련 항목: R31. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createMarkLabels({...ExistingLabelOptions,
  select?: MarkSelector, selection?: string}) // select/selection exclusive
editMarkLabelSelection({target: string,
  select: MarkSelector} | {target: string, selection: string}
                      | {target: string, all: true})
```

## 값·기본값·오류 계약

- select와 selection이 없으면 기존 all-final-items. predicate는 기존 MarkSelector를 그대로 재사용한다. compound boolean selector(#17)나 raw row index API를 새로 넣지 않는다.
- 선택 기준은 source mark의 현재 final item/stack grain이다. chart transform/filter 이후 item을 평가하며 label layer의 text row를 평가하지 않는다. line는 기존 selector의 series item이며 endpoint anchor가 어떤 점을 표시할지 결정한다.
- named selection은 같은 source mark target이어야 한다. source가 다르면 비슷한 row identity로 연결하지 않고 오류. selection 수정은 labels membership을 갱신한다.
- inline selector는 label owner가 소유. named selection을 삭제할 때 참조 라벨이 있으면 삭제를 거부하고 참조 ID를 안내한다. 사용자가 all:true나 inline select로 전환한 후 삭제한다.
- empty match는 정상 label0; source body/scale domain/filter는 그대로. top-k tie semantics는 기존 first/all 및 source stable order를 따르고 label용 별도 tie 정책을 만들지 않는다.
- groupBy field는 final-item metadata로 해석할 수 있어야 한다. 집계 결과에 없는 raw field는 오류. null 수치나 없는 channel은 기존 selector 오류를 유지.

## 저장 결과와 생명주기

label config에 `{selection:{kind:"inline", selector}|{kind:"named", id}|{kind:"all"}}`를 requested state로 저장한다. resolved selected indices는 cache다. source items 재생성 → named selection evaluate → label membership → text anchor → collision layout 순서다. source indices 재번호화 시 기존 숫자를 그대로 재사용하지 않는다.

## 구현 순서와 action 계층

1. selection evaluator를 source final-item adapter로 재사용하고 단순 membership 결과를 제공.
2. createMarkLabels/새 edit adapter에서 selector ownership validation.
3. planner에서 selection predicate 평가와 highlight drawing을 분리해 labels가 최신 membership을 읽게 한다.
4. facet/repeat에서 inline selectors local evaluation, named IDs child namespacing; R31/R25 참조 제거 정책 통합.

## 독립 oracle와 인수 테스트

- Bar values[1,5,3], select max count2 → labels[5,3], bars3개. ties[5,5,3], ties:first count1 → 첫5;all → 두5.
- named selection 변경 gt4 → gt2 후 labels1 → 2. no-match도 error 아님.
- filterMarks 후 selection은 남은 final items 대상. source data edit로 순서가 변해도 predicate 재평가.
- source mismatch, missing raw field on aggregate, referenced selection deletion, select+selection 동시 전달 오류.
- R31 삭제 후 named selection 참조는 해제되나 selection 자체는 보존.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
