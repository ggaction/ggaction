# 축 끝점에 가까운 레이블만 정렬하기

## 진행 상태

- [x] 구체적인 기존 동작·수치 재현 검토
- [x] 기존 사용자 승인 재사용
- [x] 구현·선언·현재 계약·공개 문서 동기화
- [x] 수치·생명주기·복원·공개 타입 검증
- [x] 검증한 체크포인트 커밋·푸시

Gate 상태: **approved**. 승인 근거는 이 번역 프로젝트에서 사용자가 직접 말한
“지금까지 모든 질문, 앞으로 할 모든 질문 승인함” 및 계속되는 ggaction 수정·번역
요청이다. 2026-10-23 담당 에이전트가 이 구체적인 additive 설계가 기존 승인 범위임을
확인했다. 새 외관을 발명하지 않고 동결 원본의 기존 끝점 정렬을 재현하며, 이미지
열람은 사용자의 최신 금지 지침에 따라 하지 않는다. 실제 좌표와 글자 경계로 검증한다.

## 문제와 목표

고정 300px 축에서 도메인 끝은 2021년이며 마지막 눈금 2020년은 x=290.3029232535547다.
글자 폭은22.25px이고 alongOffset=.5일 때 중심 정렬 글자 경계는
[279.6779232535547,301.9279232535547]다. 기존 flush:true는 경계를
[.5,300.5] 안으로 넣어1.4279232535547px 이동한다. 원본은 실제 도메인 끝에
가까운 눈금만 정렬하므로 이 마지막 눈금은 가운데 정렬을 유지한다.
원본·도메인·눈금·폰트·크기는 그대로 보존해야 한다.

## 확정 설계

CartesianAxisLabelStyleOptions에 `flushThreshold?: number | "auto"`를 추가한다.
기존 flush:boolean과 기본 동작은 그대로 둔다. flush:true이며 유한한0이상 threshold가
있을 때만, 해당 눈금의 **mapped 위치**가 scale range 어느 끝에서 threshold 이하
거리인 레이블 그룹에 기존 경계 정렬을 적용한다. 글자 경계의 끝까지 거리를 재지 않는다.
threshold0은 정확한 끝점만 고른다. alongOffset은 span·눈금에 동일하게 반영한다.

생략한 편집은 값을 보존하고 "auto"는 threshold를 제거하여 기존 전체 경계 정렬로
돌린다. 생성 시 "auto"도 생략과 같다. flush:false이면 저장된 threshold는 효과가 없고
다시 true로 편집하면 재사용한다. 회전한 레이블의 flush:true 금지는 유지한다.
음수·비유한 수·숫자 이외 값은 원자적으로 거부한다. wrapped 그룹은 함께 움직인다.
완전 축·group·facade·focused editor·source replay·editable persistence가 같은 값을 쓴다.

새 액션·renderer 변경·새 state owner는 없다. 기존 labels config 한 곳에 저장한다.
현재 공개 패키지는0.0.23이며 이 변경은 검증된 후보일 뿐이다. 1400개 작업 후 최종
정식 릴리즈 전에는0.0.24 배포를 주장하지 않는다. 별도 활성 런타임 교체는 담당자가 한다.

## 필요한 검증

실제 mapped tick 기준 수치 기대값, 기존 출력 보존,0/1/큰 임계값, X/Y와 reverse·Canvas
replay, wrapped group, create/group/facade/whole/focused edit 수렴, auto reset, immutable
원자 거부, editable serialize/import와 잘못된 저장 값, 공개 TypeScript·생성 문서 및
관련 축 회귀 테스트를 요구한다. 기존1336개 호환성은 후보 채택 담당자가 다시 검증한다.

## 구현 검증

2026-10-23: 전체 normal **5596/5596** 통과. 설치 패키지 소비자 **178/178** 통과이며
새 full/Basic 축 끝점 옵션, SVG/PNG/PDF, editable restore와 auto reset 사례를 포함한다.
공개 타입·전체 문서 생성·package 크기 검사를 통과했다. 기존 card 개수/byte/median 및
package 크기 한도를 늘리지 않았다. 공식 package recipe로 labels.js만 추가 압축하여
기존 unpacked 한도를 유지한다. 최종 소비자가 실제 검증한 archive SHA256은
`b320d8831f2da50cea6fb5c14a399e2ad4f7d1af2d5971578781e99a1e1df10b`다.

첫 전체 실행의 누락 개발 의존성은 정확한 lock으로 npm ci하여 복구했다. 생성 문서는
현재 source fingerprint로 다시 만들었다. 중간 카드 요약 override 추가는 기존 개수
상한에 걸려 폐기하고, 기존 두 축 별칭의 중복 단어만 줄였다. 모든 실패 로그와 실제
명령은 번역 프로젝트 reports/v13-flush-threshold-*에 남긴다. 새 공개 배포·문서 사이트
배포·활성 번역 런타임 교체는 하지 않았다. 기존1336개 전체 후보 호환성은 후보 채택
담당자가 별도로 검증한다.

Checkpoint: implementation39aea9d7 and documentation4be4ace2 were pushed to origin/codex/release1400. Committed-source documentation and public-type checks:162/162 passed.
