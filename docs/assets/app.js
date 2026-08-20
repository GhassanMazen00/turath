/* ═══ تُراث — المحرّك ═══
   المصادر مثبَّتة على مراجع محددة، لا على فروع متحركة.
   الحديث: fawazahmed0/hadith-api (الترقيم المعتمد المطبوع). */
const REF={quran:"6be8e17f2a0c13b1f33b1c3057f73cb28d5e848e",
           tafsir:"05d5ba765d77c6ca6d43c30f0e1c273deb137454",
           hadith:"df57907be35291c91ad6a6691180e22ca9920784"};
const HOSTS=[(r,f,p)=>`https://cdn.jsdelivr.net/gh/${r}@${f}/${p}`,
             (r,f,p)=>`https://raw.githubusercontent.com/${r}/${f}/${p}`];
const _c=new Map();
async function grab(repo,ref,path){
  const k=repo+ref+path; if(_c.has(k))return _c.get(k);
  let err;
  for(const h of HOSTS){
    try{const r=await fetch(h(repo,ref,path)); if(!r.ok){err=new Error("HTTP "+r.status);continue;}
      const d=await r.json(); _c.set(k,d); return d;}catch(e){err=e;}
  }
  throw err||new Error("تعذّر الجلب");
}
const api={
  local:(f)=>{const k="L"+f; if(_c.has(k))return _c.get(k);
    const p=fetch("data/"+f).then(r=>r.json()); _c.set(k,p); return p;},
  ayah:(s,a)=>grab("fawazahmed0/quran-api",REF.quran,`editions/ara-quransimple/${s}/${a}.json`),
  tafsir:(e,s,a)=>grab("spa5k/tafsir_api",REF.tafsir,`tafsir/${e}/${s}/${a}.json`),
  hadith:(b,n)=>grab("fawazahmed0/hadith-api",REF.hadith,`editions/ara-${b}/${n}.json`),
  section:(b,n)=>grab("fawazahmed0/hadith-api",REF.hadith,`editions/ara-${b}/sections/${n}.json`),
};

/* ── السمة ── */
function theme(){
  const s=localStorage.getItem("turath-theme");
  if(s)document.documentElement.setAttribute("data-theme",s);
  document.addEventListener("click",e=>{
    const t=e.target.closest(".tgl"); if(!t)return;
    const cur=document.documentElement.getAttribute("data-theme")
      || (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
    const nx=cur==="dark"?"light":"dark";
    document.documentElement.setAttribute("data-theme",nx);
    localStorage.setItem("turath-theme",nx);
  });
}
const TGL=`<button class="tgl" title="تبديل الوضع الليلي" aria-label="تبديل الوضع الليلي">
<svg class="sun" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v2.4M12 19.6V22M22 12h-2.4M4.4 12H2M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7M19.1 19.1l-1.7-1.7M6.6 6.6L4.9 4.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
<svg class="moon" viewBox="0 0 24 24" fill="none"><path d="M20 13.4A8.2 8.2 0 1110.6 4a6.6 6.6 0 009.4 9.4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>`;

/* ── أدوات ── */
const esc=s=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const AR=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const DIA=/[ً-ْٰـۖ-ۭ]/g;
const norm=s=>(s||"").normalize("NFKC").replace(DIA,"")
  .replace(/[أإآٱ]/g,"ا").replace(/[ىئ]/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و")
  .replace(/[^ء-ي ]/g," ").replace(/\s+/g," ").trim();
const paras=t=>(t||"").split("\n").map(x=>x.trim()).filter(Boolean)
  .map(x=>`<p class="para">${esc(x)}</p>`).join("")||'<p class="para">—</p>';
function loading(n,l){n.innerHTML=`<div class="msg"><span class="spin"></span> ${esc(l||"جارٍ الجلب…")}</div>`;}
function failed(n,e){n.innerHTML=`<div class="msg">تعذّر جلب البيانات من المصدر.<br>
  <span style="font-size:.76rem">${esc(String(e&&e.message||e))}</span></div>`;}
function crumbs(p){return `<nav class="crumb">`+p.map((x,i)=>(i?'<span class="sep">›</span>':"")+
  (x.href?`<a href="${x.href}">${esc(x.t)}</a>`:`<span>${esc(x.t)}</span>`)).join("")+`</nav>`;}

/* ── فصل السند عن المتن (للعرض؛ النص محفوظ كاملًا) ── */
const LINK=/(حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|عن\s|قرأت على|وحدثنا|وحدثني|نا\s|ثنا\s)/;
const bare=x=>x.replace(DIA,"");
function splitIsnad(text){
  const p=text.split("،"); if(p.length<2)return{isnad:null,matn:text};
  let last=-1;
  for(let i=0;i<p.length;i++){ if(LINK.test(bare(p[i])))last=i; else break; }
  if(last<0||last>=p.length-1)return{isnad:null,matn:text};
  const isnad=p.slice(0,last+1).join("،")+"،", matn=p.slice(last+1).join("،").trim();
  return matn?{isnad:isnad.trim(),matn}:{isnad:null,matn:text};
}
/* سلسلة الرواة: يُقسَّم السند عند ألفاظ التحمّل.
   يُطابَق على نصٍّ منزوع التشكيل مع خريطة مواضع، ثم تُقتطع الأسماء من
   النصّ الأصلي بمواضعها الصحيحة — فلا تنقطع الكلمات ولا يضيع التشكيل. */
function stripMap(s){
  let out="",map=[];
  for(let i=0;i<s.length;i++){ if(!/[\u064B-\u0652\u0670\u0640]/.test(s[i])){out+=s[i];map.push(i);} }
  map.push(s.length); return {out,map};
}
const VERB=/(وحدثنا|وحدثني|حدثنا|حدثني|أخبرنا|أخبرني|أنبأنا|أنبأني|سمعت|قرأت على|عن)\s+/g;
function chain(isnad){
  if(!isnad)return[];
  const src=isnad.replace(/[،\s]+$/,"");
  const {out,map}=stripMap(src);
  const marks=[]; let m; VERB.lastIndex=0;
  while((m=VERB.exec(out))!==null) marks.push({verb:m[1],start:m.index,after:VERB.lastIndex});
  const res=[];
  for(let i=0;i<marks.length;i++){
    const a=map[marks[i].after];
    const b=(i+1<marks.length)?map[marks[i+1].start]:src.length;
    let name=src.slice(a,b).replace(/[،\s]+$/,"").trim();
    name=name.replace(/[،\s]*ق\p{M}*ا\p{M}*ل\p{M}*[\s،]*$/u,"").trim();  // «قال» زائدة في الطرف
    if(name)res.push({verb:marks[i].verb,name});
  }
  return res;
}

/* تصنيف الدرجة للعرض اللوني */
function gclass(g){
  const t=norm(g);
  if(/موضوع|منكر|متروك|شاذ/.test(t))return"bad";
  if(/ضعيف/.test(t))return"bad";
  if(/حسن/.test(t))return"mid";
  if(/صحيح/.test(t))return"ok";
  return"na";
}

/* ═══ محرّك البحث ═══
   يبحث في: أسماء السور · كتب التفسير · كتب الحديث وأبوابها · متون الأحاديث.
   فهارس الأحاديث تُجلب عند الحاجة وتُخزَّن، فالبحث الأول أبطأ ثم يصير فوريًا. */
const SEARCH={books:null,surahs:null,tafsirs:null,idx:{},scope:"all"};

async function searchInit(){
  const [b,s,t]=await Promise.all([api.local("books.json"),api.local("surahs.json"),api.local("tafsirs.json")]);
  SEARCH.books=b; SEARCH.surahs=s; SEARCH.tafsirs=t; return SEARCH;
}
async function loadIdx(k,onp){
  if(SEARCH.idx[k])return SEARCH.idx[k];
  const r=await fetch(`data/idx/${k}.json`); const d=await r.json();
  SEARCH.idx[k]=d; if(onp)onp(); return d;
}
/* نتائج فورية من البيانات الخفيفة */
function quickHits(q){
  const n=norm(q); if(!n)return[];
  const out=[];
  for(const s of SEARCH.surahs){
    if(norm(s.ar).includes(n)) out.push({kind:"سورة",title:"سورة "+s.ar,
      sub:`${s.rev} · ${AR(s.count)} آية`,href:`tafsir.html#/${s.n}`});
  }
  for(const t of SEARCH.tafsirs){
    if(norm(t.ar).includes(n)||norm(t.author).includes(n))
      out.push({kind:"تفسير",title:t.ar,sub:t.author,href:`tafsir.html#/1/${t.slug}/1`});
  }
  for(const k in SEARCH.books){const b=SEARCH.books[k];
    if(norm(b.ar).includes(n)||norm(b.author).includes(n))
      out.push({kind:"كتاب",title:b.ar,sub:`${b.author} · ${AR(b.total)} حديثًا`,href:`hadith.html#/${k}`});
    for(const sc of b.sections){
      if(norm(sc.ar).includes(n)) out.push({kind:"باب",title:sc.ar,
        sub:`${b.ar} · الأحاديث ${AR(sc.first||0)}–${AR(sc.last||0)}`,href:`hadith.html#/${k}/${sc.n}/1`});
    }
  }
  return out.slice(0,40);
}
/* بحث المتون */
async function textHits(q,scope,onprog,limit=60){
  const n=norm(q); if(n.length<2)return[];
  const keys=scope==="all"?Object.keys(SEARCH.books):[scope];
  const res=[]; let done=0;
  for(const k of keys){
    const idx=await loadIdx(k);
    const b=SEARCH.books[k];
    for(const [num,sec,txt,grades] of idx){
      const at=txt.indexOf(n);
      if(at<0)continue;
      const st=Math.max(0,at-45), sn=txt.slice(st,at+n.length+90);
      const scn=b.sections.find(x=>x.n===sec);
      res.push({kind:"حديث",num,book:k,bookAr:b.ar,sec:scn?scn.ar:"",
        snippet:(st?"…":"")+sn+"…",q:n,grades,
        href:`hadith.html#/${k}/h/${num}`});
      if(res.length>=limit)break;
    }
    done++; if(onprog)onprog(done,keys.length,res.length);
    if(res.length>=limit)break;
  }
  return res;
}
function hl(text,q){
  const i=text.indexOf(q); if(i<0)return esc(text);
  return esc(text.slice(0,i))+"<mark>"+esc(text.slice(i,i+q.length))+"</mark>"+esc(text.slice(i+q.length));
}
/* واجهة البحث */
function mountSearch(root,{autofocus=false}={}){
  root.innerHTML=`<div class="sbox"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    <input id="q" type="search" placeholder="ابحث في السور والتفاسير والأحاديث…" autocomplete="off">
    <kbd>/</kbd></div>
    <div class="scope" id="scope"></div><div class="sres" id="sres"></div>`;
  const inp=root.querySelector("#q"), out=root.querySelector("#sres"), sc=root.querySelector("#scope");
  const scopes=[["all","كل الكتب"]].concat(Object.keys(SEARCH.books).map(k=>[k,SEARCH.books[k].ar]));
  sc.innerHTML=scopes.map(([v,l])=>`<button data-s="${v}" aria-pressed="${v===SEARCH.scope}">${esc(l)}</button>`).join("");
  sc.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
    SEARCH.scope=b.dataset.s;
    sc.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    if(inp.value.trim())run();});
  document.addEventListener("keydown",e=>{
    if(e.key==="/"&&document.activeElement!==inp){e.preventDefault();inp.focus();}
    if(e.key==="Escape"&&document.activeElement===inp){inp.blur();}});
  let tmr,seq=0;
  const run=async()=>{
    const q=inp.value.trim(); const my=++seq;
    if(!q){out.innerHTML="";return;}
    const quick=quickHits(q);
    const draw=(hits,stat)=>{ if(my!==seq)return;
      out.innerHTML=(stat||"")+(quick.map(h=>
        `<a class="hit" href="${h.href}"><div class="m"><span class="chip">${esc(h.kind)}</span>
         <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join(""))
        +hits.map(h=>{
          const g=(h.grades&&h.grades.length)?`<span>${esc(h.grades[0][0])}: ${esc(h.grades[0][1])}</span>`:"";
          return `<a class="hit" href="${h.href}"><div class="m"><span class="chip">حديث ${AR(h.num)}</span>
          <span>${esc(h.bookAr)}</span><span>${esc(h.sec)}</span>${g}</div>
          <div class="tx">${hl(h.snippet,h.q)}</div></a>`;}).join("")
        ||(quick.length?"":`<div class="msg">لا نتائج لـ «${esc(q)}»</div>`);
    };
    draw([],`<div class="sstat"><span class="spin"></span><span>يبحث في المتون…</span><span class="bar"><i style="width:6%"></i></span></div>`);
    try{
      const hits=await textHits(q,SEARCH.scope,(d,t,c)=>{ if(my!==seq)return;
        const bar=out.querySelector(".bar i"); if(bar)bar.style.width=Math.round(d/t*100)+"%";
        const st=out.querySelector(".sstat span:nth-child(2)");
        if(st)st.textContent=`يبحث… ${AR(d)}/${AR(t)} كتاب · ${AR(c)} نتيجة`;});
      if(my!==seq)return;
      draw(hits,`<div class="sstat">${AR(quick.length+hits.length)} نتيجة${hits.length>=60?" (عُرض أول ٦٠)":""}</div>`);
    }catch(e){ if(my===seq)draw([],`<div class="sstat">تعذّر البحث في المتون</div>`); }
  };
  inp.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(run,260);});
  if(autofocus)setTimeout(()=>inp.focus(),350);
}
