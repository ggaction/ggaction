from pathlib import Path
import difflib, hashlib, json, subprocess, tempfile
root=Path(__file__).resolve().parents[5]
# Script lives at repo/agent_docs/impl/roadmap9/qualification/geo-hit-a3-review.
assert (root/'package.json').is_file()
target=Path(__file__).parent
name='scripts/benchmarks/workloads.browser.js';original=(root/name).read_text();existing=original
changes=[
('function hitStage(program, queries, owner, rowKeys) {','function hitStage(program, queries, owner, rowKeys, preparation) {'),
('createInteractionSession({ program, bindings: [] })','createInteractionSession({ program, bindings: [], ...(preparation === undefined ? {} : { hitPreparation: preparation }) })'),
('function samplingStage(from, to, metric, validate) {','function samplingStage(from, to, metric, validate, options = sampleOptions) {'),
('planTransition({ from, to, options: sampleOptions })','planTransition({ from, to, options })'),
("'points', indices.map(i => rows[i]))", "'points', indices.map(i => rows[i]), count === 100000 ? { maxSceneNodes: count + 1, maxWork: 128000000 } : undefined)"),
('return checkPoints(frame, input, 1.5);\n      })()','return checkPoints(frame, input, 1.5);\n      }, count >= 10000 ? { ...sampleOptions, maxEndpointNodes: 2 * (count + 1), maxOutputNodes: count + 1 } : sampleOptions)()'),
(".createCoordinate({ type: 'geo' }).createGeoLineMark({ id: 'coast', stroke: '#2563eb', strokeWidth: 2 });", ".createCoordinate({ type: 'geo' }).createGeoLineMark({ id: 'coast', stroke: '#2563eb', strokeWidth: 2,\n        ...(count >= 10000 ? { capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 } } : {}) });"),
("check(frame.decisions.some(value => value.kernel === 'native-geo'), 'native geographic projection kernel'); return checkGeo(frame, Math.sqrt(20000));\n    })()", "check(frame.decisions.some(value => value.kernel === 'native-geo'), 'native geographic projection kernel'); return checkGeo(frame, Math.sqrt(20000));\n    }, count >= 10000 ? { ...sampleOptions, formatVersion: 5 } : sampleOptions)()")]
for old,new in changes:
 assert existing.count(old)==1,old
 existing=existing.replace(old,new)
a3=existing.replace("]), 'coast') });", "]), 'coast', undefined, count >= 10000 ? { maxWork: 128000000,\n      pathGeometry: { maxParts: 400000, maxWork: 2000000, maxIndexWork: 16000000 } } : undefined) });")
assert a3!=existing
for label,before,after in [('existing-policy',original,existing),('a3-policy',existing,a3)]:
 patch=''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+name,tofile='b/'+name))
 (target/(label+'.patch')).write_text(patch)
# Validate real sequential patch applicability in an isolated scratch checkout, never product files.
with tempfile.TemporaryDirectory(prefix='geo-hit-a3-review-') as scratch:
 scratch=Path(scratch);p=scratch/name;p.parent.mkdir(parents=True);p.write_text(original)
 subprocess.run(['git','apply','--check',str((target/'existing-policy.patch').resolve())],cwd=scratch,check=True)
 subprocess.run(['git','apply',str((target/'existing-policy.patch').resolve())],cwd=scratch,check=True)
 assert p.read_text()==existing
 subprocess.run(['git','apply','--check',str((target/'a3-policy.patch').resolve())],cwd=scratch,check=True)
 subprocess.run(['git','apply',str((target/'a3-policy.patch').resolve())],cwd=scratch,check=True)
 assert p.read_text()==a3
 parse=scratch/'candidate.mjs';parse.write_text(a3);subprocess.run(['node','--check',str(parse)],check=True)
protected=[
 original[original.index('export const workloadSizes'):original.index('const check =')],
 original[original.index('export function nativeWorkloadInput'):original.index('export function prepareNativeWorkload')],
 'const result = time(() => sampleTransition(plan, 50));',
 "session.dispatch({ type: 'inspect', point: { x: q[0] * 1.5 + 7, y: q[1] * 1.5 + 11 }, slop: 0 })",
 'for (let i = 0; i < warmups; i++) prepared.validate(await prepared.run());',
 'for (let i = 0; i < measured; i++) { const value = await prepared.run(); prepared.validate(value); samples.push(value.metrics);',
 "const coordinates = input.features[0].geometry.coordinates, indices = [0, Math.floor((count - 1) / 2), count - 2];"
]
assert all(fragment in a3 for fragment in protected)
# Finite packed-index maxima derived from proposed leaf count, not a runtime observation.
n=400000;leaves=(n+7)//8;nodes=2*leaves-1
receipt={'kind':'read-only A3 proposal static checks; no runtime qualification','baseRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'baseFile':name,'baseSHA256':hashlib.sha256(original.encode()).hexdigest(),'checks':{'sequentialPatches':True,'nodeSyntax':True,'protectedFragments':len(protected),'productSourceUnchanged':(root/name).read_text()==original},'proposedIndexBufferUpperBound':{'parts':n,'leaves':leaves,'nodes':nodes,'depth':(leaves-1).bit_length()+1,'nodeBytes':48*nodes,'peakBuffersBytes':48*nodes+12*n+1024,'retainedBuffersBytes':48*nodes+4*n,'excludes':'JS footprint/commands/allocator overhead; not a heap result'},'patches':{label:hashlib.sha256((target/(label+'.patch')).read_bytes()).hexdigest() for label in ['existing-policy','a3-policy']},'runtime':'not run; source math, workload guards and product unchanged'}
(target/'verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
