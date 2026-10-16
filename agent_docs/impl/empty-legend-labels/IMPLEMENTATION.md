# 범례의 빈 표시 문자열 렌더링 수정

## 근거와 변경

기존 Current 계약은 categorical `editLegendBlock({labelMap})`에서 `label:""`로 text만 숨기고 raw category, order, symbol과 selection identity를 유지한다고 명시한다. 기존 materializer는 빈 text graphic을 남겨 실제 SVG/Canvas renderer의 non-empty text 검증에 실패했다. 새 공개 API, schema 또는 시각적 설계가 아닌 기존 동작의 복원이다.

- 기존 categorical label materializer가 원래 item index로 좌표를 선택한 뒤 빈 text만 생략한다. 전체 categorical domain과 sample/item layout 계산은 그대로 유지한다.
- 전체 label이 숨겨지면 lane은 빈 collection을 occupied-bounds 합집합에서 제외하고 기존 symbol bounds로 배치한다. 일반 nonempty label 경로와 renderer는 변경하지 않는다.
- 숨김→복원, source input의 불변성, semantic domain, sample 수, drawing order, persistence, Canvas 편집과 shared facet/repeat replay를 검증한다.
- 공개 타입 설명, Current 계약과 문서/생성 결과를 동기화한다. Runtime module/entry 추가는 없다.

## 검증

- Focused23/23: categorical4종×4edge, 전체 숨김, 정확한 reset,11범례 family의 실제 SVG/PNG, persistence/facet/repeat/resize/order와 기존 multiline title/group 회귀를 통과했다.
- 전체 unit2977/2977, contracts532/532, docs120/120 통과.
- 실제 installed package consumer의 빈 categorical label SVG/PNG/persistence 검증과 기존 JS/TS/Basic/Full consumer/bundle 경계 검사를 통과했다.
- Package 실측562entries,791,041packed,3,886,248unpacked bytes다. Packed 한도만 기존 최소1,000bytes 단위로792,000으로 조정하고 entry/unpacked/browser/SVG 한도는 유지했다.

## 통합

이 checkpoint를 feature branch에 push한 후 parent가 stable checkout와 문서 snapshot/pin을 함께 갱신한다. 번역 코드·소스·이전 실패·사용량은 보존한다. 배포와 package publication은 수행하지 않는다.
