# Facet header rotation

## 진행 상태

- [x] 현재 공개 API와 실제 원본 헤더의 차이 재현
- [x] 구체적 API·저장·경계·호환·검증 설계 기록
- [x] 이번 범위의 직접 사용자 상시 승인 기록
- [ ] 독립 primitive 목표와 수치 oracle 확정
- [ ] 공개 API 구현·타입·현재 계약·문서 동기화
- [ ] 기존 출력·설치 패키지·문서·전체 현재 코호트 검증
- [ ] 검증된 로컬 후보 활성화 후 원본 번역 재개
- [ ] 200개 차트 릴리즈 시점에 공개 배포 확인 후 이슈 종료

## 문제와 필요한 결과

일반 facet의 패널 이름을 왼쪽에 세로로 배치할 수 없다.
`editFacetHeaders({ role: "column", rotation: { value: -90, unit: "degrees" } })`는
현재 `Unknown editFacetHeaders option "rotation".`으로 거부된다.
기존 `side`는 배치되는 변만 바꾸며 텍스트를 회전하지 않는다.

원본 대상에는 5개 패널, 패널당 선 정점 215개, 왼쪽의 -90도 패널 이름이 있다.
실제 원본 SVG의 텍스트 스타일·CTM·glyph bounds·패널 위치를 자동 측정했으며,
원본 SVG/PNG 재생성이 바이트 단위로 일치한다. 이 단계의 모델 호출은 0회다.
외부 원본 이름이나 형식에 종속된 API를 만들지 않는다.

## 승인과 검토 방식

Gate 상태: **approved** — 직접 사용자가 다음과 같이 승인했다.

> 지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자

이 승인은 진행 중인 ggaction 수정·파이프라인·차트 번역 범위의 후속 설계 질문에 적용한다.
따라서 아래 구체적 기존 옵션 확장을 같은 범위에서 구현한다. 새 질문을 반복하지 않는다.
사용자는 이미지 검사를 중단하고 자동 렌더·구조 검증을 계속하도록 지시했다.
수동 이미지 검토나 별도의 수동 시각 승인을 했다고 기록하지 않는다.
독립 primitive와 수치 oracle, 실제 glyph/경계 검사, 동일 실행 decoded pixel 비교로 검증한다.
일반 오차 한도나 데이터·경계·패키지의 기존 거부 조건을 완화하지 않는다.

## 공개 API

새 액션 없이 기존 `EditFacetHeadersOptions`에 `rotation?: RotationInput`을 추가한다.
공통 `headers`와 `headers.row` / `headers.column`도 같은 옵션을 받는다.
`facet`, `facetGrid`, `repeatCharts`의 생성 시 헤더와 기존 편집 액션이 같은 정규화를 쓴다.

```js
program.editFacetHeaders({
  role: "column",
  side: "left",
  rotation: { value: -90, unit: "degrees" }
});
```

- 기존 회전 어휘와 같이 숫자는 radians, `{ value, unit }`은 명시적 단위를 쓴다.
- 모든 유한 각도를 지원하고 기존 회전 정규화 함수를 재사용한다.
- 생략한 생성·편집은 기존 동작을 그대로 보존한다. 편집의 생략은 기존 의도를 유지한다.
- `0`은 회전을 해제한다. 이 기능을 위해 새 `auto`나 별도의 회전 어휘는 추가하지 않는다.
- common/row/column의 기존 상속·우선순위가 그대로 적용된다.
- 알려지지 않은 키, 단위, 잘못된 값, NaN/Infinity는 변경 전에 거부한다.
- 데이터, facet topology, 축 소유권, 패널 내부 크기와 renderer API는 바꾸지 않는다.

## 배치와 경계

명시적 회전이 없는 프로그램의 기존 concrete graphics와 순서를 보존한다.
회전이 있는 헤더는 실제 회전된 glyph bounds로 예약 공간과 충돌을 계산한다.

- `side`는 계속 배치되는 plot edge를 뜻한다.
- `offset`은 해당 edge에서 회전된 글자 블록의 가까운 경계까지의 바깥 거리다.
- `align: start | center | end`는 해당 edge를 따라 회전된 블록을 정렬한다.
- top/bottom은 블록의 수평 정렬, left/right는 블록의 수직 정렬을 적용한다.
- legacy header와 명시적 role header 모두 같은 회전 bounds 계산을 사용한다.
- legacy의 기존 비회전 좌표 정책은 그대로 둔다.
- 예약 공간은 회전 후 필요한 두께를 사용한다. 수직 헤더에 비회전 문자열 길이를 예약하지 않는다.
- 빈 표시 문자열은 기존과 같이 그래픽/예약을 만들지 않는다.
- 회전된 결과의 Canvas 이탈, 다른 헤더/plot/보존된 가이드와의 충돌은 기존처럼 원자적으로 거부한다.
- layout, scale, source/data, theme, text metrics, nested composition, title 및 저장/불러오기 뒤에도 의도를 보존한다.

## 저장과 책임

추가 의도는 기존 단일 소유자인
`materializationConfigs.facets[facetId].headers.common/row/column`에만 저장한다.
기존 단위 정규화에 맞는 유한 radians를 저장하고, concrete `graphicSpec`에는
기존 text primitive의 `rotation`을 사용한다. semantic 데이터나 새 상태 소유자를 만들지 않는다.
새 저장 표현은 현재 editable persistence의 검증·재생성 경로에 포함한다.
누락된 옛 상태는 예전 출력과 완전히 같아야 한다. renderer는 `graphicSpec`만 읽는다.

이 변경은 현 소유자 내 옵션/배치 확장이다. macro architecture, package exports,
mark/encoding topology 또는 renderer 경계를 바꾸지 않는다.

## 검증 계획

1. 독립 고정 literal 목표: -90/90/0도와 비스듬한 각도, 네 변, start/center/end.
2. common 및 role 초기/편집 동등성, 유한 값과 단위 검증, 상속/해제/빈 문자열/불변성.
3. 회전 후 폭/높이·가까운 경계·가운데 정렬·충돌/overflow의 독립 수치 oracle.
4. 대표 공개 프로그램과 명시적 primitive의 정확한 graphics/order/renderer calls/decoded pixels.
5. 기존 회전 생략 프로그램의 정확한 출력 유지, 0도 복원 및 저장/불러오기.
6. 의존 rematerialization, 실제 설치 패키지, Full/Basic export 경계, SVG/PNG/PDF.
7. 현재 normal suite, 선언·현재 계약·action catalog·LLM 문서 생성, 사이트/모바일/접근성 검증.
8. 모든 현재 번역된 원본/실제 코드의 순차 native SVG 호환 검증.
9. 검증된 로컬 후보만 활성화한다. 공개 npm/docs/Pages/dataset은 다음 200개 완료 체크포인트까지 보류한다.

예상되는 파일 범위는 기존 facet actions/header materializer, 타입, persistence 검증,
composition 계약, 생성 문서의 canonical source, 목적이 명확한 예제 및 테스트다.
원본 번역은 기능과 로컬 후보 검증이 끝난 뒤 동일 규칙으로 재개한다.
