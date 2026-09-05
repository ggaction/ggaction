# W3 B2 — createMarkLabels

전체 실행 승인은 [APPROVAL](../APPROVAL.md)에 따른다. B1 semantic content의 후속 aggregate facade이며 reference/annotation/common format은 이후 작업이다.

## 공개 계약과 rationale

`createMarkLabels({ id?, source?, field?, value?, content?, normalizeBy?, format?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? } = {})`.

- source는 createTextMark와 동일한 명시적/current/unique inference owner를 사용한다. 독립 text를 만들지 않으며 추론 실패 시 source를 요구한다. 명시적 incomplete source는 허용한다.
- ID는 `${source}-labels`. 반복 가능한 resource를 source와 role로 namespace한다. 충돌은 오류이며 두 번째 label layer는 explicit id를 사용한다.
- field/value/content는 encodeText와 같은 배타적 선택이다. 모두 생략하면 content:value. Bar/Arc의 의미상 aggregate를 사용하며 point의 x/y를 임의로 값이라고 추정하지 않는다. format은 하위 action의 auto 기본값을 유지한다. 퍼센트 표시는 format:".0%" 등으로 명시한다.
- text appearance는 align:center, baseline:middle만 설정하고 나머지는 하위 action 기본값을 유지한다. anchor는 source의 기존 final-item anchor 그대로다. source 종류나 부호로 offset을 임의 추정하지 않는다. endpoint 밖 배치는 baseline/dx/dy로 지정한다.
- layout 생략/false는 collision 배치를 만들지 않는다. {}는 layoutLabels 기본 policy, object는 해당 policy 옵션이며 target은 내부 label ID가 소유한다. 명시적 layout은 현재 하위 계약대로 complete text가 필요하다. incomplete source는 layout 없이 먼저 만든 후 completion 뒤 layoutLabels로 설정할 수 있다.
- 생성 이후 encodeText/editTextMark/layoutLabels/removeLabelLayout으로 편집·배치를 해제한다. 기존 removeMark 계약상 종속 label 단독 제거는 불가하며 source owner를 제거할 때 함께 정리된다. 별도 facade resource나 editMarkLabels를 만들지 않는다.
- 기존 immutable branch preflight 관례대로 전체 child flow를 discarded branch에서 검사한 뒤 결과 branch를 만든다. 실패는 이전 state/trace에 아무 변경도 남기지 않는다. 실제 trace는 createMarkLabels → createTextMark → encodeText → optional layoutLabels의 의미 있는 계층을 보존한다.

## 검증

구현 전에 Pie share primitive와 명시적 Bar endpoint offset primitive를 렌더·검토한다. 구현 후 같은 실행에서 literal primitive/public graphics, Canvas calls, PNG를 비교한다. 최단 호출, 명시적 source, 반복 source별 ID, collision, 3 content 종류와 raw/constant, inherited data, incomplete order, 오류 atomicity, child trace, lower action 편집·filter·resize를 확인한다. 타입, catalog/discovery, installed Node/browser artifact, 문서와 누적 suite를 동기화한다.
