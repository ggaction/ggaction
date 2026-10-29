import {chart} from 'ggaction';
import {getMarkItems} from 'ggaction/inspection';
const p=chart(),items=getMarkItems(p,{target:'points'}).map(item=>item.key);
p.selectMarks({target:'points',id:'picked',items,empty:'all'});
p.editMarkSelection({selection:'picked',mode:'toggle',items:[]});
p.editMarkSelection({selection:'picked',mode:'add',field:'x',op:'gt',value:0});
p.filterMarks({target:'points',items});
p.highlightMarks({target:'points',select:{items},color:'red'});
p.selectMarks({target:{childPath:['left'],id:'points'},items});
p.editMarkSelection({target:{childPath:['left']},selection:'picked',items,mode:'subtract'});
// @ts-expect-error logical keys and predicates are exclusive
p.selectMarks({items:[],field:'x',op:'eq',value:1});
// @ts-expect-error selection update mode is closed
p.editMarkSelection({items:[],mode:'compose'});

p.selectMarks({field:'x',op:'range',min:0,minInclusive:false});
p.editMarkSelection({field:'x',op:'range',max:4,maxInclusive:true});
// @ts-expect-error closure forms cannot mix
p.selectMarks({field:'x',op:'range',min:0,inclusive:true,minInclusive:false});

const where={version:2,registry:'standard@1',root:{type:'binary',op:'gt',left:{type:'field',name:'x'},right:{type:'parameter',id:'threshold'}}} as const;
p.selectMarks({id:'chosen',where});
p.editMarkSelection({selection:'chosen',where,mode:'add'});
p.highlightMarks({id:'chosen',select:{where},color:'red'});
// @ts-expect-error expression and item selectors cannot mix
p.selectMarks({where,items:[]});
// @ts-expect-error mark filters have a separate closed selector contract
p.filterMarks({where});
