import fs from 'node:fs';
const auditOutput = new URL('../../../../.artifacts/roadmap6-audit-replay/', import.meta.url);
fs.mkdirSync(auditOutput, { recursive: true });

import { execFileSync } from 'node:child_process';
import { chart } from '../../../../src/index.js';
import { getWrappedActionMetadata } from '../../../../src/core/action.js';

const root = new URL('../../../../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const index = JSON.parse(read('agent_docs/contract/ACTION_INDEX.json'));
const cards = JSON.parse(read('knowledge/action-cards.json')).cards;
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const declared = [...read('types/program.d.ts').split('export class ChartProgram')[1].matchAll(/^  ([A-Za-z][A-Za-z0-9]*)\(/gm)].map(m => m[1]).filter(n => n !== 'constructor');
const internals = Object.values(index.internal).filter(Array.isArray).flat();
const registered = Object.entries(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(chart()))).filter(([, d]) => getWrappedActionMetadata(d.value)).map(([name, d]) => ({ name, ...getWrappedActionMetadata(d.value) }));
const indexedNames = new Set(index.actions.map(a => a.name));
const known = new Set([...indexedNames, ...internals]);
const missingInternal = registered.filter(a => !known.has(a.name));
const byDomain = Object.fromEntries([...new Set(index.actions.map(a => a.domain))].map(d => [d, index.actions.filter(a => a.domain === d).length]));

function review(a) {
  const n = a.name;
  if (a.domain === 'primitives') return ['확장 primitive', 'H4', 'D20', 'F18', '세 primitive 경계를 유지. 일반 스타일은 persistent domain action으로 제공.'];
  if (a.domain === 'charts') return ['완성 차트 facade', 'H0', 'B01 B07 D04 D05 D06 D09 D17', 'F01 F02 F03 F04 F05 F06 F07 F08 F10', '짧은 호출·기본 guide·분해 경로와 sibling option vocabulary 대조.'];
  if (a.domain === 'composition') return ['차트 조합·반복·편집', n === 'facet' ? 'H0' : 'H1–H3', 'D19', 'F19', '일반 concat의 child 교체와 facet의 재파생 소유권 차이를 유지하며 authoring 범위 보강.'];
  if (a.domain === 'axes') return ['축 집합·축·구성요소', n === 'createAxes' ? 'H1' : /(?:Line|Ticks|Labels|Title)$/.test(n) ? 'H3' : 'H2', 'D07 D08 D13 D20', 'F17 F18', 'Cartesian/Polar/Parallel의 생성·편집·제거·복원 및 style 옵션 대조.'];
  if (a.domain === 'grid') return ['격자 집합·방향별 격자', ['createGrid', 'editGrid', 'removeGrid'].includes(n) ? 'H1–H2' : 'H3', 'D07 D17', 'F17 F18', '방향별 owner 재사용. 기본 방향·색은 차트 의미/테마와 분리 검토.'];
  if (a.domain === 'legend_and_title') return [n.includes('Title') && !n.includes('Legend') ? '차트 제목' : n === 'createGuides' ? 'guide 집합' : '범례·구성요소', n === 'createGuides' ? 'H1' : /^editLegend(?:Layout|Labels|Title|Symbols|Border)$/.test(n) ? 'H3' : 'H2–H3', 'D05 D07 D08 D13', 'F14 F17 F18', '범례 kind별 제약, nested false, 스타일/format 및 layout 소유권 대조.'];
  if (a.domain === 'mark-selection') return ['선택·강조·필터', 'H2–H3', 'B08 D15', 'F16 F18', '최종 item grain과 raw filtering 차이를 유지. 반복 필터/empty 결과와 lifecycle metadata 보강.'];
  if (a.domain === 'core') {
    if (/Canvas/.test(n)) return ['Canvas·plot bounds', 'H2–H3', 'D17', 'F18', '고정 margin과 자동 guide layout의 책임을 명시.'];
    if (/Scale|Coordinate/.test(n)) return ['좌표·스케일 resource', 'H2', 'D01 D09 D18', 'F02 F03 F04 F17 F18 F19', '좌표 family와 immutable/resource edit 차이는 유지. radial baseline·색 중심·재연결 경로 보강.'];
    return ['원본·파생 데이터', 'H2', 'B05 D12 D14', 'F13 F15 F16', '새 immutable dataset과 stable owner revision을 분리. standalone transform과 소비자 rebinding 검토.'];
  }
  if (a.domain === 'statistics') {
    if (n === 'createIntervalData') return ['통계 데이터', 'H2', 'D11 D12', 'F10 F15 F16', '공통 interval의 계산 방법·명명·입력/출력 grain을 유지/명시.'];
    if (n === 'createViolinPlot') return ['완성 차트 facade', 'H0', 'D04 D06 D16', 'F06 F12 F16', 'density/area/guide 분해는 유지. source/role/orientation 편집 빈틈 검토.'];
    return ['통계 layer·복합 mark·구성요소', /create(?:Box|Gradient)Plot/.test(n) ? 'H0/H1 혼합' : /(?:RegressionLine|RegressionBand|ErrorBandBoundary)$/.test(n) ? 'H2–H3' : 'H1–H2', 'D04 D06 D10 D11 D16', 'F10 F11 F12 F16', '컴포넌트 소유권, 원자적 역할 편집, 통계/모양 기본값을 대조.'];
  }
  if (a.domain === 'marks') return ['mark·스타일·라벨 배치', /^create/.test(n) ? 'H2' : 'H3', 'B06 D06 D13 D17', 'F05 F08 F09 F11 F14 F18', '9종 mark의 shape/style/anchor와 생성-편집 대칭성 검토.'];
  if (a.domain === 'encodings') return [/Density|Horizon|Histogram|Parallel/.test(n) ? '복합 semantic assignment' : 'encoding·ordering·해제', 'H2–H3', 'B01 D01 D02 D03 D06 D09 D11 D13 D14 D16', 'F01 F02 F03 F04 F05 F06 F07 F08 F13 F15 F16', 'field/constant, final grain, inference/default, 재할당·제거와 wrapper 조합 경로 대조.'];
  throw new Error('Unclassified action: ' + n);
}

const rows = index.actions.map(a => {
  const card = cards.find(c => c.name === a.name);
  if (!card || !declared.includes(a.name) || typeof chart()[a.name] !== 'function') throw new Error('Surface mismatch: ' + a.name);
  const lines = read(a.contract.file).split('\n');
  const line = lines.findIndex(l => l === '## `' + a.name + '`') + 1;
  if (!line) throw new Error('Missing contract: ' + a.name);
  const [role, authoringLevel, findings, proposals, reviewNote] = review(a);
  return { name: a.name, registered: true, declared: true, actionCard: true, currentLayer: a.layer, currentDomain: a.domain, currentLifecycle: a.lifecycle, currentUpdate: a.update, role, authoringLevel, findings: findings.split(' '), proposals: proposals.split(' '), reviewNote, signature: card.signature, options: card.options, contract: { ...a.contract, line }, source: `https://github.com/ggaction/ggaction/blob/${commit}/${a.contract.file}#L${line}` };
});
const summary = { commit, directActions: rows.length, domainCounts: byDomain, layers: Object.fromEntries(index.contractSchema.layers.map(l => [l, rows.filter(a => a.currentLayer === l).length])), registeredWrappedMethods: registered.length, indexedInternalMethods: internals.length, unlistedWrappedMethods: missingInternal, additionalPublicFactories: ['hconcat', 'vconcat'], plannedActions: index.plannedActions.length, plannedCapabilities: index.plannedCapabilities.length, probeCases: JSON.parse(fs.readFileSync(new URL('probe-results.json', auditOutput), 'utf8')).length };
const csv = fields => fields.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',');
fs.writeFileSync(new URL('inventory.json', auditOutput), JSON.stringify({ summary, actions: rows, internalInventory: index.internal }, null, 2) + '\n');
fs.writeFileSync(new URL('inventory.csv', auditOutput), [csv(['action','role','level','current layer','domain','lifecycle','findings','proposal families','contract','review']), ...rows.map(a => csv([a.name,a.role,a.authoringLevel,a.currentLayer,a.currentDomain,a.currentLifecycle,a.findings.join(' '),a.proposals.join(' '),`${a.contract.file}:${a.contract.line}`,a.reviewNote]))].join('\n') + '\n');
const md = [
  '# 전체 액션 대조표',
  '',
  `기준 commit: \`${commit}\`. 직접 호출 계약 173개를 runtime registration, TypeScript declaration, action card, owning current contract와 대조했다. 아래 H0–H4는 이번 검토용 authoring 역할 분류이며 public/advanced/primitive package 노출 분류와 별개다. 각 액션은 여러 층위를 연결할 수 있다.`,
  '',
  'H0 차트/조합 의도 → H1 분석 layer·복합 구성 → H2 mark·encoding·data·guide resource → H3 구성요소·스타일·배치 → H4 extension primitive.',
  '',
  '관련 B/D 항목은 [설계 검토 보고서](REPORT.md)의 재현 오류/설계 논점, F 항목은 추가 후보 액션군을 가리킨다. 행의 연결은 같은 소유 영역을 함께 검토했다는 뜻이며, 모든 행에 독립적인 버그가 있다는 뜻은 아니다. 옵션별 실제 선언은 [inventory.json](inventory.json)에 포함했다.',
  '',
  '| Domain | 직접 액션 수 |', '| --- | ---: |', ...Object.entries(byDomain).map(([d,n]) => `| ${d} | ${n} |`),
  '',
  '| # | Action / current contract | 역할·층위 | 현재 lifecycle | 관련 검토 | 추가 후보 |',
  '| ---: | --- | --- | --- | --- | --- |',
  ...rows.map((a,i) => `| ${i+1} | [\`${a.name}\`](${a.source}) | ${a.role} / ${a.authoringLevel} | ${a.currentLifecycle} | ${a.findings.join(', ')} | ${a.proposals.join(', ')} |`),
  '',
  '## 별도 factory와 internal 경계',
  '',
  '`hconcat`, `vconcat`은 public module function으로 별도 검토했다. 메서드 catalog 173개에 이 둘이 없는 것 자체는 누락 버그로 세지 않았다. `chart`, renderer exports도 authoring action의 직접 메서드 집계에는 포함하지 않는다.',
  '',
  'prototype에 등록된 wrapped method는 284개다. 173개 직접 계약 외 111개는 internal method이며 현재 internal manifest에는 95개만 기록돼 있다. 다음 16개를 internal inventory에 보완해야 한다. 이 메서드가 runtime에 있다는 이유로 public API로 승격하자는 뜻은 아니다.',
  '', ...missingInternal.map(a => '- `' + a.name + '`'),
  '',
  '## 검토 범위의 한계',
  '',
  '이 표는 전체 액션의 계약과 authoring 일관성을 전수 분류한 것이다. 모든 입력값의 조합을 실행하거나 모든 가능한 버그가 없음을 증명한 결과가 아니다. 실행 검증은 보고서에 지정한 공개 API 재현 사례와 MCP 생성 코드에 한정했다. 현재 production source/type/contract는 수정하지 않았다.',
  ''
];
fs.writeFileSync(new URL('ACTION_INVENTORY.md', auditOutput), md.join('\n'));
console.log(JSON.stringify(summary, null, 2));
