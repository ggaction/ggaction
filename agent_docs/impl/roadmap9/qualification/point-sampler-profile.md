# 원 100k point sampler 단독 시간과 CPU 귀속

## 진행 상태

- [x] point-node checkpoint `b3da444d7`, source pin `648dfe381`에서 실제 공개
  `planTransition` → `sampleTransition` 경로를 원 100,000점으로 실행했다.
- [x] 좌표 oracle을 타이머 밖으로 분리하고 두 sample 모두 100,000개 좌표를 확인했다.
- [x] 두 번째 호출에서만 V8 CPU profile을 수집했다. Runtime 변경은 없다.
- [ ] 공통 sampler → Canvas 50ms, P95 및 100회 retained-heap 기준은 미완료다.

승인 범위는 [남은 구현 승인](../AUTHORIZATION.json)의 `remainingApproval`을 따른다.
입력 SHA, 실제 source SHA, 원 로그와 CPU profile은
[기계 기록](point-sampler-profile-evidence/qualification.json)에 보존한다.

## 실행과 해석

Node 24.22.1, `--expose-gc --max-old-space-size=6144`로 실행했다. 원 fixture의
입력 SHA는 `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`다.
10만 점, 기존 domain 전환, 공개 v4 capacity, 기존 runtime guard를 그대로 사용했다.
다른 원 대용량 작업은 없었지만 별도 agent의 작은 검사와 동시 실행했으므로
통제된 성능 기준이나 이전 기록 대비 속도 향상의 증거로 사용하지 않는다.

| 호출 | `sampleTransition` 단독 | 별도 전체 좌표 검사 |
| --- | ---: | ---: |
| 첫 호출, 계측 없음 | 1120.094ms | 20.071ms |
| 두 번째 호출, CPU profile | 1095.549ms | 9.314ms |

기존 `product-100000-phased.mjs`의 sample 시간은 좌표 oracle까지 포함했다.
이 기록은 그 기능 검증을 무효화하지 않으며, 순수 sampler 시간과 구별한다.
이번에는 renderer를 실행하지 않았으므로 Canvas 포함 성능을 주장하지 않는다.
명시 GC는 phase 사이의 참조 수명 정리이며 100회 retained-heap 검사를 대신하지 않는다.

## 다음 최적화의 근거

CPU profile의 inclusive 시간은 서로 겹치므로 합산할 수 없다. Inspector의 시작/종료
호출 약 222ms도 profile에 포함되어 전체 profile 길이는 sampler 타이머보다 길다.
다음 값은 해당 두 번째 호출의 표본 귀속이다.

| 경로 | inclusive 표본 시간 |
| --- | ---: |
| `cloneAndFreeze` | 331.6ms |
| `samplePositionInterpolation` | 247.7ms |
| `captureFrameMeaning` | 219.0ms |
| `projectSampledAnimationEndpoint` | 194.3ms |
| `canvasSceneProgram` | 185.4ms |
| `matchItemIdentities` | 120.5ms |
| `mapContinuousScaleValues` | 120.1ms |

`freezeOwned`의 self 표본은 179.5ms, GC는 140.2ms였다. 이 자료는 복사·ownership 등록과
반복된 scale/identity 처리를 우선 조사할 근거다. 특정 WeakSet의 재해시 또는 누수 원인을
확정하지 않으며 validation·native authority·작업량 검사를 생략할 근거로 삼지 않는다.
먼저 [공유 scalar mapping 검토](prepared-scalar-mapping-review.md)의 수학·오류·복원
동일성을 증명한다. 의미/identity 재구성은 정확한 승인된 경계와 비용을 따로 검토한다.

재현은 저장소 루트에서 다음을 실행한다. 동일 프로세스에서 endpoint 준비 후 첫 호출과
profile 호출을 순서대로 수행하며 실행 중 원 대용량 fixture는 하나만 유지한다.

```sh
node --expose-gc --max-old-space-size=6144 agent_docs/impl/roadmap9/qualification/point-sampler-profile-evidence/run.mjs
```

실행 결과는 `.artifacts/point-sampler-profile/`에 저장한다. 이 검토 checkpoint는
STEP-057–070 또는 STEP-077의 완료 선언이 아니다.
