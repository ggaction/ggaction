from pathlib import Path
import hashlib, json, os, shutil, subprocess, time
root=Path.cwd(); directory=root/'.artifacts/font-public'; artifact=directory/'font-final-33a8ed88.tgz'
expected='33a8ed88e9392d05aa2ea2b4ac3349fef1bdb2c2b816f409d375827adfd8575b'
assert hashlib.sha256(artifact.read_bytes()).hexdigest()==expected
nodes=[('20','/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node'),('22','/opt/homebrew/Cellar/node@22/22.23.1/bin/node'),('24','/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node')]
records=[]
for version,node in nodes:
 env=os.environ.copy(); env['PATH']=str(Path(node).parent)+':'+env['PATH']
 start=time.time(); out=directory/f'installed-node{version}.log'
 with out.open('w') as log:
  result=subprocess.run([node,'scripts/package-consumer.js',str(artifact)],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 receipt=directory/f'installed-node{version}'; receipt.mkdir(exist_ok=True)
 for name in ['qualification.json','node-cases.json','tutorials.json']:
  p=root/'.artifacts/consumers'/name
  if p.is_file(): shutil.copyfile(p,receipt/name)
 records.append({'node':version,'artifactSHA256':expected,'exitCode':result.returncode,'durationSeconds':time.time()-start,'log':out.name,'receipts':receipt.name})
 (directory/'installed-matrix.json').write_text(json.dumps(records,indent=2)+'\n')
 print(json.dumps(records[-1]),flush=True)
 if result.returncode: raise SystemExit(result.returncode)
