# 좌표 보간의 검증된 불변 준비 결과 재사용

기존 전체 실행 승인에 따라 원래 좌표 수식과 입력 경계를 보존하면서 반복 검증 비용을 줄였다.
`preparePositionInterpolation`이 완전히 검증·복사·freeze한 정확 객체만 private WeakSet에 등록한다.
`samplePositionInterpolation`은 그 객체의 endpoint 정규화를 재실행하지 않는다. 복사·구조화 복제·
호출자 freeze·가변 입력에는 기존 전체 검증이 유지된다. Proof는 weak하며 transport에 저장하지 않는다.
API·declaration·schema·kernel version·수치·fallback·work·item·codec 한도를 변경하지 않는다.

8개 순수 시험과 전체 animation708개, 경계/타입38개, package/docs16개, 4backend render3개,
실제 Chromium Canvas/SVG DPR1/2 검사1개가 통과했다. 변경 owner coverage는100/96.20/100이다.
동일 canonical tar를3Node에 실제 설치해 각각 runtime3개·strict TypeScript·공개문서 예제·
optional peers·6개 browser bundle을 검사했다. Node20/24 최초 animation333720>333700 실패를
원본으로 보존하고 같은 실제18개 측정을 새333800 ceiling에 다시 대조했다. 설치나 runtime을
재실행했다고 세지 않는다. 나머지5개 bundle ceiling은 그대로다.

Node22 canonical archive는1239entries/1777863packed/8023072unpacked이며 Node20/24의
실제 npm 실행 packed 최대1780877이다. packed1780900/unpacked8023100만 최소 정합했다.
초기 상대 출력 경로 오류와 이전 unpacked/packed cap 거부, 잘못된 설치 fixture로0개를 고른
첫 harness 실행은 별도 원본 로그로 보존한다. 올바른 fixture의 실제3case 실행으로만 판정한다.

`comparison.mjs`는 원3aa8e93c4와 새 positions source의 순수 함수만 별도 번들하여10,000개의
모든 중간 value/position을 독립 선형 공식으로 검산한다. 전체 sample JSON hash도 동일하다.
Node diagnostic warm5/sample10 시간은 병렬 작업 중의 진단이며 원 Chromium P95·지원 크기·
AT56/82 또는 STEP077 완료 근거가 아니다. 다음 명령은 저장한 exact baseline과 현재 source를 비교한다.

```sh
node agent_docs/impl/roadmap9/qualification/position-proof-evidence/comparison.mjs
```

전체 native consumer/acceptance matrix, 9개 최종 명령, 대규모 animation admission·실제 SLO,
최종 독립 검토와 보호된 최종 전달은 계속 남아 있다.
