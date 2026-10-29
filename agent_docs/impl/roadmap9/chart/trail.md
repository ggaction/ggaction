# Trail native vertical slice

## 진행 상태

- [x] structure-recipes와 기존 line/area/path 책임 경계 확인
- [x] 순수 screen-space ribbon 및 독립 literal·area·containment·boundary 시험
- [x] 실제 primitive 시각 및 공개 create/edit·핵심 consumer 연결
- [x] 브라우저·패키지·실제 데이터 최종 qualification
- [ ] polar/rose/radar/streamgraph/violin 기존 계약 감사
- [x] Current/types/docs/package와 Trail 공개 slice checkpoint

Gate는 [AUTHORIZATION.json](../AUTHORIZATION.json)의 remainingApproval에 따라 approved다. 공개 API·저장·시각 세부 선택을 기록하고 질문 없이 구현하되 완료 여부는 실제 증거로 분리한다. Trail 공개 slice는 구현됐으며 아래 합산 의무와 기존 variant 감사가 남아 STEP054 전체 완료가 아니다.

## 순수 geometry의 정확한 선택

`grammar/trail.js`의 `layoutTrailRibbon(samples, options)`는 이미 순서와 coordinate projection이 정해진 `{x,y,width}` 또는 명시 missing separator `null`만 받는다. input 순서를 바꾸지 않는다. line/area의 grouping·curve order·missing policy·polar seam은 이후 공개 adapter가 기존 owner를 공유한다. 한 strokeWidth로 trail을 대신하지 않는다.

각 segment의 양쪽 endpoint는 centerline tangent unit normal에 각 sample width/2를 더하거나 뺀 위치다. 기본 lineJoin:miter / lineCap:butt / miterLimit:4 / fillRule:nonzero. 기존 closed vocabulary와 path fill-rule owner를 사용한다. Miter는 두 tangent normal의 bisector 교점이며 ratio가 miterLimit을 넘으면 bevel이다. Inner join도 같은 유한한 limit을 적용하며 바깥 round join은 local width/2 원호다. End cap은 butt(끝점), square(local half-width 연장), round(local half-width 반원)이다. `fillRule:evenodd`도 동일 compound path의 공유 fill 계약으로 지원한다. 자기 교차는 자동 boolean union이나 topology repair를 하지 않는다.

현재 Path primitive는 M/L/C/Z이며 별도 A schema를 추가하지 않는다. Round geometry는 기존 `arcToCubicCommands`의 tolerance .25px, bounded subdivision·command budget을 재사용한다. 독립 circle containment/literal endpoint 검사로 확인한다. 모든 subpath는 한 compound path의 한 번 fill/opacity 대상이다.

연속 같은 좌표는 마지막 authored width를 사용하고 원 sourceIndices를 전부 보존한다. 정확180도 반전은 bisector가 없으므로 그 지점을 공유하는 두 capped subpath로 분리한다. 누락 separator는 연결하지 않는다. 단일 point는 butt일 때 면적0, square/round는 해당 local cap이다. width0 및 half-width underflow는 degenerate geometry로 남고 negative/nonfinite width와 좌표 overflow는 오류다. 원 samples·options를 변경하지 않으며 결과는 재귀 frozen이다.

입력 최대10000samples, 최종 Path 최대30000commands를 기존 owner로 제한한다. 누적 command 한도를 넘거나 round tolerance를 충족할 수 없으면 부분 결과 없이 거부한다. Bounds/paint/clip/renderer는 기존 concrete geometry owner를 후속 materializer가 소비한다.

## 다음 공개 연결

Full 전용 createTrailPlot/editTrailPlot의 group/order/position/width 및 appearance를 기존 path·scale·guide 역할로 연결한다. series identity와 row lineage를 유지하며 rescale/revise/Canvas/facet/selection/highlight/hit/accessibility/codec/offline4formats를 모두 검증한다. STEP050 exact final candidate admission은 최신 합산 owner를 사용한다. Basic 공개 액션을 늘리지 않는다. 현재 kernel export는 private module이며 package export map을 추가하지 않는다.

순수 checkpoint의 입력 hash·12개 수치/경계 시험·critical100/96.25/100·source/discovery27·package13 및 Node20/22/24 크기 실측은 [kernel evidence](trail-kernel-evidence/summary.json)에 고정했다. 이 파일은 공개 연결 완료를 뜻하지 않는다.

## 공개 후보와 승인 근거

remainingApproval의 전체 남은 공개 API·저장·시각 결정 승인을 그대로 적용한다. 별도 renderer schema를 늘리지 않고
기존 Path와 source-owned Text를 사용한다. 정확한 create/edit/저장 값은 [Current](../../../contract/current/TRAIL.md)의
단일 owner에 기록한다. 순수 원안대로 constant/field width, 기존9개 Cartesian curve, Polar linear projected path,
closed compound winding, typed group/member identity를 택했다. Basic action은 추가하지 않는다.

`examples/trail/program.js`가 브라우저·tutorial·slice의 정본이며 package는 별도 source-free 공개 consumer를 검증한다. 고정 좌표 x40→380,
y88/152와 sample폭8→32/28→12의 독립 면적6800 각각을 primitive로 작성했고 공개 출력과 exact 비교했다.
두 variant의 Canvas 호출·SVG문자열·동일실행 PNG/PDF decoded pixels, strict types5개 검사는 통과했다.
색/outline/shadow/blend, source-revise/computed width, selection/highlight/labels/hit, theme/reset, facet/nested/codec는
공개 owning11개와 순수/primitive 포함41개로 통과했다. 설치/browser/realdata 증거는 아래 qualification에 고정하며 전체 STEP054 감사를 대신하지 않는다.

050 shared `assertFacadeGuidesFrame`은 root의 최신 합산 owner가 final candidate 위치에 연결한다.
이는 guide fit 및 단일Y의 첫 child 사전검증 의무이며 현재 checkpoint의 미완료 통합 셀로 남긴다.


## 공개 slice qualification

Runtime source는 `fedc6a4b944057433c6d82f07b6cf00039d06391`이다. 신규 critical8개는
100/97.89/100이며 기존95/90/100 floor를 유지했다. 5개의 실제 데이터 테이블에서 원 values를 바꾸지 않고
명시 computed screen width와3recipe를 실행한16개 검사가 통과했다. Native Canvas/SVG/PNG/PDF의
독립 primitive/public pair와 strict types5개, Chromium2variants×DPR1/2가 통과했다.
같은 final tar `8526f0e987796de59cb5a7295cf283578ef6a7ad9b29e678d02dd580b13ddcbd`를
Node20/22/24에서 source-free 신규3cases·strict types·optional peers·5bundles로 검증했다.
Canonical staging1028파일과 archive bytes는 모두 동일하다. Source 이후 변경은 테스트 분모와
문서 provenance/증거뿐이며 최종 입력과 최초 실패는 [evidence](trail-evidence/summary.json)에 구분한다.

문서 최초198개 중 runtime와 무관한 provenance3개 실패는 sourcecommit후 canonical재생성하여
해당47개 owner를 통과했다. Final Jekyll179pages/1525 selective artifacts 및 실제 desktop/mobile
320/390/768px·keyboard·Axe 검증을 통과했다. 전체 coverage/corpus/installed sweep은 이 작은 slice에서
중복하지 않고 STEP074 합산 의무로 남긴다. 같은 semantic Y/frame의 최신050 사전검사 연결 역시 아래
기존 integration owner의 책임이며 현재 source가 그것까지 완료했다고 기록하지 않는다.
