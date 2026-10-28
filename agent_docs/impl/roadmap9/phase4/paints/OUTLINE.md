# P2 외곽선과 halo 공개 연결

## 진행 상태

- [x] P2 `06e9eba8` 및 outline primitive `ca064947`의 기존 승인 재사용
- [x] 기존 Point/Bar/Rect/Arc/Area/Text create/edit의 outline 연결
- [x] 명시 materialization, 저장/복원, 조건부 appearance, 가이드/선택/구성 소비자
- [x] 공개 8 variants와 primitive의 concrete 값·명령·동일 실행 픽셀 일치
- [x] 5 pinned datasets × 3 recipes와 직접 옵션 126 paths 감사
- [x] 영향 owner 9개의 canonical coverage floor, source-free 설치 및 문서 검증
- [ ] Filled/text/line 계열 blend 적용 범위 확장
- [ ] 공통 image payload와 실제 glyph mask를 사용하는 shadow 공개 연결

이 체크포인트는 P2의 외곽선 부분이다. P2·STEP017·Roadmap9 전체는 미완료다.
정확한 공개 계약은 Current MARKS의 `Pre-fill outlines and halos`와 PRIMITIVES가 소유한다.
별도 halo alias나 새 action은 추가하지 않는다.

## 구현 경계

`grammar/markOutline.js`가 닫힌 `{color,width}`를 검증하고 외부 입력을 복사한다. 기존 mark config를
읽는 `materialization/markOutput.js`가 각 domain action의 마지막 명시 materialization에서 concrete
outline을 적용한다. Renderer는 graphicSpec만 소비하고 semantic 의미를 재계산하지 않는다.

기존 stroke authoring/encoding 결과는 concrete와 config에 보존한다. Outline이 최종 edge를 소유하는
동안 기존 stroke는 그리지 않으며 `outline:false`에서 정확히 복원한다. 같은 호출에서 active outline과
명시 non-false stroke를 함께 주면 원자적으로 실패한다. Width0도 저장하지만 contour 호출은 생략한다.
Selection의 명시 stroke highlight는 잠시 outline을 제거하며 selection 제거 뒤 기존 outline을 복원한다.

Text는 기존 line origin·rotation과 실제 strokeText/fillText glyph를 사용한다. Glyph를 bounds rectangle으로
대체하지 않는다. 부분 opacity는 stroke와 fill을 합친 glyph에 한 번 적용한다. Native 글꼴의 overhang도
보존하도록 기존 isolated owner의 visible frame에 실제 glyph를 그린다. SVG는 vector text stroke/fill,
PNG/PDF는 기존 Canvas 출력 경로를 사용한다. 부분 opacity PDF는 bounded glyph image를 포함할 수 있다.

Point packing/jitter는 기존 stroke 폭 대신 최종 outline 폭을 사용한다. Labels/legend/selection bounds는
동일 concrete edge를 읽는다. 자동 fill/shape 범례는 outline을 상속하며 stroke-channel 범례는 encoding의
의미를 유지한다. Text/Rect 옵션을 이미 전달하는 labels/annotation/reference bands도 동일 값과 검증을 쓴다.

## 증거와 소비자

| 소비자 | 검증 |
|---|---|
| Full/Basic, create/edit | Full 6 filled owners, Basic의 기존 Point/Bar/Rect 경계, omission/false/0, 입력 불변성 |
| revision/conditional | data·scale·canvas·parameter 재계산, 조건부 fill/opacity와 Text 내용/위치 교차 |
| selection/guide/labels | identity/원본 row grain 유지, 강조 제거 복원, 범례 contour, point packing/jitter |
| facet/repeat/concat | 복제와 이동 뒤 concrete 효과·lineage·editable source 유지 |
| codec/scene | editable/graphic 재로드, malformed stored owner 거부, graphic-only Canvas scene |
| Canvas/SVG/PNG/PDF | 8 공개 variants의 정확한 primitive pair와 독립 native/browser literal 표본 |
| declarations/package | MarkOutline과 Text stroke details, source-free Full/Basic와 fresh-process codec |
| realistic | 5 pinned datasets × 3 recipes, 각 2 owners × white/zero/false; direct inventory 126 paths |
| docs | 실제 공개 프로그램과 같은 문서 이미지, 실행 가능한 Text snippet, source/built/browser 검사 |

공개 source는 `examples/mark-outlines/program.js`, 실행 slice는 `test/charts/mark-outlines/`다.
승인된 별도 native oracle은 `variants/native/`로 승격했다. Public/ggaction primitive pixels는 정확 일치한다.
독립 native stroke+fill baseline의 부분 opacity는 기존 premultiplied 변환에 따라 최대1byte 차이를 허용하며,
opaque 결과는 exact다. Browser glyph는 browser에서 독립적으로 그린 oracle과 비교한다. 서로 다른 native와
browser 글꼴 raster edge가 같은 픽셀이라고 주장하지 않는다. 고정 font hash와 interior expected colors를 별도 보존한다.

전체 unit 실행은 5412/5414였다. 실패2건은 Text lineJoin/lineCap을 미지원으로 가정한 이전 기대값이며,
새 지원 범위를 반영한 뒤 해당 입력을 포함한 focused24/24가 통과했다. 전체 contracts 실행은711/716이었다.
실패5건은 새 차트의 variants 폴더/primitive assertion/baseline ledger/public inventory와 Text lineJoin 타입
기대값이다. 해당 입력을 직접 수정하고 관련 계약·차트·discovery 검사를 통과했다. 전체 검사를 다시 실행한
것으로 표현하지 않는다. Runtime source는 이러한 테스트/증거 정리 전에 동결되어 있다.

Coverage는 전체 저장소 완료 주장이 아니다. 136 focused tests로 영향 owner9개의 기존 canonical floor를
모두 통과했다. Aggregate line94.49/branch88.74/function100%, 새 grammar/Canvas outline owner는 모두100%다.
상세 원 로그·파일 hash·실행수·package 결과는 `outline-evidence/manifest.json`이 소유한다.

## 패키지와 실행 환경

새 책임 owner2개로 packed entry는761→763이 되었다. 기존 entry cap 실패는 보존한다.
Canonical staging Node22 packed1,129,103/unpacked5,212,872bytes이며 Node20/24 packed1,131,929bytes다.
따라서 cap은763/1,132,000/5,213,000으로만 조정했다. Raw npm pack의 비압축 knowledge 측정은 canonical
artifact qualification과 구분한다. Full/Basic gzip은 Node22 555,609/332,357, Node20 556,491/333,073bytes다.
Cap은557,000/334,000, SVG25,000은 유지한다. 이전 한도가 통과했다고 기록하지 않는다.

세 지원 Node는 동일한 archive SHA256 `56357b832921cd551dd4026795f3d7b05ef8998a67b81cfe1d390d3f4131fc26`를
소비한다. 최종 실행 결과와 Node24 측정은 evidence에 기록한다. 로컬 패키지 검증은 publish/deploy를 뜻하지 않는다.
문서 환경은 Ruby3.2와 Node22를 사용한다. 기본 shell Ruby2.6의 preflight 실패도 원 로그로 남긴다.
