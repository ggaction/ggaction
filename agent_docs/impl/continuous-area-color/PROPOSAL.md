# 면적 시리즈의 정량 색상

## 진행 상태

- [x] 0.0.19 공개 동작의 거부와 이전 프로그램 불변성 재현
- [x] 새 API의 범위·저장 결과·호환성·소비자 검증 계획
- [x] 독립적인 9개 면적 primitive 목표와 실제 PNG 렌더
- [ ] **Gate: ready-for-review — 공개 계약과 아래 그림에 대한 사용자 승인**
- [ ] 승인된 범위 구현, 소비자 검증, 문서/계약/타입 동기화

현재 라이브러리 구현을 수정하지 않았다. `fixture.mjs`의 `proposedProgram()`은 지금 실패해야 한다. 진단·목표 생성 명령은 다음과 같다.

```sh
node agent_docs/impl/continuous-area-color/reproduce.mjs
node agent_docs/impl/continuous-area-color/render-target.mjs
```

기준 릴리스는 `f6b50bf55a9de1857f106c7aa519326ce7a86d76` / 0.0.19다. 검토할 소스와 증거 revision은 승인 요청에 링크한 이 패키지의 Git commit이다. 승인 전에는 이 Gate에 의존하는 구현만 보류한다.

## 문제와 재현

기존 `encodeColor({field, fieldType:'quantitative', scale})`는 Point/Bar/Rect/Text에만 연결된다. 그룹별로 숫자 하나가 일정한 Area에도 `continuous color mark requires an eligible layer.`로 거부된다. 그룹을 범주형 색상으로 바꾸면 숫자 척도와 연속형 범례 의미를 잃는다.

`rejection-evidence.json`은 27행/9시리즈의 합성 재현, 실패 후 이전 프로그램 불변성, 현재 Point에서 이미 지원하는 동일 HCL/D50 척도의 9개 색상을 기록한다. 실제 번역 소스나 합성한 변환 결과를 배포 코드로 제공하지 않는다.

## 제안하는 공개 계약

**기존 `encodeColor`의 Area 소비자에 정량 필드만 추가**한다. 새 액션·옵션·척도 종류는 만들지 않는다. `createAreaPlot.color` 생성 옵션의 기존 범주형 전용 계약은 유지하며, 완전한 AreaPlot 선언 후 별도 색상 인코더로 정교화한다.

```js
// fixture.mjs의 실제 제안 흐름. values는 27행 합성 fixture다.
chart()
  .createCanvas({width:320, height:220, margin:20})
  .createData({values})
  .createAreaPlot({
    x:{field:'x', scale:{domain:[0,2], nice:false}},
    y:{field:'value', scale:{domain:[0,20], nice:false}},
    guides:false
  })
  .encodeGroup({fields:['series']})
  .encodeColor({field:'level', fieldType:'quantitative', scale:{
    domain:[10,8090],
    range:['#D9D9F3','#00BFFF','#0276FD','#000080','#000080','#0276FD','#00BFFF','#D9D9F3'],
    interpolate:'hcl', whitePoint:'d50'
  }})
  .layoutSeries({mode:'stack'})
  .editAreaMark({opacity:0.7});
```

모든 액션은 상위 옵션 3개 이하다. 의미 결과는 `mark.type:area`, 기존 `group`, `encoding.color.field/fieldType/scale`, 기존 `layout.mode:stack`이다. 새 저장 key/schema는 추가하지 않는다.

- 그룹마다 **유한 숫자 하나가 일정**해야 한다. 그룹 안에서 값이 달라지면 기존 path appearance 규칙처럼 원자적으로 거부한다. 그룹이 없으면 전체가 단일 시리즈다. 색상 값으로 그룹을 임의 생성하지 않는다.
- 기존 정량 색상 척도 종류·range·보간·whitePoint/gamma·domain 검증을 재사용한다. 새 수학 공식이나 오차 허용은 없다. 척도가 요구하는 양수 등 기존 유효성도 그대로다.
- Area의 `color.aggregate`, `color.fieldType:'temporal'`, point 전용 `scale.unknown`은 이번 범위에서 거부한다. 일반 Line의 기존 색상 지원 범위도 유지한다.
- 한 시리즈의 전체 경로/결측 subpath에는 동일한 척도 색상을 채운다. 경로 내부의 값별 gradient나 vertex 색상 보간은 제안하지 않는다. 현재 단색/구조화 FillPaint fallback과 인코딩 우선순위는 유지한다.
- Full facade와 Basic의 기존 Area mark 흐름은 같은 domain 인코더를 사용한다. 정량 fill과 별도 stroke·opacity·그룹·stack/center/ranged/수평 면적을 각각 유지한다. 색상이 layout이나 group 의미를 다시 소유하지 않는다.

## 그래픽 목표

[독립적인 primitive 그림](target.svg) — 320×220, 9개 선형 면적 경로, 각 6개 경계 꼭짓점, opacity 0.7. 세 X지점에서 시리즈별 값은 1/2/1이며 숫자 level은 10부터 8,090까지 1,010 간격이다. 색상은 현재 공개 Point 인코더가 같은 HCL/D50 척도에서 이미 내는 정확한 9색이다.

`target-render-evidence.json`은 실제 SVG의 양수 경로 길이, 플롯 안의 painted bounds, 색/opacity와 PNG hash를 기록한다. PNG는 `.artifacts/test/png/review/continuous-area-color/nine-series-hcl/target.png`에 있다. 이미지 픽셀을 사람이/모델이 검사했다는 주장은 하지 않는다. **새 public Area 실행/primitive 동일성/최상위 public trace 검증은 구현 뒤 수행할 항목이며 아직 통과하지 않았다.**

이 목표는 새 채움 조합만 검토한다. 연속 범례의 primitive·외부 기본 간격·정렬·gradient opacity는 기존 승인된 범례 계약을 그대로 사용한다. Area의 척도가 그 범례의 실제 소비자가 되어야 하며 dummy mark/scale 복제는 허용하지 않는다.

## 구현 경계와 검증

기존 architecture의 명시적 action→semantic→materialization 흐름을 유지한다. `encodeColor`의 소비자 선택과 검증, path별 일정한 정량 값 추출, Area fill의 기존 scale mapper 연결 및 의존성 갱신을 각각 기존 소유 모듈에서 처리한다. Renderer는 완전히 materialize된 `graphicSpec`만 읽고 새 데이터 해석을 하지 않는다. 정량 필드를 범주형으로 재라벨하거나 경로별 색상을 외부에서 미리 계산하여 저장하는 우회는 사용하지 않는다.

| 소비자 | 승인 후 필요한 검증 |
| --- | --- |
| 생성/재할당/해제 | Full/Basic, 하나/다중 그룹, 기존 fallback, 이전 프로그램·입력 불변성, 잘못된 값 원자적 거부 |
| 면적 geometry | 선형/곡선, 수평/수직/ranged, stack/fill/center/overlay/diverging, 명시적 그룹 순서, missing-break subpaths와 기존 density 기반 Area의 지원/거부를 명시 |
| 색상 척도 | 현재 지원되는 정량 척도와 전체 ramp, HCL/D50 등 보간, 데이터·domain/range·coordinate/Canvas 변경 뒤 fill 재계산, 기존 numeric 한도 유지 |
| 범례 | 실제 하나의 척도로 gradient/지원된 symbol 표현, source title/values/labels, 독립적 gradient opacity, 기본 외부 간격, 다른 채널/기존 범주형 범례 동작 유지 |
| 선택/편집/저장 | selection/highlight 및 복구, 데이터·mark·scale 재물질화, import/export, immutable replay |
| Renderer/패키지 | 독립 primitive와 새 public 출력의 동회차 SVG/decoded PNG 정확 일치, Canvas/PDF, 설치 패키지 Full/Basic 및 타입 consumer |
| 문서/기존 출력 | source/types/current contracts/public reference/examples/generated cards 동시 동기화, focused 회귀 + 전체 unit/contracts/docs/package, 기존 범주형 면적 및 다른 색상 소비자 출력 보존 |

실제 번역에서 보류된 소스는 13,896개 원본행, 3,537개 요약 지점과 9개 면적 시리즈를 가진다. 승인 후에도 실제 배포 번역 코드는 학교 모델만 작성하며, 이 합성 fixture를 번역 답안으로 사용하지 않는다. 별도의 새 버전 배포 및 데이터셋 runtime 동기화 검증 전에는 현재 공개 0.0.19로 성공한 것처럼 기록하지 않는다.
