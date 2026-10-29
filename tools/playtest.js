// 最小限のDOMスタブで、ゲームをランダム/指定方針で最後まで遊ぶ
const fs=require('fs'),vm=require('vm'),G=process.argv[2];
function mkEl(id){let h='';return {id,hidden:false,get innerHTML(){return h},set innerHTML(v){h=v;this.children=[]},textContent:'',className:'',style:{},value:'',children:[],dataset:{},
 classList:{toggle(){}},appendChild(c){this.children.push(c)},insertAdjacentHTML(p,h){this.innerHTML+=h},toggleAttribute(){return true}}}
function run(policy,seed){
 let rnd=seed;const R=()=>{rnd=(rnd*16807)%2147483647;return rnd/2147483647};
 const els={};const get=s=>{const k=s.replace('#','');return els[k]||(els[k]=mkEl(k))};
 ['ti'].forEach(k=>get('#'+k).hidden=false);['map','en','hud','box'].forEach(k=>get('#'+k).hidden=true);
 const document={querySelector:get,querySelectorAll:()=>[],createElement:()=>({className:'',textContent:'',onclick:null}),activeElement:{tagName:'BODY'}};
 const ctx={document,location:{hash:''},Image:function(){},setTimeout:()=>{},console};
 ctx.window=ctx;vm.createContext(ctx);
 const files=['characters.js','version.js','art.js','engine.js','scenario/common.js','scenario/wataru.js','scenario/akari.js'];
 // const を外に出すため、全部まとめて1スクリプトで実行
 let src=files.map(f=>fs.readFileSync(G+'/'+f,'utf8')).join('\n;\n');
 src+=`\n;globalThis.__=()=>({S,MAPS,st,steps:()=>steps,i:()=>i,curMap:()=>curMap,adv,$,CHARS});`;
 vm.runInContext(src,ctx);
 const A=ctx.__();const $=A.$;
 get('#in').value='テスト';get('#go').onclick();
 const trace=[];let guard=0,end=null;
 while(guard++<2000){
  if(!$('#en').hidden){end=$('#en').innerHTML.match(/<h2[^>]*>(.*?)<\/h2>/)[1];break}
  if(!$('#map').hidden){const m=A.curMap();const pick=policy.map?policy.map(m,A.st,R):null;
   let ids=pick||[];const all=m.spots.map(s=>s.id);
   while(ids.length<(m.need||3)){const c=all[Math.floor(R()*all.length)];if(!ids.includes(c))ids.push(c)}
   trace.push('MAP:'+ids.join(','));get('#vg').onclick=null;
   // engine の $('#vg').onclick を呼ぶ代わりに done を直接
   const sel=new Set(ids);$('#map').hidden=true;vm.runInContext('play(curMap.done(__sel,st))',Object.assign(ctx,{__sel:sel}));continue}
  const ch=$('#ch').children;
  if(ch.length){const k=policy.choice?policy.choice(ch.map(b=>b.textContent),A.st,R):Math.floor(R()*ch.length);
   const b=ch[Math.min(k,ch.length-1)];trace.push('CH:'+b.textContent.slice(0,14));$('#ch').children=[];b.onclick({stopPropagation(){}});continue}
  A.adv();
 }
 return {end,aff:A.st.aff,flags:A.st.flags,who:A.st.who,trace};
}
module.exports=run;
if(require.main===module){
 const tally={};let errs=0;
 for(let s=1;s<=600;s++){try{const r=run({},s*7919);const k=(r.who||'none')+' | '+r.end;tally[k]=(tally[k]||0)+1}catch(e){errs++;if(errs<3)console.log('ERR',e.message)}}
 console.log(tally,'errors',errs);
 // 最善手：最初の選択肢を選び、地図は正解を含む
 for(const [reg,best] of [['sea',['hill','shop','shrine']],['town',['lane','plaza','shotengai']]]){
  const r=run({choice:(l,st)=>{if(l.some(x=>x.includes('坂の街'))||l.some(x=>x.includes('路地が')))return 0;return 0},
   map:(m)=>m.title.includes('どんな街')?[reg]:best},1);
  console.log('BEST',reg,r.end,JSON.stringify(r.aff),Object.keys(r.flags).join(','));
  const w=run({choice:(l)=>l.length-1,map:(m)=>m.title.includes('どんな街')?[reg]:null},5);
  console.log('WORST-ish',reg,w.end,JSON.stringify(w.aff));
 }
}
