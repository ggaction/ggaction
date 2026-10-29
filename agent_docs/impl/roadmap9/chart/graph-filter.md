# 그래프 필터 소비자 통합

## 진행 상태

- [x] 기본 induced view와 제거·갱신·복원
- [ ] 명시 recompute와 inference revision
- [x] 기본 보기의 선택·접근성·렌더러·설치 소비자 검증

[남은 계획 전체 승인](../AUTHORIZATION.json)을 적용한다. 이 기록은 구현 완료 증거가 아니다.

## 기본 보기 결정

기존 `filterMarks`와 `removeMarkFilter`가 graph plot도 받는다. 선택 조건은 node item에만
적용하며 양 끝 node가 남은 edge만 표시한다. 자기 연결·병렬 edge·arrow·label은 원 identity와
geometry를 그대로 유지한다. Graph/layout resource, 전체 graph degree, 자동 origin은 변하지 않는다.

`materializationConfigs.marks[id].graphPlot.view.selectors`가 순서 있는 normalized selector recipe의
단일 owner다. 기존 필터와 같은 replace/compose/idempotence 규칙을 사용하며 source revision,
layout/paint/Canvas 변경 때 domain materializer가 명시적으로 다시 평가한다. Property 조건은
highlight 이전 node body의 concrete 값을 읽는다. Rows 조건은 node의 정확한 원본 lineage를 읽고
edge-only dataset을 거부한다. Node item grain만 허용하고 빈 결과도 유효하다.

새 graph/layout로 plot을 rebind하면 같은 recipe를 새 node items에 적용하며 유효하지 않은 field는
preflight에서 거부한다. 필터 제거는 recipe를 삭제하고 전체 plot을 다시 만든다. 다른 plot이나
graph source는 바꾸지 않는다. Renderer는 여전히 완성된 graphicSpec만 읽는다.

## 다음 소비자 경계

`recompute: true`는 필터된 source로 명시 inference revision을 만드는 별도 후행 구현이다.
기본 view checkpoint만으로 이 요구나 STEP-032 완료를 주장하지 않는다. Controller의 사라진
selection drop/orphan event 역시 후행 controller 통합 의무다.

## 기본 보기 source 검증

Node20/22/24 각각63개, 신규 owner3개의 집중 coverage24개(줄100%, branch98.39%, 함수100%),
source/package/discovery 경계36개가 통과했다. 실제 dataset5종과 knn/MST/sequence3종의15개
검증에서 정확한 node/edge identity와 제거 후 복원을 확인했다. 같은 고정 geometry의 public/primitive
PNG·PDF8개 및 Browser Canvas/SVG DPR1/2가 통과했다. 기존 공용 browser host의 bare package
import 누락은 import map으로 연결하고 재검증했다. 생성한 induced 이미지도 직접 확인했다.

Source3개 추가로866entries, unpacked5,807,352bytes다. Canonical staging packed는
Node22 1,259,887, Node20 1,262,438bytes였고 설치 bundle은 Node20 Full635,805/Basic360,127gzip이다.
따라서 cap866/1,263,000/5,808,000 및636,000/361,000으로 최소 단위 조정했다. 초기 초과와
실측을 [검증 기록](graph-filter-evidence/summary.json)에 보존한다. 최종 고정 archive는 README
ceiling 한 자리 수정 뒤 별도 생성했으며 hash/크기는 같은 기록에서 구분한다.

Source revision은 `525cf6276`이다. SHA256
`55c2aae8a0f6917d51c69afcda206482d7fd510df041426cb5823ff96131dbb5`인 동일 archive로
Node20/22/24 각각 runtime228, tutorial81, qualification7개를 통과했다. Docs177개,
Jekyll160pages/1390selective artifacts 및 desktop search와 전체 페이지320/390/768px 검사도 통과했다.
전체 suite를 다시 실행했다거나 STEP-032가 완료됐다는 의미가 아니다. Explicit recompute와
controller orphan/drop은 위 미완료 항목으로 유지한다.
