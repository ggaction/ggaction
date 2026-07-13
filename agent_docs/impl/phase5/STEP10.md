# Phase 5 — Step 10: Public Vertical Slice and Cleanup

## 목표

Chart contract의 최종 action chain을 browser, standalone program, acceptance, tutorial,
PNG에서 동일하게 사용하고 Phase 5를 정리한다.

## 진행 상태

- [x] Final public regression scatterplot program
- [x] Primitive/public exact graphicSpec equivalence
- [x] Browser example and console verification
- [x] 2× PNG physical dimension and ink/color regression
- [x] Final semantic and action hierarchy acceptance
- [x] Caller data and prior program immutability
- [x] Tutorial, action reference, API pages, `llms.txt`
- [x] Intermediate test/program cleanup
- [x] Coverage and full CI regression
- [x] Chart/Phase documents final-state update
- [x] Final conceptual commits and push

## 완료 결과

- Public chain은 raw graphic ID/path를 노출하지 않는다.
- `createRegression()`은 shortest valid call에서 x/y/groupBy를 infer한다.
- Primitive baseline과 public program은 concrete output과 order가 동일하다.
- Renderer는 `graphicSpec`만으로 같은 chart를 그린다.

## 검증 결과

- Standalone browser example은 `760×480` Canvas에 point, band, line, shared guides를
  렌더링하며 console warning/error가 없다.
- Public과 primitive program의 전체 `graphicSpec` 및 mock Canvas call sequence가 같다.
- Public과 primitive PNG는 모두 pixel ratio 2의 `1520×960`이며 USA/Japan 색과 충분한
  ink pixel을 포함한다.
- 최종 public trace는 12개 top-level action을 가지며 `createRegression`과
  `createGuides`의 wrapped child hierarchy를 보존한다.
- 일반/acceptance/docs test 361개가 통과했다.
- Coverage는 line `94.47%`, branch `89.25%`, function `98.41%`로 기준을 통과했다.
- 5개 대표 chart의 public/primitive high-resolution PNG regression이 통과했다.
- Primitive baseline은 삭제하지 않고 extension-level executable oracle로 유지했으며,
  별도의 중간 public program은 남기지 않았다.
