# 2D bin 소속 판정 정책 제안

## 진행 상태

- [x] 원본2474행 /필터2462행 /483 cells와 현 native481 cells 재현
- [x] 세 행 최소 수치 재현 및 기존 계약 확인
- [x] 호환성을 보존하는 최소 공개 옵션 설계
- [x] ROOT 구체 설계 검토
- [x] 승인 근거 기록
- [x] 구현·검증 (검증 기록: `VERIFICATION.md`)

Gate: `approved`. 인간의 기존 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함” 및
번역 중 필요한 ggaction 개선 승인 범위 안에서 ROOT가 구체 설계를 검토한다.
ROOT는 원격 `d6cef4fe`의 134줄 제안 전체와 저장소 지침을 직접 읽고, 2026-10-23 인간의 기존 in-scope 모든 향후 설계 승인에 근거하여 이 구체 설계를 승인했다. 구현은 하나의 검증된 checkpoint로 진행한다. 현재 P 런타임55c8와 실제1023 번역은 변경하지 않으며, 새 활성화는 ROOT의 quiet Gate 뒤에만 가능하다. 이 승인은 배포·번역 집계를 뜻하지 않는다.

## 판정: 기존 계약 위반이 아닌 수치 의미의 차이

현재 `createBin2DData`의 Current 계약은 실제 저장된 edge 숫자의 `[lower, upper)` 소속과
마지막 upper endpoint 포함을 명시한다. 구현은 동일하게 binary search로 실제 edge와
비교한다. 따라서 기본 알고리즘을 조용히 epsilon floor로 바꾸는 것은 기존 수학적 계약을
보존하는 버그 수정이 아니다. 경계에 매우 가까운 원본 값의 소속을 바꾸는 새 의미다.

예를 들어 extent `[-5,5]`, 50개 균등 bin의 nominal step은0.2다. 저장된 어느 edge는
`0.6000000000000005`다. 입력0.6은 이 실제 edge보다 작으므로 현 계약에서는 아래쪽 bin에
속한다. 원본 변환은 논리적인 균등 step의 index를 floor하며 index 공간에 고정된1e-14를
더하므로 위쪽 bin에 속한다. 원본 행을 바꾸지 않고 어느 소속 정책을 사용할지 명시해야 한다.

최소 입력은 `{x:-4.89,y:-4.67}`, `{x:0.6,y:0.6}`, `{x:4.94,y:4.67}` 세 행이며,
두 축 extent는 `x:[-5,5]`, `y:[-4.8,4.8]`, bins는 `{x:50,y:48}`이다.

| 판정 | 0.6의 x cell |
| --- | --- |
| 현재 저장 edge 비교 | `[0.40000000000000036,0.6000000000000005)` |
| 원본 논리 step 판정 | `[0.6000000000000005,0.8000000000000007)` |

실제 source1125는 양쪽 모두2462 eligible rows를 보존하지만 cell 수와 각 count가 다르다.
색상·좌표·원본·검증 허용오차를 바꾸어 이 차이를 숨기지 않는다.

수치 증거는 번역 workspace의 다음 불변 연구 기록에 있다.

- `reports/v13-source1125-bin-boundary-diagnostics-v1.json`
- `scripts/diagnose-v13-source1125-bin-boundary-v1.mjs`
- `reports/v13-source1125-private-action-diagnostic-v1.json`은 별개의 Canvas replay 충돌이며
  이 제안으로 해결됐다고 주장하지 않는다.

## 공개 API: 옵션 하나, 새 액션 없음

```javascript
chart()
  .createData({ values: observations })
  .createBin2DData({
    id: "cells",
    x: "x",
    y: "y",
    bins: { x: 50, y: 48 },
    extent: { x: [-5, 5], y: [-4.8, 4.8] },
    assignment: "step"
  });
```

`assignment?: "edges" | "step"`을 다음 세 요청 경계에 추가한다.

1. `createBin2DData`
2. `editBin2DData`
3. `createHeatmap`의 기존 `bin` object

새 타입 `Bin2DAssignment`를 기존 public type entry에서 재노출한다.
`createHeatmap({x,y,bin:{...,assignment:'step'}})`은 기존 top-level 세 옵션을 유지한다.
가중치·adaptive/hexagonal bin·임의 boundary 배열 등 다른 기능은 추가하지 않는다.

## 정확한 두 정책

### 기본 `edges`

기존 코드 경로, edge 생성, 소속, 오류 문자열, count/member/order와 snapshot 표현을 그대로
유지한다. 생략 또는 명시적 `assignment:'edges'`는 기본 의미다. Canonical transform에는 기본
`assignment`를 생략하여 기존 저장 결과가 byte-identical하도록 한다.

### 명시적 `step`

- 기존 방식으로 동일한 finite increasing edge 배열을 생성·검증한다.
- 각 축의 nominal step은 `(maximum-minimum)/count`다. span이 overflow할 때는
  `maximum/count-minimum/count`로 같은 step을 안전하게 계산한다.
- bin이 하나인 축은 eligible value를 모두 index0에 둔다.
- 나머지는 `floor(1e-14 + (value-minimum)/step)`를 계산한다. 차이만 overflow하면
  `value/step-minimum/step`를 사용한다. Index를0부터 count-1까지의 범위로 제한한다.
- 마지막 upper endpoint는 항상 마지막 bin에 속한다.
- 명시 extent 밖의 row는 기존처럼 **먼저 거부**한다. Index 제한으로 범위 밖 데이터를
  몰래 수용하거나 버리지 않는다.
- 고정1e-14는 index 연산의 정의이며 사용자가 조절하는 오차 허용치가 아니다. 원본·실측
  비교의 허용오차는 변경하지 않는다. 다른 epsilon 값이나 자동 튜닝은 추가하지 않는다.
- `step`의 소속은 논리적인 균등 step 기준이다. 반올림된 저장 edge와 입력을 다시 strict 비교했을
  때 미세한 경계 차이가 있을 수 있음을 계약에 명시한다. `edges`의 엄격한 half-open 계약을
  두 정책 전체에 잘못 일반화하지 않는다.

## 저장·편집·replay

- 기존 `DatasetBin2DTransform`에 optional `assignment?: 'step'`를 저장한다.
  기본 `edges`는 기존 snapshot과 동일하게 property가 없다.
- Edit에서 생략하면 이전 의미를 보존한다. `assignment:'edges'`는 step property를 제거하여
  기존 의미로 되돌린다. 실제 의미 변화가 없으면 기존 no-op edit 오류를 유지한다.
- Requested transform 추출, 직접 transform schema, strict persistence 검증, derived dependency
  replay, logical owner revisions, facets와 downstream recomputation이 이 optional 의미를 보존한다.
- 값·구성·caller object는 불변이며 count/member index/order는 기존 규칙을 유지한다.
- 단일 pure owner인 `grammar/bin2d.js`에서 enum/정규화/선택을 처리한다. Actions와 heatmap은
  동일한 저장 의미를 전달하며 renderer는 이 옵션을 읽지 않는다.
- API 추가 후에도 기본 package entry 수는624다. 새 내부 모듈이나 package byte 한도 확장은
  요청하지 않는다.

## 필수 검증과 negative cases

1. 기존 기본값·저장 transform·count·members·SVG/PNG/semantic 모두 그대로다.
2. 세 행 재현: edges는 기존 결과, step은 명시된 논리적 상위 cell이다.
3. 정확한 저장 edge, 최소/최대, 음수·0·양수, final upper endpoint를 x/y 양쪽에서 검사한다.
4. 경계보다 충분히 아래인0.6-1e-12는 step에서도 아래 bin이어야 한다. 경계 근처를 무조건
   다음 bin으로 몰거나 count를 조작하지 않는다.
5. 1 bin,10,000 bins, 최대 cell 수, full finite-range extent, subnormal/unrepresentable edges,
   invalid extent·잘못된 enum/type·unknown keys, null/nonfinite rows의 기존 정책을 검사한다.
6. 양 정책의 count 합·members 원본 index 보존, 중복 값, includeEmpty, 안정적인 row order를 검사한다.
7. Create/edit/revision/default 복구, no-op·실패의 원자성, persistence roundtrip, dependent cascade와
   facet replay, heatmap 고수준→분해된 액션의 동일한 저장 의미/graphic을 검사한다.
8. Source1125의 별도 PRIVATE 수치 oracle은 실제 원본483개 cell의 각 bounds와 **각 count 전체**를
   검증한다. 세 행 성공이나 count 합2462만으로 원본 호환을 주장하지 않는다.
9. 새 public type의 positive/negative packed consumer, Current/API 문서·action cards·schema·생성물,
   focused와 전체 normal/package/docs/browser를 동기화한다.
10. 새 후보 package/docs 및 전체 기존 accepted cohort를 검증한 뒤에만 quiet runtime 전환을 검토한다.
    현재 실행 중인 실제 School source의 runtime/controls를 바꾸지 않는다.

## 완료와 공개 경계

이 제안의 승인과 source1125의 완료는 별개다. 별도의 Canvas replay/layout 문제와 모든 실제
cell paint/guide/legend/font 검증, meaningful2..8 stage equality, protocol, 실제 School 저작,
ROOT prior-read, normal/cold/final 검증을 마치기 전에는 source1125를 admit하거나 집계하지 않는다.
기존 외부 snapshot·raw data·실제 모델 응답은 수정하지 않는다. 새 registry/문서/뷰어 공개는
약속한1400 release 시점의 별도 승인·검증 경계를 따른다.
