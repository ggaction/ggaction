# 집합 시각화 후속 설계 — 이번 구현 목표에서 제외

사용자 지시에 따라 UpSet·membership/intersection 자원·전용 API·상호작용·시험 모두 후속 과제로 이관한다. 아래는 이전 설계 기록이며 현재 구현·릴리스 의무가 없다.

### F.4 UpSet: 집합 membership과 교집합 데이터 계약

UpSet은 교집합 membership matrix와 크기·속성 정보를 연결하는 표현이다. 단순 점 격자만 그리는 것으로 완료하지 않는다. [원 논문과 자료](https://www.visdesignlab.net/publications/2014_infovis_upset/)

필수 data pipeline은 `createSetData → createIntersectionData → createUpSetPlot`이다. UpSet 편의 액션은 기존 bar/point/rule/text와 aligned composition을 호출하는 얇은 facade다. 새로운 복합 primitive 하나에 전체 차트를 굽지 않는다. set/intersection 데이터는 일반 bar plot, 요소 테이블, attribute histogram에서도 재사용할 수 있다.

입력은 (1) long `{elementId,setId}`, (2) wide boolean 열 목록, (3) element별 set ID 배열을 지원한다. 입력 형식은 명시하고 문자열 truthiness로 membership을 추정하지 않는다. duplicate (element,set)는 deduplicate하되 수를 diagnostic으로 기록한다. element ID 누락/중복 속성 충돌은 오류, null membership은 기본 error이며 `unknown-as-absent` 선택 시 해당 정책을 저장한다. universe가 주어져야 어떤 집합에도 없는 요소를 셀 수 있다. universe 미지정은 membership에서 관찰된 요소의 합집합이며 빈 조합 count를 “0으로 확인”했다고 보고하지 않는다.

교집합 기본은 **exclusive/exact**: 선택된 집합에는 속하고 나머지 분석 집합에는 속하지 않는 요소를 센다. inclusive query는 required 집합을 모두 포함하고 forbidden 집합을 포함하지 않는 요소를 센다. 나머지 집합은 don't-care다. inclusive count들은 중복되므로 합계가 universe size여야 한다는 검사를 적용하지 않는다. 분석 집합을 줄이는 `project`는 나머지 membership을 무시하여 재집계하고, 단순 display hide는 원래 signature를 유지한다. 이 두 동작을 하나의 토글로 숨기지 않는다.

signature는 정렬된 typed set ID 배열의 canonical encoding으로 만든다. 32-bit bitmask나 53-bit JS number에 의존하지 않는다. 64/128/1000 집합에서도 ID 충돌이 없어야 한다. membership bitmap 등 내부 가속 표현은 직렬화 계약과 분리한다. `intersectionId`는 분석 set universe와 signature로 구성하고 화면 행/열 순서 변경으로 바뀌지 않는다.

기본 metric은 distinct element count. weight 합은 명시적인 `metric:{op:'sum',field}`로 선택하고 음수 weight 허용 여부와 범위를 고정한다. 기본 크기 bar는 nonnegative weight만 허용한다. count와 weight를 같은 이름으로 표시하지 않는다. attribute 평균/분포는 해당 intersection의 element lineage에서 계산하며 long table 중복을 다시 세지 않는다.

손으로 확인할 fixture: A={e1,e2,e3}, B={e2,e3,e4}, C={e3,e5}, universe={e1…e6}. exact는 A만1, B만1, C만1, AB만1, ABC1, none1, AC만0, BC만0. set size는 A3/B3/C2, inclusive AB는2, exact AB는1. A/B만 분석하는 project mode에서는 C만인 e5가 none으로 이동하므로 none2, AB2, A1, B1이다. 원 데이터와 expected 결과는 [계획용 수치 fixture](evidence/revision-oracle-fixtures.json)에 저장한다. 이는 ggaction 실행 결과가 아닌 독립 기대값이다.

### F.5 UpSet: 배치·질의·확장성

matrix의 열은 intersection, 행은 set으로 기본 배치한다. 위쪽 intersection bar는 matrix 열 중심과 같은 categorical scale/band를 공유한다. 왼쪽 set-size bar는 set 행 중심과 공유한다. matrix point의 active/inactive style과 연결 rule은 의미 role이 다르며 별도 hit/selection 대상이다. 이들은 **분리된 plot frame**이므로 축을 각자 갖는 것이 이중 Y축 금지가 아니다. 좌우·상하 orientation 전환도 동일한 정렬 constraint로 구현한다.

필수 정렬은 cardinality/degree/set name/explicit order이며 tie는 canonical ID로 고정한다. 집합 순서와 교집합 순서 변경은 원본 ID를 유지한다. 교집합 클릭/다중선택, set row 선택, required/forbidden query, range cardinality filter, clear/reset, 연결된 원소 테이블·속성 분포를 지원한다. tooltip은 정확/포함 여부, count/weight, 전체 및 현재 universe 크기, 포함/제외 집합을 명시한다. keyboard matrix 이동과 접근성 문장도 같은 query resource를 읽는다.

기본은 관찰된 exact signature만 집계하고 2^S 조합을 열거하지 않는다. zero intersection 요청은 명시 `includeEmpty:true`와 `maxCombinations` 안에서만 수행한다. `topK`, degree bounds, minSize, search, virtualized viewport를 제공하되 omittedIntersectionCount/omittedElementCount와 필터 이유를 표시한다. 묶음 Other는 membership 없는 aggregate이며 개별 exact signature처럼 점을 표시하지 않는다. 화면 제한은 데이터 삭제와 다르다. inclusive query의 omittedElementCount는 누락 교집합 count를 더하지 않고 실제 element ID의 합집합으로 계산한다. 표시 중인 query와 겹치는 요소 수도 별도 보고한다.

복잡도 기준: membership 수 M에 대해 normalization O(M log S) 이하의 목표, observed signature 집계는 요소별 membership 방문과 signature hash 기반이다. set 수만으로 2^S를 예약하지 않는다. 1000집합 sparse fixture, 100k 요소와 1M memberships의 측정 fixture를 마련하고 기존 성능 장비/SLO manifest에 stage별 시간·메모리를 추가한다. 이 수치는 제품 성능 보장이 아니라 qualification 입력 크기다. sort/filter/update 중 stale worker 결과가 현재 query를 덮으면 실패다.

