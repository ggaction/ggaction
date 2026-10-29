# 조합 recipe 3종

## 진행 상태

- [x] STEP056과 structure-recipes, 기존 native frame/lineage 계약 확인
- [x] API·시각 선택에 `../AUTHORIZATION.json` remainingApproval 재사용
- [x] Marginal/Bullet 공개 action과 독립 primitive 작성
- [x] 기존 linked-overlay를 Combo 정본으로 재사용
- [ ] 사용자 문서·설치·실제데이터·4format·browser 증거 완료
- [ ] 동기화·commit/push 및 root 인계

새 ChartProgram method, 저장 schema, geometry kernel, renderer 경로는 없다. 새 전용 createMarginalPlot/createBulletPlot/createComboPlot를 만들지 않는다. examples의 createMarginal/createBullet는 문서용 함수이며 공개 라이브러리 export가 아니다.

## 정확한 의미

Marginal은 한 immutable source에서 3개 panel을 분기한다. 중앙 Scatter와 위 x histogram, 오른쪽 y histogram의 해당 숫자 domain·plot range를 명시적으로 일치시킨다. 두 histogram은 기존 createBinData의 count·members를 Rect의 두 endpoint로 표시한다. Bar y-bin 정책은 넓히지 않는다. 서로 다른 count Y는 독립 panel에만 있다. 공개 getMarkItems에서 선택한 bin의 원 source row indices를 읽어 각 child에 기존 rows selector를 적용한다. 저장 membership은 기존 typed row keys owner이며 원행의 중복 좌표를 합치지 않는다. 관측 행 revision은 세 child의 명시 source를 각각 갱신한다. 리사이즈도 x/중앙 width 및 중앙/y height를 명시적으로 묶는다.

Bullet은 기준 range Rect → actual Bar → target Rule → attached Text 순서다. 기준은 reference dataset이며 actual/target은 observed dataset이다. 모든 수치는 하나의 `amount` X scale을 공유한다. 실제 막대만 하나의 category Y를 가지며 전체 높이 reference/rule은 기존 full-span 계약이다. 색·extent·bar width는 명시한다. 데이터 row label로 total 또는 role을 추측하지 않는다.

Combo는 `examples/linked-overlay/program.js`의 기존 Bar → createOverlay(Line) 정본이다. 별도 예제나 geometry owner를 복제하지 않고 scale identity·endpoint·revision·codec 소비 증거와 recipe 문서를 보강한다. 다른 단위 Y는 독립 panel이 필요하다.

## 경계

Marginal의 빈 unknown schema는 bin field가 없어 거부한다. Bullet의 빈 aggregate input은 기존 no-values 오류다. 실제 0 measure는 semantic 값과 target/reference를 보존하며 zero-area Bar는 출력 item을 만들지 않는다. 중복 source key는 오류이며 같은 좌표의 서로 다른 key는 별도 관측치다. 새 자동 정규화나 누락 행 조작은 없다.

Core/Current/type/API signature 변경 없음. docs의 실행 flow, AST raw-primitive0 검사, original/immutable equality, selected source membership, resize/revise/codec/scene/hit 및 Canvas/SVG/PNG/PDF를 완료 기준으로 둔다. Basic의 미지원 createBinData/RectRange 확장도 하지 않는다. source-free 설치는 Full entry로 수행한다. 최종 074/077 통합 검사는 이 checkpoint 완료와 별개다.
