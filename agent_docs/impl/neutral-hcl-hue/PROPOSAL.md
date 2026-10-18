# Neutral HCL endpoint hue

## 진행 상태

- [x] #227의 공개 재현, 현재 색상 변환 및 기존 36-cell 대체 표현의 증거 검토.
- [x] 아래 구체 설계에 현재 작업 범위의 사용자 포괄 승인 재사용.
- [x] 독립 수치 oracle, 공개 액션·범례·렌더링·저장 복원과 문서 검증. [RESULTS.json](./RESULTS.json).
- [ ] 검증된 후보 commit/push. 새 배포는 1,413-family checkpoint에 통합.

## 승인과 범위

사용자의 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”를 진행 중인 번역에서 발견한 이 라이브러리 오류에 재사용한다. 기존 action/option/enum/저장 schema를 바꾸지 않는 HCL 및 HCL-long 동작 복구다. 현재 공개 기준 1,213개 + 200개인 1,413개 완료 전에는 새 npm/문서 배포나 번역 runtime 교체를 하지 않는다.

## 구체 동작

HCL 변환에서 파싱된 RGB의 R/G/B가 **정확히 동일**하면 neutral endpoint로 분류한다. 새 chroma epsilon이나 byte 양자화는 추가하지 않는다. 해당 endpoint의 chroma는 0, hue는 undefined로 취급한다. 한쪽만 neutral이면 그 구간의 hue는 반대쪽 유채색 hue로 고정한다. 양쪽 neutral이면 hue 0/chroma 0으로 lightness만 보간한다. Short/long 선택은 neutral endpoint가 있는 구간에서 같은 결과를 갖고, 두 유채색 구간의 기존 hue 경로는 유지한다.

기존 D50/D65 행렬, white-point 기본값, RGB endpoint 정규화, RGB byte 반올림, clamp/reverse/midpoint/다중 stop의 구간 선택 및 다른 보간법은 유지한다. Hue의 undefined 표시는 변환 내부에만 있고 semantic/graphic 결과에는 기존과 같은 RGB 색상만 남는다.

## 기존 공개 기준

```javascript
import { chart } from "ggaction";
const target = chart().createCanvas({ width: 300, height: 180 })
  .createData({ values: [{ x: 0, y: 0, v: 0.5 }] })
  .createScatterPlot({ x: "x", y: "y", guides: false })
  .encodeColor({ field: "v", fieldType: "quantitative", scale: {
    domain: [0, 1], range: ["#4682b4", "#fdfdfd"],
    interpolate: "lab", whitePoint: "d50"
  } });
```

Blue→neutral→tan의 기존 36-cell 그래픽은 같은 RGB stops와 Lab/D50 대체 표현으로 정확하게 구현되어 있다. D50의 neutral 반쪽은 hue를 유지하는 HCL 경로와 같은 rounded RGB를 제공한다는 별도 16,385-sample 증거도 보존되어 있다. 새 HCL 경로를 이 기존 기준 및 독립 행렬-vector oracle과 비교한다. 기존 승인된 차트 코드나 raw rows는 바꾸지 않는다.

## 검증

원래 공개 HCL 오류와 변경 전 색상 표를 보존한다. D50/D65, neutral↔chromatic, neutral↔neutral, HCL/HCL-long, multi-stop, domain 방향/역전/clamp, 정확한 endpoints와 one-channel near-gray를 검사한다. 정확한 행렬 oracle과 literal RGB witnesses를 사용하며 오차 허용을 늘리지 않는다. 기존 유채색 경로와 다른 보간법의 변경 전 표를 정확히 비교한다.

36개 원본 수치와 전체 domain의 16,385개 샘플, 공개 fill/stroke·gradient/sample 범례·편집·저장 복원, 독립 primitive와 실제 RGBA/PNG/SVG 결과를 검사한다. 이미지는 눈으로 보지 않는다. 단위/계약/문서/차트/설치 패키지 검증은 후보 checkpoint의 증거다. 보호된 Node24 릴리스·정확한 registry archive·live 문서와 dataset 동기화는 200-family 릴리스 때 별도로 수행한다.

관련 이슈: https://github.com/ggaction/ggaction/issues/227
