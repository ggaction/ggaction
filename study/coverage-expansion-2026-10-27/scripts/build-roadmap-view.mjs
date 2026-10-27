import {loadMarked} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {marked}=await loadMarked();
const md=fs.readFileSync(path.join(root,'ROADMAP.ko.md'),'utf8');
const plan=JSON.parse(fs.readFileSync(path.join(root,'roadmap/plan.json'),'utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const toc=[],renderer=new marked.Renderer();
renderer.heading=function({tokens,depth}){
 const html=this.parser.parseInline(tokens),text=html.replace(/<[^>]*>/g,'');
 const step=text.match(/^(STEP-\d+)\s/);
 const id=step?step[1].toLowerCase():'r-'+toc.length;
 toc.push({depth,text,id});
 return `<h${depth} id="${id}">${html}<a class="anchor" href="#${id}" aria-label="절 링크">#</a></h${depth}>`;
};
renderer.table=function(t){return `<div class="table-scroll" tabindex="0" role="region" aria-label="가로 스크롤 표">${marked.Renderer.prototype.table.call(this,t)}</div>`;};
renderer.html=({text})=>esc(text);
const body=marked.parse(md,{renderer,gfm:true});
const common=fs.readFileSync(path.join(root,'scripts/build-report.mjs'),'utf8').match(/<style>\n([\s\S]*?)\n<\/style>/)[1];
const chapters=toc.filter(h=>h.depth===2);
const nav=chapters.map(h=>`<a href="#${h.id}">${esc(h.text)}</a>`).join('');
const tasknav=plan.tasks.map(t=>`<a href="#${t.id.toLowerCase()}" data-wp="${t.workPackage}"><b>${t.id}</b> ${esc(t.title)}<small>${t.workPackage} · planned</small></a>`).join('');
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggaction 상세 구현 로드맵</title><style>${common}
aside details{margin-top:18px}aside summary{cursor:pointer;font-weight:700;font-size:14px}.task-nav a[hidden]{display:none}.task-nav small{display:block;color:#adc8cf;font-size:11px}select{width:100%;font:inherit;font-size:12px;padding:7px;border-radius:4px;margin-top:10px}.flow{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0}.flow span{padding:7px 10px;border:1px solid #bcd2d6;background:white;font-size:12px}.flow span:after{content:' →';color:#708c92}.flow span:last-child:after{content:''}.status-note{border-left:4px solid #b57c20;background:#fff9ed;padding:12px 17px;font-size:14px}.facts{grid-template-columns:repeat(4,1fr)}@media(max-width:720px){.facts{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<a class="skip" href="#report">본문으로 이동</a><button class="mobile-menu" aria-expanded="false">목차와 작업 검색</button><aside><p class="brand">ggaction</p><p class="subbrand">상세 구현 로드맵 · native design</p><div class="tools"><a href="ROADMAP.ko.md">Markdown 원문</a><a href="roadmap/plan.json">작업 DAG와 상태 JSON</a><a href="roadmap/oracle-fixtures.json">독립 기대값 26개</a><a href="REPORT.ko.html">기존 조사 보고서</a><button id="print">인쇄</button></div><label class="search-label" for="search">계약과 작업 전체 검색</label><input id="search" type="search" placeholder="kNN, STEP-035, cancel…"><div id="search-status" role="status"></div><div class="search-results" hidden></div><div class="toc"><details open><summary>공통 계약</summary>${nav}</details><details open><summary>실행 카드 ${plan.tasks.length}개</summary><label class="search-label" for="wp-filter">작업 묶음</label><select id="wp-filter"><option value="all">모든 WP</option>${plan.workPackages.map(w=>`<option value="${w.id}">${w.id} ${esc(w.title)}</option>`).join('')}</select><div class="task-nav">${tasknav}</div></details></div></aside>
<main><header class="hero"><div class="eyebrow">IMPLEMENTATION ROADMAP · 2026 10 27</div><h1>ggaction 상세 구현 로드맵</h1><p>작은 액션과 공통 리소스로 기능을 완결하기 위한 실행 명세. 입력·출력·수식·오류·소스 위치·시험·인계 조건을 함께 고정했습니다.</p><div class="facts"><div class="fact"><strong>${plan.tasks.length}</strong><span>작은 실행 카드</span></div><div class="fact"><strong>79</strong><span>인수 시험군과 종료 담당</span></div><div class="fact"><strong>30</strong><span>활성 native·사용자 요구</span></div><div class="fact"><strong>26</strong><span>독립 기대값 fixture</span></div></div><div class="flow"><span>기반과 geometry</span><span>데이터와 구조</span><span>디자인과 geo</span><span>인터랙션과 시간</span><span>종단 검증과 릴리스</span></div><p class="status-note">계획과 검토용 계약입니다. 새 기능은 아직 구현·검증된 것으로 기록하지 않았습니다. Flint 정합성·번역·전용 집합 시각화는 이번 범위에서 제외합니다.</p></header><article id="report">${body}</article><p class="foot">기준 ${plan.baseline.version} · ${plan.baseline.commit} · 인터넷 없이 읽을 수 있습니다.</p></main><div id="progress"></div>
<script>
const $=s=>document.querySelector(s),search=$('#search'),results=$('.search-results'),toc=$('.toc');
const blocks=[...document.querySelectorAll('article h2,article h3,article h4,article p,article li,article tr')];
const jump=el=>{document.querySelector('.highlight')?.classList.remove('highlight');el.classList.add('highlight');el.scrollIntoView({block:'start'});document.body.classList.remove('nav-open');$('.mobile-menu').setAttribute('aria-expanded','false');};
search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();results.replaceChildren();results.hidden=!q;toc.hidden=!!q;if(!q){$('#search-status').textContent='';return;}const matches=blocks.filter(e=>e.textContent.toLowerCase().includes(q));$('#search-status').textContent=matches.length+'개 결과 · 최대 60개 표시';for(const el of matches.slice(0,60)){const b=document.createElement('button');b.textContent=el.textContent.slice(0,160);b.onclick=()=>jump(el);results.append(b);}});
search.addEventListener('keydown',e=>{if(e.key==='Escape'){search.value='';search.dispatchEvent(new Event('input'));search.blur();}});
$('#wp-filter').onchange=e=>{for(const a of document.querySelectorAll('.task-nav a'))a.hidden=e.target.value!=='all'&&a.dataset.wp!==e.target.value;};
$('.mobile-menu').onclick=()=>{const open=document.body.classList.toggle('nav-open');$('.mobile-menu').setAttribute('aria-expanded',String(open));};
for(const a of document.querySelectorAll('aside a[href^="#"]'))a.onclick=()=>{document.body.classList.remove('nav-open');$('.mobile-menu').setAttribute('aria-expanded','false');};
$('#print').onclick=()=>window.print();
addEventListener('scroll',()=>{$('#progress').style.width=(innerWidth-(innerWidth>720?document.querySelector('aside').offsetWidth:0))*scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)+'px';},{passive:true});
</script></body></html>`;
fs.writeFileSync(path.join(root,'ROADMAP.ko.html'),html);
const file=path.join(root,'evidence/roadmap-build.json'),meta=JSON.parse(fs.readFileSync(file,'utf8'));
Object.assign(meta,{htmlBytes:Buffer.byteLength(html),htmlSha256:createHash('sha256').update(html).digest('hex'),chapters:chapters.length,headings:toc.length,tables:(body.match(/<table>/g)||[]).length,toc});
fs.writeFileSync(file,JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify({htmlBytes:meta.htmlBytes,chapters:meta.chapters,headings:meta.headings,tables:meta.tables}));
