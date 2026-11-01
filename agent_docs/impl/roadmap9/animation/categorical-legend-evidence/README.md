# 범주형 범례 전환 검증

`remainingApproval`로 승인된 native 범례의 단일 edge block을 구현했다. 그룹/lane과 동적 reflow는 다음 구현 범위로 남긴다. Source manifest는 `native-guide-values@6`이며 전역 transition version2 및 shared4는 변경하지 않았다.

- 기존 native 배치·appearance mapping·symbol recipe 검증을 순수 owner로 공유한다. Action의 쓰기와 trace 순서는 유지한다. 값과 line/point/swatch 역할로 대응하며 표시 label은 identity가 아니다.
- 같은 policy의 Canvas/plot, 명시 offset, 간격, 기호 치수를 매시점 native layout으로 재생한다. 네 edge, layered symbols, polygon shape, stroke/color, hard-break·hidden labels, 중첩 scope, 현재 frame 재기준 및 오염 거부를 확인했다.
- 신규 8개와 native 회귀 29/29, state coverage 98.48/93.02/100. 누적 389 중 2개는 @5 기대 literal만 낡았으며 수정 후 owning 19/19이다. 최초 누적 실패는 그대로 보존한다.
- 실제 5 cohort의 원행·단위·source를 유지한 50 recipe, 네 renderer 및 Browser DPR1/2의 10개 검사가 통과했다. 대표 midpoint는 20px swatch이며 public fixture는 `test/support/animation-guide-frame.js`에 있다.
- 최종 동일 archive `259636d4…9dd14`를 Node20/22/24에서 각각 runtime5, strict types, 실행 문서, optional peers 및 6개 bundle로 검증했다. 중간 archive의 cap-only 실패와 최종 새 archive의 통과를 구분한다.
- 패키지 entry는 3개 증가했다. Node20/24 pack 및 6개 bundle 실측에 따라 최소한도를 조정하고 README/현재 아키텍처 표를 동기화했다. 최종 package/boundary/truth16, 생성 docs47 및 built186pages/1598LLM 검사가 통과했다.

## 재현 명령

```sh
node --experimental-test-coverage --test-coverage-include='src/materialization/animation/categoricalLegendState.js' --test-coverage-include='src/materialization/guides/categoricalLegend.js' --test-coverage-include='src/grammar/legendSymbolRecipe.js' --test test/unit/animation/categorical-legend-transitions.test.js test/unit/actions/guides/combined-legend-appearance.test.js test/unit/actions/guides/legend-recipe-replay.test.js test/unit/actions/guides/rounded-legend-recipe.test.js test/unit/actions/guides/legend-summary-symbol.test.js
node scripts/run-tests.js realistic test/contracts/realistic-guide-transitions.test.js
node --test test/charts/cross-feature-integration/variants/animation/guides.render.js test/browser/animation-guides.browser.js
```

격리 설치 명령 원문과 정확 archive hash는 `qualify-package.mjs.txt` 및 `qualification.json`에 보존한다. Runtime checkpoint 검증이며 배포·최종077 전체검증으로 집계하지 않는다.
