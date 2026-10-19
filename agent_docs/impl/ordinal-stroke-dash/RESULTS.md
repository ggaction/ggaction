# 순서형 StrokeDash 검증 결과

## 진행 상태

- [x] 기존 categorical validator와 path policy로 ordinal 필드 지원
- [x] 공개 타입·계약·action cards·사용자 문서·생성 산출물 동기화
- [x] 단위/타입 16개, 전체 일반 검사 4,777개, 문서 검사 120개 통과
- [x] 생성 문서 150개와 검색·접근성·키보드·320/390/768px 표시 검사 통과
- [x] packed package의 Full/Basic 실제 runtime 및 TypeScript 소비자 검사 통과
- [ ] 정기 배포 checkpoint 1,413개에서 통합·배포 후 이슈 종료

기존 encodeStrokeDash의 fieldType에 ordinal을 허용한다. 생략 기본 nominal, 명시 domain/range,
원본 raw 타입·행 순서, 상수 모드, series 단일 appearance 및 immutable 실패 정책은 그대로다.
새 option key나 action을 추가하지 않았다. createLinePlot·encodeChannels·rule·기존 Basic 경로도 검증했다.

같은 명시적 domain/range의 nominal과 ordinal은 graphic/SVG, DPR1/2 decoded RGBA 및 PDF의
decoded stream이 정확히 같다. Plot 내부 실제 잉크 픽셀은 각각 434/1,736개다.
기존 문서 프로그램 95개의 PNG/thumbnail 190개도 이전 후보 commit과 byte-exact다.
새 시각 목표는 없으며 이미지는 열어보지 않았다.

패키지는 로컬 후보 ggaction@0.0.21이며 npm 공개 배포가 아니다. 602개 항목,
851,062 packed bytes, 4,124,739 unpacked bytes로 기존 한도를 통과했다.
학교 모델 호출/토큰은 0이며 번역용 공개 runtime과 immutable snapshot은 바꾸지 않았다.
이슈 #233은 정기 배포에서 통합될 때까지 열어 둔다.

검증 로그의 SHA256, renderer/hash/패키지 증거는 [RESULTS.json](RESULTS.json)에 있다.
초기 테스트 기대값 오류, Ruby 경로 및 상대 pack 경로 실패 기록도 덮어쓰지 않고 보존했다.
실제 라이브러리 동작을 잘못된 테스트 기대값에 맞춰 바꾸지 않았다.
