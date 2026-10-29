# Table — 행·열 키를 유지하는 셀과 소형 차트

## 진행 상태

- [x] STEP055·structure-recipes·core와 기존 전체 승인 확인
- [x] typed row/column key와 고정·실측 자동 폭의 순수 셀 계산
- [x] 독립 literal·순서·영역 보존·극값·own-data·예산 회귀
- [ ] executable primitive와 실제 렌더링
- [ ] Full create/edit·저장·명시 materialization·source revise
- [ ] footer 집계·bar cell·sparkline cell·format/wrap
- [ ] selection/hit·접근성·resize/sort·codec·4 backend
- [ ] 타입·Current·문서·설치·실제 데이터 수직 검증
- [ ] STEP050 합산 및 STEP074/077 누적 인수

상태: 순수 계산 checkpoint. 공개 Table 기능이나 STEP055 완료를 뜻하지 않는다.
[AUTHORIZATION.json의 remainingApproval](../AUTHORIZATION.json)은 남은 API·저장·시각
결정까지 포함하는 명시 승인이다. 이 범위에 따라 아래 구체안을 기록하고 질문 없이 계속한다.
추가되는 공개 API와 저장 구조는 후속 구현 후 Current에 옮긴다. 원안의 footer, bar-table,
inline sparkline, static 4 formats, 접근성 값을 제외하지 않는다.

## 책임과 현재 private 계산

`src/grammar/cells.js`는 프로그램·renderer·font를 읽지 않는다.
`layoutTableCells(rows, columns, options)`에 명시 row key, column key, width,
실측 intrinsicWidth를 전달한다. 현재 결과는 저장 semantic schema가 아닌 pure numeric result다.

- row와 column key는 기존 `core/itemIdentity.encodeRowKey`를 각각 한 번 사용한다.
  Date, number/string, tuple의 구분은 그 owner를 따른다. 결과의 rowKey/columnKey는 canonical
  typed token이며 cell key는 role·row token·column token의 경계를 보존한다. 표시 index와
  문자열 label은 identity가 아니다. Header와 footer는 서로 다른 role이다.
- column.width는 양의 고정 pixel 또는 `auto`. auto에는 반드시 유한한
  nonnegative intrinsicWidth를 전달한다. Text 측정과 padding은 후속 materializer의 기존
  exact text owner가 먼저 계산한다. kernel이 fontSize로 text 폭을 추정하지 않는다.
- 고정 폭을 먼저 빼고 남은 폭을 auto intrinsicWidth 비율로 배분한다. 모든 auto 실측 폭이
  0이면 균등 배분한다. 고정 폭만 있으면 남은 영역을 임의 확장하지 않는다.
- 큰 측정값을 최대값으로 나눠 합 overflow를 피한다. 각 auto endpoint는 남은 폭을
  넘지 않도록 확정하며 마지막 auto가 잔여 폭을 소유한다. 폭0인 auto 셀도 identity를 유지한다.
- options는 width 필수, rowHeight 기본24, header 기본true, footer 기본false,
  rowLimit 생략 시 모든 행이다. rowLimit 0을 허용한다. header/body/footer는 같은 rowHeight를
  쓰며 sourceRowCount·visibleRowCount·omittedRowCount를 구분한다.
- hidden row도 key 유효성과 중복을 검증한다. 원본 row를 삭제하거나 다른 group으로
  재분류하지 않는다. 결과에 원본 데이터 값을 복사하지 않는다.
- row와 column 각각 10,000, 생성 cell 10,000 및 공통 work 10,000,000 한도를 사용한다.
  key token과 반복된 cell key 길이도 누적 예산에 포함한다. height overflow와 고정 폭 초과는
  부분 결과를 반환하지 않고 거부한다.

## 공개 연결의 구체 방향

기존 native compound와 같은 `createTablePlot`/`editTablePlot`를 Full에만 연결한다.
`data`는 기존 source dataset, columns는 ordered explicit column key/field/label 정의다.
사용자가 source에 keyField/keyFields를 준 경우 해당 row identity를 그대로 사용하며,
생성 token source도 기존 identity 계약을 따른다. 별도 자동 row-key 추론은 없다.

semantic layer는 table의 source와 column meaning, 정렬, formatter, missing text, footer 집계,
cell content kind만 저장한다. pixel rowHeight/column width/padding/align/wrap과 역할별 appearance는
materializationConfigs의 단일 table owner에 둔다. resolved cell와 Rect/Text/Path는 graphicSpec만
소유한다. create/edit는 모든 값·텍스트 측정·geometry·소비자 후보를 첫 child 전에 검증하고
wrapped mark application/materialization으로 기록한다.

footer는 column별 명시 집계만 사용하며 rowLimit 이전 전체 source가 집계 근거다.
보이지 않는 행의 존재와 잘린 문자열은 표시 및 접근성 metadata로 설명한다.
숫자·시간 formatter는 `grammar/valueFormat.js`, wrapping과 정확한 font profile은 기존 Text
owner를 재사용한다. font 준비가 부족하면 추정값으로 통과시키지 않는다.

bar cell은 동일 cell frame 안의 명시 value domain을 기존 scale owner로 mapping한다.
sparkline은 기존 Line의 order/missing/curve·scale mapping을 재사용하며 각 cell이 독립 frame이다.
공통 x extent와 independent/shared y 선택을 명시하고 한 cell에 두 Y를 만들지 않는다.
reference-band는 기존 domain action recipe로 연결한다. HTML만으로 export를 대체하지 않는다.

source revise·sort·column reorder는 살아 있는 row+column key를 유지한다. source value와
cell accessibility value, cell/row/column-header hit는 같은 semantic resolver를 소비한다.
selection/highlight, Canvas resize, nested composition, scene/interaction, codec 및 offline
Canvas/SVG/PNG/PDF 소비자는 기존 registry/정책 경계에 연결한다. Renderer에 table 분기를
추가하지 않는다. 이 공개 소비자들은 아직 이 private checkpoint의 완료 증거가 아니다.

## 수치 증거와 최초 실패

2행×2열 literal fixture는 고정40/자동60 폭, rowHeight20이며 header/body/footer 총80 높이다.
자동10:30 측정값과 고정20은100폭에서20:60,180폭에서40:120이다.
typed key 재정렬, 제한된 body의 원 source 수, empty body, MAX_VALUE 측정,
31×17 셀의 면적·연속 경계, own-data getter 미실행, 전체 예산을 검증한다.

최초 실행 8/10: raw Date key를 result에 복사한 것이 plain state boundary와 충돌했고,
budget test의 오류 문자열 기대가 실제 공통 owner와 달랐다. 출력 key를 canonical token으로
통일하고 공통 예산10M에 맞춘 독립 경계로 수정했다. 이후10/10 통과.
추가 seeded extreme fuzz에서1,000입력 중116개가 누적 반올림으로 viewport를1ULP 넘거나
잔여폭을 음수로 만들 수 있음을 발견했다. endpoint 확정 정책과 동일1,000입력의 회귀를
추가해 최종11/11, line/branch/function100/100/100을 확인했다.

패키지는 Node20/22/24에서1,030entries/6,717,758unpacked이며 packed는
20/24의1,476,686bytes,22의1,473,599bytes다. 실제 추가된 private owner1개에 맞춰
1,030/1,476,700/6,717,800의 최소 상한만 적용한다. 현재 공개 entry에서 새 kernel을
import하지 않으므로 기존 공개 번들·설치 소비자의 입력은 그대로다.

실행·입력·패키지 근거는 table-kernel-evidence에 기록한다. 공개 chart 값이나 primitive golden을
수정해 이 수치 실패를 숨기지 않았다. 외부 adapter/parity 시험을 필수·통과 분모에 넣지 않는다.
