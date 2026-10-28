# Per-item blend 공개 연결

## 진행 상태

- [x] P1/P2 `06e9eba8` 및 사용자 포괄 승인 정본을 재사용
- [x] Point/Bar/Rect/Area/Arc/Text/Line/Rule/Tick의 기존 create/edit에 네 blend 값 연결
- [x] 단일 semantic intent와 명시 final mark-output, normal 제거 및 ordinary 동작 복원
- [x] 독립 native/browser 픽셀 및 공개/primitive 동일 출력, 실제 데이터 5개 × 3 recipes
- [x] shared policy·action·compositing과 final materialization/renderer의 정본 coverage floor
- [x] 전체 unit5,564/5,564, contracts734/735와 유일한 ledger 수정3/3, data/mark realistic14/14
- [ ] 지원 Node 설치 결과의 최종 기록
- [ ] 커밋한 canonical example을 가리키는 provenance와 최종 문서 증거
- [ ] P2 shadow와 Image/H/Partition의 남은 공통 paint 소비자 통합

이 체크포인트는 blend이며 STEP017 또는 Roadmap9 전체 완료가 아니다. 승인 정본은
[PUBLIC.md](PUBLIC.md)와 [PUBLIC_APPROVALS_20261028.json](../../PUBLIC_APPROVALS_20261028.json)이다.
앞선 outline/image/hierarchy 통합 `20fbe3819`에서 이어가며, 최신 관측 graph는 root가 별도로 합산한다.

## 공개 계약과 소유

새 action이나 package entry를 만들지 않는다. 9종 create/edit의 `blend`는 normal/multiply/screen/difference다.
Create 생략은 ordinary, edit 생략은 보존이고 normal은 semantic key를 제거한다. `grammar/markBlend.js`가
닫힌 mark/mode 정책, `actions/marks/blend.js`가 domain action에서 명시 호출하는 semantic 적용을 소유한다.
`materialization/markOutput.js`만 concrete non-normal mode를 최종 item에 쓴다. Style config에 중복 저장하지 않는다.

Non-normal glyph의 fill와 기존 stroke/outline을 먼저 합친 뒤 mark opacity를 한 번 적용한다. 그다음 owner clip과
blend를 수행한다. Normal은 기존 ordinary paint 동작을 복원한다. Path 하나는 하나의 item이고, Text는 실제 glyph와
multiline이다. 임의 series/group 합성은 추가하지 않았다. Labels/annotations/reference styles 및 Lollipop stem,
Dumbbell connector는 기존 Text/Rect/Rule style 객체를 그대로 사용한다. Basic은 기존 Point/Bar/Rect/Line 생성만 지원한다.

Canvas는 bounded isolated glyph, SVG는 concrete vector와 root isolation, PNG/PDF는 기존 native 경계를 재사용한다.
Renderer는 semantic state를 읽지 않는다. Inherited `blend`와 pure composite 옵션 getter는 실행하지 않으며 own-data
입력만 소비한다. Unsupported mode와 불가능한 Canvas source는 target clear/resize 전에 실패한다.

## 검증 범위

- `mark-blend` focused 회귀는 9종 create/edit/normal 복원, pending intent, 실패 원자성, 데이터 revision, Canvas resize,
  stable item identity, fresh editable codec, Basic, label/reference, conditional opacity/highlight, facet/repeat/concat을 검증한다.
- 대표 Point/Rect/Line/Text × 3 non-normal modes는 공개/primitive concrete·Canvas command·decoded PNG·PDF raster가
  정확히 같다. 기존 Bar와 승인된 native group numeric reference는 계속 독립 검증한다. Group fixture는 새 public group API의 증거가 아니다.
- Browser Canvas와 OffscreenCanvas는 독립 native literal glyph와, SVG는 독립 literal SVG와 정확히 비교한다. 이상적인
  straight-alpha 수치와 native premultiplied edge의 허용 오차는 기존 1byte 정책 그대로다.
- 실제 데이터 penguins/london-marathon/astronauts/us-births/chocolate-ratings의 3 recipes 각각에서 9종·4값을 실제 실행한다.
  Create/edit 동등, 원본 grain/identity, resize, codec, normal 복원, trace args를 검증했다. Option inventory witness도 추가했다.
- 마지막 own-read 수정 후 91/91 coverage: policy/action/compositing 100/100/100,
  markOutput 100/88.57/100, isolated 97.18/96.43/100, SVG 84.29/79.70/85.11. 여섯 정본 floor를 그대로 통과했다.
  이것을 전체 source coverage 재실행으로 표시하지 않는다.

## 최초 실패와 수정

첫 lifecycle 검사는 Rule 필수 quantitative range와 기존 conditional-opacity 지원 범위를 잘못 가정한 fixture를 고쳤다.
Tick create는 새 semantic blend를 appearance config에서 다시 읽어 undefined를 전달하는 실제 결함이 있어
blend를 config forwarding에서 제외하고 회귀로 고정했다. Renderer fixture의 Canvas scene API/host factory 입력도 실제
계약에 맞췄다. 기존 unsupported Point blend 기대는 새 지원 계약으로 바꾸고 invalid owner를 명확히 검증한다.

첫 realistic 실행은 명시 cache 경로 누락, 다음 실행은 aggregate Bar의 불필요한 explicit orientation fixture로 실패했다.
Canonical runner와 pinned cache를 사용해 15/15 통과했다. 기존 data/mark 전체14/14도 실제128개 option path witness를 통과했다. 최초 docs 검사에서 Related 위치·새 snippet 등록·잘못된 상대
링크를 고쳤다. 아직 커밋되지 않은 canonical example의 source-ref 실패는 커밋 후 provenance 검증으로 닫는다.
승인 native slice를 stable `test/charts/bar-compositing/variants/native/`로 옮긴 뒤 baseline ledger를 재생성했다.

## 크기와 설치

신규 source owner 2개 때문에 package entries 794→796, unpacked 실측 5,417,405bytes로 cap 5,411,000→5,418,000만
조정했다. Node22 packed 1,176,024bytes는 기존 1,178,000 이내였으나 Node20의 1,178,070bytes가70bytes를 초과해
packed cap을1,179,000으로 올렸다. Full/Basic gzip Node22는580,617/342,310bytes, Node20은581,372/343,054다.
Full582,000은 유지하고 Basic343,000을54bytes 초과하여344,000으로 최소 조정했다. 추가 supported Node와
동일 archive 설치 결과는 최종 evidence에 보존한다.

새 BlendMode union으로 증가한 세 compact card만 최소 cap을 올렸다. ReferenceBand 3,732→3,740,
MarkLabels 3,988→3,990, Annotation 3,982→3,990bytes이며 전체 median 2,034, max 4,681bytes다.
기존 median 2,070 한도와 다른 card 한도는 유지한다. 최초 측정 실패를 버리지 않는다.

## 남은 의무

Shadow는 실제 glyph alpha와 공통 image payload, 준비된 명시 font identity를 연결해야 한다. 모든 네 renderer의
공개 준비/호출 경로, stale/dispose/restore 재준비, blur/offset/clip과 source opacity 1회 증거가 필요하다.
Text bounds 사각형으로 glyph를 대체하거나 전체 chart를 rasterize하지 않는다. Image/H/Partition의 적용 가능한
paint 소비자는 각 owner와 합산하고, STEP047–049와 전체 STEP077 목표는 열린 상태로 유지한다.

전체 unit는 마지막 own-read 경계 수정 전에 시작했다. 해당 여섯 owner는 수정 뒤 fresh coverage91개와
getter 회귀14개를 별도로 실행했으므로, 전체 suite를 최종 source hash에서 다시 실행했다고 주장하지 않는다.
Node22 source-free213/213 및6개 qualification은 통과했고, 새로 허용한 createBar blend를 금지하던 옛 타입
fixture만 실패했다. 그 expectation을 실제9종 계약으로 바꾼 뒤 같은 설치 디렉터리의 tsc가 exit0으로 통과했다.
