import {loadMarked} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {marked}=await loadMarked();
const read=name=>fs.readFileSync(path.join(root,'parts',name),'utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function chapter(file,number,title){
  const text=read(file), cut=text.indexOf('\n## 부록');
  let main=(cut<0?text:text.slice(0,cut)).replace(/^# .*\n/,'');
  main=main.replace(/^(#{2,5})\s+(?:C\.)?(\d+(?:\.\d+)*)\.?\s+(.+)$/gm,(_m,hash,num,label)=>'#'.repeat(hash.length+1)+' '+number+'.'+num+' '+label);
  main=main.replace(/^(#{2,5})\s+(?!\d)(.+)$/gm,(_m,hash,label)=>'#'.repeat(hash.length+1)+' '+label);
  return {main:`## ${number}. ${title}\n\n${main.trim()}\n`,appendix:cut<0?'':text.slice(cut)};
}
const gg=chapter('ggaction-audit.ko.md',2,'현재 ggaction: 전체 기능과 구현 경계');
const flint=chapter('flint-audit.ko.md',3,'Flint 조사 기록 — 참고 전용');
const corpus=chapter('corpus-audit.ko.md',4,'코퍼스·기존 번역 조사 기록 — 참고 전용');
const ga=gg.appendix.replace('## 부록 A.','## 부록 A.');
const fa=flint.appendix.replace('## 부록 A.','## 부록 B.').replace('## 부록 B. 중요한','## 부록 C. 중요한').replace('## 부록 C. 재현','## 부록 D. 재현');
let md=[read('00-scope.ko.md'),gg.main,flint.main,corpus.main,read('40-architecture.ko.md'),read('45-design-and-adapters.ko.md'),read('50-verification.ko.md'),read('55-generated-plan.ko.md'),read('60-closure.ko.md'),ga,fa,read('65-api-contracts.ko.md'),read('70-scope-revision.ko.md')].join('\n\n');
// Part documents use report-root evidence paths, so the integrated file needs no relocation.
fs.writeFileSync(path.join(root,'REPORT.ko.md'),md);
const toc=[];
const renderer=new marked.Renderer();
renderer.heading=function({tokens,depth}){
  const content=this.parser.parseInline(tokens), plain=content.replace(/<[^>]*>/g,'').replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  let id='section-'+String(toc.length+1).padStart(3,'0');
  const chapterNumber=depth===2&&plain.match(/^(\d+)\./);
  if(chapterNumber)id='chapter-'+chapterNumber[1];
  const appendix=depth===2&&plain.match(/^부록 ([A-Z])\./);
  if(appendix)id='appendix-'+appendix[1].toLowerCase();
  toc.push({depth,id,text:plain});
  return `<h${depth} id="${id}">${content}<a class="anchor" href="#${id}" aria-label="이 절 링크">#</a></h${depth}>\n`;
};
renderer.table=function(token){
  const normal=marked.Renderer.prototype.table.call(this,token);
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="표: 가로 스크롤 가능">${normal}</div>`;
};
renderer.html=({text})=>esc(text);
const plan=JSON.parse(fs.readFileSync(path.join(root,'evidence/implementation-plan.json'),'utf8'));
const content=marked.parse(md,{renderer,gfm:true});
const headings=toc.filter(t=>t.depth===2);
const nav=headings.map(h=>`<a href="#${h.id}">${esc(h.text)}</a>`).join('');
const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ggaction 자체 설계와 기능 확장 — 조사와 구현 명세</title>
<style>
:root{--ink:#182d39;--muted:#536773;--paper:#fff;--line:#dbe4e8;--accent:#005d66;--light:#eef5f5;--sidebar:292px;color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",Arial,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:auto;scroll-padding-top:24px}body{margin:0;background:#f4f7f8;color:var(--ink);font-size:16px;line-height:1.85}a{color:var(--accent);text-underline-offset:3px}a:hover{text-decoration-thickness:2px}a:focus-visible,button:focus-visible,input:focus-visible,.table-scroll:focus-visible{outline:3px solid #dc8b18;outline-offset:3px}button,input{font:inherit}button{cursor:pointer}
.skip{position:fixed;left:10px;top:-100px;z-index:20;background:white;padding:10px}.skip:focus{top:10px}aside{position:fixed;inset:0 auto 0 0;width:var(--sidebar);background:#102d38;color:#ecf4f5;padding:28px 22px;overflow:auto;border-right:1px solid #143f4a;z-index:10}.brand{font-size:24px;letter-spacing:-.7px;font-weight:750;margin:0}.subbrand{font-size:12px;color:#bed2d8;margin:3px 0 22px}.tools{display:grid;gap:9px}.tools a,.tools button{color:#e5f4f4;background:#1c4651;border:1px solid #39616b;border-radius:5px;font-size:12px;text-decoration:none;padding:7px 9px;text-align:left}.search-label{font-size:12px;color:#c5dcdf;display:block;margin:19px 0 6px}#search{width:100%;padding:9px 10px;border:1px solid #557b84;border-radius:4px;background:#fff;color:#102d38;font-size:14px}#search-status{font-size:12px;color:#bfd6db;min-height:23px}.toc{margin-top:12px}.toc a{display:block;color:#c8dce1;text-decoration:none;font-size:12px;line-height:1.55;padding:8px 0;border-bottom:1px solid #234650}.toc a:hover,.toc a.active{color:white;font-weight:700}.search-results button{display:block;border:0;border-bottom:1px solid #345861;background:none;color:#fff;text-align:left;width:100%;font-size:12px;line-height:1.5;padding:10px 0}.search-results small{display:block;color:#b5ced6;margin-top:5px}.search-results[hidden],.toc[hidden]{display:none}
main{margin-left:var(--sidebar);max-width:1450px;padding:48px 52px 90px}.hero{padding-bottom:28px;border-bottom:3px solid var(--ink);margin-bottom:32px}.eyebrow{font-size:12px;letter-spacing:1.2px;color:#3a6770;font-weight:750}.hero h1{word-break:keep-all;font-size:36px;line-height:1.3;letter-spacing:-1.4px;margin:13px 0 18px}.hero p{max-width:850px;color:var(--muted);margin:0}.pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.pill{border:1px solid #c6dadd;border-radius:4px;background:#eaf3f4;font-size:12px;padding:3px 8px}.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:25px 0 0}.fact{background:white;border:1px solid var(--line);padding:14px 16px}.fact strong{display:block;font-size:25px;color:#005b64;line-height:1.3}.fact span{font-size:12px;color:var(--muted)}
article{background:var(--paper);border:1px solid var(--line);padding:34px 38px;overflow:hidden}article>h1{display:none}article h2{font-size:27px;line-height:1.4;letter-spacing:-.8px;margin:60px 0 24px;border-top:2px solid #173f4b;padding-top:24px}article h2:first-of-type{margin-top:15px}article h3{font-size:21px;line-height:1.45;margin:34px 0 16px;letter-spacing:-.4px}article h4{font-size:18px;margin:26px 0 10px}article p{margin:14px 0;overflow-wrap:anywhere}article li{margin:8px 0;overflow-wrap:anywhere}article ul,article ol{padding-left:25px}.anchor{font-size:.7em;color:#7d9b9f;margin-left:10px;text-decoration:none;opacity:0}h2:hover .anchor,h3:hover .anchor,h4:hover .anchor,.anchor:focus{opacity:1}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.84em;background:#edf3f5;border-radius:3px;padding:2px 4px;overflow-wrap:anywhere}pre{background:#112e3a;color:#e3f0f2;border-radius:6px;padding:20px;overflow:auto;line-height:1.65;font-size:13px}pre code{background:none;padding:0;font-size:inherit;overflow-wrap:normal}blockquote{margin:24px 0;border-left:4px solid #257b82;padding:4px 20px;background:#f0f6f6;color:#34515b}.table-scroll{overflow-x:auto;margin:25px 0;border:1px solid var(--line);border-radius:5px}table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.65;min-width:640px}th{background:#eaf2f3;text-align:left;color:#153d48;font-weight:700}th,td{padding:11px 13px;border-bottom:1px solid #e1e8eb;vertical-align:top;min-width:90px;overflow-wrap:anywhere}tr:last-child td{border-bottom:0}tr:nth-child(even) td{background:#fafcfc}table code{font-size:11px}table th:first-child,table td:first-child{min-width:110px}strong{font-weight:730}hr{border:0;border-top:1px solid var(--line);margin:42px 0}.highlight{outline:3px solid #e2b242;outline-offset:5px;background:#fff8d7!important}.mobile-menu{display:none}.foot{font-size:12px;color:var(--muted);margin-top:26px}#progress{position:fixed;left:var(--sidebar);top:0;height:3px;background:#00858e;z-index:9;width:0}
@media(min-width:1600px){main{padding-left:70px;padding-right:70px}}
@media(max-width:1000px){:root{--sidebar:245px}main{padding:35px 25px}article{padding:25px}.hero h1{font-size:30px}.facts{grid-template-columns:repeat(2,1fr)}}
@media(max-width:720px){:root{--sidebar:0px}aside{display:none;width:280px;top:50px}body.nav-open aside{display:block}.mobile-menu{display:block;position:sticky;top:0;z-index:12;width:100%;background:#102d38;color:white;border:0;text-align:left;padding:11px 18px;font-size:14px}main{margin:0;padding:25px 14px}article{padding:19px 16px}.hero h1{font-size:27px}article h2{font-size:23px}article h3{font-size:20px}body{font-size:15px}.facts{gap:8px}.fact{padding:10px}#progress{top:49px}.table-scroll{margin:20px -3px}pre{padding:13px;font-size:11px}}
@media print{aside,.mobile-menu,#progress,.hero .pills,.anchor{display:none!important}main{margin:0;padding:0;max-width:none}article{border:0;padding:0}body{background:#fff;font-size:10pt;line-height:1.55}.hero{break-after:page}.facts{display:none}h2,h3,h4{break-after:avoid}table{font-size:8pt;min-width:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;color:#111;background:#f2f5f6}.table-scroll{overflow:visible}a{color:#173c48}article h2{margin-top:35px}.foot{display:none}}
</style></head><body>
<a class="skip" href="#report">본문으로 이동</a><button class="mobile-menu" aria-expanded="false" aria-controls="sidebar">목차 · 문서 검색</button>
<aside id="sidebar"><p class="brand">ggaction</p><p class="subbrand">COVERAGE EXPANSION · 2026.10.27</p><div class="tools"><a href="REPORT.ko.md">Markdown 원문</a><a href="evidence/implementation-plan.json">구현 계획 · ${plan.workPackages.length}개 작업</a><a href="evidence/requirements-traceability.csv">요구사항 원장 · CSV</a><button id="print">인쇄 / PDF로 저장</button></div><label class="search-label" for="search">본문 검색</label><input id="search" type="search" placeholder="예: identity, geo, WP-10" autocomplete="off"><div id="search-status" role="status" aria-live="polite"></div><nav class="toc" aria-label="보고서 목차">${nav}</nav><div class="search-results" hidden></div></aside>
<div id="progress" aria-hidden="true"></div><main><header class="hero"><div class="eyebrow">SOURCE AUDIT / IMPLEMENTATION SPECIFICATION</div><h1>재사용 가능한 native action으로.<br>자체 설계와 기능 확장 설계.</h1><p>ggaction의 현재 기능과 자체 설계 계약, 인터랙션·애니메이션·geo의 공통 기반, 구현 순서와 완료 판정을 연결한 상세 보고서입니다.</p><div class="pills"><span class="pill">기준 ggaction 0.0.26</span><span class="pill">Icicle · 그래프 추론 · Bundling</span><span class="pill">범위 개정 · 새 기능 구현 전</span><span class="pill">오프라인 읽기 · 외부 리소스 없음</span></div><div class="facts"><div class="fact"><strong>298</strong><span>현재 공개 액션 카탈로그</span></div><div class="fact"><strong>30</strong><span>활성 native · 사용자 요구</span></div><div class="fact"><strong>4</strong><span>필수 edge bundling 방법</span></div><div class="fact"><strong>${plan.workPackages.length} / ${plan.acceptanceTests.length}</strong><span>구현 작업 / 인수 시험군</span></div></div></header><article id="report">${content}</article><p class="foot">고정된 소스 기준의 조사 문서입니다. 전수 인벤토리와 일부 실행 증거를 포함하며, 새로운 기능의 구현 완료 또는 전체 원본 충실도 합격을 주장하지 않습니다.</p></main>
<script>
const search=document.querySelector('#search'),status=document.querySelector('#search-status'),results=document.querySelector('.search-results'),toc=document.querySelector('.toc');
const blocks=[...document.querySelectorAll('article h2,article h3,article h4,article p,article li,article tr,article pre')];
let section='보고서';const index=blocks.map((el,i)=>{if(/^H/.test(el.tagName))section=el.textContent.replace(/#$/,'');return {el,text:el.textContent,lower:el.textContent.toLocaleLowerCase(),section,i}});
let highlighted=null;
function show(el){if(highlighted)highlighted.classList.remove('highlight');highlighted=el;el.classList.add('highlight');el.scrollIntoView({block:'center'});document.body.classList.remove('nav-open');document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');}
search.addEventListener('input',()=>{const q=search.value.trim().toLocaleLowerCase();results.replaceChildren();toc.hidden=!!q;results.hidden=!q;if(!q){status.textContent='';return;}const hits=index.filter(x=>x.lower.includes(q));status.textContent=hits.length+'개 문단/행 일치 · 최대 60개 표시';for(const h of hits.slice(0,60)){const button=document.createElement('button');button.type='button';button.textContent=h.section;const small=document.createElement('small');const at=h.lower.indexOf(q),start=Math.max(0,at-35);small.textContent=(start?'…':'')+h.text.slice(start,start+145);button.append(small);button.addEventListener('click',()=>show(h.el));results.append(button);}});
search.addEventListener('keydown',e=>{if(e.key==='Enter'){results.querySelector('button')?.click();}if(e.key==='Escape'){search.value='';search.dispatchEvent(new Event('input'));}});
document.querySelector('.mobile-menu').addEventListener('click',e=>{const open=document.body.classList.toggle('nav-open');e.currentTarget.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.toc a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('nav-open');document.querySelector('.mobile-menu').setAttribute('aria-expanded','false');}));
document.querySelector('#print').addEventListener('click',()=>window.print());
const links=[...document.querySelectorAll('.toc a')];const sections=links.map(a=>document.getElementById(a.hash.slice(1)));
let raf=0;function track(){raf=0;const scroll=document.documentElement;const ratio=scroll.scrollTop/Math.max(1,scroll.scrollHeight-scroll.clientHeight);document.querySelector('#progress').style.width=(ratio*(innerWidth-(innerWidth>720?document.querySelector('aside').offsetWidth:0)))+'px';let active=0;sections.forEach((s,i)=>{if(s.getBoundingClientRect().top<140)active=i;});links.forEach((a,i)=>a.classList.toggle('active',i===active));}window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(track)},{passive:true});track();
</script></body></html>`;
fs.writeFileSync(path.join(root,'REPORT.ko.html'),html);
const partFiles=fs.readdirSync(path.join(root,'parts')).filter(f=>f.endsWith('.md'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const manifest={generatedAt:new Date().toISOString(),markdownBytes:Buffer.byteLength(md),htmlBytes:Buffer.byteLength(html),markdownLines:md.split('\n').length,characters:md.length,headings:toc.length,chapters:headings.length,tables:(content.match(/<table>/g)||[]).length,sha256:{markdown:hash(md),html:hash(html)},parts:partFiles.map(file=>({file,sha256:hash(read(file))})),toc};
fs.writeFileSync(path.join(root,'evidence/report-build.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({markdownBytes:manifest.markdownBytes,characters:manifest.characters,lines:manifest.markdownLines,headings:manifest.headings,tables:manifest.tables}));
