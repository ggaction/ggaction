# 독립 Text의 데이터별 숫자 오프셋

## 진행 상태

- [x] 현재 Text의 상수 dx/dy와 categorical xOffset/yOffset 계약을 비교했다.
- [x] 구체적인 공개 API·저장·결측·item grain·제거·consumer 범위를 확정했다.
- [x] 최신 직접 사용자의 앞으로의 모든 질문 승인으로 설계·시각 목표 Gate를 승인했다.
- [x] 독립 primitive 목표를 생성하고 동결했다.
- [ ] 공개 액션·순수 문법·명시적 materialization·저장/복원·타입·문서를 구현한다.
- [ ] focused/normal/설치 패키지·문서·기존 프로그램 호환성을 검증한다.
- [ ] 검증된 로컬 후보를 채택하고 정규 공개 릴리즈에서 이슈를 정리한다.

이슈: https://github.com/ggaction/ggaction/issues/248

## 문제와 가까운 기존 계약

독립 Text의 dx/dy는 현재 mark appearance의 상수다. 행별 숫자 오프셋을 같은 data grain과 painter order에서 표현할 수 없다. 기존 encodeXOffset/encodeYOffset는 bar/point/rule의 categorical subgroup 위치이며 픽셀 오프셋과 다른 의미다. 이 계약을 바꾸지 않는다. source-owned label은 위치 owner가 별도로 있으며 이번 범위에 포함하지 않는다.

가까운 직접 숫자 encoding인 encodeAngle의 field/value/target 패턴을 재사용한다. 새 다중 채널 facade를 추가하는 대신 기존 encodeChannels에 두 채널을 연결한다. 한 축만 설정하는 일과 두 축을 함께 원자적으로 설정하는 일이 모두 짧다.

## 확정된 공개 API

```js
chart()
  .createCanvas({width:500,height:300,margin:80})
  .createData({values:rows})
  .createTextPlot({
    x:{field:'x',scale:{domain:[0,10]}},
    y:{field:'y',scale:{domain:[0,10]}},
    text:{field:'label'}
  })
  .editTextMark({fontSize:20,align:'center',baseline:'middle'})
  .encodeDx({field:'dx'})
  .encodeDy({field:'dy'});
```

`encodeDx({target?,field?,value?})`, `encodeDy`를 추가한다. 정확히 field 또는 value 하나를 받으며 최대 세 top-level option이다. 숫자는 부호를 허용하는 유한한 logical pixel 값이다. fieldType과 scale 옵션은 받지 않는다. raw 숫자 문자열을 자동 변환하지 않는다. `encodeChannels({target?,dx:{field|value},dy:{field|value}})`로 같은 두 채널을 결합할 수 있다. 채널 payload 안의 target/coordinate/id 금지는 기존 규칙을 유지한다.

독립 Text만 지원한다. source-owned Text/label과 다른 mark는 변경 전에 오류다. explicit target, 현재 유일한 호환 mark, 유일한 후보 순서를 따르며 모호함을 첫 번째 항목 선택으로 숨기지 않는다. 불완전하지만 유효한 독립 Text에 할당하면 semantic intent만 보존하고 x/y/text 준비 뒤 기존 owner가 출력한다. 별도 placeholder나 renderer 동작은 없다.

각 component의 encoding은 같은 component의 상수 `editTextMark.dx/dy`를 override한다. 다른 component는 보존한다. field↔constant 재할당 시 이전의 field/datum 형태를 제거한다. encoded 상태에서 상수 style을 편집해도 encoding이 우선하며, `removeEncoding({channel:'dx'|'dy',target?})` 뒤 그 저장된 상수가 다시 적용된다. 삭제는 기존 액션의 lifecycle/모호함 규칙을 유지한다.

## 데이터·결측·item grain

field는 비어 있지 않은 문자열이며 현재 eligible dataset의 유한한 숫자를 참조한다. 기존 Text의 `missing:'error'|'skip'`를 동일한 최종 eligible row set에서 먼저 적용한다. skip이면 참조된 dx/dy의 null/undefined가 있는 행 전체를 건너뛰며 raw dataset은 보존한다. error 또는 기본 엄격한 numeric 검증에서 누락/비유한값/숫자 문자열은 원자적으로 거부한다. 빈 dataset의 field는 알려진 schema가 그 field를 보유하는 경우만 허용하며, 그 schema가 알려진 경우 숫자 타입이어야 한다. 실제 비어 있지 않은 eligible rows는 기존 numeric reader로 검증한다.

현재 x/y/text/color의 field binding이 row grain을 결정한다. 여기에 dx/dy field도 같은 방식으로 참여한다. 따라서 위치와 text가 상수여도 dx field가 있으면 입력 행마다 glyph가 생긴다. offset이 상수이고 다른 field binding도 없으면 기존처럼 빈 dataset에서도 한 constant glyph다. field-driven 빈 eligible dataset은 0개다. 모든 field 채널이 같은 raw row를 읽고 순서를 유지해야 한다.

## 저장·구현 책임

기존 `semanticSpec.layers[].encoding.dx/dy`가 각각 `{field,fieldType:'quantitative'}` 또는 `{datum:number}`를 저장한다. 공통 vocabulary에서 unscaled 채널로 정의한다. positional scale/domain, guide, legend, category domain을 생성하거나 바꾸지 않는다. 상수 appearance는 기존 `materializationConfigs` owner에 남는다. 새 owner, 중복 offset cache, 자동 compiler 또는 public package boundary는 없다. 기존 macro architecture 책임을 바꾸지 않으므로 SECOND_ARCHITECTURE를 새 계약 목록으로 확장하지 않는다.

기존 Text materializer가 eligible row의 dx/dy를 해석해 concrete text의 최종 x/y를 만든다. scale mapping 뒤 logical pixel offset을 적용하고 기존 rotation/baseline/line/clip 처리를 따른다. renderers는 resolved graphicSpec만 읽으므로 변경하지 않는다. 순수 validation/값 해석은 Text grammar가 소유하며 action, materializer, persistence가 같은 정책을 쓴다. source data revision, derived data edit, binding 교체, Canvas/scale replay, facet snapshots에서 기존 dependency owner를 따른다.

## Consumer matrix와 검증

- 생략된 과거 output/storage 보존, 부호/0/소수, dx/dy 독립성과 combined atomic assignment.
- field↔constant cleanup, removal fallback, style override precedence, caller/program/trace immutable failure.
- 불완전 authoring, 모호한 target, source-owned Text 및 다른 mark 거부.
- 1-row/여러 row/상수 anchor/known typed empty/unknown field/skip/error 결측, numeric string/NaN/Infinity 거부.
- raw row/순서 보존, data revision/derived edits/bindMarkData, Canvas 및 x/y scale 재구현, facet clone/persistence.
- 직접 편집된 잘못된 persisted shape도 restore/serialize에서 거부. 기본 omission은 새 필드를 넣지 않는다.
- 기존 categorical xOffset 의미와 label/selection 배치/scale/guide/legend inference는 그대로다. Text selection/highlight 자체는 이번에 확장하지 않는다.
- Full/Basic 공개 JS·types, installed package SVG/PNG/PDF, inspection/channel provenance, machine docs/action index/catalog/support matrix.
- primitive/public 같은 실행 graphic 순서 및 decoded PNG 정확 일치, plot ink, 기존 전체 normal 검사와 현행1290family/9398actualprogram native SVG 호환성.

## 승인 및 공개

Gate 상태는 **approved**다. 사용자의 직접 지시 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”를 이 구체적인 진행 중 API·저장·시각 목표 결정에 재사용한다. 일반적인 구현 허가에서 승인을 추론한 것이 아니다. 반복 질문을 하지 않으며 구체적인 primitive 목표와 검증 자료를 구현 전에 기록한다.

사용자의 이미지 검사 중단 지시를 따라 이미지/VLM을 열어 보지 않는다. DOM/graphic geometry, 같은 실행 decoded equality와 plot ink만 자동 확인한다. TARGET.mjs의 signed field offset primitive 목표는 공개 동작 구현 전 생성하고 동결한다. 공개 call chain은 위와 같으며 raw rows의 dx/dy를 기존 base text anchor에 더한 목표다.

현재 공개1213family/8788program은 유지한다. 다음 정규 공개 checkpoint1413 이전에는 검증된 immutable local candidate만 사용할 수 있다. 이슈는 실제 public package/main/docs/dataset 검증까지 열어 둔다. 관련 입력은 자체 source/raw/style/stage 검증이 끝나기 전 미입력·0School 상태다.

## 목표 생성 기록

TARGET_EVIDENCE.json의 signed field target은 공개 액션 구현 전에 동결했다. 프레임500×300, plot ink1372, PNG SHA256 `d585e062ba4aa2b1d7c48ecf165e25115724e0e62092a03e70c21d251c54c75c`다. 세 행의 positive/negative/zero dx/dy와 원래 순서를 보존한다. 최초 helper 실행의 미생성 parent directory와 두 번째의 collection input에 concrete id를 넣은 fixture 오류는 로그에 남겼다. 빈 실패 디렉터리만 제거했고 target 생성은 문서화된 primitive `{type,properties}`로 고쳤다. 라이브러리 동작이나 한도를 바꾸지 않았다. 동결된 TARGET.mjs는 다시 실행하지 않는다.
