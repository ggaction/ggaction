# 수치 축 제목의 prospective replay 복원

## 승인과 진행 상태

- [x] 기존 공개 API의 원본 무관 세 행 재현과 ROOT 검토 확인
- [x] 같은 owner의 실제 미래 title leaf만으로 scoped deferral 하는 최소 수정 승인 확인
- [x] 새 공개 API/저장 schema/허용오차 없이 기존 materialization plan에 연결
- [x] 누적 normal·실제 패키지·browser·문서 검증
- [x] coherent commit/push와 clean-source metadata 동기화

이 작업은 [#268](https://github.com/ggaction/ggaction/issues/268)을 복원한다.
ROOT는 사용자의 기존 버그 수정·모든 질문 승인 범위에서 다음 정확한 설계를 검토·승인했다.

> 남은 normalized/dedup steps는 plan owner의 실행 중 private context에만 둔다. Guide owner가
> 기존 selector로 같은 axis owner의 미래 title leaf를 확인할 때만 이전 title preflight를
> 미룬다. 최종 title/Canvas/full collision 검사와 genuine label-only 충돌 거부를 유지한다.

#267의 기능 checkpoint `d99614f99c8d43b68af44e5bd5cf3e2e6b7c34b0`과 metadata checkpoint
`a59e75618bfd39d66abcb1278ca4c78e7b844c45`를 먼저 commit/push한 뒤 별도 수정으로 시작했다.

## 원인과 최소 수정

Canvas margin replay는 scale→marks→guide line/ticks/labels/title 순서로 진행한다.
명시적 수치 title은 이전 concrete 위치를 갖고 있는 동안 새 label과 먼저 충돌 검사돼,
최종적으로는 둘 모두 이동해 겹치지 않는 상태도 거부됐다.

Generic planner는 축 정책을 알지 않는다. 각 실행 step에만 private normalized plan과 다음
index를 전달한다. 이미 소유한 plan을 한 번 복사·동결해 반복적인 전체 plan 복사를 피한다.
각 step 뒤에는 이전 scope를 복원하므로 중첩 실행은 바깥 scope로 돌아간다. 실패하면 새로
만든 immutable branch만 버리고 이전 program/context를 유지한다. 반환 program에는 새 scope가 없다.

Guide resource owner는 기존 `selectCartesianAxis`로 정확한 channel/target owner를 확인한다.
다른 축·다른 owner·미래 title 부재·모호한 target은 유효한 deferral 근거가 아니다.
예약된 실제 title leaf가 새 label/Canvas geometry를 검증하고 outer transaction이 전체 충돌을
다시 검사한다. Blanket guide-validation skip이나 renderer 보정은 없다.

## 실행할 검증

- 세 행 Y축: 이전 title x17.2587890625..28.2587890625가 새 x5.7587890625..16.7587890625로
  이동해야 한다. 동일 숫자의 공개 title 제거→Canvas 편집→재생성 reference와 전체 graphicSpec이 같다.
- X축도 새 labels가 옛 title과 교차하도록 실제 geometry에서 이동량을 구성하고 최종 reference와 비교한다.
- X/Y numeric·omitted shrink/expand, named owner, 실제 focused-label 및 최종 title 충돌 거부,
  unknown/ambiguous selector, 실패 atomicity와 저장·복원을 확인한다.
- Generic planner의 dedup/동결/중첩 실행/성공·실패 private context 누수 검사를 유지한다.
- Full actual installed consumer에서 numeric Canvas replay와 PNG 크기·저장 복원을 확인한다.
  Basic은 `editCanvas`가 없는 기존 public surface를 유지하며 같은 최종 Canvas를 처음 생성해
  Full replay와 정확한 graphicSpec 동등성을 확인한다.

이미지 VLM/수동 시각 검사는 하지 않으며, 활성 번역 runtime·설정·School·counter는 이 작업이
변경하지 않는다. Registry release와 통합 cohort 채택은 ROOT의 별도 checkpoint다.

## 보존한 검증 실패

첫 전체 normal은5671/5672였다. 유일한 실패는 앞선 #267의 승인된 bundle cap 숫자가
canonical architecture table과 README에는 아직 이전 값으로 남아 있었던 동기화 누락이다.
#267 전체 normal은 cap 측정·승인 이전에 통과했고, 이후 실제 consumer는 새 cap을 사용해
통과한 시간차를 구분한다. 이전 성공/실패 기록은 그대로 보존하며 이번 최종 전체 normal은
cap·canonical table·README 수정 이후 입력 전체를 포함해야 한다. 보호 test는 바꾸지 않는다.

첫 Node24 실제 consumer의 새 fixture가 Basic에 없는 `editCanvas`를 호출한 것은 테스트
가정 오류였다. 새 API를 추가하지 않고 Full replay와 Basic의 지원된 초기 생성 결과를
비교하도록 바로잡았다. 기존179case와 별개로 이 추가 case도 실제 설치 검증해야 한다.

같은 실행에서 Full453148/Basic232016gzip bytes가 직전453000/232000을148/16bytes
초과했다. ROOT의 정확한 측정 검토와 기존1000byte 최소 단위 정책으로454000/233000만
승인받았으며 오류·수치·픽셀·coverage/storage 또는 다른 package 한도는 바꾸지 않았다.

## 최종 자동 검증

최종 cap·README·canonical table·지원된 Basic fixture 수정 이후 전체 normal5672/5672가
통과했다. 같은 runtime 입력에서 Node22.23.1/Node24.22.1의 실제 설치 consumer는 각각
Node180cases와 일곱 그룹 모두 통과했다. Browser4/4는 앞선 네 panel의 exact RGBA 차이0을
다시 확인했다. Canonical docs:verify는153개 문서 검사,150개 built pages,1132 selective LLM
artifact identity, 모든 페이지의320/390/768px interaction/containment 검사를 통과했다.

이 결과가 cap 측정 전의 #267 normal과 누락 발견 당시5671/5672를 시간 순서대로 보완한다.
기존 성공·실패 원문은 번역 workspace에 보존하며 과거 결과를 현재 결과로 덮어쓰지 않는다.

## 검증한 소스 checkpoint

구현은 `c12a2c5ed1353915eb13dff0bb8cd1e2006f6c21`로 commit/push했다. 번역 workspace의
`reports/v13-axis-title-prospective-replay-implementation-qualified-v1.json`
(SHA256 `9febe57a56e7ebda96adc8b47e4c70bf5ebb34b9c4eb2873dd08cfbe1d9f1efd`)이
23개 변경 파일과 각 검증 로그를 결합한다. Runtime 세 파일과 README/공식 budget table/한도는
최종5672/5672 입력과 같다. Clean-source 문서 provenance만 이 소스 commit을 가리키도록
별도 재생성하며 runtime/package 내용은 바꾸지 않는다.
