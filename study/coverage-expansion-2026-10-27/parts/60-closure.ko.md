## 16. 최종 완료 조건과 실제 구현 착수 순서

최종 완료는 다음 조건을 **모두** 만족할 때다.

1. GGA-01–10과 USR-01–22 중 USR-03/04를 제외한 자체 계약이 구현되고 적용되는 수치·geometry·상태·시간·오류·조합 시험이 통과한다.
2. 외부 adapter/upstream 변경/Flint 정합성/번역기/코퍼스 fidelity를 선행 조건으로 두지 않는다. 외부2,279행은 참고로 보존하며 활성30행과 분리한다. native 기능의 누락은 남김없이 추적한다.
3. geo는 채택한 native projection과 planar identity, geometry/join/clip/LOD/camera/export/hit/animation을 포함한다. interaction은 실제 입력과 상태·표현·event를, animation은 중간 프레임과 중단·복원까지 확인한다.
4. normal recipe에 private state, raw graphics escape, 원본 screenshot, 외부 렌더러 fallback, row별 수동 geometry가 없다. 새 facade의 trace는 의미 있는 하위 액션으로 설명된다.
5. 저장·로드·edit·resize·data revise·theme change 뒤 의미와 디자인이 보존되고, 모든 지원 renderer와 설치된 npm package에서 동작한다. 접근성·자원 정리·고정된 성능 SLO도 통과한다.
6. 코드·타입·계약·human docs·LLM/MCP 문서·capability manifest가 같은 지원 상태를 말한다. 릴리스에는 동일 candidate tarball의 CI·공개 artifact hash와 native capability qualification manifest를 함께 확인한다.

구현 첫 변경은 `createMap`이나 `animate`처럼 큰 facade 하나를 만드는 것이 아니다. **WP-00 기준 고정 → WP-02 identity의 재현 실패를 native 계약으로 해결 → WP-03 상태/schema 합의 → WP-04 compound path**가 공통 선행 작업이다. WP-01/15/16/17의 외부 통합·번역 작업은 철회되었으며 선행 조건이 아니다. 그 뒤 데이터/레이아웃/구조형 차트/geo/interaction/animation을 작업 패키지 의존 관계에 따라 완성한다.

이 순서가 중요한 이유는 하나다. identity 없이 animation을 만들면 data revision에서 다시 고쳐야 하고, compound path 없이 geo를 만들면 holes와 hit/export를 다시 고쳐야 하며, 자체 계약과 독립 oracle가 없으면 같은 구현 오류를 테스트가 반복할 수 있다. 이번 목표는 검증 가능한 native 표현력을 늘리는 것이다. 조사 원장과 실패 사례를 구현의 입력으로 유지해야 한다.

추가 완료 게이트: Icicle/Sunburst 공통 partition, 여섯 graph inference rule, 네 bundling method가 모두 구현·검증되어야 한다. 조합 표현의 전용 API는 추가하지 않고 한 frame의 Y scale/guide 제약을 모든 생성·수정·복원 경로에서 지킨다. native 계약의 미완료가 남아 있으면 완료가 아니다. 최종 주장은 `ggaction-native-2026-10-27` capability 충족이며 외부 호환성·번역 주장이 아니다.

## 17. 산출물, 재현, 보고서의 사용 범위

이 보고서의 본문은 현재 기능과 구현 방침을 사람이 읽는 문서다. 부록 A는 298개 액션 전수 목록, 부록 B·C는 Flint의 154개 template 및 공개 타입 필드 전수 자료다. JSON/CSV는 원본 pointer와 옵션·출처를 잃지 않기 위한 구현 입력이다. 문서만 읽고 수작업으로 몇 개 사례를 골라 처리하지 말고 원장을 fixture generator와 CI에 연결한다.

| 산출물 | 역할 |
|---|---|
| [REPORT.ko.md](REPORT.ko.md) / [REPORT.ko.html](REPORT.ko.html) | 통합 보고서와 오프라인 목차·검색 읽기 화면 |
| [implementation-plan.json](evidence/implementation-plan.json) | 22개 활성 작업, 의존성·코드 접점·79개 인수 시험군 |
| [requirements-traceability.csv](evidence/requirements-traceability.csv) | native/사용자30행 + 후속2행 + 외부참고2,279행 = 2,311행; required와 scope disposition 구분 |
| [ggaction-inventory.json](evidence/ggaction-inventory.json) | 현재 298개 액션의 옵션·타입·소스·계약 위치 |
| [flint-requirements.json](evidence/flint-requirements.json) | chart/property/preset/theme/public field/native behavior 요구 |
| [corpus-original-crosswalk.csv](evidence/corpus-original-crosswalk.csv) | 원본 1,981개 전체와 번역 존재/원본 변경/스키마/현재 probe |
| [corpus-all-files-qualified.csv](evidence/corpus-all-files-qualified.csv) | 추적 JSON 전체 25,024개 분류와 schema 상태 |
| [corpus-embedded-specs.json](evidence/corpus-embedded-specs.json) | 파일 내부 30개 중첩 차트의 pointer와 원문 |
| [corpus-source-deltas.json](evidence/corpus-source-deltas.json) | 340개 구조 차이의 before/after/hash |
| [translations-programs.json](evidence/translations-programs.json) | 10,174개 프로그램의 AST·작성 방식 |
| [README.ko.md](README.ko.md) | 재현 순서, 도구 환경, 파일 안내 |

이번에 수행한 일은 소스 고정, 인벤토리·스키마 검사, 핵심 runtime probe, 요구사항 분석, 구현·검증 명세 작성이다. **ggaction 새 기능 구현·소스 수정·PR 생성·릴리스는 수행하지 않았다.** 현재 source-family 전체 fidelity가 검증됐다고 주장하지 않는다. 이 보고서에 제시한 제안 API와 인수 시험은 다음 구현 작업의 계약 초안이다.


개정 명세는 부록 F, [scope-policy.json](evidence/scope-policy.json), [target-chart-mapping.json](evidence/target-chart-mapping.json), [corpus-scope-screening-summary.json](evidence/corpus-scope-screening-summary.json), [revision-oracle-fixtures.json](evidence/revision-oracle-fixtures.json)을 함께 읽는다.

[자체 capability 원장](evidence/native-capability-requirements.json)과 [철회된 작업·시험 기록](evidence/withdrawn-flint-plan.json)이 최신 목표를 정의한다. 과거 조사 파일은 구현 의무가 아니다.
