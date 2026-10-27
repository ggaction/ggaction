import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chart } from '../../ggaction/src/index.js';

const results = {};
function capture(name, callback) {
  try { results[name] = { ok: true, result: callback() }; }
  catch (error) { results[name] = { ok: false, error: error.message }; }
}

capture('line_recipe_secondary_without_canvas', () => {
  const program = chart()
    .createData({ values: [{ date: '2020-01-01', value: 2 }, { date: '2021-01-01', value: 3 }] })
    .createBarMark({ id: 'bars' })
    .encodeX({ field: 'date', fieldType: 'temporal' })
    .encodeY({ field: 'value', aggregate: 'mean' })
    .createLineMark({ id: 'trend', strokeWidth: 3 });
  return program.graphicSpec.order;
});

capture('heatmap_recipe_label_on_binned_branch', () => {
  const program = chart()
    .createCanvas({ margin: { right: 120 } })
    .createData({ values: [{ weight: 1, economy: 2 }, { weight: 2, economy: 3 }] })
    .createHeatmap({ x: 'weight', y: 'economy', bin: { bins: { x: 10, y: 8 } }, color: { scale: { palette: 'blues' } } })
    .createTextMark({ align: 'center', baseline: 'middle' })
    .encodeText({ field: 'value', format: '.0f' });
  return program.graphicSpec.order;
});

capture('box_recipe_actual_quartiles', () => {
  const program = chart().createCanvas()
    .createData({ values: [1, 2, 3, 4].map(value => ({ category: 'A', value })) })
    .createBoxPlot({ x: { field: 'category', fieldType: 'nominal' }, y: { field: 'value' }, guides: { legend: false } });
  return program.semanticSpec.datasets.find(data => data.id === 'boxPlotSummaryData').values;
});

capture('revise_data_replays_missing_observation_pipeline', () => {
  const before = chart().createCanvas()
    .createData({ id: 'raw', values: [{ t: 1, value: 2 }, { t: 3, value: 6 }] })
    .createCompleteData({ id: 'complete', source: 'raw', key: 't', values: [1, 2, 3] })
    .createImputedData({ id: 'imputed', source: 'complete', fields: 'value', sortBy: [{ field: 't' }], method: 'linear' })
    .createWindowData({ id: 'window', source: 'imputed', sortBy: [{ field: 't' }], operations: [{ op: 'movingMean', field: 'value', as: 'mean', frame: { preceding: 1 } }] })
    .createLinePlot({ id: 'trend', data: 'window', x: 't', y: 'mean' });
  const after = before.reviseData({ source: 'raw', id: 'replacement', values: [{ t: 1, value: 4 }, { t: 3, value: 8 }] });
  return {
    before: before.semanticSpec.datasets.find(data => data.id === 'window').values.map(row => row.mean),
    after: after.semanticSpec.datasets.find(data => data.id.startsWith('windowWindowDataRevision')).values.map(row => row.mean),
    beforeSourcePreserved: before.semanticSpec.datasets.find(data => data.id === 'raw').values
  };
});

capture('error_recovery_sample_render_failure', () => {
  const before = { revision: 1 };
  let current = before;
  const render = () => { throw new Error('Simulated renderer failure'); };
  function applyRevision(revise) {
    try {
      const candidate = revise(current);
      current = candidate;
      render(current, {});
      return { ok: true };
    } catch (error) { return { ok: false, message: error.message }; }
  }
  return { returned: applyRevision(() => ({ revision: 2 })), current, retainedPrevious: current === before };
});

capture('readme_release_command_dry_run', () => {
  try {
    return execFileSync(process.execPath, ['scripts/prepare-release.js', '0.0.16', '--dry-run'], {
      cwd: new URL('../../ggaction/', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    return { status: error.status, stderr: error.stderr };
  }
});

const manifest = JSON.parse(await readFile(new URL('../../ggaction/package.json', import.meta.url)));
const runtime = await readFile(new URL('../../ggaction/docs/reference/runtime.md', import.meta.url), 'utf8');
results.runtime_reference_entries = {
  packageExports: Object.keys(manifest.exports).map(key => key === '.' ? 'ggaction' : `ggaction${key.slice(1)}`),
  renderedReferenceHeadings: [...runtime.matchAll(/^#### `([^`]+)`/gm)].map(match => match[1])
};

await writeFile(new URL('./human-probe-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
