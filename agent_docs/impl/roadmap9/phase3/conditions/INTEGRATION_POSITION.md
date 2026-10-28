# 조건부 인코딩 최종 통합

## 진행 상태

- [x] 위치·텍스트 구현 e62e9f38과 누적 image/paint/graph/hierarchy private 준비 통합
- [x] 전체 normal·실제 데이터·renderer·browser·설치·문서 검증
- [x] 원본 실패·재현 명령·hash와 source coverage 재사용 경계 고정
- [x] `a561ae1c` 통합 commit/push 및 main 반영, [STEP-016 progress](../progress/STEP-016.json) 고정

[구현 기록](POSITION_IMPLEMENTATION.md), [고정 evidence](evidence/integrated-position/manifest.json)를 따른다.
Source parent는 b758b912와 e62e9f38이다. 정확한 merge commit은 후속 STEP-016 progress에 기록한다.
기존 blend 설치 소비자와 새 position/text 소비자를 모두 보존하고 generated metadata는 합쳐진
canonical source에서 재생성했다. Native conditional source의 의미 충돌은 없었다.

| 검사 | 통과 결과 |
| --- | --- |
| 전체 normal | 7,100/7,100 |
| 실제 데이터 | 19/19; 512 MiB, concurrency2, pinned cache 명시 |
| Renderer | 284/284; approved226/review46 variants gallery 검증 |
| Browser | 305/305 |
| Installed | 동일 tar Node20·22·24 각각200 cases +7 groups |
| 독립 AT-18 입력 | 8 cases; expected/actual/diff 기록 |
| Docs | 150pages,1221LLM artifacts,desktop search,320/390/768 반응형 |

Tar SHA-256은 `e62af203eb6653118b651608c28a81345ff08ae10382024da0eae66535aa6031`이다.
Node20/24 최대 packed1,117,945bytes, unpacked5,159,396bytes,755entries를 실측하여
최소 ceilings1,118,000/5,160,000/755를 적용했다. Installed Node20 Full548,136/Basic324,895/SVG8,185gzip
bytes로 기존 browser ceilings를 유지했다. 처음 relative archive 경로를 쓴 설치 실패도 보존했다.

Conditional source의 전체 coverage는 e62e9f38의6,835개 시험과245critical floors 증거를 재사용한다.
통합 후 살아 있는 변경 runtime의 bytes는 regenerated action descriptor를 제외하고 모두 일치한다.
Fresh 통합 검사는 위 표와 같으며, 이 기록은 전체 통합 source의 coverage를 새로 실행했다고
주장하지 않는다. 전체 통합 qualification은 STEP-074와 최종 release에서도 수행한다.

Group/pathOrder는 ordinary topology action이 소유하고 조건부 data topology는 where filter가 소유한다.
조건부 API의 scalar 조건으로 그룹 구조를 암묵 변경하지 않는 현재 계약과7개 atomic structural
실행 증거를 보존한다. 기존 empty aggregate Bar 오류를 새 지원으로 해석하지 않는다.
이미 승인된46개 private visual은 각 public 기능 구현 때 stable owner로 이동하는 별도 후속 의무다.
