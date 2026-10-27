#!/usr/bin/env python3
"""Validate this report's evidence links/counts, not proposed ggaction capabilities."""
import csv, hashlib, json, re, subprocess, os
from datetime import datetime,timezone
from html.parser import HTMLParser
from pathlib import Path
from environment import find_repository
from urllib.parse import unquote,urlparse

ROOT=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
    def __init__(self): super().__init__();self.links=[];self.ids=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and 'href' in a:self.links.append(a['href'])
p=Links();p.feed((ROOT/'REPORT.ko.html').read_text())
errors=[];checks=[]
def check(name,condition,detail=None):
    checks.append({'name':name,'passed':bool(condition),'detail':detail})
    if not condition: errors.append({'check':name,'detail':detail})
read=lambda f:json.loads((ROOT/'evidence'/f).read_text())
g=read('ggaction-inventory.json');f=read('flint-catalog.json');c=read('corpus-summary.json')
schema=read('corpus-schema-summary.json');embedded=read('corpus-embedded-summary.json')
plan=read('implementation-plan.json');trace=read('requirements-traceability.json')
probes=read('ggaction-probes.json');flint_probes=read('flint-compile-probe.json');runtime=read('translations-runtime-probes.json')
check('ggaction action census',g['counts']['total']==298)
check('Flint chart names',len(f['charts'])==51)
check('Flint preset count',len(f['interactionPresets'])==23)
check('Flint update count',len(f['updateOps'])==7)
check('canonical originals',len(read('corpus-originals.json'))==1981)
check('all JSON classification',c['jsonFiles']==25024 and c['chartSpecificationFiles']==24957)
check('root schema denominator',sum(schema['counts'].values())==24957)
embedded_specs=read('corpus-embedded-specs.json')
check('embedded charts',len(embedded_specs)==30)
check('source deltas',len(read('corpus-source-deltas.json'))==340)
check('translation integrity',read('translations-integrity-failures.json')==[])
check('core probes',probes['allMatched'] and len(probes['results'])==19)
check('Flint compile scope',len(flint_probes['results'])==154 and sum(x['status']=='compiled' for x in flint_probes['results'])==153)
check('translation current replay scope',len(runtime['results'])==6 and sum(len(x.get('stages',[])) for x in runtime['results'])==46 and all(x['status']=='executed' for x in runtime['results']))
wpids={w['id'] for w in plan['workPackages']};testids={t['id'] for t in plan['acceptanceTests']}
check('plan size',len(wpids)==22 and len(testids)==79)
check('every active test has a work owner',testids==set(t for w in plan['workPackages'] for t in w['acceptance']))
check('plan dependencies',all(set(w['dependsOn'])<=wpids and set(w['acceptance'])<=testids for w in plan['workPackages']))
check('proposal remains unimplemented',all(w['status']=='proposed-not-implemented' for w in plan['workPackages']))
check('traceability denominator',len(trace['requirements'])==2311 and trace['counts']=={'flint':874,'corpusFeatureKinds':1405,'userRequirements':22,'nativeRequirements':10,'referenceOnly':2279,'deferred':2,'active':30,'total':2311})
check('traceability has owners',all(set(x['workPackages'])<=wpids and len(x['workPackages'])>0 for x in trace['requirements'] if x['required']))
active=[x for x in trace['requirements'] if x['required']]
reference=[x for x in trace['requirements'] if x['scopeDisposition']=='reference-only']
deferred=[x for x in trace['requirements'] if x['scopeDisposition']=='deferred-by-user']
check('reference rows have no implementation obligations',len(reference)==2279 and all(x['scopeDisposition']=='reference-only' and not x['workPackages'] and not x['acceptance'] for x in reference))
check('native active rows only',len(active)==30 and all(x['id'].startswith(('USR-','GGA-')) for x in active))
check('withdrawn work not active',set(w['id'] for w in plan['withdrawnWorkPackages'])=={'WP-01','WP-15','WP-16','WP-17'} and not (wpids & {'WP-01','WP-15','WP-16','WP-17'}))
check('withdrawn tests not active',set(t['id'] for t in plan['withdrawnAcceptanceTests'])=={'AT-03','AT-05','AT-46','AT-47','AT-48','AT-49','AT-50','AT-51','AT-52'} and not(set(t['id'] for t in plan['withdrawnAcceptanceTests']) & testids))
check('unique HTML ids',len(p.ids)==len(set(p.ids)))

policy=read('scope-policy.json');mapping=read('target-chart-mapping.json');screen=read('corpus-scope-screening-summary.json')
check('external goals removed',not policy['externalReferences']['Flint']['releaseGate'] and not policy['externalReferences']['chart-llm']['translationRequired'] and not policy['externalReferences']['chart-llm']['releaseGate'])
check('scope profile',plan['scopeProfile']==policy['profile']=='ggaction-native-2026-10-27')
check('source target census',mapping['counts']=={'sourceChartNames':51,'sourceBackendEntries':154,'excludedChartNames':2,'excludedBackendEntries':4,'namesBeforeOptionPolicy':49,'backendEntriesBeforeOptionPolicy':150})
check('required bundling methods',set(policy['mandatoryBundlingMethods'])=={'hierarchical','force-directed','density','edge-path'})
check('required inference rules',len(policy['mandatoryInferenceRules'])==6)
check('all source rows preserved',set(x['id'] for x in read('flint-requirements.json')['requirements']) <= set(x['id'] for x in trace['requirements']))
check('all trace tests linked',all(set(x['acceptance'])<=testids and bool(x['acceptance']) for x in trace['requirements'] if x['required']))
check('all user requirements covered',len([x for x in trace['requirements'] if x['id'].startswith('USR-')])==22)
check('disposition present and no false qualifications',all(x.get('scopeDisposition') and x['status'] not in ['pass','fully-qualified'] for x in trace['requirements']))
bychart={c['chart']:c for c in mapping['charts']}
check('KPI Gauge excluded',all(bychart[n]['priorScopeDisposition']=='excluded-by-user' for n in ['KPI Card','Gauge Chart']))
check('Pyramid naming collision resolved',bychart['Funnel Chart']['targetRepresentation']=='stage-pyramid' and bychart['Pyramid Chart']['targetRepresentation']=='mirrored-bars')
check('composition-only sources',all(bychart[n]['priorScopeDisposition']=='required-via-composition' for n in ['Marginal Plot','Bullet Chart']) and bychart['Combo Chart']['priorScopeDisposition']=='scoped-conditional')
check('single Y policy',policy['singleY']['maxYScales']==1 and policy['singleY']['maxVisibleYGuides']==1 and not policy['singleY']['hiddenIndependentScaleAllowed'])
check('original evidence unchanged',all(hashlib.sha256((ROOT/'evidence'/name).read_bytes()).hexdigest()==digest for name,digest in read('pre-revision-source-hashes.json').items()))
check('all corpus occurrences screened',screen['rows']==24987 and screen['rootOccurrences']==24957 and screen['embeddedOccurrences']==30 and screen['finalPolicyQualifications']==0)
with (ROOT/'evidence/corpus-scope-screening.csv').open() as fp: screening_rows=list(csv.DictReader(fp))
check('corpus scope csv denominator',len(screening_rows)==screen['rows'] and sum(screen['screenStates'].values())==screen['rows'])
seen=set();dag=True
for w in plan['workPackages']:
    dag=dag and set(w['dependsOn'])<=seen;seen.add(w['id'])
check('work order topological',dag)
check('set visualization work deferred','WP-23' not in wpids and set(w['id'] for w in plan['deferredPlan']['workPackages'])=={'WP-23'})
check('set visualization tests deferred',not(testids & {'AT-66','AT-67','AT-68','AT-69'}) and set(t['id'] for t in plan['deferredPlan']['acceptanceTests'])=={'AT-66','AT-67','AT-68','AT-69'})
check('set visualization requirements deferred',{x['id'] for x in deferred}=={'USR-03','USR-04'} and all(not x['required'] and not x['workPackages'] and not x['acceptance'] for x in deferred))
check('set visualization no release gate',not policy['deferredFeatures']['setVisualization']['releaseGate'] and next(x for x in policy['policies'] if x['id']=='POL-02')['disposition']=='deferred-by-user')
check('set fixture preserved only for future','upset' not in read('revision-oracle-fixtures.json') and read('deferred-upset-oracle-fixture.json')['status']=='deferred-reference-only')
api_part=(ROOT/'parts/65-api-contracts.ko.md').read_text()
check('set constructors absent from active API table',all('| `'+name+'` |' not in api_part for name in ['createSetData','createIntersectionData','createUpSetPlot']))
check('appendix F rendered','appendix-f' in p.ids)


repos={'ggaction/ggaction':find_repository(),'microsoft/flint-chart':Path(os.environ.get('GGACTION_REFERENCE_SOURCES',ROOT/'sources'))/'flint-chart','hyungkwonko/chart-llm':Path(os.environ.get('GGACTION_REFERENCE_SOURCES',ROOT/'sources'))/'chart-llm','ggaction/chart-datasets':Path(os.environ.get('GGACTION_REFERENCE_SOURCES',ROOT/'sources'))/'chart-datasets'}
commits={'ggaction/ggaction':'40ec7edead7fc84de05aad31888dd0f7d264a512','microsoft/flint-chart':'a794557384adcc3293a77043f6b9aff1c33d152c','hyungkwonko/chart-llm':'6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24','ggaction/chart-datasets':'58791ace7212cacb98c2b64e3f92280722ab638e'}
repo_state=[]
for name,folder in repos.items():
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=folder,text=True).strip()
    status=subprocess.check_output((['git','status','--short','--','.',':(exclude)study'] if name=='ggaction/ggaction' else ['git','status','--short']),cwd=folder,text=True).strip()
    repo_state.append({'repo':name,'commit':sha,'status':status})
    check('pinned '+name,subprocess.run(['git','merge-base','--is-ancestor',commits[name],'HEAD'],cwd=folder,capture_output=True).returncode==0 if name=='ggaction/ggaction' else sha==commits[name],sha)
    permitted_untracked='?? .audit-runtime/' if name=='microsoft/flint-chart' else ''
    check('source unchanged '+name,status in ['',permitted_untracked],{'status':status,'permittedGeneratedDirectory':permitted_untracked or None})

link_errors=[];local_count=0;source_count=0
for link in sorted(set(p.links)):
    u=urlparse(link)
    if not u.scheme and not u.netloc:
        if u.path:
            local_count+=1
            target=(ROOT/unquote(u.path)).resolve()
            if not target.exists():link_errors.append({'link':link,'error':'local target missing'})
        elif u.fragment and unquote(u.fragment) not in p.ids:link_errors.append({'link':link,'error':'HTML anchor missing'})
    if u.netloc=='github.com':
        parts=u.path.strip('/').split('/')
        if len(parts)>=5 and parts[2]=='blob' and '/'.join(parts[:2]) in repos:
            repo='/'.join(parts[:2]);sha=parts[3];rel=unquote('/'.join(parts[4:]));target=repos[repo]/rel;source_count+=1
            if sha!=commits[repo]:link_errors.append({'link':link,'error':'unfixed or unexpected source commit'})
            elif not target.is_file():link_errors.append({'link':link,'error':'source path missing'})
            elif u.fragment:
                nums=[int(n) for n in re.findall(r'L(\d+)',u.fragment)]
                if nums:
                    n=len(target.read_text(errors='replace').splitlines())
                    if not all(1<=v<=n for v in nums):link_errors.append({'link':link,'error':f'line outside 1..{n}'})
check('local/source/anchor links',not link_errors,{'local':local_count,'sourcePermalinks':source_count,'errors':link_errors})
build=read('report-build.json')
check('report build hash',hashlib.sha256((ROOT/'REPORT.ko.md').read_bytes()).hexdigest()==build['sha256']['markdown'] and hashlib.sha256((ROOT/'REPORT.ko.html').read_bytes()).hexdigest()==build['sha256']['html'])
check('all source actions represented',all(a['name'] in (ROOT/'REPORT.ko.md').read_text() for a in g['actions']))
result={'generatedAt':datetime.now(timezone.utc).isoformat(),'scope':'Report evidence consistency, references and proposals; not external chart conformance','passed':not errors,'checks':checks,'repoState':repo_state,'errors':errors}
(ROOT/'evidence/report-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':not errors,'checks':len(checks),'sourcePermalinks':source_count,'localLinks':local_count,'errors':errors},ensure_ascii=False))
raise SystemExit(0 if not errors else 1)
