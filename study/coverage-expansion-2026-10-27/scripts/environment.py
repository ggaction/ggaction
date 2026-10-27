"""Locate a checkout in either the tracked or original sibling study layout."""
import json,os
from pathlib import Path
REPORT_ROOT=Path(__file__).resolve().parents[1]
def find_repository():
 candidates=[]
 if os.environ.get('GGACTION_SOURCE'):candidates.append(Path(os.environ['GGACTION_SOURCE']))
 for p in [REPORT_ROOT,*REPORT_ROOT.parents]:candidates.extend([p,p/'ggaction'])
 for p in candidates:
  try:
   if json.loads((p/'package.json').read_text()).get('name')=='ggaction' and (p/'src/core/ChartProgram.js').exists():return p.resolve()
  except (OSError,ValueError):pass
 raise RuntimeError('Set GGACTION_SOURCE to the ggaction checkout.')
