#!/usr/bin/env python3
"""Literal design fixtures with independent arithmetic checks; not library tests."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
F=[]
def add(id,slug,input,expected,assertion,tasks):
    F.append({'id':id,'capability':slug,'status':'expected-only-not-implementation-result','input':input,'expected':expected,
      'assertion':assertion,'taskSlugs':tasks.split(),'numericTolerance':{'absolute':1e-9,'relative':1e-9}})
add('OR-01','row-identity',{'before':[{'id':'a','v':1},{'id':'b','v':2}],'after':[{'id':'b','v':3},{'id':'a','v':1}],'key':'id'},
 {'survivingKeys':['a','b'],'updatedKeys':['b'],'oldBValue':2,'newBValue':3},'Compare logical identity, old program value and trace immutability, not scene array position.','row-identity scene-identity')
add('OR-02','partition',{'nodes':[['root',None,10],['A','root',6],['B','root',4],['A1','A',2],['A2','A',4]],'valueMode':'leaf-sum','width':1000},
 {'intervals':{'root':[0,1],'A':[0,.6],'B':[.6,1],'A1':[0,.2],'A2':[.2,.6]},'AWidth':600,'AAngle':3.7699111843077517},'Verify parent containment and sibling interval sums.','partition-values partition-intervals partition-marks')
add('OR-03','partition-focus',{'focus':'A','focusInterval':[0,.6],'childInterval':[0,.2]},
 {'childInterval':[0,.3333333333333333],'nodeKey':'A1'},'Focus only remaps view; node key does not change.','partition-navigation transition-sampler')
add('OR-04','radial-area',{'inner':0,'outer':100,'levels':2},
 {'equalDepthBoundary':50,'equalDepthAreaBoundary':70.71067811865476,'equalDepthAreaRingAreasOverPi':[5000,5000],'bendCenterAtAnyB':[0,.5],'bendEndQuarter':[1,0]},'Compare squared-radius band areas.','partition-marks')
add('OR-05','knn-radius',{'nodes':[['a',0],['b',1],['c',3],['d',10]],'k':1,'radius':2},
 {'directed':[['a','b'],['b','a'],['c','b'],['d','c']],'union':[['a','b'],['b','c'],['c','d']],'mutual':[['a','b']],'radius':[['a','b'],['b','c']]},'Distance then stable typed key; self excluded; radius inclusive.','graph-neighbors')
add('OR-06','duplicate-points',{'nodes':[['a',0],['b',0],['c',2]],'k':1},
 {'directed':[['a','b'],['b','a'],['c','a']],'zeroEdges':[['a','b'],['b','a']]},'Keep zero distances and resolve c tie by key.','graph-neighbors')
add('OR-07','metrics',{'a':[0,0],'b':[3,4],'setA':['a','b'],'setB':['b','c'],'cosA':[1,0],'cosB':[-1,0]},
 {'euclidean':5,'manhattan':7,'cosine':-1,'jaccard':.3333333333333333,'jaccardEmptyEmpty':1},'Metric units/domain and empty behavior are explicit.','graph-metrics')
add('OR-08','mst',{'nodes':[['a',0],['b',1],['c',3],['d',10]]},
 {'edges':[['a','b',1],['b','c',2],['c','d',7]],'cost':10,'components':1},'Independent Kruskal union-find with stable edge ordering.','graph-rules')
add('OR-09','compound-path',{'outer':[[0,0],[10,0],[10,10],[0,10]],'hole':[[3,3],[7,3],[7,7],[3,7]],'island':[[12,0],[14,0],[14,2],[12,2]]},
 {'donutArea':84,'totalArea':88,'hit':[[1,1,True],[5,5,False],[13,1,True],[11,1,False]]},'Both evenodd and canonical nonzero rings preserve holes under transparency.','compound-path compound-render hit-shapes')
add('OR-10','cubic-extrema',{'control':[[0,0],[0,10],[10,10],[10,0]]},
 {'bounds':[0,0,10,7.5],'atHalf':[5,7.5]},'Derivative extrema, not control hull or sampled approximation.','geometry-math')
add('OR-11','hierarchy-route',{'parents':{'root':None,'A':'root','B':'root','s':'A','t':'B'},'source':'s','target':'t'},
 {'lca':'root','route':['s','A','root','B','t'],'strengthZero':'straight'},'Ancestor path has no duplicated LCA.','hierarchical-bundling')
add('OR-12','fdeb-compatibility',{'P':[[0,0],[1,0]],'Q':[[0,.1],[1,.1]],'step':.001,'internalPoints':1},
 {'angle':1,'scale':1,'position':.9090909090909091,'visibility':1,'compatibility':.9090909090909091,'pMidAfterOneStep':[.5,.00909090909090909],'qMidAfterOneStep':[.5,.09090909090909091]},'Double buffer; no cap for this explicit step; endpoint positions remain unchanged.','force-edge-bundling')
add('OR-13','density-kernel',{'point':[0,0],'weight':1,'bandwidth':1,'sampleX':[0,.5,1]},
 {'density':[1,.5625,0],'gradientXAtHalf':-1.5,'symmetricGradientAtOrigin':0},'Native density-v1 compact radial kernel; not a rendered heatmap golden.','density-bundling')
add('OR-14','edge-path',{'nodes':{'A':[0,0],'B':[1,1],'C':[2,0]},'edges':[['A','C'],['A','B'],['B','C']],'maxStretch':2,'exponent':2},
 {'ACRoute':['A','B','C'],'routeLength':2.8284271247461903,'lockedEdges':[['A','B'],['B','C']],'maxStretch1_2':'straight'},'Validate actual graph path and geometric, not squared-cost, stretch.','edge-path-bundling')
add('OR-15','image-fit',{'image':[200,100],'box':[100,100],'align':[.5,.5]},
 {'contain':[0,25,100,50],'cover':[-50,0,200,100]},'Bounds are before viewport clipping.','image-resolver')
add('OR-16','statistics',{'values':[1,2,3],'quantileValues':[1,2,3,4],'quantileMethod':'linear','window':2},
 {'mean':2,'sampleVariance':1,'populationVariance':.6666666666666666,'q25':1.75,'q50':2.5,'trailingMeans':[1,1.5,2.5]},'Explicit methods; do not change existing defaults.','statistics-oracles')
add('OR-17','histogram-ecdf',{'binEdges':[0,1,2,3],'values':[0,1,2,3],'ecdfValues':[1,1,3]},
 {'counts':[1,1,2],'ecdfAt':[ [0,0],[1,.6666666666666666],[3,1]]},'Last histogram endpoint included; ECDF right-continuous.','statistics-oracles')
add('OR-18','regression-density',{'pairs':[[0,1],[1,3],[2,5]],'gaussianPoint':0,'bandwidth':1},
 {'slope':2,'intercept':1,'densityAtZero':.3989422804014327},'Regression sums and Gaussian formula independent from source kernels.','statistics-oracles')
add('OR-19','calendar',{'year':2024,'month':2,'timezone':'UTC'},
 {'daysInYear':366,'daysInMonth':29},'Supplement with IANA DST civil-day fixtures during implementation.','time-transform calendar-layout')
add('OR-20','pyramid',{'values':[100,60,20],'width':100,'height':90,'gap':0,'lastStage':'flat'},
 {'stageWidths':[[100,60],[60,20],[20,20]],'stageHeights':[30,30,30],'areaModeTaperPoint8Areas':[2700,1620,540]},'Stage order preserved; no forced triangle. Visual target is a proposal.','pyramid-ohlc-waterfall')
add('OR-21','waterfall',{'stages':[['delta',5],['delta',-2],['subtotal',None],['delta',4],['total',None]]},
 {'endpoints':[[0,5],[5,3],[0,3],[3,7],[0,7]],'finalTotal':7},'Subtotal does not reset unless explicit reset flag.','pyramid-ohlc-waterfall')
add('OR-22','projection',{'mercatorDeg':[0,45],'orthographicDeg':[[90,0],[180,0]],'planarBounds':[0,0,10,20],'viewport':[100,100]},
 {'mercatorRaw':[0,.881373587019543],'orthographicLimb':[1,0],'backsideVisible':False,'planarFit':{'scale':5,'translate':[25,0]}},'Raw projection math before screen y reflection.','projection-kernels geo-stream')
add('OR-23','linear-animation',{'from':10,'to':30,'durationMs':1000,'timesMs':[0,250,500,750,1000],'easing':'linear'},
 {'values':[10,15,20,25,30],'logScaleMidpoint':10},'Exact t0/t1 scene equality and declared log-space transform.','transition-sampler')
add('OR-24','gesture-cancel',{'events':['down','move','move','move','Escape','up']},
 {'terminalEvents':['cancel'],'commitCount':0,'historyDelta':0,'baselineChanged':False,'capturedPointersAfter':0},'Replay actual browser input; late up cannot commit.','gesture-controller session-transactions session-events')
add('OR-25','async-stale',{'dispatch':['job1@revision1','job2@revision2'],'completion':['job2','job1']},
 {'applied':['job2'],'discarded':['job1'],'finalRevision':2},'Compare generation and input revision vector before applying.','session-lifecycle')
add('OR-26','single-y',{'cases':['same-frame-independent-scales','same-frame-mirror-y','separate-facet-panels','same-scale-y2-range','polar-coordinate']},
 {'accepted':[False,False,True,True,True]},'Validate at create/edit/composition/schema/load boundaries.','single-y-policy')
checks=[]
def check(name,actual,expected):
    ok=math.isclose(actual,expected,rel_tol=1e-12,abs_tol=1e-12) if isinstance(actual,(int,float)) else actual==expected
    checks.append({'name':name,'passed':ok,'actual':actual,'expected':expected});assert ok,name
check('partition A fraction',6/10,.6);check('partition A2 end',(2+4)/10,.6)
check('partition angle',2*math.pi*.6,3.7699111843077517)
check('focus child',( .2-0)/(.6-0),1/3)
check('equal depth area boundary',math.sqrt(10000/2),70.71067811865476)
nodes=[('a',0),('b',1),('c',3),('d',10)]
knn=[[a,min(( (abs(x-y),b) for b,y in nodes if a!=b))[1]] for a,x in nodes]
check('brute force knn',knn,F[4]['expected']['directed'])
check('inclusive radius',[[a,b] for a,x in nodes for b,y in nodes if a<b and abs(x-y)<=2],F[4]['expected']['radius'])
check('metric norm',math.hypot(3,4),5);check('mst cost',1+2+7,10)
def area(ps):return abs(sum(x*ps[(i+1)%len(ps)][1]-y*ps[(i+1)%len(ps)][0] for i,(x,y) in enumerate(ps)))/2
p=F[8]['input'];check('polygon area',area(p['outer'])-area(p['hole'])+area(p['island']),88)
check('cubic half y',3*.5*.5*.5*10+3*.5*.5*.5*10,7.5)
c=1/(1+.1);check('FDEB compatibility',c,F[11]['expected']['compatibility'])
check('FDEB midpoint',.001*c/.1,F[11]['expected']['pMidAfterOneStep'][1])
check('density half',(1-.5**2)**2,.5625);check('density gradient',-4*.5*(1-.5**2),-1.5)
check('edge path length',2*math.sqrt(2),2.8284271247461903)
check('image contain offset',(100-100*100/200)/2,25)
check('sample variance',sum((x-2)**2 for x in [1,2,3])/2,1)
check('linear quantile',1+.25*3,1.75)
check('Gaussian center',1/math.sqrt(2*math.pi),.3989422804014327)
check('mercator45',math.log(math.tan(math.pi/4+math.pi/8)),.881373587019543)
check('linear time samples',[10+20*t/1000 for t in [0,250,500,750,1000]],[10,15,20,25,30])
check('log midpoint',math.exp((math.log(1)+math.log(100))/2),10)
for b in [.000001,.25,.5,.75,1]:
 radius=(1-b)*2*math.pi/(2*math.pi*b);theta=2*math.pi*b*(.5-.5)
 check('bend center '+str(b),(radius+.5)*math.cos(theta)-radius,.5)
check('Pyramid area ratio',.5*30*(60+48)/(.5*30*(100+80)),.6)
(ROOT/'roadmap/oracle-fixtures.json').write_text(json.dumps({'status':'design-expectations','notice':'Literal proposed expectations. Arithmetic checked independently; ggaction implementations not executed.','fixtures':F},ensure_ascii=False,indent=2)+'\n')
(ROOT/'evidence/roadmap-oracle-validation.json').write_text(json.dumps({'passed':all(c['passed'] for c in checks),'scope':'Independent arithmetic of roadmap fixtures only','checks':checks},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'fixtures':len(F),'arithmeticChecks':len(checks),'passed':True}))
