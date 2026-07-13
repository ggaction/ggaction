# Phase 5 — Step 10: Public Vertical Slice and Cleanup

## 목표

Chart contract의 최종 action chain을 browser, standalone program, acceptance, tutorial,
PNG에서 동일하게 사용하고 Phase 5를 정리한다.

## 진행 상태

- [ ] Final public regression scatterplot program
- [ ] Primitive/public exact graphicSpec equivalence
- [ ] Browser example and console verification
- [ ] 2× PNG physical dimension and ink/color regression
- [ ] Final semantic and action hierarchy acceptance
- [ ] Caller data and prior program immutability
- [ ] Tutorial, action reference, API pages, `llms.txt`
- [ ] Intermediate test/program cleanup
- [ ] Coverage and full CI regression
- [ ] Chart/Phase documents final-state update
- [ ] Final conceptual commits and push

## 완료 결과

- Public chain은 raw graphic ID/path를 노출하지 않는다.
- `createRegression()`은 shortest valid call에서 x/y/groupBy를 infer한다.
- Primitive baseline과 public program은 concrete output과 order가 동일하다.
- Renderer는 `graphicSpec`만으로 같은 chart를 그린다.
