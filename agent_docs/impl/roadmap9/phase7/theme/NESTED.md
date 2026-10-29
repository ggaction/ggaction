# STEP-035 중첩 패싯과 공유 가이드

전체 승인 `b758b912`를 재사용한다. 새 공개 API/저장 형식은 추가하지 않는다.
기준은 STEP034 `9e2179cd1` 및 source union Calendar `c96637495`를 합친
`ed369db83`이다. 기존 occupied topology, ragged footer, header, ancestor snapshot
소유자를 재사용하며 현재 문서 COMPOSITION의 responsive nested reflow가 동작을 소유한다.

## 최초 실패와 구현

1. native point와 함께 존재하는 resource-only inferred graph를 facet하면 새 derived
   dataset logicalId를 same-source revision으로 취급해 거부했다. 독립 projection 권한은
   exact receiver/args, current previous/next refs 및 모든 graph/layout dependent 결과를
   검사한다. 같은 source의 후속 revision 권한을 넓히지 않았다.
2. responsive pass가 shared 0–40000 domain을 각 cell의 0–4, 0–40 등의 domain으로
   다시 추론했다. 이미 해결한 domain을 임시 context로 유지하고 range만 다시 계산한다.
   Font apply/remove, inherited theme, empty grid도 같은 작은 owner를 재사용한다.
3. child candidate scale 준비가 임시 개별 axis labels까지 측정했다. candidate 단계는
   scale plan만 실행하고 최종 공유 범위가 정해진 뒤 guide layout을 수행한다.
4. 준비된 폰트와 회전 header가 top=-8.9e-16 경계 때문에 거부되었다. 기존 responsive
   containment와 같은16ULP 경계 허용을 사용하고 실제 교차 판정은 유지한다.
5. 읽기 전용 layout 측정이 intrinsic legend scratch에서 theme completion을 재실행했다.
   기존 facetLegendIntrinsic scope를 존중하여 부모만 theme reflow를 소유한다.

## 소비자와 검증

- 기존 관련 단위538/538, 추가 capability19/19, 영향 계측588/588.
- 기존 observed graph 보충40/40으로 모든 영향 critical floor 충족. 새 domain context는
  lines/branches/functions100/100/100. 전체 source coverage라고 주장하지 않는다.
- source/discovery/package/coverage 계약34/34, 실제 staged package check통과.
- 공개 primitive/Canvas calls/SVG/scene/program+graphic codec1/1.
- Node PNG/PDF primitive pair2/2, browser Canvas/SVG DPR1/2 pair1/1.
- 3행 공통 header x/plot column/footer y, 독립bar높이43.7, 공통domain0–20,
  10cell 중5empty, sourceresize/revise/theme/font, 실패 receiver/trace 동등성을 확인한다.
- declarations: 기존 API만 사용하므로 변경 없음. 새 source-free installed3case와 기존
  TypeScript/4browserbundles/optionalpeer검증을 최종 archive에 대해 수행한다.
- AT21은 이 capability가 소유한다. 원안의 AT20 closureTask는 STEP035다. 현재 병렬
  분담에서 single-Y admission을 STEP050 소유자가 구현하며, 그 결과를 합친 최종 인수
  검증까지 AT20과 STEP035 전체 종료를 열어 둔다. 원안의 closure 위치를 변경하지 않는다.

## 실행 기록 상태

Source `fbc2bd66f2c9e95013334c45427b4628e399070c`의 runtime/primitive와 최종 문서
source/built/browser, 동일 archive의 Node20/22/24 설치 검증을 완료했다.
정확한 범위·결과·남은 인수 조건은 [NESTED_COMPLETION.md](NESTED_COMPLETION.md),
실행 로그와 hash는 [nested-public-evidence/summary.json](nested-public-evidence/summary.json)에 있다.
첫 docs source검사의4실패는 미커밋 예제 source link1, search한도2,
두 번째 contextual snippet 미등록1이었다. snippet은 실행 가능한 canonical flow와
함께 inline scoped 호출로 정리했다. 초기 coverage588은 테스트 전부 통과했으나
observed-graph 기존branch를 선택하지 않아 graphresources75%였다; 보충40에서96.77%.

파일prefix를 일반 runner selector로 전달하면 매칭되지 않는 점을 확인해 이후
capability:responsive-layout로 선택했다. baseline integration51은 selection/Calendar
범위이며034 회귀로 세지 않는다. 실제034 capability를 포함한538 및588은 통과했다.
