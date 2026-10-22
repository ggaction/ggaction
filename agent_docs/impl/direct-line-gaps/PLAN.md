# 직접 Cartesian 선의 결측 구간

## 진행 상태

- [x] 이슈 #259의 원본 결측 구간과 기존 strict 동작 확인
- [x] 구체적인 범위와 승인 근거 기록
- [x] 구현·타입·현재 계약·문서 동기화
- [x] 단위/렌더러/저장·복원/패키지 검증 — [EVIDENCE.json](./EVIDENCE.json)
- [ ] 검증된 후보 커밋·push, 번역 런타임 이행과 전체 호환 검증

## 승인과 배포

사용자는 기존 작업 범위에서 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함.
새로운 릴리즈는 200개 단위로 하자”라고 명시했다. 이 결정은 기존 이슈 #259의
`missing: "error" | "break"` 방향을 구체화한다. 추가 승인 질문을 만들지 않는다.
사용자의 이미지 검사 중단 지시를 우선하며, 아래 명령/수치와 독립 렌더러 검증으로
기존 원본의 끊어진 선을 복원한다. 새 시각 스타일이나 renderer primitive는 추가하지 않는다.
공개 출판은 현재 번역 기준 1,413개 체크포인트까지 보류한다.

## 계약

- 기존 createLineMark/editLineMark/createLinePlot.line에 missing을 추가한다.
  생략은 기존 error 그대로이며 기존 프로그램의 저장 상태/출력에 새 필드를 넣지 않는다.
  명시적인 값은 semantic layer.mark.missing 한 곳에 저장한다.
- break는 직접 Cartesian quantitative/temporal x/y에만 적용한다. aggregate/bin,
  categorical position, Polar, Parallel은 명확하게 거부한다. 기존 strict 모드 범위는 유지한다.
- null/absent 좌표만 결측이다. NaN/Infinity/숫자 문자열/잘못된 날짜는 계속 오류다.
  각각의 차원은 적어도 하나의 유효 관측값을 요구한다. x는 y 결측 때문에 domain에서 사라지지 않는다.
- 기존 area 결측 처리와 같은 방식으로 각 유효 구간은 별도 graphic path/selection item이다.
  원본 rows는 바뀌지 않으며 각 구간의 sourceIndices를 보존한다. 선택/강조는 그 구간의
  실제 유효 관측값을 소유한다. 기존 one-subpath concrete schema는 확장하지 않는다.
- 기존 기본 순서(보통 x, temporal y인 경우 y), 또는 explicit pathOrder를 유지한다.
  순서 좌표가 결측이면 그 행은 원본 순서상 경계이며, 양쪽 구간을 각각 정렬한다.
  순서 좌표가 유효하고 다른 좌표만 결측이면 그 지점까지 정렬한 뒤 경로를 끊는다.
- 각 구간에 동일한 curve/tension을 독립 적용한다. singleton은 M 하나,
  빈 구간은 path 없음이다. 두 구간은 각각 M,L이고 bridge나 가짜 점은 없다.
  각 path command 한도는 기존 30,000개 그대로이며 collection의 기존 한도도 유지한다.
- 접근성 데이터는 실제 유효 vertex만 제공하는 기존 형식을 유지한다. 원본 결측과
  경로 topology는 semanticSpec/graphicSpec/저장 결과에 보존한다.
- create/edit, encoding 순서, scale/Canvas/data/group replay, selection/highlight,
  SVG/PNG/PDF와 저장 roundtrip을 검증한다. strict/no-gap 출력은 그대로여야 한다.

## 수치 목표

margin 0, 100×100 Canvas, 명시 domain x/y=[0,10]에서
[(0,1),(2,3),(3,null),(5,6),(7,8)]은
두 path [M(0,90),L(20,70)], [M(50,40),L(70,20)]이다.
누락 행의 x=10이면 x domain은 여전히 10을 포함한다.
