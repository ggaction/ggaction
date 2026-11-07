# Trail 실제 데이터 검사와 팔레트 의무 수리

## 원인과 변경

최초 합산 로그를 gzip으로 보존했다. Trail의 concrete output은 fill로 채워진 ribbon이며 strokeWidth 0이 정상이다. 기존 analytic oracle가 Trail을 선 분류에 넣어 양수 stroke를 요구한 것이 실패 원인이다. 기존 면적형 경로 집합에 trail만 추가했다. 1e-9 threshold와 기존 모든 판정은 그대로다. 독립 literal은 정상 filled ribbon을 허용하고 폭0·높이0·한점·Infinity·NaN 다섯 반례를 거부한다.

뉴질랜드 이름의160행·2ribbons와 전 지구 기온의8행·8round ribbons를 같은 불변 program으로 이전/수정 oracle에 전달했다. 이전에는 directTrail 한 건만 실패하고 수정 후에는 실패0이다. source values와 graphic SHA가 불변임을 `trail-corpus-proof.json`에 기록했다. 실제 lifecycle recipe/원행/geometry는 수정하지 않았다.

팔레트 누락16개는 Trail8개와 Table8개(create/edit × palette object/count/extent/name)다. 정확 목록을 owning 검사에 고정하고 기존184개를 유지해200개 전체를 검증한다. 기존 generic palette projection의 원행·category/value/key/sourceRowIndex를 보존한 Trail과 Table 공개 create/edit witness를 각각 추가했다. Trail의 affine x/y projection과 groupBy는 provenance에 명시했다. 이는 실제 금융 분석이나 원 단위 width 의미 증거가 아닌 palette API 실행 증거다. Table은 원 category/value를 표시한다.

## 검증

`qualification.json`은 실행 명령·hash·결과를 소유한다. normal oracle9/9, 두 실제 실패 owning 각각1/1, palette owning1/1 통과했다. 팔레트는 penguins/marathon/astronauts/births/chocolate의5개 실제 source에서265개 program을 실행했다. 모든200개 옵션은 최소5회·최소3개 source, palette name은최소3종이라는 기존 요건을 유지한다.

집중 realistic 호출은 canonical runner의512MiB heap·concurrency2·metrics import를 그대로 재현하고 정확 test name만 선택했다. 이를 전체 파일 또는 합산 corpus 통과로 집계하지 않는다. 전체 common3files는 root 통합에서 다시 실행한다. source/types/package 변경0이므로 새로운 설치·전체 coverage는 반복하지 않았다.

초기 개발 probe에서 top-level stroke가 Trail 공개 옵션이 아님을 확인하고 올바른 color 옵션만 사용했다. API를 넓히거나 선언을 바꾸지 않았다. 최종 독립 정상/퇴화 검증과 palette actual builds가 수정안을 입증한다.
