# 범주 StrokeDash의 명시적 unknown fallback

## 진행 상태

- [x] 기존 직접 encoding·일반 scale editor의 실제 거부 확인
- [x] 기존 ordinal unknown 정규화와 consumer 정책 소유권 검토
- [x] 구체 공개 계약 및 기존 사용자 standing approval 기록
- [ ] 구현·선·rule·범례·재물질화·편집·복원·불변성 검증
- [ ] 선언·Current 계약·공개 문서·생성 참조 동기화
- [ ] 전체 라이브러리·설치 consumer 검증 및 후보 commit/push
- [ ] 전체 기존 차트 호환 검증 뒤 로컬 후보 runtime/docs 전환
- [ ] 1,413개 정기 checkpoint에서 통합·배포·이슈 종료

이슈: https://github.com/ggaction/ggaction/issues/241

## 승인

사용자는 이 진행 중인 번역/파이프라인/ggaction 개선 범위의 기존 및 앞으로의 모든 질문을
승인했으며, 공개 릴리즈는 200개 완료 차트 단위로 하라고 직접 지시했다.
`APPROVAL.json`에 직접 지시와 이 설계의 범위를 기록한다. 새 질문을 반복하지 않는다.
이 설계는 기존 Line/Rule의 이미 지원하는 constant 대시 패턴을 범위 밖 범주의 명시적
스타일로 재사용한다. 새 마크·도형·renderer나 새 시각 목표를 도입하지 않는다.

## 문제와 재현

유효한 raw 범주가 명시적 ordinal domain 밖에 있어도 저자가 그 경로의 선 스타일을
명시적으로 고를 수 있어야 한다. 현재 `encodeStrokeDash`가 `unknown`을 명시적으로 거부하고,
일반 scale 편집의 공유 consumer 정책도 거부한다. 일반 derived definition은 값을
물질화하지 않으므로 그 자체가 간결한 대체 동작이 아니다. 관측치를 지우거나 범주를
기존 domain 값으로 치환하거나 legend에 범위를 추가하지 않는다.

`REPRO.mjs`는 source-neutral 두 범주·네 관측치로 기존 실패를 재현한다.

## 구체 공개 계약

1. 기존 `DashScaleOptions`에 `unknown?: DashStyle | DashPattern`을 추가한다. 새 action과
   새 저장 key는 없다. 기존 `validateScaleUnknown('strokeDash', value)`와 ordinal mapper가
   named style/짝수 길이 비음수 패턴을 정규화하고 immutable array를 저장한다. `[]`는 실선이다.
2. 기존 `encodeStrokeDash`, 해당 `createLinePlot` 옵션/`encodeChannels`, 기존 scale 재사용과
   일반/focused scale editor가 같은 정책을 사용한다. Nominal/ordinal raw field role은 유지한다.
3. 생략은 기존 strict 동작이다. 명시 domain 밖의 유효한 raw 범주만 fallback으로 매핑한다.
   자동 domain은 기존대로 raw 범주를 추론한다. fallback을 domain이나 legend에 추가하지 않는다.
4. 새 consumer 범위는 Cartesian Line/Rule의 categorical strokeDash다. Point 및 다른 channel의
   기존 unknown 동작을 변경하지 않는다. Parallel/polar 경로, aggregate/bin topology 등 지원되지
   않은 조합은 명확하게 거부한다. X/Y가 아직 없는 유효한 불완전 Line/Rule은 기존 lifecycle대로
   선언을 유지하고 좌표가 완성될 때 물질화한다.
5. Missing/null/잘못된 raw 범주를 새로 허용하지 않는다. Raw series identity·vertex order·group
   partition과 한 series 안의 raw appearance 값 일관성 검사를 유지한다. 서로 다른 unknown
   raw 범주를 fallback의 같은 스타일이라는 이유로 한 경로로 합치지 않는다.
6. `editStrokeDashScale`에 같은 editable option을 추가한다. 생략은 유지, 편집의 명시적
   `unknown: undefined`는 fallback 제거다. 일반 `editScale`의 같은 제거도 일치해야 한다.
   생성에서 명시적 undefined는 기존 정규화대로 거부한다. 제거 뒤 out-of-domain 관측치가
   남으면 전체 compatibility preflight에서 실패하며 이전 state/trace는 바뀌지 않는다.
7. 값·domain·range·field·data revision/edit에서 같은 fallback을 다시 적용한다. Shared consumer
   하나라도 불가능하면 변경 전 실패한다. Legend는 실제 domain/range만 표시하고 기존
   stroke/width/opacity/대시 paint·selection·persisted replay·export를 유지한다.

## 상태·아키텍처

Ordinal scale의 기존 `unknown` 한 곳에 정규화한 패턴을 저장한다. Raw/derived 데이터와
범주 값은 바꾸지 않는다. 기존 scale/consumer grammar, domain action, wrapped
rematerialization plan을 사용한다. Renderer는 기존 concrete `strokeDash`만 읽는다.
기존 프로그램에서 option을 생략한 경로의 출력은 byte-identical이어야 한다.

## 검증

- 명시 fallback의 선 두 경로와 기존 constant 패턴 두 경로의 concrete/SVG/decoded PNG 일치.
- Nominal/ordinal, facade/bulk/direct, Line/Rule, explicit/inferred grouping, raw order와
  서로 다른 unknown 범주 분리, 축 이전/이후 encoding 순서.
- 잘못된 패턴·missing/null·conflicting raw appearance·incompatible shared consumers 원자성.
- 일반/focused scale 편집, undefined 제거/제거 거부, dataset revision/replay, 값 보존.
- Legend domain이 늘지 않으며 기존 sample paint와 원본 숫자/문자 범주가 유지됨.
- Selection/highlights, persisted program 복원, SVG/PNG/PDF export와 설치 package/type consumer.
- 기존 unknown 채널/ordinal dash/기타 전체 library 회귀, 계약·생성 참조·공개 문서 freshness.
- 새 로컬 후보 adoption 전 전체 1,281개/9,326개 실제 코드 native 호환성 재검증.

현재 배포판과 49adee7d authoring epoch는 보존한다. 검증만으로 공개 배포를 주장하지 않는다.
공개 integration/release는 1,413개 checkpoint에서 시행한다.
