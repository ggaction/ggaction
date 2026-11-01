# 리소스 뷰와 분석 뷰의 명시 조합 소비자

## 범위와 승인

- 기존 [포괄 승인](../AUTHORIZATION.json)의 `remainingApproval`과 root의 구체 지시를 재사용한다. 새 API·저장 schema·계산 정책·렌더러는 추가하지 않는다.
- Tree, Treemap, Cartesian/Polar Partition, GraphPlot, DAG/cyclic Flow의 `encodings`, `scales`, `guides` 21셀에 실제 positive 소비자를 연결한다.
- 원 19열은 토폴로지의 위치를 scale-driven geometry로 바꾸라는 요구가 아니다. Current가 이미 허용하는 named concat + ordinary Point + 명시 scoped action 경로를 사용한다.
- 분석 축·범례는 분석 child의 필드 매핑을 설명한다. 리소스 자체 위치·Flow 두께·명시 스타일·라벨은 각 native 계약을 유지한다. 이 경계를 [Current COMPOSITION](../../../contract/current/COMPOSITION.md)에 기록했다.

## 하나의 실행 owner

`examples/program-composition/resource-comparison.js`가 일곱 family의 완전한 public 프로그램과 source revision을 소유한다. 일반 `chart`/`hconcat` 및 native 도메인 액션만 호출한다. 공개 recipe는 같은 helper를 가져오며 installed 문서 검사는 이 helper의 import만 정식 `ggaction` 패키지로 바꾼다.

각 fixture는 숫자 `1`과 문자열 `"1"`을 구별하는 원행을 갖는다. 구조 child는 hierarchy node, graph node attribute 또는 flow link value로 원행을 소비한다. 분석 child는 같은 typed source 값의 `amount`/`rank`/`category`를 Point의 x/y/color로 매핑한다. 두 dataset은 독립 logical ID를 유지하고 같은 키만으로 묵시 연결되지 않는다.

1. 분석 color를 `alternative` 필드로 바꾸면 concrete 색·범례 순서·제목이 바뀐다.
2. 분석 x domain `[0,10]`을 `[0,20]`으로 바꾸면 literal point·tick 위치가 절반으로 이동한다. 구조 child/program/graphics/resource 참조는 정확히 같은 객체다.
3. 한 `reviseData`에 두 명시 child path를 전달해 amount를 두 배로 갱신한다. 각 source의 logical ID·typed row keys와 native item keys는 보존되고 model/layout revision은 1로 증가한다. 최종 두 child의 동일 row 의미와 구체 그래픽을 codec로 검증한다.
4. analysis 후보가 성공한 뒤 structure 후보만 실패하는 입력을 사용한다. 이전 program·trace·호출자 rows는 그대로이며 부분 결과를 반환하지 않는다.

## 검증과 한계

14개 독립 회귀, 기존 composition/scene/manifest/discovery/type를 합친 51개 검사, Node20/22/24의 새 14개씩이 통과했다. Chromium은 7 family × Canvas/SVG × DPR1/2에서 구조 영역의 byte 차이 0, 분석 영역 실제 변경, revision 실제 변경, 동일 backend의 codec 전체 픽셀 차이 0을 확인했다. Backend 간 안티앨리어싱 차이를 정규화하지 않는다.

실제 문서 snippet과 source-free installed Chromium도 통과했다. Runtime/type/package 입력은 이전 고정 archive source `3f1355feb`부터 바뀌지 않아 같은 `5bb29c9c…bc3e` tar를 사용했다. 신규 bundle/성능 검사를 통과했다고 재계산하지 않는다. Canonical pack은 일부 소스를 minify하므로 raw source와 packed file의 직접 byte 비교 대신 archive source commit 이후 입력 diff가 없음을 확인했다.

초기 fixture의 옵션 위치, 오류 정규식, browser readiness, 문서 host의 Canvas lookup 실패는 보존했다. 런타임 결함은 없었으며 가드·허용값을 완화하지 않았다. [증거 요약](native-resource-composition-evidence/summary.json)은 성공과 최초 실패를 구분한다.

기존 owner·다른 행·79 acceptance groups·577 consumer targets·결과 상태·분모는 유지했다. 이 브랜치의 package 셀은 pending이며 root의 별도 installed runtime owner를 후속 합산 때 보존한다. Native 완료 판정이나 STEP077 완료를 기록하지 않는다.
