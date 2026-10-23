# Cartesian 축 제목의 명시적 겹침 정책

## 진행 상태

- [x] 고정 프레임 원본에서 실제 레이블-제목 교차와 현재 공개 API 거부를 확인했다.
- [x] 기존 레이블 `overlap: 'error' | 'allow'` 어휘와 기존 제목 소유자를 비교했다.
- [x] 최신 직접 사용자 승인으로 설계·시각 목표 Gate를 승인했다.
- [x] 독립 primitive 목표와 공개 프로그램의 같은 실행 출력이 정확히 일치한다.
- [x] 동작·지속성·타입·계약·문서·설치 패키지 검사를 완료한다.
- [ ] 전체 현행 번역 차트 호환성을 검사하고 로컬 후보에 반영한다.
- [ ] 200개 단위 공개 릴리즈 후 이슈를 정리한다.

이슈: https://github.com/ggaction/ggaction/issues/247

## 문제와 결정

일부 고정 프레임 디자인은 축 레이블끼리 또는 축 제목과 레이블이 겹친다. 레이블끼리는 이미 명시적 `overlap: 'allow'`가 있지만, 축 제목에는 같은 선택이 없다. 현재 기본 충돌 검사는 유지하면서 정확한 명시적 배치를 표현할 수 있어야 한다. 프레임 확대·문구 변경·글자 축소·렌더링 primitive로의 번역은 해결책으로 사용하지 않는다.

기존 Cartesian `AxisTitleOptions`에 `overlap?: 'error' | 'allow'`를 추가한다. `createAxes`, `createGuides.axes`, 개별 X/Y 제목 생성·편집에서 같은 계약을 쓴다. 생략은 현재 엄격한 동작이다. `allow`는 그 제목과 같은 축 레이블 사이의 교차만 허용한다. Canvas 이탈, 레이블끼리의 교차, 다른 축 소유자의 충돌, 차트 제목의 배치는 별도의 현재 규칙을 유지한다.

레이블이 먼저 만들어지는 경우와 제목이 먼저 만들어지는 경우가 같은 최종 상태에서 같은 결론을 내야 한다. 레이블 생성·편집도 해당 제목의 저장된 정책을 읽는다. 명시적으로 `error`로 되돌리면 제안된 최종 배치가 유효할 때만 성공한다. 예를 들어 `editYAxisTitle({offset:300, overlap:'error'})`는 결합된 최종 상태를 검사한다. 오류 시 기존 프로그램·호출자 입력·trace는 바뀌지 않는다.

옵션 값은 두 문자열만 허용한다. Boolean, null, 임의 문자열은 거부한다. 이 옵션은 새 액션이나 scale/channel/mark 문법이 아니다. 기본 생략 경로의 저장 설정과 출력은 바꾸지 않는다.

## 저장과 책임

기존 `materializationConfigs.guides.axis[axisId].title` 소유자가 명시적 정책을 저장한다. `guideConfigs`는 기존 alias이며 별도 상태를 만들지 않는다. 의미 축 제목의 문구는 기존 `semanticSpec.guides.axis`에 남긴다. 중복 정책, 새 자동 컴파일러, renderer 분기는 추가하지 않는다. 이름 있는 축, facet 자식, persistence, Canvas/scale/data 재구현도 기존 소유자를 따라야 한다. 모호한 축은 기존처럼 명시적 target을 요구한다.

기본값을 모든 과거 설정에 새 필드로 쓰지 않는다. 명시적 `allow`/`error`는 저장·복원할 수 있다. 렌더러는 기존 concrete graphics만 읽는다. 공개 package 경계나 거시 아키텍처 소유권은 바뀌지 않는다.

## 승인 근거와 Gate

상태: **approved**. 사용자의 최신 직접 지시: “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”. 이 진행 중인 차트 번역·파이프라인·ggaction 작업의 설계 및 시각 목표 질문을 포함하는 사전 명시적 승인으로 재사용한다. 일반적인 새 기능 요청에서 승인을 추론한 것이 아니다. 원본·설계·검증 자료를 구체적으로 기록하고 기존 검사나 임계값을 완화하지 않는다. 반복 승인을 요청하지 않는다.

시각 목표는 `TARGET.mjs`의 독립 primitive 프로그램과 동일한 제목의 의도적 레이블 교차다. 공개 목표는 아래와 같다. 기본 글꼴·색·데이터·나머지 좌표는 바꾸지 않으며 제목만 명시적 위치에 존재한다.

```js
chart()
  .createCanvas({width:500,height:220,
    margin:{left:320,right:20,top:20,bottom:60}})
  .createData({values:rows})
  .createScatterPlot({x:'rank',y:{field:'group',fieldType:'nominal'},guides:false})
  .createAxes({x:false,y:{
    ticksAndLabels:{labels:{fontSize:14,overlap:'allow'}},
    title:{text:'Group',fontSize:11,offset:80,overlap:'allow'}
  }});
```

사용자의 이미지 시각 검사 중단 지시를 따른다. 이미지를 열어 보거나 VLM으로 검사하지 않는다. 원본/목표 DOM·concrete graphics·같은 실행 PNG decoded equality·플롯 ink를 자동 검사한다. 공개 흐름 구현 뒤 primitive/public equality를 완료한다.

## 검증 범위

- 생략 및 명시적 error의 현재 거부와 기본 출력 보존.
- 제목/레이블 양쪽 생성·편집 순서, 유효한 reset과 충돌 reset의 rollback.
- X/Y·회전·이름 있는 축·모호한 소유자·동일 축 정책만 적용.
- Canvas 밖 제목은 allow여도 거부. 레이블끼리의 overlap 정책은 별도.
- Canvas/scale/data 재구현, facet, persistent materialization 설정 및 손상된 값 거부.
- Full/Basic 타입 및 실제 설치 패키지, SVG/PNG/PDF, exact primitive/public 출력.
- canonical AXES 계약·types·action metadata·API 문서·생성 docs 동기화.
- 기존 라이브러리 검사와 현행1289개/9390개 코드의 전체 native SVG 호환성.

원본0107은 이 기능과 자기 원본·스타일·단계 검증이 끝날 때까지 미승인 입력 상태이며 School 호출은 0이다. 현재 공개본1213개/다음 공개 기준1413개를 유지한다. 로컬 검증과 공개 배포를 구분한다. 이슈는 실제 공개 검증까지 열어 둔다.
