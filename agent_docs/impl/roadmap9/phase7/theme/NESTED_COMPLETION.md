# STEP-035 중첩 반응형 합성 검증

## 진행 상태

- [x] 기존 전체 승인 `b758b912`와 STEP034·Calendar source union 기준 보존
- [x] resource-only graph의 facet projection 권한과 전체 dependent result 검증
- [x] shared/independent domain·빈 cell·긴 header·공유 legend의 명시 reflow
- [x] resize/source revision/font apply-remove/theme 뒤 ancestor snapshot 갱신
- [x] literal primitive, native Canvas/SVG/PNG/PDF, browser Canvas/SVG DPR1/2
- [x] Current·공개 예제·문서·동일 artifact Node20/22/24 설치 검증
- [x] AT21의 3행 full-bounds·긴 label·정확 text metrics 인수 조건
- [ ] 원안 STEP035 closure인 AT20 전체: STEP050 single-Y admission 합산 검증

검증 대상 source는 `fbc2bd66f2c9e95013334c45427b4628e399070c`다. 새 공개 action,
option, persisted schema, renderer 책임을 추가하지 않는다. 구현 근거는 [NESTED.md](NESTED.md),
현재 동작은 [COMPOSITION.md](../../../../contract/current/COMPOSITION.md#responsive-nested-reflow)가
소유한다. 이 체크포인트는 중첩 합성과 AT21을 검증하며 AT20 또는 Roadmap9 전체 완료가 아니다.

## 확정된 동작

기존 same-source 후속 revision은 그대로 엄격하게 검사한다. Facet의 새 logicalId는 별도
private projection 권한으로 구분하며 exact receiver/args, 현재 previous/next ref,
모든 graph/layout dependent 결과를 함께 검증한다. GraphPlot facet 지원을 추가한 것은 아니다.

공유 scale domain은 명시 layout 동안 임시 context로 전달하고 range만 재계산한다.
이 권한은 중첩 호출과 오류 뒤 원래 context로 복원된다. 빈 cell, 독립 domain, 폰트 profile,
scoped typography와 inherited theme도 같은 owner를 재사용한다. Renderer와 persistence는
solver·provider를 실행하지 않는다. 최종 plot bounds owner는 기존 `resolveGraphicBounds`다.

독립 literal target은 1047×942 Canvas의 3행 패싯과 overview다. 공통 header x,
column plot 정렬, ragged footer y, shared domain 0–20 및 첫 막대 높이43.7을 수치로
확인했다. 0–40000 shared domain과 10개 중5개 빈 grid cell도 별도 회귀로 검사한다.
원본 프로그램·trace 보존, childPath/item identity, program/graphic codec과 scene endpoint를
검사했다. 새 async owner가 없으며 기존 준비·renderer adapter를 그대로 사용한다.

## 검증 결과

- 관련 단위538/538, 최종 capability19/19, 영향 source 계측588/588.
- 기존 observed graph 보충40/40을 합쳐 해당 critical floor 충족. 새
  `facetScaleContext.js`는 lines/branches/functions100/100/100이다.
- source boundary/discovery/package/coverage policy34/34 및 공식 package check 통과.
- literal primitive/public 그래픽·native calls·SVG·scene·codec1/1,
  PNG/PDF pair2/2, Chromium Canvas/SVG DPR1/2 pair1/1.
- docs source184/184, build 성공, built168 pages/1433 LLM artifacts,
  desktop search 및 전체 페이지320/390/768px containment 검사 통과.
- 동일 tar Node20.20.2/22.23.1/24.22.1 각각 신규 runtime3/3 및
  optional peer·runtime·types·Full/Basic/SVG/interaction bundle7/7 통과.

위 수는 서로 중복되는 실행 범위이므로 합산해 고유 테스트 수로 표시하지 않는다.
전체 normal/coverage/realistic를 반복한 증거가 아니다. 변경된 owner의 회귀와 critical
floor만 닫았으며, 공통 realistic 세 파일의 최종 합산은 root integration이 소유한다.
AT21은 원안상 특정 corpus source ID를 요구하지 않는다.

## Artifact와 최초 실패

최종 tar SHA256은 `dedfe6a1272818635f90254a6c2e74a14e650eba93b56aa185adc96d65479eb7`다.
934 entries, packed1,339,188 bytes, unpacked6,149,683 bytes다. 세 Node 모두 이 파일을
설치했다. Node20/24의 별도 pack 실측 최고1,341,753 bytes를 포함하여 한도는
934/1,342,000/6,150,000이다. Source bundle 실측 최고 Full667,284/Basic374,685 bytes는
기존668,000/375,000 한도 내다. 최종 tar의920개 runtime/type entry가 현재 source와
기존 canonical compaction 정책을 적용한 byte hash에 정확히 일치한다.

초기 shared-domain 재추론, temporary font query, header 경계 잔차, intrinsic legend의
theme 재진입 실패를 통과 로그로 덮지 않았다. Manifest의 최종 hconcat trace 누락,
test inspection import, capability 정렬, uncommitted example Git link, search 한도,
추가 contextual snippet의 등록 오류도 별도로 보존했다. 588개 실행은 테스트는 모두
통과했지만 기존 observed graph branch를 선택하지 않아 floor 검사에서 실패했다.
동일 source의 기존40개 보충 실행이 graph resource100/96.77/100을 입증한다.

Baseline의51개 integration 실행은 responsive 파일 prefix가 selector로 매칭되지 않아
selection/Calendar만 검사했다. 이를 STEP034 증거로 세지 않으며 후속538/588은
`capability:responsive-layout`로 실제 파일을 선택했다.

로그·명령·consumer matrix·입력 hash는
[nested-public-evidence/summary.json](nested-public-evidence/summary.json)에 보존한다.
Source commit 이후 변경은 문서 provenance와 검증 기록뿐이며 runtime/types/tests/scripts
delta는 없다. 원격 source ref를 사용한 최종 docs build/browser 결과를 그대로 보존한다.
