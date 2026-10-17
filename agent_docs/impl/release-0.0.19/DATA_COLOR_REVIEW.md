# 0.0.19 데이터·색상 공개 계약 검토

## 진행 상태와 승인 경계

Gate: **approved**. 이슈 #167, #168, #169, #172, #196, #198, #202, #207, #209의 구체적인 공개·저장 계약과 시각 목표는 사용자에게 승인받았다. 승인된 검토 revision은 `bad3f346`, 승인 기록은 [`PROPOSAL.md`](PROPOSAL.md)의 `f53dd78a` checkpoint다. 이후 각 절의 구현·검증 증거를 개별 checkpoint로 기록하며, 설계 승인을 구현 완료로 간주하지 않는다.

- [x] 현재 타입, grammar, data action, point materializer, primitive guard 및 persistence 검사 경로 확인
- [x] 기존 floor·exponential·summary 제안의 정확한 결정 재검토
- [x] 새 중요 선택마다 권고안과 이유, 호환성·검증 조건 작성
- [x] 통합 리뷰 패키지의 원격 revision 및 사용자 설계 승인 기록: bad3f346, PROPOSAL.md 승인 기록
- [ ] 승인 후 구현, focused/cumulative/installed 소비자 검증
- [x] 실제 색상 출력 비교의 시각 Gate 증거 및 사용자 확인: 초기 승인과 감마 보정 목표 `4f2f985c`, 승인 기록 `e670508b`

검토 기준은 현재 작업트리의 0.0.18 공개 표면이다. 이 문서는 계약의 새 canonical 사본이 아니라 구현 전 검토 자료다. 구현 시 정확한 현재 계약은 해당 `agent_docs/contract/current/` 소유 파일에 반영하고 이 문서에는 승인·완료 근거만 연결한다. 데이터·색상 계산은 grammar, 의미·소유권·명시적 재물질화는 domain action, 이미 계산된 출력은 renderer가 담당한다. renderer에 데이터 변환이나 fitting을 추가하지 않는다.

### 구현 checkpoint — computed expressions

#167과 #198은 `src/grammar/computed.js`의 기존 validator/evaluator에서 구현했다.
정확한 현재 계약은 [CORE](../../contract/current/CORE.md#createcomputeddata), 공개 설명은
[expressions](../../../docs/api/data/expressions-and-normalization.md)가 소유한다.
Year의 IANA/BCE 처리는 기존 calendar owner를 사용하고 era를 읽어 astronomical year를 보존한다.

- Focused 21개 및 추가 calendar/facet/타입 lifecycle 5개 통과.
- 전체 unit 3,086개, contracts 533개, docs 120개 통과.
- `npm run docs:generate`와 실제 `npm run test:package` 통과. Packed npm 설치 후 두 표현식의
  runtime·TypeScript·persistence, 기존 Basic 범위, browser·MCP 소비자를 검증했다.
- 승인 당시 보존 source data SHA256 `2a0b94cc86e91266fda7547f90bea0292fc5f8e5888e5e87f09acbec303687f7`의
  실제 5,000행에 explicit toNumber/floor 조합을 실행했다. 기존 독립 source proof와 같은
  20,000개 ordered interval endpoints를 대조하여 최대오차 0, raw/derived 5,000행과 raw fields를 보존했다.
- 유료 모델 호출·새 번역·차트 픽셀 관찰 없이 검증했다. 나머지 일곱 요구는 계속 구현 대상이다.

### 구현 checkpoint — continuous color controls

#168 D50/D65 whitePoint, #169 cubehelix gamma와 #172 signed-power color를 기존
color grammar·scale action·materialization·persistence 소유자에 구현했다. 새 renderer
분기나 공개 액션은 없다. 생략된 기본값을 저장 metadata에 추가하지 않으며, 편집의
`"auto"` reset과 interpolation 변경 시 inherited control 제거를 구분한다.
Stroke editor의 비분배 Omit 때문에 누락되던 기존 실행 가능한 타입 표면도 정정했다.

- 감마의 양자화 공개 range `['#75190b','#90f2a4']` 목표는 사용자에게 재승인받았다.
  검토 revision `4f2f985c`, 승인 기록 `e670508b`의 GAMMA_TARGET_REVIEW.md를 따른다.
  기존8bit endpoint 정책은 바꾸지 않았다. 독립 Gaussian 역산·literal18 RGB·실제
  public swatches의 전체480×270 RGBA가 오차 없이 일치했다. D50/D65·pow도 같은
  primitive/public 픽셀 검증을 통과했다. 이미지 관찰/VLM은 사용하지 않았다.
- 전체 unit3,101개, contracts533개, docs120개 통과. 뒤이어 multi-stop·역순·clamp와
  source revision·shared facet lifecycle를 추가한 focused12개도 통과했다.
- 실제 packed npm 설치 후 runtime·TypeScript·Full/Basic·stroke·sampled legend·snapshot,
  browser/MCP 소비자가 통과했다. macOS/Node22.23.1/npm10.9.8에서 Full392,560,
  Basic190,001, SVG7,176 gzip바이트다. 실측 unpacked3,913,392에 따라 unpacked만
  3,914,000, Basic만191,000으로 최소 단위 갱신했다. 다른 예산은 유지했다.
- 누적 통합 전에 computed와 색상 새 옵션의 realistic corpus 최소5회·3실데이터셋
  실제 실행 증언을 추가해야 한다. 이 의무와 이후 회귀·통계·capacity 구현은 남아 있다.

### 구현 checkpoint — summary group capacity

#209는 summary grammar의 단일 output-group ceiling만30,000 inclusive로 올린다.
타입/schema/action trace와 계산·키 순서는 그대로며 새 bypass 옵션은 없다.
현재 계약과 공개 shaping 설명을 동기화했다.

- 9,999/10,000/10,001/29,999/30,000/30,001 경계,60,000행의30,000그룹,
  typed/multifield keys·weighted members, revision/editor·30,000 snapshot·facet replay,
  실패 부모 불변성과 독립10,000 graphic limit을 검사했다. Focused capacity5개 통과.
- [source evidence](summary-source-evidence.json)와 [공개 재현](summary-source-proof.mjs)은
  보존 입력 SHA256 `1ae3e91972addcbdba23e94c13e30fce6708b402efe315403b1ed8b2d23ffd02`
  26,265행의 전체 membership을 검사한다. Clock/hour/minute19,194/10,968/25,909그룹이
  독립 날짜 키·합계/건수 oracle과 순서·평균 오차0으로 일치하며 raw 문자열은 보존했다.
  마지막25,909점 단일 경로의 독립20,000명령 hold는 유지한다.
- 전체 unit3,106개와 docs120개 통과, 설치 package의10,001그룹·snapshot 소비자 통과.
  뒤이어 추가한 facet capacity 사례5개도 통과했다. Contracts532/533의 한 실패는
  앞선 Basic budget 변경의 README·architecture canonical table 누락이었고 두 곳을
  동기화한 documentation-truth3개가 통과했다. 최종 누적 검사에서 재확인한다.

### 구현 checkpoint — response-weighted exponential regression

#196은 기존 regression method union에`exp`를 추가했다. Log response를 실제 y weight로
계산하고, positive finite amplitude/rate·prediction 검사와 interval:false 정규화를
데이터 action·facade·editor·follow/facet replay·persistence에 동일하게 적용했다.
Renderer와 transform shape는 기존 소유자를 유지한다.

- 독립 weighted raw moments와50자리 Decimal 교차검사 literal, noisy/정확한 지수,
  극단 predictor와1e-300/1e300 response, missing·typed group·양수/옵션 오류,
  band 제거/복원·원자성·follow/facet·snapshot을 검사했다. Focused8개와 기존 회귀46개 통과.
- Primitive를 직접 그린400×300 Canvas 전체 RGBA가 public flow와 정확히 일치했다.
  [실제 보존 source proof](exponential-source-proof.mjs)는 원본9행과 실제60개 sample 위치를
  보존한다. [결과](exponential-source-evidence.json)는 원본 곡선 대비 최대 response오차
  1.8474111129762605e-13, 좌표오차5.684341886080801e-13이며 전체360×360 RGBA는 정확히 같다.
  고정 EPS 이내 수치 비교이며 pixel tolerance는 추가하지 않았다. 이미지를 관찰하지 않았다.
- 전체 unit3,113개, docs120개, 실제 npm설치 runtime·TS·PNG/SVG·Full/Basic·MCP 통과.
  Contracts531/533의 compact-card3바이트 초과와 측정 package 초과를 정정한14개가 통과했다.
  Card의 모든 옵션을 유지하고 부정확했던 설명 문장만 짧게 다듬었으며3360 ceiling은 유지했다.
- macOS/Node22.23.1/npm10.9.8에서 packed798,553/unpacked3,916,961,
  Full393,012 gzip바이트를 측정했다. 최소 단계로799,000/3,917,000/394,000만 갱신하고
  Basic191,000·SVG25,000·567entries는 유지했다. 측정과 이전 한도 통과를 혼동하지 않는다.
- 새 exp literal의 realistic 최소5회·3실데이터셋 실제 증언과 최종 누적 검사는 남아 있다.

## 1. 공통 결정

1. 일반 작성 호출은 기존 domain action을 유지한다. 함수의 핵심 옵션을 보통 세 개 이하로 작성할 수 있도록 focused edit를 사용한다. 중첩 AST의 필수 피연산자까지 세 개를 강제하여 의미를 손상시키지는 않는다.
2. unknown own key, 잘못된 enum/타입/조합은 전체를 원자적으로 거부한다. 옵션·행·이전 program을 수정하지 않는다. `undefined` 생략은 기존 정책을 따르며 `null`을 임의의 reset 표기로 추가하지 않는다.
3. 기존 computed depth 16, nodes 128, work 10,000,000 row-nodes와 공통 work 10,000,000은 유지한다. #207과 #209의 별도 한도 외에 tick, range, path, fold 등 한도를 높이지 않는다.
4. 새로 허용되는 저장 노드/enum은 현재 snapshot 형식 안에서 확장한다. 이전 snapshot은 동일하게 읽고, 새 기능을 쓴 snapshot을 구버전이 거부할 수 있다는 최소 런타임 요구사항을 문서화한다. 새로운 decoder가 저장 상태를 자동으로 재계산하거나 보정하지 않는다.
5. Full/Basic 노출은 해당 기능의 현행 가용성에 맞춘다. Full의 계산·회귀 기능을 새로 Basic에 등록하지 않는다. Basic에 이미 존재하는 점·색상 경로는 같은 공통 구현을 사용한다.
6. 각 checkpoint에서 declarations, schema/validator, current contract, public docs, action cards/API·MCP metadata, generated reference와 installed-package evidence를 같이 갱신한다. 새로운 시각 목표는 같은 실행의 primitive/public 출력과 정확한 호출을 먼저 제시한다.

## 2. #167 — 달력 연도 정수 추출

### 권고 공개 계약

`ComputedExpression`에 다음 노드 하나를 추가한다.

```ts
type CalendarYearExpression = {
  readonly op: "datePart";
  readonly part: "year";
  readonly operand: ComputedExpression;
  readonly timeZone?: string;
};
```

```js
program.createComputedData({
  id: "issued-year",
  as: "issuedYear",
  expression: {
    op: "datePart", part: "year",
    operand: {op: "parseTime", operand: {field: "issued"}}
  }
});
```

다른 날짜 열에도 같은 표현식을 적용한 뒤 기존 subtract로 두 연도의 차이를 계산한다. 1986-12-30과 2024-07-17의 차이는 정확히 38이다. elapsed milliseconds를 평균 연 길이로 나누지 않는다.

### 중요 선택과 이유

- **UTC 기본 + 선택적 명시 IANA timeZone을 권고한다.** UTC만 지원하는 별도 문법보다 기존 `createTimeUnitData`의 시간대 계약과 `calendarParts` 소유자를 공유하는 것이 일관적이다. 로컬 시스템 시간대는 절대 암묵적으로 쓰지 않는다. 예를 들어 같은 instant가 UTC에서 2024년, America/New_York에서 2023년인 사례를 명시적으로 표현할 수 있다.
- **이번 part enum은 year 하나다.** 이슈의 필수 요구가 정확한 연도 추출이므로 month/day 또는 substring 문법을 추측하여 추가하지 않는다. “연도 또는 substring”의 연도 경로로 요구를 충족한다.
- 입력은 **명시적으로 파싱된 epoch milliseconds인 finite number 또는 null**이다. 문자열은 기존 `parseTime`으로 명시 변환한다. 특히 숫자 2024를 이 노드에서 자동으로 연도로 해석하지 않는다.

### 기본값·오류·저장

- 생략한 timeZone은 UTC, part는 필수다. 기존 timezone 검사와 Gregorian calendar 부분 추출을 재사용한다. unsupported/empty/nonstring timezone은 빈 source에서도 구조 검사 단계에서 오류다.
- null은 null을 반환한다. 기존 parseTime의 invalid/null → null 정책을 보존한다. 문자열·boolean·record·array 또는 비유한 timestamp는 TypeError다. finite timestamp의 절댓값은 8,640,000,000,000,000 이하여야 하며 초과는 RangeError다. 소수 milliseconds는 기존 Date TimeClip과 같은 정수 절삭으로 해석한다.
- 기존 UTC getter의 astronomical year 숫자를 보존한다. non-UTC 경로도 year 0/BCE를 era 해석 없이 AD 숫자로 바꾸지 않아야 한다. 기존 calendarParts가 이를 지원하지 못하면 해당 helper를 같은 계약 안에서 보완한다.
- editComputedData는 기존 expression 전체 교체 방식이다. timeZone을 생략한 새 expression으로 UTC로 reset한다. 별도 auto/reset 문자열은 추가하지 않는다.
- schema는 nullable numeric derived field이며 원본 날짜 열과 source lineage는 그대로다. AST를 깊이 복사·동결하고 저장/재생 시 timeZone과 part를 유지한다.

### 필수 검증

UTC와 명시 시간대의 연말 경계, 윤년, 1970 이전, year 0/99/BCE, TimeClip 양 끝·초과, fractional timestamp, null/invalid parse 및 미선택 lazy branch를 검사한다. 정확한 38 계산, source revision/edit/facet replay, field dependency, typed numeric/null 결과와 기존 bounds·persistence를 검증한다. OS timezone을 바꿔도 결과가 동일해야 한다.

소유자: `src/grammar/computed.js`, `src/grammar/timeUnit.js`, `src/grammar/datasetSchema.js`, 기존 computed data action/contract.

## 3. #168 — Lab/HCL 백색점 명시

### 권고 공개 호출과 schema

```js
program
  .encodeColor({field: "measure", fieldType: "quantitative"})
  .editColorScale({interpolate: "hcl", whitePoint: "d50"});
```

- 기존 continuous color option에 `whitePoint?: "d65" | "d50"` 추가.
- focused `editColorScale`의 whitePoint는 `"d65" | "d50" | "auto"`. auto는 저장된 explicit whitePoint를 제거하고 기존 기본 d65로 돌아간다.
- `createScale`/low-level color scale와 color/stroke encoding, focused editor, public scale types가 같은 값 집합을 사용한다.
- 저장 color scale에는 선택된 explicit whitePoint만 저장한다. 생략된 기존 scale은 d65로 평가한다. resolved 값이 필요하면 d65/d50 concrete enum으로 기록한다.

### 중요 선택과 이유

**기존 D65 기본을 유지하고 D50을 opt-in한다.** 기본을 D50으로 바꾸면 이미 승인된 차트의 내부 색이 달라진다. 명시적으로 선택한 D50은 D50-adapted sRGB ↔ XYZ ↔ Lab 행렬을 사용한다. 단순히 D65 XYZ의 분모만 D50 값으로 바꾸는 구현은 잘못된 chromatic adaptation이므로 허용하지 않는다.

- whitePoint는 lab/hcl/hcl-long interpolation에만 유효하다. 다른 interpolation, ordinal/discretized scale에 explicit whitePoint를 주면 d65라도 오류다.
- hue 짧은/긴 경로, 무채색 처리, gamut clipping·byte rounding과 endpoint 정책은 현행 규칙을 유지한다.
- whitePoint를 명시한 상태에서 interpolation을 rgb 등으로 바꾸면 inherited whitePoint를 제거한다. 같은 edit에 incompatible whitePoint를 직접 명시하면 원자적 오류다. 이는 옵션이 조용히 무시되는 것을 막는다.
- gamma와는 서로 다른 interpolation family이므로 같은 scale에 둘을 explicit하게 지정할 수 없다. #172 pow와는 조합할 수 있다.

### 소비자·필수 검증

공통 color mapper 한 곳을 통해 점 fill, stroke, line/area/rect 등 지원 마크, gradient stop·sampled-symbol legend가 같은 RGB 결과를 사용한다. legend 자체에서 다른 백색점 계산을 하지 않는다.

독립된 D50/D65 변환 수치 fixture와 내부점 byte 결과, 양 hue 경로·무채색·역순 domain/range·clamp·midpoint를 검사한다. 기존 D65 호출의 semantic/graphic/trace와 SVG 결과를 동일하게 유지한다. encode/edit/source revise/legend regeneration/resize/facet/persistence·installed 소비자를 검증한다. 색상 차이는 구체적 호출과 렌더링 결과로 시각 Gate에 제출한다.

소유자: `src/grammar/scales/color.js`, scale validation/resolution, color/stroke editor와 legend materialization, color current contract와 `docs/api/scales/continuous-color.md`.

## 4. #169 — cubehelix gamma

### 권고 공개 계약

```js
program.editColorScale({interpolate: "cubehelix", gamma: 2.2});
program.editColorScale({gamma: "auto"});
```

- continuous color scale의 `gamma?: number`, focused editor의 `gamma?: number | "auto"`.
- **finite gamma > 0**만 허용한다. 임의 상한은 두지 않는다. 기본은 1이며 생략된 기존 scale에는 새 요청 필드를 추가하지 않는다. auto는 explicit 값을 제거한다.
- gamma는 cubehelix/cubehelix-long에만 유효하다. 다른 interpolation에서 gamma:1도 오류다. interpolation을 다른 family로 바꾸면 inherited gamma는 제거하되 같은 호출의 incompatible explicit gamma는 오류다.

### 중요한 수학 선택

gamma는 **구간 안의 lightness 보간 인수**에만 적용한다. 원래 위치 t에서 hue와 saturation은 기존 t로 선형/각도 보간하고 lightness는 `L0 + (L1-L0) * t**gamma`로 보간한다. 전체 scale t를 감마 변환하여 hue/saturation까지 함께 바꾸거나 보간된 lightness 값 전체를 거듭제곱하지 않는다. multi-stop range는 각 구간의 local t에 적용한다.

- clamp이면 먼저 t를 [0,1]에 제한한다. reverse는 기존 domain/range 처리 후 같은 함수를 적용한다. midpoint가 지원되는 sequential scale에서는 기존 midpoint 구간 위치 계산 후 local gamma를 적용한다.
- gamma 1은 기존 결과와 byte까지 같다. zero/negative gamma는 endpoint·내삽의 예측 가능성을 위해 의도적으로 거부한다.
- unclamped 외삽에서 fractional gamma와 음수 local t 조합처럼 계산이 비유한/실수가 아닌 경우 RangeError로 전체를 거부한다. 조용히 gamma를 1로 바꾸거나 abs(t)를 취하지 않는다. 유효 finite 외삽은 기존 gamut clipping을 유지한다.

### 검증

gamma 1 기본 동일성, 0.5/2.2/3의 독립 수학 fixture, 끝점·중간·multi-stop, 역전·clamp·midpoint 및 unclamped 음수 t 오류를 검사한다. 점·stroke·gradient와 symbol legend 일치, lazy/revision/persistence와 unknown-option 원자성을 검증한다. #168과 같은 opt-in 색상 시각 Gate가 필요하다.

## 5. #172 — pow continuous color transform

### 권고 공개 계약

```js
program
  .encodeColor({field: "measure", fieldType: "quantitative"})
  .editColorScale({type: "pow", exponent: 3});
```

- continuous color type union에 pow를 추가하고 `exponent?: number`를 허용한다. focused editor도 같은 numeric 타입이다. 기본 변환으로 복귀하려면 `editColorScale({exponent:1})`을 사용한다. 현행 numeric scale에 없는 exponent auto/null reset은 추가하지 않는다.
- exponent는 finite > 0, 생략 기본 1. pow가 아닌 color scale에서 explicit exponent는 오류다. sqrt의 별칭 지수 0.5는 기존 내부 계약을 유지하며 사용자 exponent로 덮어쓰지 않는다.
- 기존 `src/grammar/scales/transformed.js`의 signed power 계산을 재사용한다. `f(v)=sign(v)*abs(v)**p`, `t=(f(v)-f(d0))/(f(d1)-f(d0))`. 값을 먼저 domain [0,1]로 정규화한 다음 t를 제곱하는 다른 변환은 금지한다.
- explicit domain은 서로 다른 finite 두 값이다. 양·음·0 교차 domain 모두 signed transform을 따른다. auto-domain의 singleton padding과 극단값 안정화는 기존 transformed scale 정책을 따른다. clamp·reverse·unknown은 기존 color 정책 유지.
- **midpoint는 pow에서 지원하지 않는다.** 현행 transformed color(log/sqrt/symlog)와 동일하게 numeric midpoint는 오류, auto/생략만 유효하다. pow에서 sequential로 바꾸면 inherited exponent를 제거한다. 동시 explicit incompatible 옵션은 원자적 오류다.

### 범례와 호환성

색과 범례 좌표가 반드시 같은 transform을 사용한다. label 값은 원래 수치 단위를 유지하며 gradient sample 위치는 inverse signed power로 계산한다. sampled-symbol legend는 원래 값을 공통 mapper에 전달한다. whitePoint/gamma는 interpolation 단계라 유효한 family 안에서 pow와 함께 쓸 수 있다.

exponent1과 sequential의 비퇴화 domain 일치, exponent3/domain [8,24.8]의 독립 중간점, 음수/0교차/역순 domain, clamp·unknown·극단지수·overflow 안정화, 원래 값 tick 위치 및 encodeColor/encodeStrokeColor/editColorScale 전체를 검증한다. 기존 sqrt/log/symlog 결과를 유지한다.

## 6. #196 — 양의 반응값 지수 회귀

### 재사용한 기존 결정

기존 `a544b85d10b140d4adb3fe980d29af68a01159da:agent_docs/impl/exponential-regression/PROPOSAL.md`를 읽었다. 아래 내용은 그 제안의 estimator·오류·소유권을 유지하며, #202 통계 출력과의 조합을 명시한다. 이전 문서의 proposal 상태를 사용자 승인으로 간주하지 않는다.

```js
program
  .createRegressionData({id: "fit", x: "exposure", y: "response"})
  .editRegressionData({target: "fit", method: "exp", interval: false})
  .editRegressionData({target: "fit", predict: {domain: [0, 100], steps: 60}});
```

- RegressionMethod에 exp, 기존 method parameter/model union에 exp 전용 branch 추가.
- `y = amplitude * exp(rate*x)`. 각 eligible finite pair에서 y>0을 요구하고 w=y, z=log(y)의 **반응값 가중 최소제곱**을 사용한다.
- rate=Σw(x-meanX)(z-meanZ)/Σw(x-meanX)², logAmplitude=meanZ-rate*meanX. 예측은 exp(logAmplitude+rate*x). 안정적인 centered/scaled 계산을 사용한다.
- 모델의 count, amplitude, rate 및 stable log 표현을 보존한다. 최소 두 행과 서로 다른 x가 필요하다.
- 기본/생략 interval 또는 false는 interval false로 정규화한다. mean/prediction band, confidenceMethod/level/confidence, polynomial degree, loess span/robustIterations는 explicit 요청 시 오류다. facade의 기본 band는 exp에서 만들지 않고 explicit band는 오류다.
- missing 정책을 먼저 적용한 뒤 유한한 0/음수 y는 drop하지 않고 오류다. coefficient under/overflow, 예측의 nonfinite/0 결과도 원자적 오류다.
- raw data·prediction field names·group order·prediction grid/explicit values·일반 한도는 현행대로다. 새 R² 의미를 exp에 부여하지 않는다. #202 통계 dataset이 exp fit을 참조하면 명시 오류다.

필수 검증: weighted와 unweighted fit을 구분하는 noisy fixture, exact/noisy/two-point, missing/0/음수/degenerate/extreme, 기존 세 method 회귀, 데이터·line·facade·source edit·persistence와 CI 필드 부재. 기존 보존 증거의 9행/60개 실제 sample 위치를 다시 계산하되 원본 관측값을 다시 쓰지 않는다.

## 7. #198 — finite floor 표현식

기존 `b6392220:agent_docs/impl/computed-floor/PROPOSAL.md`의 결정을 유지한다.

```js
program.createComputedData({
  id: "rounded", as: "lower",
  expression: {op: "floor", operand: {field: "measurement"}}
});
```

- 기존 numeric unary union에 floor 하나만 추가한다. 정확한 own keys는 op/operand다.
- finite number만 허용하고 numeric string은 명시 toNumber가 필요하다. null/string/boolean/array/record는 기존 row-indexed numeric 오류다. 필요한 null 제어는 기존 lazy if로 표현한다.
- Math.floor 의미: 1.8→1, -1.8→-2, -0.2→-1. Math.floor(-0)의 in-memory signed zero를 유지한다. 새 wire signed-zero 표현은 추가하지 않는다.
- depth/node/work, 기존 dependency collection과 모든 구조 검사는 유지한다. reset은 expression 전체 교체다.
- derived rows·lineage·consumer replay·persistence·facet와 caller/parent immutability를 기존 numeric unary와 같은 owner에서 처리한다.

필수 검증은 positive/negative fraction, 정수·양/음0·subnormal·최대유한수, nested divide/multiply와 명시 toNumber, lazy branch/unknown keys·bounds, 5,000행의 20,000 interval endpoint 독립 기대값이다. 기존 bin action으로 aggregate하여 독립 관측행을 없애지 않는다.

## 8. #202 — fit 소유 통계 dataset

### 현재 구현에서 발견한 점

`deriveRegression()`은 models를 반환하지만 공통 `derivedMaterializer`가 values/report만 저장하므로 fitted models를 나중에 dataset에서 읽을 수 없다. “이미 저장된 모델을 단순히 노출한다”는 설명만으로는 구현할 수 없다. 원본을 다시 moment pipeline으로 작성하는 대신 **fit이 한 번 계산한 통계 최소값을 소유하고 통계 dataset은 그것을 참조**하도록 해야 한다.

### 권고 공개 계약

```js
program
  .createRegressionData({id: "fit", x: "exposure", y: "response"})
  .createRegressionStatisticsData({id: "fit-stats", source: "fit"});
```

새 생성 domain action은 createRegressionStatisticsData이며, 완전한 편집 lifecycle을 위해 아래의 editRegressionStatisticsData도 함께 추가한다. 생성 옵션은 정확히 필수 id/source 두 개이며 source 생략/currentData 추측은 허용하지 않는다. source는 raw 데이터가 아니라 regression transform의 fit dataset ID여야 한다.

저장 노드는 `{type:"regressionStatistics"}`이며, 새 dataset.source가 fit dataset을 가리킨다. source dependency는 **raw → fit → stats → annotation**이다. output은 fit의 각 group당 한 행이며:
- ungrouped: `{count, intercept, slope, rSquared}`
- grouped: `{[fit.groupBy]: originalTypedGroup, count, intercept, slope, rSquared}`

고정 필드 이름 네 개를 사용한다. groupBy가 그 이름 중 하나이면 충돌 오류다. 별도 alias/as 옵션을 이번에 추측 추가하지 않는다. count는 numeric 정수, intercept/slope는 finite number, rSquared는 finite number 또는 null이다.

### 모델 소유·저장과 중요한 선택

- **linear만 최초 지원**한다. polynomial/loess/exp를 입력하면 method-specific 진단과 함께 오류다. exp의 weighted log-space와 raw-space R² 중 하나를 임의 선택하지 않는다.
- linear fitting 경로가 동일 eligible observations를 사용해 count/intercept/slope와 R² 최소 통계를 계산한다. prediction grid의 x/y 행을 observations로 다시 fitting하지 않는다.
- R²는 `1-SSE/SST`, SSE=Σ(y-fit(x))², SST=Σ(y-meanY)². 안정적인 scaled sum을 써서 overflow를 막는다. 일정 y로 SST=0이면 **null**을 반환한다. 정확한 상수 fit에 관행적으로 1을 부여하지 않으며 dataset의 numeric/null 의미를 문서화한다. finite이면서 작은 반올림 오차 범위 밖 결과를 0..1로 임의 clamp하지 않는다.
- `materializationConfigs.regressionFits[fitId]`에 버전 1의 닫힌 최소 캐시를 저장한다. shape는 `{version:1, method:"linear", groups:[{group?:Scalar,count,intercept,slope,rSquared}]}`. raw 행, full model 행, prediction arrays를 중복 저장하지 않는다. group 필드는 grouped일 때만 존재한다.
- 캐시는 fit data materializer가 소유하고 통계 dataset materializer가 읽는다. cache.source가 아니라 fit dataset의 기존 source/transform이 lineage의 canonical owner다. 별도 자동 compiler를 만들지 않는다.
- 기존 호출도 linear fit의 내부 최소 캐시를 가질 수 있다. **기존 semanticSpec/graphicSpec/공개 trace·prediction rows·rendered output은 동일하게 유지하지만 내부 materializationConfigs와 새 snapshot byte는 이 추가 metadata로 달라질 수 있음**을 명시한다. 일반 regression을 바꾸지 않았다고 저장 bytes까지 동일하다고 주장하지 않는다.
- 이전 snapshot의 fit에는 캐시가 없다. load 중 자동 재계산하지 않고 그대로 복원한다. 처음 새 statistics action을 호출하면 명시적 하위 fit materialization을 한 번 실행해 캐시를 만들고 통계를 생성한다. 기존 캐시가 있으면 재피팅하지 않는다. 오래된 stats node+캐시 누락의 조합은 snapshot 검증에서 거부한다.
- runtime에서 새로운 통계 출력 때문에 기존에 성공하던 fit을 실패시켜서는 안 된다. native stable 계산이 이미 지원하는 극단값에 대해 캐시의 R²/coefficients도 같은 안정성을 확보한다. 별도 통계 실패 때문에 기존 fit이 실패하는 구현은 호환성 조건 위반이다.

### 편집·삭제·원자성

stats dataset은 독립 ID를 가진 일반 derived owner다. 기존 generic reviseData 또는 transform를 임의 덮어쓰는 방식은 금지한다. **source 변경용 focused editor `editRegressionStatisticsData({target, source})`도 같은 checkpoint에 구현**하며 옵션은 target/source 두 개다. source 생략은 기존 source 유지, target은 현행 unique-target 규칙만 따른다. 필드 schema와 consumer 타입을 재검증한다. create/edit/materialize/topology 등록은 한 기능의 완전한 lifecycle로 본다.

fit/source revision이 실행되면 fit cache를 먼저 갱신하고 그 다음 dependent stats·annotations를 명시적으로 재물질화한다. stats가 달린 linear fit을 unsupported method로 편집하면 전체 edit가 원자적으로 실패한다. 사용자는 stats 소비자를 제거하고 stats를 removeData한 뒤 fit method를 바꿀 수 있다. source 삭제는 현행 dependency collector가 막아야 하고 stats 제거는 소비자가 없을 때만 허용한다. 캐시를 지우거나 fit/source를 바꿀 때 stale cache를 재사용하지 않는다.

### 필수 검증

독립 선형 fixture의 slope/intercept/count/R², constant y의 null, two-point interval:false, grouped typed keys·missing/error/drop, tiny/huge finite 수치, 계수 field 충돌·unsupported source/method를 검사한다. 모델 fit 호출 횟수로 신규 캐시 재사용과 구 snapshot 한 번 명시 materialization을 입증한다. prediction domain/steps 변경은 같은 관측 통계를 유지해야 한다. create/edit/revise/remove/facet/annotation rematerialization·persistence cache tamper·installed consumer를 검증한다.

소유자: regression grammar/data materializer, transform registry/topology·schema/dependency collection, data editing/removal, persistence config validation. renderer나 text annotation API를 바꾸지 않는다. 타입 exports, action inventory·catalog·Current data/statistics contract·public 문서·MCP에 새 action 둘과 내부 materializer를 등록한다.

## 9. #207 — 한 점 레이어의 50,000개 item

### 권고 공개 호출과 수치

```js
program
  .createData({values})
  .createScatterPlot({x: "horizontal", y: "vertical", guides: false});
```

새 옵션·action·bypass flag 없이 기존 point domain 경로에 **점 레이어별 50,000개 inclusive** 상한을 적용한다. 50,001개는 원자적으로 거부한다. 20,707/44,992개 전체 관측값을 보존하기에 충분한 유한 capacity다. 임의 sampling, semantic layer 분할, 행 삭제는 허용하지 않는다.

### 전역 guard와 분리하는 중요 선택

공통 MAX_GENERATED_ITEMS=10,000을 50,000으로 바꾸면 ticks/다른 마크/임의 extension graphic까지 넓어진다. **이를 유지하고 point owner가 증명된 concrete collection에만 전용 상한**을 적용한다.

- 검사 owner는 현재 semantic layer의 mark.type=point 및 연결된 data/graphic ID다. caller-supplied bypass 옵션이나 actionStack의 이름 문자열만으로 특권을 부여하지 않는다.
- createPointMark가 semantic point owner를 먼저 등록한 뒤 호출하는 createGraphics와 이후 editGraphics의 length/items/property-array 경로가 같은 capacity resolver를 사용한다. owner 없는 일반 `createGraphics({id:"dots",type:"circle",length:10001})`는 계속 10,000 한도로 거부한다.
- 하나의 semantic point에 하나의 기존 graphic collection을 유지한다. 10,000개씩 인공 top-level layer를 만들거나 표시 순서·selection index를 바꾸지 않는다. mixed point shape collection도 같은 point 상한을 사용한다.
- point 생성의 raw item allocation 수가 한도의 기준이다. positions 미완성 상태, invisible/unknown/missing 후보를 나중에 필터링할 수 있다는 이유로 50,001행을 임의 허용하지 않는다. 기존 source-follow/missing 정책으로 실제 선택된 dataset을 사용하며 raw 원본은 보존한다.
- 공통 work 10,000,000은 유지한다. mark 추가/refresh·facet 총 작업량, per-shape path 명령, packing의 독립 work guard는 별도로 검사한다. 점 개수 허용은 임의 expensive packing을 보장하지 않는다.
- 진단은 기존 structured resource-limit 형식을 사용하고 실제 operation은 action wrapper가 붙인다. 전용 `optionPath:"Point mark item count"`, limit:50000, actual:50001, 메시지 `Point mark item count must not exceed 50000.`를 사용한다. 일반 graphics 진단의 기존 path/limit은 그대로다.

### 저장·소비자와 경계

Full editable snapshot에서는 semantic owner와 graphic capacity를 같은 resolver로 확인한다. **현재 graphic-only persistence validator는 items 수에 공통 generated ceiling을 강제하지 않는다.** 여기에 point semantics를 새로 삽입하거나 brand-specific marker를 넣지 않는다. 기존 graphic-only 구조 검증/전체 payload·work 경계를 유지하면서 실제 생성된 50,000-item graphic을 round-trip/render할 수 있음을 입증한다. editable input에서는 owner 없는 >10,000 graphics를 새로 허용하는 API 우회가 생기지 않도록 create/edit 경로와 full-state 검증을 구분하여 검토한다. 확장 graphic-only 입력의 기존 지원 범위를 소급 축소하지 않는다.

source revision·reencode·Canvas resize·mixed shape·stroke/size/angle/opacity·selection/highlight·accessible data/export·facet를 누락하지 않는다. per-item IDs/indexes와 draw order, original typed rows를 유지한다. 본 기능이 상한 이내에서 renderer에 새 primitive나 backend 분기를 요구해서는 안 된다.

### 필수 검증

9,999/10,000/10,001/49,999/50,000/50,001, circle/square/path/mixed point, raw source unchanged·실패 parent unchanged, initial/incomplete/followed source revision과 runtime property editing을 검증한다. 일반 circle graphics·다른 marks/ticks/ranges의 10,001 실패와 20,000 path 상한은 그대로 검사한다. 두 실제 보존 source의 20,707/44,992 item 수·좌표·원본 타입·consumer/render export를 입증하고 성능·최대 work가 예측 가능함을 기록한다.

## 10. #209 — summary group 30,000개

기존 `proposal/bounded-summary-output:agent_docs/impl/bounded-summary-output/PROPOSAL.md` 및 원래 `b670fa1d31d26a8150d53725b8ff5f9e074e33ee` 검토 checkpoint의 결정을 유지한다.

```js
program.createSummaryData({
  id: "means", groupBy: ["group"],
  aggregates: [{op: "mean", field: "measurement", as: "mean"}]
});
```

- 오직 summary 실제 distinct typed group 수의 상한을 **30,000 inclusive**로 올린다. 30,001은 기존 summary RangeError 형태로 원자적 거부한다. 새 public option/bypass는 없다.
- input row count가 아니라 group 수다. typed/multifield key identity·first-seen order·arithmetic·weighted aggregates·missing/empty·optional members를 유지한다.
- `src/grammar/summary.js`의 단일 bound owner를 create/edit/revise/facet/replay에 적용한다. #207 point guard, 공통 work, 데이터 입력/출력의 별도 제한과 20,000 path 명령 한도는 그대로다.
- 기존에 성공한 프로그램의 semanticSpec/graphicSpec/trace·출력·저장 shape를 그대로 유지한다. 30,000개의 summary를 받아도 그 수의 points나 path가 자동으로 허용되는 것은 아니다.

필수 검증: 9,999/10,000/10,001/29,999/30,000/30,001, 각 group 1행·여러 행, typed/multi-field key와 모든 기존 aggregate, 부동소수 기대값·members·missing·빈 데이터, downstream failure/revision atomicity·persistence·facet·installed consumer. 보존 source의 실제 26,265행 membership과 19,194/10,968/25,909 group을 독립 계산한다. 25,909개 직선 vertex source는 독립 20,000 path hold를 유지하며 이 이슈만으로 번역 성공이라고 보고하지 않는다.

## 11. 권고 구현 순서와 승인 후 종료 기준

1. #198 floor, #167 datePart: 같은 computed union의 개별 conceptual checkpoint. expression guard와 generated docs 충돌을 막는다.
2. #168 whitePoint, #169 gamma, #172 pow: 공통 option admission/normalization와 interpolation/transform 축을 구분하여 구현한다. whitePoint와 gamma를 하나의 임의 interpolation object로 합치지 않는다.
3. #196 exp 및 #202 statistics: exp model branch를 먼저 동결하고 statistics가 linear-only임을 type·runtime·data-owner lifecycle에 동일하게 반영한다.
4. #207 point capacity와 #209 summary capacity: 한도 owner를 분리하고 공통 guard 회귀를 유지한다.
5. focused→unit/contracts→docs/generated→render/persistence→installed package→cumulative suite 순서로 증거를 남긴다. 불필요한 외부 모델 호출이나 유료 번역은 수행하지 않는다.

새 공개 계약 승인 전에는 구현 완료/Current 승격/이슈 해결로 기록하지 않는다. 승인 이후 실제 구현과 소비자 행렬·문서·배포 패키지까지 확인한 이슈만 해결한다. 범위에 포함된 능력을 구현하지 않은 상태로 미래 기능으로 옮기거나 단순히 닫아 정리하지 않는다.

