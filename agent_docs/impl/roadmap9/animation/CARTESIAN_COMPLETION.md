# Cartesian native typed 경로 완결

## 진행 상태

- [x] 원안 STEP061/062와 기존 Cartesian 기록의 명시 후행 범위를 대조했다.
- [x] `AUTHORIZATION.json#remainingApproval`의 설계·저장·시각 승인과 부모의 구체안 1–6 승인을 재사용한다.
- [x] Native conditional row/series 값과 선택된 scale을 기존 준비값으로 연결한다.
- [x] Ordinal offset, fixed/box span, category slot의 native 배치를 공유한다.
- [x] Density-derived area와 source-follow overlay를 forward 의미값으로 연결한다.
- [x] 정확 endpoint, 현재 frame 재기준, 닫힌 복원·한도·오염 및 네 renderer를 검증한다.
- [x] Current·타입·공개 문서·동일 tar 3 Node 증거를 동기화하고 source `d939c695a`를 commit/push했다.

시작점은 `5ff53c12d`(공개 timeline v3 source `933cacad0` + 문서 pin)이다.
이는 전체 STEP061/062/077 완료 선언이나 fresh final AT60이 아니다.

## 승인과 범위

[기존 승인](../AUTHORIZATION.json)의 `remainingApproval`은 STEP077까지 남은 API·저장 구조·
아키텍처·시각 세부 선택을 포괄한다. 원안 animation의 Cartesian semantic endpoints→scale,
동일 ordered-member line/area와 [첫 Cartesian 기록](CARTESIAN.md)의 명시 후행을 구현한다.
일반 point conditional은 이미 `resolveRowEncodingValues`를 사용하므로 별도 AST owner를 만들지 않는다.
Jitter/packing·비원형 point·새 random/layout는 이 개념에 추가하지 않는다.
원안이 허용한 membership/curve/topology/content 변경의 명시 crossfade는 그대로 유지한다.

## 단일 계산 소유자

1. 준비는 native final item identity와 row lineage를 기준으로 한다. `rowEncoding`,
   `conditionalPositionBindings`, `conditionalLineValues`, `conditionalAreaValues`에서 이미 선택한
   값과 scale을 읽는다. Sample/restore에서 AST·selection·통계·binning·stack을 실행하지 않는다.
2. 기존 Cartesian points/grid/policy를 유지한다. 추가 offset은 ordinal offset의 값·scale,
   category slot은 band 계수로 보존하며 concrete pixel에서 의미를 역산하지 않는다.
   실제 slot 정본은 `markConfigs[id].categorySlotOffset`이다.
3. Rule fixed span은 orientation/size, box span은 native bar width intent와 category mapping,
   선택적인 median pixel width를 보존한다. 필요한 순수 placement 계산만 native action과
   sampler가 공유하도록 추출한다.
4. Density는 계산이 끝난 sample grid·density와 정규화 maximum·side/width/curve를 사용한다.
   Categorical density 및 continuous density의 기존 path owner를 재사용한다.
5. Overlay는 기존 source item membership/order와 endpoint 의미를 준비하고 source의 anchor를
   forward 계산한다. 다른 source/segment topology는 명시 fade이며 가짜 endpoint index를 만들지 않는다.

## 저장·소유 경계

공개 여섯 함수·semantic schema·concrete scene schema는 유지한다. Cartesian private kernel의
닫힌 state가 확장되면 version을 명시 상향한다. 새 값을 받아들이는 normalizer/geometry owner가
state 검증을 단독 소유하며 getter, unknown field/version, 불변 입력, finite/work 한도를 유지한다.
현재 sample 의미만 flat proof에 보존하고 과거 plan/native program을 재귀 저장하지 않는다.

이 작업은 `materialization/animation/cartesian*`, `grammar/animation/cartesian*`와 필요한 작은
native placement/path 추출을 소유한다. 공유 `planner`, `sample`, `frameEndpoint`,
`frameProvenance`는 부모가 소유한다. 공개 current circle frame을 rebase 후 복원하는 실제
설치 소비자 실패를 확인하고, 부모가 정확히 승인한 `frameEndpoint`의 Cartesian primitive
허용 배열에만 `circle` 한 항목을 추가했다. guide 등 다른 판정은 유지했다. 최초 실패와
수리 후 공개 소비자 3건 성공은 별도 로그로 보존한다.

## 검증 계획

- Native t0/t1과 same-policy 중간 forward geometry, log 값, reversed band, chosen conditional scale.
- 수평/수직 fixed/box span, ordinal offset, 실제 raincloud category slot과 immutable source.
- Continuous/category density, source-follow overlay의 exact member grid와 정당한 topology fade.
- Current frame rebase/offline restore, 오염·unknown version·accessor·예산·원자 실패.
- 공개 API의 실제 current hit, 동일 frame Canvas/SVG/PNG/PDF, fresh process network0,
  같은 archive Node20/22/24 집중 consumer와 source/current/docs 동기화.

## 검증된 source checkpoint

- 누적 animation 및 변경 native owner의 집중 coverage: 608/608, 선택한 source 합계
  97.37% lines / 93.58% branches / 100% functions. 변경 critical owner 13개는 기존
  95/90/100 floor를 모두 통과했다. 이는 저장소 전체 coverage가 아니다.
- Circle current-frame 복원 수리 후 native placement/strict boundary 8/8, 공개 설치
  소비자 3/3, renderer 4 + Canvas/SVG DPR1/2 browser 1 검사가 통과했다.
- 실제 원단위 자료 5개 × conditional rule / bar overlay / density 3개 시나리오의
  canonical realistic 5/5를 통과했다. 원본 row·SHA·cohort와 독립 위치 산술을 유지했다.
- 같은 archive `058befd4884e5bab62e2ea637b0f4f527fe1691eefcbd288beeacb76f13dec97`를
  Node20.20.2/22.23.1/24.22.1에 설치해 각 신규 public 3건, strict types,
  optional peers와 여섯 browser bundle을 통과했다. Package 1,190 entries,
  unpacked 7,677,726 bytes; packed는 Node22 1,697,065, Node20/24 1,701,026 bytes다.
- 최초 문서 232개 중 230개 통과·2개 생성물 불일치가 있었고, 타입 복사와 runtime
  reference를 재생성한 뒤 owning 2/2로 회복했다. 원본 실패와 회복 로그를 구분한다.
  Package/documentation contracts 16/16, source/discovery 30/30도 통과했다.
- Source-pinned provenance/coverage 18/18와 documentation truth 3/3, built 186페이지·
  selective 1,598 artifacts, desktop 및 전체 320·390·768px browser가 통과했다.
  [지속 증거](cartesian-completion-evidence/qualification.json)에 source/input/artifact hash와
  최초 실패·회복·동일 archive 설치 결과를 보존한다.
  공통 corpus·전체 합산 AT60/STEP077 qualification은 부모의 최종 candidate 책임이다.
