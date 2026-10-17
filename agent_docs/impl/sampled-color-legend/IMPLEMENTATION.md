# 연속형 색상 범례의 심볼 표현 구현

## 진행 상태

- [x] 승인된 기존 `createLegend`/`editLegend` 옵션 구현
- [x] 기존 gradient owner·sample 상태·표현 전환·편집·저장 검증
- [x] Full/Basic·Cartesian/Polar point·Bar·Rect·Text 소비 경로 검증
- [x] 그룹·Canvas·scale/data 수정·삭제/재생성·facet/repeat/shared 검증
- [x] SVG/Canvas/PNG/PDF의 concrete output 검증
- [x] 선언·현재 계약·공개 문서·생성 문서·설치 패키지 동기화
- [ ] 별도 최소 글줄 pitch 수정과 통합 후 최종 runtime pin
- [ ] 번역 overlay의 해당 차트 재번역·전체 단계 재검증

사용자 승인은 `decisions.json`의 정확한 설계 revision을 재사용한다. 새 action, scale
종류, resource kind 또는 renderer primitive는 추가하지 않았다. `representation`을 생략한
기존 생성은 gradient를 유지하며 기존 저장 결과도 같은 출력으로 읽는다.

## 구현 소유권

기존 `guideConfigs.legend.gradient`가 `representation:'symbols'`, canonical `sampling`,
단일 point recipe와 항목 layout을 보관한다. semantic color scale/title과 target identity는
그대로다. materializer는 같은 resolved color mapper에서 각 값의 색을 얻어
`colorGradientSymbols`의 circle collection을 만든다. 표현 전환은 이전 전용 graphics를
정리하며 공통 title/typography/placement/group/border를 보존한다. renderer는 기존 concrete
primitives만 읽는다. 저장 validator는 새 discriminator, sampling, recipe와 layout을 검사한다.

다중 블록의 특정 채널 sample/text/symbol 수정은 기존 `editLegendBlock`을 사용한다.
`channels`를 명시한 전체 편집은 기존 최종 content-set 교체 의미를 유지한다. count/values,
point recipe, gradient 전용 설정의 충돌은 atomic failure다. labelMap은 기존 범주형 전용
계약을 넓히지 않는다.

## 검증

현재 capability 테스트는 `test/unit/actions/guides/sampled-color-legend.test.js`가 소유한다.
네 값의 색과 좌표에 대한 literal oracle, 모든8개 edge/corner, sample 경계·반전 domain,
log/symlog/midpoint, companion block 보존, 편집/전환, scale/data/Canvas replay, persistence,
삭제/재생성, 공유 facet/repeat와 모든 output adapter를 검사한다. 차트 픽셀을 보지 않았고
PNG는 same-run byte/decoded equality만 사용했다.

- focused26개, 전체 unit2,921개, contracts532개, docs120개, charts578개 통과
- 새 materializer의 line/branch/function coverage 각각100%
- 독립 agent 추가18개 중립 검사와 기존 focused25개 통과
- 실제 packed consumer에서 Full/Basic 생성·편집·저장·색/심볼 구조 검증 통과

정확한 수치·패키지 SHA·기존 baseline 대비 측정·예산은 `implementation-evidence.json`에 있다.
Source checkpoint와 그 정확한 runtime을 가리키는 문서 provenance는 후속 metadata
checkpoint에서 연결한다. 패키지 출판·문서 배포·PR 생성은 수행하지 않았다.

## 이전 baseline 동기화

문서 generator가 변경한56개 PNG는 untouched 승인 부모의 같은 환경 재렌더와 모두 byte 및
decoded RGBA가 같다. 새 기능의 no-opt-in pixel delta는0이다. 기존 committed asset drift를
동기화한 것이며 source와 맞지 않는 옛 PNG에 새 source hash만 붙이지 않았다.
`no-optin-doc-image-evidence.json`에 부모 revision, 경로, 세 가지 SHA와 재현 절차를 기록했다.

전체 chart 검사에서 발견한3개 stale literal fixture도 untouched 부모에서 같은 실패를
재현했다. 이미 승인된 occupied-top·rotated-label anchoring·기본 pitch18 좌표를 동기화했으며
비교·geometry·pixel equality 검사는 그대로 유지했다. 새 feature 때문에 기존 출력이
바뀌었다고 해석하지 않는다.

## 역사적 재현과 남은 통합

`reproduce.mjs`는 승인 전 `cb61e5f2`에서 unsupported gap을 보인 역사적 재현이다. 새
runtime에서 이 스크립트가 통과한다고 주장하지 않는다. 현재 검증은 위 durable 테스트다.
별도 sibling branch의 최소16 글줄 안전 pitch와 최종 runtime 통합·번역 overlay 재검증은
이 library checkpoint 이후 root가 수행한다.
