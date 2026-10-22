# 축별 눈금 간격에 따른 숫자 표기

## 진행 상태

- [x] 기존 공개 formatter와 독립 facet 재현 확인: 이슈 #260.
- [x] 사용자 승인 재사용: 2026-10-22 현재 번역 작업에서 기존·향후 질문 전부 승인, 필요한 라이브러리/파이프라인 수정 지속 요청. 새 승인 질문 없이 이 범위 안에서 구현한다.
- [x] 구현·공개 타입·계약·문서·생성 문서 동기화.
- [x] 순수 계산, 공개 생성·편집·재물질화·저장, 독립 facet, 타입/패키지 검증. [EVIDENCE.json](EVIDENCE.json) 참조.
- [x] 검증된 구현 checkpoint에 이 기록을 함께 commit/push한다. 공개 배포는 다음200개 완료 기준1413까지 보류.

## 정확한 결정

새 액션 없이 기존 axis label `format`에 명시적 문자열 `"ticks"`를 추가한다.
생략/`"auto"`/기존 고정 숫자·UTC 표기는 바뀌지 않는다. Cartesian·Polar·Parallel의
숫자 축은 자기 축에 정착한 전체 tick values로 formatter를 한 번 계산한다.
Time/discrete 축에서 이 숫자 옵션을 쓰면 거부한다. 기존 typed display-label map은
우선하며 없는 항목에만 새 formatter를 적용한다.

최소 양의 인접 tick 간격을12유효숫자로 정규화해 부동소수점 subtraction 잔여를 제거한다.
그 간격의 decimal exponent로 fixed precision을 정한다:0.05→2,100→0.
서로 다른 tick을 같은 문자열로 만들면 precision을 늘리며12자릿수까지 해결되지 않으면
거부한다. 단일 tick은 그 값을12유효숫자로 정규화한 소수 자릿수를 사용한다. 빈 values는
빈 결과다. `0.00`처럼 정한 자릿수의0을 보존하고 음수는 수학 기호 `−`로 표시하며,
반올림된 signed zero는 양의0표기로 통일한다. 원본 값, domain, tick 위치는 바꾸지 않는다.

예상 값:

```
[-0.15,-0.10,-0.05,0,0.05,0.10,0.15,0.20,0.25,0.30]
→ ["−0.15","−0.10","−0.05","0.00","0.05","0.10","0.15","0.20","0.25","0.30"]
[0,100,200,300,400,500,600,700,800,900]
→ ["0","100","200","300","400","500","600","700","800","900"]
```

`createYAxis({ticksAndLabels:{labels:{format:"ticks"}}})`로 만들고,
`editYAxisLabels({format:"auto"})`로 기존 표기로 복귀한다. Facet은 같은 high-level
지시를 각 resolved child scale에서 다시 계산한다. 기존 guide config 한 곳에
문자열 intent만 저장한다. primitive/schema/state owner/renderer 경계는 추가하지 않는다.
기존 순수 tick grammar가 계산을, 기존 wrapped guide actions가 concrete text materialization을
소유한다. SVG/PNG/PDF renderer는 materialized 문자열만 소비한다.

단위 검증 외에 두 독립 패널의 전체 glyph·data·guide 검증은 번역 파이프라인의
별도 성공 조건이다. 이 기능 구현만으로 번역 완료를 인정하지 않는다.
