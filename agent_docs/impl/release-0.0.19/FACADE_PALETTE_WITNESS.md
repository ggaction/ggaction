# Facade의 복원된 range palette 증언

## CI 실패 원인과 보존 범위

PR217 CI39034674598 realistic5의 scale inventory179→191은 object/array union parser가
아래3facade의 `color.scale.range.palette`와 `.count`/`.extent`/`.name`을 복원한 결과다:
`createViolinPlot`, `createHeatmap`, `createHistogram`. 추가12paths/삭제0이다.
path literals189개/type literals68개는 그대로이며 palette/name 다양성은6→12다.
기존 profile은 주로 `scale.palette`를 실행해 새 `range.palette` strict 증언이 부족했다.
선언·runtime·parser·admission 정책을 바꾸거나 기존 profile을 교체하지 않는다.

## 추가한 실제 public variant

각3facade에 다음4개 variant를 append한다. 원래 variant와 모든 직접 호출은 보존한다.
각각 pinned TidyTuesday source의 실제 필드·행을 사용하고5회/3dataset을 요구한다.

- `{range:{palette:'viridis'}}`
- `{range:{palette:{name:'viridis',count:7,extent:[0.08,0.92]}}}`
- `{range:{palette:'magma'}}`
- `{range:{palette:{name:'magma',count:7,extent:[0.08,0.92]}}}`

Violin/Histogram의 기존 categorical color에는 ordinal scale을, Heatmap의 quantitative
color에는 sequential scale을 사용한다. 기존 scale roles를 넓히지 않는다.
각 program의 해당 facade 직접 root1개 규칙도 유지한다. 새 variant의 색상 선택을
분석 질문에 설명하고 factor observation이 실제 direct trace의 string/object/name/count와
extent tuple presence를 확인한다. redacted trace의 extent 값을 재구성하지 않는다.

| Recipe | 기존→현재 variants | 최소 chart 수 | 유효 dataset 수 | Field-pair 수 | 현재 capacity |
| --- | --- | --- | --- | --- | --- |
| Box | 10→10 | 50 | 45 | 524 | 5240 |
| Gradient | 10→10 | 50 | 45 | 524 | 5240 |
| Violin | 10→14 | 70 | 45 | 524 | 7336 |
| Heatmap | 16→20 | 100 | 50 | 753 | 15060 |
| Histogram | 5→9 | 45 | 50 | 740 | 6660 |

총 minimum255→315, advanced230→270/intermediate25→45다. 기존 조합을 버리지 않고
60개를 추가했다. 전체 generation quota 배분은 별도 engine owner가 맡는다.
capacity/factor 표는 `/tmp/ggaction-217-facade-range-capacity.json`에도 보존했다.

## 고정된 전체 색상 회귀 selector 정정

같은 CI의 realistic4 `7 !== 3`은 required path 수가 아니라 **variant 수 단언** 실패다.
고정124개 object leaf/135program 증언이 `ordinal>=36`으로 원래 object3개뿐 아니라
뒤에 추가된 string palette2개와 scatter combined legend2개까지 선택했다.

- 기존 원래3개 object 소비자를 ordinal36/37/38로 정확히 선택하고 그3개를 명시 단언한다.
- Statistical fixture도 `rangePalette` 속성 존재만으로 새 문자열 대안을 포함하던 조건을
  `rangePalette.palette`의 객체 branch로 정확히 구분한다.
- 고정159requirements/100programs 및124object-leaves/135programs의 수·digest·5/3·
  최소3개 object palette name을 모두 유지한다.
- 새 문자열/결합 variant는 해당 owner의 별도 strict ledger에서 계속 실행한다.
  이 고정 object 회귀가 전체 공개 union의 문자열 branch 검사를 대신한다고 주장하지 않는다.

## 실제 검증

Node22.23.1/macOS:

```sh
node --max-old-space-size=512 --test test/contracts/realistic-facade-option-recipes.test.js
node --max-old-space-size=512 --test test/contracts/realistic-data-color-contracts.test.js
```

- Facade **10/10PASS**,124,865.2745ms. 실제315charts/191paths/189literals/12diversity
  각각5회/3dataset, 새 string/object viridis/magma별5/3 회귀 통과.
  기존2259개 discrete TT heatmap,470개 baseline/longest title 및 모든 variant 효과도 통과했다.
  로그 `/tmp/ggaction-217-facade-range-actual.log`.
- Data/color **3/3PASS**,47,621.566583ms.
  159요구 SHA`945f57c2d544486480599f6730c944b55f3f25eb74ba4e06a249f4f92950c071`,
  124object-leaf SHA`7dd3a0dccf3b59ec06d048dfb05b1f36bf055ef63c9281aa0f5a8f24b9cfcfaa` 불변.
  로그 `/tmp/ggaction-217-fixed-color-contracts-actual.log`.
- Source/runtime/types/global coverage/5회3dataset minimum 변경0.
  원본 chart-datasets 파일·공개0.0.18 증명·미커밋 importer patch 변경0.
