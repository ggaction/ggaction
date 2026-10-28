# 검토 중 발견한 기존 선언 한계

기준 source: `7e0f2b4688c7ae8ea26ae9abb7e054c784c034ed`.

제안 calls.ts가 기존 expression 선언을 거쳐 types/program.d.ts를 참조한다. 전체 선언에
`--strict --exactOptionalPropertyTypes`를 적용하면 기존 EditLegendOptions의 channels가
LegendOptions.channels를 확장하는 부분에서 TS2430이 발생한다. 이 충돌은 기존 코드에 있으며
이번 parameter review에서 unrelated public type 변경을 하지 않는다.

관찰한 오류:

```text
types/program.d.ts(5267,18): error TS2430: Interface 'EditLegendOptions' incorrectly extends interface 'Omit<LegendOptions, ...>'.
Types of property 'channels' are incompatible.
Type 'readonly (...)[] | undefined' is not assignable to type 'readonly (...)[]'.
```

검증을 skipLibCheck로 생략하지 않는다. 전체 호출·기존 선언은 현재 프로젝트의 strict 설정으로
확인하고, 새 parameter 선언은 production import가 없는 exact-options.ts에서 strict와
exactOptionalPropertyTypes를 모두 적용한다. 따라서 새 parameter 옵션의 undefined 거부는 검증하지만,
현재 package 전체가 exactOptionalPropertyTypes를 지원한다고 주장하지 않는다. 공개 통합 시
consumer 환경별 declaration qualification에 이 알려진 한계를 포함해야 한다.

## 기존 package 압축 한도와 runtime 차이

현재 shell의 Node22.23.2/npm10.9.8에서 전체 suite는 6,448 passed/1 failed였다. 실패는 기존
package-artifact의 packedBytes 1,010,000 한도이며 실측은 1,012,113bytes다. 첫 실행의 receipt/log는
evidence/attempt-node22.23.2/에 보존한다. 이 실패를 통과 결과로 바꾸지 않는다.

기존 core 검증과 같은 Homebrew Node22.23.1/npm10.9.8에서는 canonical pack이 678 entries,
packed 1,009,983/unpacked 4,712,832bytes로 통과한다. 이 artifact의 동일 tar bytes를 Node22.23.2
gzip level9로 다시 압축하면 정확히 1,012,113bytes가 된다. 제품 파일 증가가 아닌 compressor 차이임을
확인했다. 비교 수치와 tar SHA-256은 evidence/compression-comparison.json에 보존한다.

이번 계약 검토의 누적 baseline은 이전 core와 동일한 Node22.23.1에서 재현한다. 검토안은 package나
runtime 한도를 변경하지 않는다. **현재 shell의 Node22.23.2 package 검사 실패는 미해결**이며,
공개 제품 통합의 지원 Node matrix/package qualification을 완료하기 전에 해결해야 한다.
이 리뷰의 baseline 통과를 모든 지원 runtime의 package 통과나 release 승인으로 해석하지 않는다.
