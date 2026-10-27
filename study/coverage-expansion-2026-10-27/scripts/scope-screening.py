#!/usr/bin/env python3
"""Declaration-level scope screen; not a compiled scale/axis conformance check."""
import csv,json
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
E=ROOT/'evidence';SOURCE=ROOT/'sources/chart-llm'
files=json.loads((E/'corpus-files.json').read_text())
embedded=json.loads((E/'corpus-embedded-specs.json').read_text())
rows=[];findings=[]
def screen(spec,path,base):
    hits=[]
    def visit(node,p):
        if not isinstance(node,dict):return
        scale=node.get('resolve',{}).get('scale',{}) if isinstance(node.get('resolve'),dict) else {}
        if isinstance(scale,dict) and scale.get('y')=='independent':
            kind='layer-independent-y-candidate' if isinstance(node.get('layer'),list) else 'panel-independent-y-declaration' if any(k in node for k in ['facet','row','column','concat','hconcat','vconcat','repeat']) else 'unresolved-independent-y-declaration'
            hits.append({'pointer':p+'/resolve/scale/y','kind':kind,'finalDisposition':'scope-review-required' if kind!='panel-independent-y-declaration' else 'allowed-panel-candidate-needs-resolved-frame-check'})
        # Vega declarations, when present: multiple y-oriented guide declarations need frame resolution.
        axes=node.get('axes')
        if isinstance(axes,list):
            y=[a for a in axes if isinstance(a,dict) and a.get('orient') in ['left','right']]
            if len(y)>1:hits.append({'pointer':p+'/axes','kind':'multiple-y-guides-candidate','finalDisposition':'scope-review-required'})
        # Traverse grammar nodes, never data records or named dataset values.
        for key in ['layer','concat','hconcat','vconcat','spec','marks']:
            child=node.get(key)
            if isinstance(child,dict):visit(child,p+'/'+key)
            elif isinstance(child,list):
                for i,c in enumerate(child):visit(c,p+'/'+key+'/'+str(i))
    visit(spec,base)
    for h in hits:findings.append({'path':path,'rootPointer':base,**h})
    status='scope-review-required' if any('candidate' in h['kind'] or 'unresolved' in h['kind'] for h in hits) else 'panel-declaration-review' if hits else 'no-explicit-candidate-found'
    return status,len(hits)
for f in files:
    if f.get('classification')!='chart-spec-candidate':continue
    obj=json.loads((SOURCE/f['path']).read_text())
    status,n=screen(obj,f['path'],'')
    rows.append({'path':f['path'],'pointer':'','sourceHash':f['sha256'],'group':'root','screenStatus':status,'declarations':n,'qualification':'not-run'})
for f in embedded:
    status,n=screen(f['spec'],f['path'],f['pointer'])
    rows.append({'path':f['path'],'pointer':f['pointer'],'sourceHash':f['canonicalJsonSha256'],'group':'embedded','screenStatus':status,'declarations':n,'qualification':'not-run'})
assert sum(r['group']=='root' for r in rows)==24957
assert sum(r['group']=='embedded' for r in rows)==30
with (E/'corpus-scope-screening.csv').open('w',newline='') as fp:
    w=csv.DictWriter(fp,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
(E/'corpus-scope-screening-findings.json').write_text(json.dumps(findings,ensure_ascii=False,indent=2)+'\n')
result={'profile':'user-scope-2026-10-27','method':'Grammar-node traversal of explicit independent Y and Vega multiple-Y guide declarations; data records skipped.','limits':'Not a dialect compiler. Implicit defaults, inheritance and resolved scale binding need fixture qualification. No rows marked pass or automatically excluded.','rootOccurrences':24957,'embeddedOccurrences':30,'rows':len(rows),'screenStates':dict(Counter(r['screenStatus'] for r in rows)),'declarationKinds':dict(Counter(h['kind'] for h in findings)),'findings':len(findings),'finalPolicyQualifications':0,'allRequiredResolvedFrameChecks':'not-run'}
(E/'corpus-scope-screening-summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
