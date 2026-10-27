"""Inventory source documentation and visible built content without changing it."""
from pathlib import Path
from html.parser import HTMLParser
import re,json,hashlib,collections
ROOT=Path(__file__).resolve().parents[2]/'ggaction'
OUT=Path(__file__).resolve().parent/'evidence'

class MainText(HTMLParser):
 def __init__(self):
  super().__init__();self.main=0;self.suppressed=0;self.text=[];self.headings=0;self.codes=0
 def handle_starttag(self,tag,attrs):
  if tag=='main':self.main+=1
  if self.main and tag in ['script','style']:self.suppressed+=1
  if self.main and tag in ['h1','h2','h3','h4']:self.headings+=1
  if self.main and tag=='pre':self.codes+=1
 def handle_endtag(self,tag):
  if self.main and tag in ['script','style']:self.suppressed-=1
  if tag=='main':self.main-=1
 def handle_data(self,data):
  if self.main and not self.suppressed:self.text.append(data)

manifest=json.loads((ROOT/'docs/llms-manifest.json').read_text())
pages=[];snippets=collections.defaultdict(list)
for section in manifest['sections']:
 source=ROOT/'docs'/section['source'];text=source.read_text()
 route=section['route'];html=ROOT/'_site'/route.lstrip('/')/'index.html'
 parser=MainText()
 if html.exists():parser.feed(html.read_text())
 codes=list(re.finditer(r'^```([^\n]*)\n(.*?)^```',text,re.M|re.S))
 for i,code in enumerate(codes):
  norm=code.group(2).strip()
  if len(norm)>80:snippets[hashlib.sha256(norm.encode()).hexdigest()].append({'source':section['source'],'block':i+1,'line':text[:code.start()].count('\n')+1,'language':code.group(1).strip()})
 pages.append({'source':section['source'],'route':route,'title':section['title'],'sourceLines':len(text.splitlines()),'sourceBytes':source.stat().st_size,'bundleBytes':section['bytes'],'headings':parser.headings,'codeBlocks':parser.codes,'rawFences':len(codes),'visibleWords':len(re.findall(r'\S+',' '.join(parser.text))),'generatedMarkers':len(re.findall('generated',text,re.I))})
docs=list((ROOT/'docs').rglob('*'));tracked=__import__('subprocess').check_output(['git','ls-files','docs'],cwd=ROOT).decode().splitlines()
groups=collections.Counter('root' if '/' not in p['source'] else p['source'].split('/')[0] for p in pages)
summary={'pageCount':len(pages),'trackedDocsFiles':len(tracked),'groups':dict(groups),'visibleWordsWithCode':sum(p['visibleWords'] for p in pages),'sourceFences':sum(p['rawFences'] for p in pages),'renderedCodeBlocks':sum(p['codeBlocks'] for p in pages),'bundleBytes':(ROOT/'docs/llms-full.txt').stat().st_size,'searchIndexBytes':(ROOT/'docs/search-index.json').stat().st_size,'searchEntries':len(json.loads((ROOT/'docs/search-index.json').read_text())),'duplicatedCodeGroups':len([s for s in snippets.values() if len(s)>1]),'largestPages':sorted(pages,key=lambda p:p['visibleWords'],reverse=True)[:15]}
(OUT/'corpus-metrics.json').write_text(json.dumps({'summary':summary,'pages':pages,'exactDuplicateCodeGroups':[s for s in snippets.values() if len(s)>1]},indent=2)+'\n')
print(json.dumps(summary,indent=2))
