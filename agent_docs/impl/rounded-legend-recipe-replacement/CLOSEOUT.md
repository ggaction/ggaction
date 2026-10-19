# 둥근 범례 표본 편집 복원 검증

## 결과

기존 swatch owner가 rect와 둥근 path collection 사이를 오가는 편집을 허용하도록 고쳤다. collection에서 직선 rect로 바뀌는 경우만 collection에 대한 length 편집을 생략한다. 일반 rect/line/point의 기존 wrapped action 순서와 오류는 유지했다. 새 action/옵션/저장 schema나 renderer 동작은 없다. 기존0.0.21버전, 공개 사이트와 번역 runtime 설치는 바꾸지 않았다.

## 확인한 증거

- 새 공개 회귀 검사6개 통과: shorthand/layered swatch, auto 복원, 반복 크기 변경, 실제 data revision에 따른 mark/legend 재실체화, mixed recipe/facet replay, 일반 rect 대조군. 이전 program과 원본 rows는 불변이다.
- 전체 normal suite4,783개 통과(실행122.926초). 최종 `symbols.js`를 사용한 재실행이다.
- 집중 scope20개 통과: 새 회귀6개와 기존 Quarto/public trace 및 generated documentation coverage.
- 초기 broad 후보는 일반 표본의 length action까지 제거하여 Quarto의 공개 trace가284→282로 바뀌었다. 그 실패와 stale documentation provenance 실패를 보존했고, 기존 rect action을 복원하고 provenance/LLM출력을 재생성했다. 기존 expected284를 낮추지 않았다.
- 표본 appearance의 기존 render 검사11개가 통과했다. 최종 source에서 plain/layered/mixed3쌍의 전체 graph는 deepStrictEqual, 명시 painter order는 동일하고 SVG문자열·decoded Canvas RGBA·decoded PDF streams가 모두 exact다. 혼합 recipe의 object-map 삽입 순서만 달랐으며 시각 순서나 concrete 값은 동일하다.
- 실제 차트 이미지/VLM관찰은 하지 않았다. 새 시각 목표를 만들지 않고 기존 recipe-at-birth 결과를 비교했다.

## 재현 명령

```sh
node scripts/run-tests.js all unit/actions/guides/rounded-legend-recipe.test.js docs/quarto-ojs-example.test.js docs/documentation-coverage.test.js
node scripts/run-tests.js unit unit/actions/guides
node scripts/run-tests.js render chart:legend-appearance
npm test
```

기존 current 계약의 recipe reconciliation을 복원한 수정이며 타입/공개 signature는 그대로다. Current coverage와 composite symbols 문서, changelog, 생성된 provenance/LLM bundle을 함께 갱신했다. 별도 npm 배포나 이슈 종료는 하지 않는다. 정규 다음200가족 checkpoint1413에서 다른 후보와 통합 후 package/registry/CI/전체 corpus 호환성 및 release checks를 다시 실행한다. 이전233후보 tarball은 이 수정234를 포함하지 않으므로 재사용해 이번 수정의 packed 검증으로 보고해서는 안 된다.
