# Image 및 Geo의 남은 소비자 근거

## 범위

기존 [남은 설계 승인](../AUTHORIZATION.json)과 root의 후속 consumer 감사 지시를 재사용했다. Current `CORE`/`MARKS`/`GEOMETRY`/`ACCESSIBILITY`/`INTERACTION`/`ANIMATION`을 실제 실행 owner와 대조했으며 새 API·runtime·숫자 정책·shared animation owner·공개 타입·문서를 변경하지 않았다.

- Image: `source-revise`, `hit`, `scene-animation`, `docs` 4셀.
- Geo Shape/Point/Line: `docs`, `accessibility` 각 2셀.
- Graticule: `source-revise`, `docs`, `accessibility` 3셀.

합계 13셀만 새로 배정했다. root의 최신 integration에서 이미 배정한 다른 Image/Geo/설치 패키지 owner 및 Image 3 N/A는 후속 병합 때 그대로 보존한다. 이 브랜치의 오래된 미배정 셀로 덮어쓰지 않는다. 분모·그룹·requiredConsumers·결과는 바꾸지 않는다.

## 실제 근거

### Image

기존 retained resource 교체 시험이 새 bytes/hash/dimensions와 revision 1을 모든 live image binding에 적용하고, stable item key·선택·opacity highlight·원본 revision 0·codec를 검증한다. Image에는 dataset 행이 없으므로 source revision은 그 native `replaceImageResource` 수명이다.

새 native session 시험은 viewport와 추가 clip 교집합의 내부/외부 literal 좌표를 검사한다. 중첩 concat의 두 자식은 서로 다른 namespaced item key를 갖고 정확한 `image:logo@0` resource ref와 빈 row keys를 보고한다. Opacity 0은 hit되지 않는다. Pixel-alpha hit를 새로 지원한다고 주장하지 않는다.

새 native Image→Image plan은 `unsupported-family` 명시 crossfade를 사용한다. 현재 40ms의 두 실제 image source 가중치 `.6/.4`와 embedded 원본 bytes를 확인하고, authentic frame에서 역방향 재기준을 시작할 때 시작 객체가 정확히 같다. 원 계획 0/40/100과 재기준 0/30/60의 전체 frame이 offline 복원 결과와 같다. 기존 fresh-process offline image/font 렌더 시험도 합산했다. 이를 typed Image 보간이라고 부르지 않는다.

이미지 공개 예제/primitive와 실행 tutorial을 사용하고, 기존 four-output render 시험의 fit·clip·alpha 독립 pixel probes를 재실행했다.

### Geo

정식 `createGeographicMarks` 예제의 District, West/Central/East, Service route와 경위선 6개의 raw axis/value를 literal 기대값으로 검증했다. 투영 편집 뒤 accessible `items`의 필드·키·visible·선택 이름이 유지되고, 중첩 childPath/namespace와 selected/plain 두 child가 분리된다. 접근성 결과는 불변이고 편집 가능한 program codec로 정확히 복원된다.

Graticule는 별도 dataset을 만들어 source를 꾸미지 않는다. native projection translate를 바꾸면 정확한 `projection:map@1` lineage로 재물질화되며, 명시 생성 intent의 `stepDeg` 변경은 경위선 6개를 독립 기대값의 8개로 바꾼다. 기존 tick keys를 포함하고 0도 자오선의 x=325를 검증한다. 이 source consumer는 projection resource와 생성 intent의 기존 수명이다.

공개 planar tutorial이 Shape/Point/Line을, source-label 실행 snippet과 실제 graticule variant가 Graticule을 소유한다. 공개 primitive 동등성과 Canvas/SVG/PDF renderer 검사를 재사용했다. Graticule의 미배정 field/scale/guide 3셀은 그대로 남긴다.

## 검증

- owning 61/61, 실제 render 9/9, manifest/discovery 32/32, 실행 문서 4/4.
- 새 경계가 들어간 두 owning 파일은 Node20.20.2/22.23.1/24.22.1에서 각각 28/28.
- 최초 Image 검사 16/17 실패는 test에서 weighted source의 `properties`를 잘못 읽은 것이며, 테스트만 고쳐 수리했다. 원본 로그를 보존했다.
- Runtime/type/package/document 입력 변경 0이므로 새 pack·bundle·전체 문서 빌드·SLO 성공을 추가 집계하지 않는다.

[기계 증거](native-image-geo-consumer-evidence/summary.json)에 명령과 로그가 있다. Native candidate의 실제 pass receipt나 STEP077 완료 상태는 만들지 않았다.
