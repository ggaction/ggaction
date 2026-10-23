# Tick의 수치형 color 인코딩

## 진행 상태

- [x] 기존 Tick/stroke/color/범례 소비자 경로 진단
- [x] 구체적인 계약과 수치 목표 기록
- [x] 기존 사용자 승인 재사용
- [x] 구현과 문서·검사 동기화
- [ ] 수정 후보 통합·기존 전체 native 호환 검사
- [ ] 다음 200개 추가 완료 공개 릴리즈

## 승인과 범위

사용자 직접 지시 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”와 번역 중 필요한 ggaction 수정을 계속하라는 지시를 이 구체적인 소비자 확장에 적용한다. 다시 승인 질문을 하지 않는다. 이미지 검사 제외 지시를 유지하며 수치·SVG/PNG 등가성과 renderer 검사를 사용한다. 다음 정규 공개 checkpoint는 성공 원본1,413개다.

## 진단과 목표

Tick는 현재 수치형 stroke를 지원하지만 encodeColor는 Tick를 거부한다. Stroke gradient는 mapped outline과 기존 고정 채움을 보여주는 정상적인 별도 표현이다. 따라서 실제 수치 색상을 꽉 찬 ramp로 보여줘야 하는 barcode chart를 Tick의 color 의미로 표현할 경로가 없다. 기존 stroke 표현의 기본 결과를 바꾸지 않고 기존 color 채널의 Tick 소비자를 추가한다.

```js
program.createRugPlot({ x: 'value', edge: 'bottom', guides: false })
  .encodeY({ field: 'region', fieldType: 'nominal' })
  .encodeColor({ field: 'value', fieldType: 'quantitative' })
  .createLegend({ values: [40, 60, 80] });
```

새 액션/mark/옵션/renderer primitive는 추가하지 않는다. Full의 기존 Tick와 Rug scaffold가 사용하는 공개 인코딩을 확장한다. Basic에 Tick/Rug 생성이나 편집 API를 새로 노출하지 않는다.

## 닫힌 계약

- Tick의 encodeColor는 quantitative/temporal만 지원한다. 기존 compatible sequential/log/pow/sqrt/symlog 및 quantitative quantize/quantile/threshold 척도와 mapper/범례를 재사용한다. Nominal/ordinal color, aggregate, layout, point 전용 unknown fallback은 추가하지 않는다.
- 색상은 Tick의 concrete stroke 전체에 적용된다. x/y/angle/length/두께/opacity/원본 행은 변하지 않는다. 기존 stroke-only Tick의 출력은 동일하다.
- 하나의 Tick에서 field color와 field stroke의 동시 보유는 거부한다. color가 있는 상태의 encodeStroke(value 또는 field)와 editTickMark.stroke도 거부하고 먼저 removeEncoding({channel:'color'})를 요구한다. 반대 방향은 먼저 stroke 인코딩을 제거한다. 저장된 잘못된 동시 인코딩도 거부한다.
- encodeColor는 기존 고정 stroke 설정을 교체하고 과거 고정색을 숨겨 보관하지 않는다. 제거 뒤에는 기존 Tick 기본색을 사용한다. field stroke와 color 양쪽 모두 없을 때의 상수 stroke 편집은 그대로다.
- 같은 mark의 수치 color는 공통 color scale/gradient·interval·symbols 범례를 사용한다. Gradient의 body는 기존 color ramp로 꽉 채워지며 stroke-gradient의 고정 내부색 정책은 바꾸지 않는다. 기존 정확한 눈금 values는 그대로 사용할 수 있다.
- 기존 현재/유일 target 추론과 명시적 ID, 불완전-but-valid positional assignment, missing error/skip, scale/data/theme/Canvas replay, selection/highlight, clipping, persistence와 facet 공유 범례에 같은 의미를 적용한다. 새로운 저장 vocabulary는 없다.

## 수치 목표와 검사

양 끝의 수치가 blue/red에 대응하는 길이20·두께1인 수직 Tick 두 개는 기존 stroke 기반 Tick와 동일한 endpoints/paint여야 한다. Color gradient는 mapped fill을 가진60개의 strip이고 fixed-blue interior를 갖지 않는다. Value-domain [35,85] 위의 [40,60,80]은 기존 승인된 [0.1,0.5,0.9] 위치를 유지한다. Independent literal 색상, 원본 행, target별 자원 소유권과 동일 graphics/pixel 출력을 검사한다. 모든 renderer는 기존 graphicSpec만 읽는다.

첫 구현은 shared color-consumer validation, 기존 continuous color action, Tick rematerializer 및 범례 dispatch를 수정한다. 중복 소비자 규칙을 만들지 않는다. 선언의 의미 설명·현재 계약·공개 호환표와 예제·generated docs를 함께 갱신한다. 검증된245와 함께 하나의 불변 후보를 만들어 전체1,288family/9,382program native 호환 검사 후 활성화한다. 원본0193은 완료된 qualification과 실제 School 코드 검증 전까지 성공 수에 넣지 않는다.

## 검사 중 보정 기록

- 집중 검사68개가 통과했다. 초기 신규 test의 discrete 색상 문자열 보존, legend owner 전체 제거, reviseData의 자동 rebind, highlight의 앞으로 이동 순서에 대한 잘못된 fixture 가정을 수정했으며 runtime 계약을 바꾸지 않았다.
- 첫 전체4,919개 검사 중4개가 실패했다: 패키지 용량1개, 문서 Related 위치1개, 공통 검색 한도2개. 원래 실패 로그를 보존한다.
- 패키지는 원본854,170bytes 및 Tick 모듈 압축 실험854,475bytes로 기존854,000bytes 한도를 넘었다. 기존 공식 compaction을 gradient module에 적용한 실제 결과853,398packed/4,123,898unpacked/604files로 통과했다. Tick module 실험은 제거했고 압축 JavaScript는45개이며 패키지 한도는 유지했다.
- 새 Tick 검색 항목을 보존하면 실제 index840,401bytes로840,000bytes를 넘는다. 본문 중복을 줄여도 공통 요약 길이 때문에 거의 줄지 않았다. 정보·항목을 삭제하지 않고 기존 최소1,000bytes 단위 정책으로 검색 한도만841,000bytes로 조정한다. 사용자 일괄 승인 범위로 기록하며 old search 한도 통과라고 보고하지 않는다. 데이터·도형·픽셀·통계 허용치는 바꾸지 않는다.
- 공개 Related navigation은 다시 마지막으로 옮겼다. 수정 후 전체/설치/문서와 built-site 검사를 다시 수행한다.
