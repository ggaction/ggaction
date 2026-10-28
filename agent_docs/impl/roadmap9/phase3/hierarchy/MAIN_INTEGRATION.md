# Hierarchy branch와 main 동기화

## 진행 상태

- [x] Main `72855612447cf391defdbf6a121a26cc503bb9ce`를 hierarchy branch로 merge
- [x] 최신 parameter/computed-v2/prepared-data와 기존 statistics 동작 보존
- [x] Hierarchy/graph/Gate79·numeric/statistics39·boundary40·render5 통과
- [x] 승인된5개 primitive의 source/reference/PNG hash 정확히 유지
- [x] Combined artifact 및 installed Full/Basic bundle 실측
- [ ] Hierarchy/layout 공개 연결과 전체 consumer 완료
- [ ] STEP-020·STEP-021·STEP-077 전체 완료

Base hierarchy는 approval 기록 `381711d6`, main은 위 exact revision이다. 실제 runtime source 충돌은 없었다.
Coverage family 등록과 package limits 두 파일만 충돌했으며 두 branch의 해당 capability를 모두 보존했다.
Graph family 이름은 다른 graph 담당자와 맞추어 `graph`, prefix `grammar/graph/`,95/90/100이다.
Hierarchy95/90/100 및 main의 source 준비/grammar/action/state/context floor도 모두 유지했다.

검사는 `.artifacts/validation/hierarchy-main-merge/`에 보존한다.

| 명령/증거 | 결과 |
| --- | --- |
| `node scripts/run-tests.js all capability:hierarchy capability:graph` | 79 passed |
| numeric sums/summary/capacity/LOESS degree/pivot/calendar lifecycle focused | 39 passed |
| discovery/source/package-boundary/artifact contracts | 40 passed |
| Tree/treemap5종 focused render | 5 passed |
| `node scripts/check-hierarchy-primitives.js`와 승인 receipt 비교 | 5개 source/reference/PNG hash 모두 동일 |
| `npm run package:check` | 710 entries,1,056,936packed /4,907,846unpacked bytes |
| `npm run package:bundle` | Full527,077 /Basic304,914gzip bytes; 기존 main bundle 제한 통과 |

Private hierarchy7개와 graph2개 source가 main701-entry artifact에 더해져710개다.
기존701-entry cap 실패를 보존했다. Packed cap1,061,000bytes는 실측값에 main에서 이미 확인한
CI pack variation4KB를 유지한 뒤1KB 경계로 올린 값이다. Unpacked cap4,908,000bytes는 실측 최소1KB 경계다.
Source2개였던 graph 단독 branch의 이전 cap을 main 위에 그대로 덮지 않았다.

현재 공개 액션은 아직 추가하지 않았다. 원안에 명시된 `createHierarchyData`, `editHierarchyData`,
`layoutHierarchy`, `editLayout`, `removeResource`의 기존 승인 범위와 새 tree/treemap plot facade의
미지정 public 설계를 구분한다. 새 facade는 별도 검토안을 먼저 고정한다.
