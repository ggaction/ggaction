# 행 단위 Cartesian Line의 명시적 categorical unknown 색상

관련 이슈: https://github.com/ggaction/ggaction/issues/236

## 진행 상태

- [x] 현재 설치 후보에서 누락된 색상 field 및 별도 display-key 경로의 거부를 재현했다.
- [x] 기존 범위 내 미래 질문까지 승인한 사용자의 직접 지시를 기록했다.
- [x] public API, raw data, series identity, 편집·재생 및 호환성 목표를 확정했다.
- [ ] 공유 정책과 field/series 처리, action 및 materializer를 구현한다.
- [ ] 선언·Current·사용자 문서·생성물을 동기화한다.
- [ ] focused, 전체 normal, installed package 및 renderer 검증을 완료한다.
- [ ] 검증된 구현 checkpoint를 commit/push하고 로컬 번역 후보에 반영한다.

## 승인 근거

사용자는 진행 중인 번역·파이프라인·라이브러리 수정 범위에서
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고 명시했다.
이 설계는 그 범위에 속하며 같은 승인을 다시 요청하지 않는다. 이 기록은 사용자에게 개별 이미지나
아직 없는 구현을 보여 주었다는 주장이 아니다. 새 graphic primitive나 새 glyph/layout은 도입하지 않고,
기존 Line path와 categorical line legend를 그대로 사용한다. 기존 primitive/public renderer 비교를 통해
실제 결과를 검증한다. 배포·main 통합은 기존 200-family checkpoint인 1,413개에서 진행한다.

현재 번역에 설치된 후보는 `ffd3295e9e073ae1f28142b8f52fee6f2d4ab02a`이며
package manifest version은 `0.0.21`이지만 미배포 개발 후보이다. 이 변경을 구현 중인 working tree와
현재 설치 후보를 혼동하지 않는다. 새 package/docs/proof가 검증될 때까지 현재 설치물을 변경하지 않는다.

## 문제와 목표

색상 field가 raw row마다 없더라도, 명시적인 ordinal domain은 실제 범례의 의미를 소유할 수 있다.
`unknown: "transparent"`는 이 경우 path만 보이지 않게 하고 domain의 두 색상과 label을 보존해야 한다.
현재 Line은 missing nominal field에서 먼저 실패하고, 별도 표시 key를 만들더라도 Point 전용 unknown
검사에서 거부된다. 관측치를 합성하거나 원래 없던 raw key를 넣거나 범례만 다른 데이터로 대체하지 않는다.

```js
chart()
  .createCanvas({width: 240, height: 120,
    margin: {left: 20, right: 100, top: 10, bottom: 20}})
  .createData({values: [{id: 0}, {id: 1}]})
  .createLinePlot({x: "id", y: "id", guides: false})
  .encodeColor({field: "kind", fieldType: "nominal", scale: {
    domain: ["Regression", "Reference"],
    range: ["firebrick", "black"], unknown: "transparent"
  }})
  .createLegend({channels: ["color"], title: "Line"});
```

새 action이나 새 저장 필드는 추가하지 않는다. 기존 `scale.unknown`과 해당 scale/encoding의 소유권을
사용하며 public call은 모두 root option 세 개 이하다. `createLinePlot.color`, `encodeColor`, bulk encoding,
기존 scale 재사용과 편집은 같은 정책을 사용한다.

## 확정 동작

1. Point의 기존 unknown 동작은 변경하지 않는다. 새 허용 범위는 **행 하나가 vertex 하나를 소유하는
   Cartesian Line의 nominal/ordinal color**이다. X/Y aggregate, bin, parallel 및 polar 경로는 현재 제약을 유지한다.
   Bar/Area/Rule/Text 및 continuous color/stroke 등의 unknown 범위도 확대하지 않는다.
2. Line opt-in은 유효한 nonempty explicit ordinal domain과 명시적 color `unknown`을 요구한다.
   기본값은 추가하지 않는다. unknown을 생략하면 기존 strict 오류와 출력이 유지된다.
3. absent field, null 및 유효하지만 domain 밖인 category는 지정한 fallback paint를 사용한다.
   새 Line branch에서 object/array/비유한 숫자 같은 잘못된 categorical 값은 계속 거부한다.
   원래 row/key/type/order는 변경하지 않는다. 문자열 `"undefined"`나 가짜 측정치도 삽입하지 않는다.
4. color에서 추론한 series는 raw category identity를 보존한다. absent와 null을 서로 연결하지 않으며,
   같은 fallback 색상을 쓰는 서로 다른 정상 category도 합치지 않는다. 내부 key 표현은 충돌 없이 구분하고,
   기존 finite scalar category의 key·정렬·graphic ID·출력은 바꾸지 않는다.
5. 명시적 group field의 strict 검증은 유지한다. 명시적 **유효한** group에서 누락된 color를 쓰는 경우에도
   각 series의 color 값이 하나여야 한다. unknown은 position eligibility나 path gap 정책을 변경하지 않는다.
6. 모든 path가 투명해도 원래 vertex와 실제 Line layer는 유지한다. 범례는 그 Line의 동일한 semantic color
   scale과 explicit domain/range를 사용한다. unknown entry나 관측치를 추가하지 않는다.
7. scale의 unknown을 바꾸면 실제 path와 범례를 기존 순서대로 rematerialize한다. explicit domain의 정상
   legend sample 색상은 fallback과 독립적이다. reset은 기존 scale 계약만 재사용하며 새 token을 만들지 않는다.
   fallback 제거 또는 auto domain 변경이 현재 누락된 값을 더는 표현하지 못하면 전체 edit를 원자적으로 거부한다.
8. 공유 scale은 **모든 consumer**를 사전 검증한다. 새로 허용하지 않은 grain/mark/channel이 하나라도 있으면
   일부 consumer만 바뀐 상태를 남기지 않는다. data revision·파생 데이터 편집·facet·editable restore에서도 동일하다.

## 구현 소유권

- pure path grouping/appearance 정책은 `grammar/pathSeries`와 기존 Line derivation 소유자에서 공유한다.
- categorical unknown consumer 적합성은 기존 scale/color consumer 정책에 둔다. action은 preflight와 기존
  wrapped materializer 호출만 조율한다.
- missing opt-in은 실제 semantic scale에서 한 번 읽어 explicit context로 전달한다. encoding/mark에 복제한 flag나
  source-specific 분기, cache, renderer 동작을 추가하지 않는다.
- typed absent/null key의 distinction은 계산용 내부 표현이다. raw data나 persisted schema에 sentinel을 넣지 않는다.
- 기존 정상 데이터·생략 동작·각 Point fallback·다른 mark/channel의 금지 범위를 regression으로 고정한다.

## 검증과 완료 조건

- absent/null/정상 out-of-domain/정상 domain category, 혼합된 series와 같은 fallback의 분리,
  잘못된 scalar/object/array, explicit grouping의 일정한 색상 제약, unsupported grain을 독립 검사한다.
- direct/facade/bulk, scale 생성·재사용·edit/reject, 원본 revision과 derived replay,
  highlight/selection, facet 및 editable snapshot을 검사한다. 원래 `kind` key 부재가 끝까지 보존되어야 한다.
- Point 기존 parity와 생략 시 strict 오류를 유지한다. 공통 scale의 혼합 consumer rejection은 원자적이어야 한다.
- Full/Basic 공개 entry·TypeScript·설치 package 소비자를 검사한다. renderer는 기존 primitive와 native public
  SVG/decoded PNG/PDF를 비교한다. 대표 fixture에는 정상 Reference 선도 있어 실제 plot ink를 검증한다.
- Current encoding/scale/Line 계약, public support matrix와 API 문서, action cards·LLM·machine reference를
  구현과 함께 갱신한다. scope 밖 capability를 Current로 올리지 않는다.
- 전체 normal suite와 실제 package/bundle budget을 실행한다. 실패를 숨기거나 수치·그림 허용 오차를 늘리지 않는다.
- 기존 실제 1,275개 family의 후보 runtime 호환성은 새 설치 후보를 채택할 때 별도 증명한다.
  원래 authoring runtime의 source/cold proof와 실제 모델 bytes는 그대로 보존한다.

이 단계는 0702의 실제 모델 번역 완료가 아니다. 원본 500행/선택 494행, clipping·회귀·모든 layer/범례/축/글자와
의미 있는 단계별 등가 출력을 새 runtime에서 독립 검증한 뒤에만 학교 모델을 호출한다.
