# Hierarchy 공개 연결 구현

## 범위와 승인

`928fba48`의 공개 API·저장 경계 승인, `ec048461`의 tree 3종·treemap 2종 시각 승인과
`PUBLIC_APPROVALS_20261028.json`의 사용자 전체 승인 범위를 재사용한다. 새 승인 요청은 없다.
현행 계약은 [HIERARCHY](../../../../contract/current/HIERARCHY.md), 공개 설명은
[Hierarchy resources and plots](../../../../../docs/api/hierarchy.md)가 소유한다.

공개 9개 action은 hierarchy 생성·편집, layout 생성·편집, stored resource 제거와 tree/treemap
생성·편집이다. 내부 `materializeTreePlot`·`materializeTreemapPlot`은 각각 concrete graphics를
만드는 wrapped child다. Public direct-child 관계에는 실제 child만 기록하며 내부 action을
거쳐 실행한 primitive를 직접 호출한 것처럼 기록하지 않는다.

## 소비자 행렬

| 소비자 | 확정 동작 | 실행 증거 |
|---|---|---|
| 입력·정렬·값 | flat/nested/groups, typed key, forest, 세 value 정책, 명시 sibling order | hierarchy grammar 및 resource unit |
| 레이아웃 | tree vertical/horizontal/radial, partition interval, treemap slice-dice/squarify | 독립 수치 oracle와 저장 결과 검증 |
| 위치·guide | 기존 x/y scale과 axis를 새로 추론하지 않음. 저장 layout 좌표와 명시 origin을 사용 | 승인 chart 계약, plot unit |
| appearance·labels | 공개 plot editor, typed override, dormant style, 명시 label text | plot/validation unit |
| 선택·강조 | body와 label은 같은 node identity, link는 구조 요소, 실제 원본 membership | plot/consumer unit |
| source revision | raw/computed/parameter→hierarchy→layout→plot을 명시 action으로 갱신 | resource/plot unit 및 기존 DATA regression |
| composition | concat namespace 분리, complete-subtree facet, 유일한 live logical ancestor | consumer 및 facet-source-identity unit |
| repeat | 임의 positional field 역할이 없어 명시 부적격 오류 | consumer unit |
| 삭제 | live plot·authored dependent를 보존, mark 삭제 후 layout/hierarchy 순서로 제거 | resource/installed lifecycle |
| inspection·accessibility | 원본 row와 node 수, layout/H/data refs, orphan·synthetic·zero-total 진단 | consumer unit |
| 저장·복원 | exact refs 및 숫자 결과 검증, 알고리즘·host I/O 미실행 | resource tamper unit 및 fresh-process installed |
| Canvas/SVG/PNG/PDF·scene | 기존 concrete path/circle/rect/text만 읽음 | 5개 primitive/public PNG pair 및 installed renderer case |
| Full/Basic | Full에만 9개 action과 H/layout handler 등록 | types/installed boundary |
| 실제 데이터 | pinned 5종 × 3개 구조, 모든 공개 action에 5개 direct dataset witness | realistic-hierarchy-lifecycle 16/16 |

원본 nested source는 실제 member path를 유지한다. Forest synthetic root는 source contribution이
빈 배열이고 selection/override 대상이 아니다. 복원은 저장 topology·value·geometry를 검증하며
계산 결과를 다시 만들지 않는다. 실패한 revision은 이전 program과 trace를 바꾸지 않는다.

## 통합 경계

공통 registry와 prepared result/revision owner는 각각 선행 checkpoint와 `d6263c2e`에 분리했다.
Graph와 H가 layout kind를 공유할 때 정확히 한 `graph` 또는 `hierarchy` 입력으로 판별한다.
최종 `materialization/layoutState.js`의 닫힌 dispatch와 Full 등록 map 합성은 통합 담당이 소유한다.
H selector 및 갱신 계획은 method뿐 아니라 input.kind가 hierarchy인 layout만 소비한다.
별도 persisted discriminator나 공개 registry를 추가하지 않는다.

STEP025–028 partition view/focus/bend는 이 checkpoint의 tree/treemap 완료와 구별하여 후속으로
계속 구현한다. 전체 STEP077 완료를 이 기록으로 주장하지 않는다.

## 검증 원본과 크기

현재 검증 원본은 `.artifacts/hierarchy-*.log`, `.artifacts/consumers/`,
`.artifacts/validation/hierarchy-primitives/`, `.artifacts/size-study/hierarchy-public/`에 보존한다.
최종 통과 목록과 입력 hash는 checkpoint 완료 시 별도 receipt에 기록한다.

동일 staging tar와 동일 minified browser bytes를 Node20.20.2/22.23.1/24.22.1,
npm10.9.8에서 측정했다. 767 entries, unpacked 5,259,004 bytes, packed 최대 1,139,047 bytes다.
Browser 최대 gzip은 Full 566,357, Basic 330,313, SVG 8,185 bytes다. Package 한도는
767/1,140,000/5,260,000, browser Full/Basic는 567,000/331,000으로 최소 1,000-byte 단위만
조정하고 SVG 25,000은 유지했다. Search index는 886,377 bytes로 887,000의 bounded ceiling을
사용한다. Coverage의 기존 global/critical floor는 낮추지 않았고 새 H action/materialization
owner에 기존 H grammar와 같은 95/90/100 floor를 자동 적용한다.
