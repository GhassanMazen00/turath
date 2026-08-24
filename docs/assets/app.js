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
const SEARCH={books:null,surahs:null,tafsirs:null,idx:{},scope:"all",kind:"all",quran:null};

async function searchInit(){
  const [b,s,t]=await Promise.all([api.local("books.json"),api.local("surahs.json"),api.local("tafsirs.json")]);
  SEARCH.books=b; SEARCH.surahs=s; SEARCH.tafsirs=t; return SEARCH;
}
async function loadIdx(k,onp){
  if(SEARCH.idx[k])return SEARCH.idx[k];
  const r=await fetch(`data/idx/${k}.json`); const d=await r.json();
  SEARCH.idx[k]=d; if(onp)onp(); return d;
}
/* المصحف كاملًا — يُحمَّل عند أول بحث في القرآن فقط */
async function loadQuran(){
  if(SEARCH.quran)return SEARCH.quran;
  const r=await fetch("data/quran.json"); const t=await r.json();
  const rows=[]; let i=0;
  for(const s of SEARCH.surahs){ for(let a=1;a<=s.count;a++,i++) rows.push([s.n,a,t[i],norm(t[i])]); }
  SEARCH.quran=rows; return rows;
}
function quranHits(q,limit=40){
  const n=norm(q); if(n.length<2)return[];
  const out=[];
  for(const r of SEARCH.quran){ if(r[3].indexOf(n)<0)continue; out.push(r); if(out.length>=limit)break; }
  return out;
}
/* نتائج فورية من البيانات الخفيفة */
function quickHits(q,kind){
  const n=norm(q); if(!n)return[];
  kind=kind||"all";
  const want=k=>kind==="all"||kind===k;
  const out=[];
  if(want("quran"))for(const s of SEARCH.surahs){
    if(norm(s.ar).includes(n)) out.push({kind:"سورة",title:"سورة "+s.ar,
      sub:`${s.rev} · ${AR(s.count)} آية`,href:`tafsir.html#/${s.n}`});
  }
  if(want("tafsir"))for(const t of SEARCH.tafsirs){
    if(norm(t.ar).includes(n)||norm(t.author).includes(n))
      out.push({kind:"تفسير",title:t.ar,sub:t.author,href:`tafsir.html#/1/${t.slug}/1`});
  }
  if(want("hadith"))for(const k in SEARCH.books){const b=SEARCH.books[k];
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
        sig:txt.slice(at,at+80),                 // ما بعد اللفظ — مشترك بين الكتب
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
/* ── تجميع النتائج: النصّ الواحد يُعرض مرة، وتحته الكتب التي أخرجته ── */
function groupHits(hits){
  const by=new Map();
  for(const h of hits){
    const k=(h.sig||h.snippet).slice(0,60);
    if(!by.has(k)) by.set(k,{snippet:h.snippet,q:h.q,books:[]});
    by.get(k).books.push(h);
  }
  return [...by.values()];
}
function hl(t,q){const i=t.indexOf(q); if(i<0)return esc(t);
  return esc(t.slice(0,i))+"<mark>"+esc(t.slice(i,i+q.length))+"</mark>"+esc(t.slice(i+q.length));}

const KINDS=[["all","كل المحتوى"],["hadith","الحديث"],["quran","القرآن"],["tafsir","كتب التفسير"]];

function mountSearch(root,{autofocus=false}={}){
  root.innerHTML=`<div class="sbox"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
    <input id="q" type="search" placeholder="ابحث في متون الأحاديث وآيات المصحف والسور والأبواب…" autocomplete="off"><kbd>/</kbd></div>
    <div class="chips" id="kind"></div><div class="chips sub" id="scope" hidden></div><div class="sres" id="sres"></div>`;
  const inp=root.querySelector("#q"),out=root.querySelector("#sres"),
        kd=root.querySelector("#kind"),sc=root.querySelector("#scope");

  kd.innerHTML=KINDS.map(([v,l])=>`<button class="chip" data-k="${v}" aria-pressed="${v===SEARCH.kind}">${esc(l)}</button>`).join("");
  sc.innerHTML=[["all","كل الكتب"]].concat(Object.keys(SEARCH.books).map(k=>[k,SEARCH.books[k].ar]))
    .map(([v,l])=>`<button class="chip" data-s="${v}" aria-pressed="${v===SEARCH.scope}">${esc(l)}</button>`).join("");
  const syncScope=()=>{ sc.hidden=!(SEARCH.kind==="hadith"); };
  syncScope();

  kd.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
    SEARCH.kind=b.dataset.k;
    kd.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    syncScope(); if(inp.value.trim())run();});
  sc.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return;
    SEARCH.scope=b.dataset.s;
    sc.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",x===b));
    if(inp.value.trim())run();});

  document.addEventListener("keydown",e=>{
    if(e.key==="/"&&document.activeElement!==inp&&!/input|textarea/i.test(document.activeElement.tagName)){
      e.preventDefault();inp.focus();}
    if(e.key==="Escape"&&document.activeElement===inp)inp.blur();});

  let tmr,seq=0;
  const run=async()=>{
    const q=inp.value.trim(),my=++seq,kind=SEARCH.kind;
    if(!q){out.innerHTML="";return;}
    const quick=quickHits(q,kind);
    const qh=quick.map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
      <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("");

    const draw=(stat,ayat,groups)=>{ if(my!==seq)return;
      const ah=(ayat||[]).map(([sn,a,tx])=>{
        const su=SEARCH.surahs.find(x=>x.n===sn);
        return `<a class="hit ayahit" href="tafsir.html#/${sn}/ar-tafsir-ibn-kathir/${a}">
          <div class="m"><span class="tag c">آية</span><span>سورة ${esc(su?su.ar:"")} <bdi>${AR(sn)}:${AR(a)}</bdi></span></div>
          <div class="tx amiri">${esc(tx)}</div></a>`;}).join("");
      const gh=(groups||[]).map(g=>{
        const chips=g.books.map(h=>{
          const gr=(h.grades&&h.grades.length)?`<span class="g ${gclass(h.grades[0][1])}">${esc(h.grades[0][1])}</span>`:"";
          return `<a class="bchip" href="${h.href}"><b>${esc(h.bookAr)}</b><span class="n">${AR(h.num)}</span>${gr}</a>`;
        }).join("");
        return `<div class="grp"><div class="grp-t">${hl(g.snippet,g.q)}</div>
          <div class="grp-b">${chips}</div></div>`;}).join("");
      const body=qh+ah+gh;
      const note=gh?`<div class="note">مقتطف المطابقة يُعرض بالرسم المجرَّد من التشكيل — وهو صورة البحث لا صورة الكتاب. النصّ كما ورد في صفحة الحديث.</div>`:"";
      out.innerHTML=(stat||"")+(body||`<div class="msg">لا نتائج لـ «${esc(q)}»</div>`)+note;};

    const wantQuran=kind==="all"||kind==="quran";
    const wantHadith=kind==="all"||kind==="hadith";
    if(!wantQuran&&!wantHadith){ draw("",[],[]); return; }
    draw(`<div class="sstat"><span class="spin"></span><span>يبحث…</span><span class="bar"><i style="width:6%"></i></span></div>`,[],[]);
    try{
      let ayat=[];
      if(wantQuran){ await loadQuran(); if(my!==seq)return; ayat=quranHits(q,kind==="quran"?60:8); }
      if(!wantHadith){
        draw(`<div class="sstat"><bdi>${AR(ayat.length)} آية</bdi></div>`,ayat,[]); return; }
      draw(`<div class="sstat"><span class="spin"></span><span>يبحث في المتون…</span><span class="bar"><i style="width:18%"></i></span></div>`,ayat,[]);
      const hits=await textHits(q,SEARCH.scope,(d,t,c)=>{ if(my!==seq)return;
        const bar=out.querySelector(".bar i"); if(bar)bar.style.width=Math.round(18+d/t*82)+"%";
        const st=out.querySelector(".sstat span:nth-child(2)");
        if(st)st.textContent=`يبحث في المتون… ${AR(d)}/${AR(t)} — ${AR(c)} نتيجة`;});
      if(my!==seq)return;
      const groups=groupHits(hits);
      const parts=[];
      if(ayat.length)parts.push(`<bdi>${AR(ayat.length)} آية</bdi>`);
      parts.push(`<bdi>${AR(groups.length)} نصًّا</bdi> في <bdi>${AR(hits.length)} موضعًا</bdi>${hits.length>=60?" (أول ٦٠)":""}`);
      draw(`<div class="sstat">${parts.join(" <span class=\"sep\">•</span> ")}</div>`,ayat,groups);
    }catch(e){ if(my===seq)draw(`<div class="sstat">تعذّر البحث</div>`,[],[]); }
  };
  inp.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(run,240);});
  if(autofocus)setTimeout(()=>inp.focus(),300);
}


/* ── شروح الحديث: كتبٌ تُقرأ وتُبحث، لا شرحٌ يُنسَب إلى حديثٍ بعينه ──
   المصدر نصٌّ متّصل، ونسبة فقرةٍ منه إلى حديثٍ بذاته تُخطئ بصمت. فالبحث
   هو الواسطة: القارئ يرى الموضع بجزئه وصفحته ويحكم بنفسه. */
const SH={books:null,idx:{},chunk:{}};
async function sharhBooks(){ if(!SH.books) SH.books=await api.local("sharh/books.json"); return SH.books; }
async function sharhMeta(slug){ const bs=await sharhBooks(); return bs.find(b=>b.slug===slug); }
async function sharhIdx(slug){
  if(!SH.idx[slug]) SH.idx[slug]=await api.local(`sharh/${slug}/idx.json`);
  return SH.idx[slug];
}
async function sharhToc(slug){
  const k="toc:"+slug;
  if(!SH.idx[k]) SH.idx[k]=await api.local(`sharh/${slug}/toc.json`);
  return SH.idx[k];
}
async function sharhChunk(slug,n){
  const k=slug+":"+n;
  if(!SH.chunk[k]) SH.chunk[k]=await api.local(`sharh/${slug}/c${n}.json`);
  return SH.chunk[k];
}
/* بحثٌ في كتاب: الفهرس المعكوس يحصر الأجزاء، ثم تُمسح وحدها */
async function sharhFind(slug,q,{limit=40,onprog}={}){
  const n=norm(q); if(n.length<3) return [];
  const words=[...new Set(n.split(" ").filter(w=>w.length>2))];
  if(!words.length) return [];
  const idx=await sharhIdx(slug);
  // أندر الكلمات أولًا، ثم تقاطعها
  const lists=words.map(w=>idx[w]).filter(Boolean).sort((a,b)=>a.length-b.length);
  let cand;
  if(!lists.length) cand=null;                       // كلها شائعة: امسح الكلّ
  else { cand=new Set(lists[0]);
    for(const l of lists.slice(1,3)){ const s=new Set(l); cand=new Set([...cand].filter(x=>s.has(x))); }
    if(!cand.size) cand=new Set(lists[0]); }
  const meta=await sharhMeta(slug);
  const list=cand?[...cand].sort((a,b)=>a-b):Array.from({length:meta.chunks},(_,i)=>i);
  const out=[]; let done=0;
  for(const ci of list){
    const rows=await sharhChunk(slug,ci);
    rows.forEach((r,i)=>{
      if(out.length>=limit) return;
      const t=norm(r[0]);
      let at=t.indexOf(n);
      if(at<0 && words.length>1 && !words.every(w=>t.includes(w))) return;   // لا العبارة ولا كل الكلمات
      if(at<0) at=t.indexOf(words[0]);
      out.push({t:r[0],v:r[1],p:r[2],c:ci,i,exact:t.includes(n)});
    });
    if(onprog) onprog(++done,list.length,out.length);
    if(out.length>=limit) break;
  }
  out.sort((a,b)=>(b.exact-a.exact));
  return out;
}
/* إبراز الموضع في النصّ الأصلي: المطابقة على المطبَّع والقصّ على الأصل */
function sharhMark(text,q){
  const n=norm(q); if(!n) return esc(text);
  const map=[]; let acc="";
  for(let i=0;i<text.length;i++){
    const c=norm(text[i]);
    if(c){ acc+=c; for(let k=0;k<c.length;k++) map.push(i); }
    else if(acc && !acc.endsWith(" ")){ acc+=" "; map.push(i); }
  }
  const at=acc.indexOf(n);
  if(at<0||at>=map.length) return esc(text);
  const s=map[at], e=map[Math.min(at+n.length,map.length-1)];
  return esc(text.slice(0,s))+"<mark>"+esc(text.slice(s,e+1))+"</mark>"+esc(text.slice(e+1));
}

/* ── نبذة عن كل كتاب — تُستعمل في الرئيسية وصفحات الفهارس ── */
const BOOKNOTE={bukhari:'أصحّ الكتب بعد كتاب الله، جمعه البخاري في نحو ستة عشر عامًا.',
 muslim:'ثاني الصحيحين، امتاز بحسن السياق وجمع طرق الحديث في موضع واحد.',
 abudawud:'عُني بأحاديث الأحكام، وهو أحد السنن الأربعة.',
 tirmidhi:'يجمع الحديث وحكمه وأقوال الفقهاء فيه، ويذكر الباب وما فيه.',
 nasai:'أدقّ السنن شرطًا في الرجال، وهو المجتبى.',
 ibnmajah:'رابع السنن، فيه زوائد كثيرة على بقية الكتب.',
 malik:'أقدم كتب السنّة المصنّفة، جمع الحديث مع عمل أهل المدينة.',
 nawawi:'أربعون حديثًا جوامع، عليها مدار الدين، مع شرحها.',
 qudsi:'أربعون من الأحاديث القدسية.',
 dehlawi:'أربعون انتقاها شاه ولي الله الدهلوي.'};
const TAFNOTE={"ar-tafsir-al-mukhtasar": "تفسير موجز بلغة معاصرة، يعطي المعنى الإجمالي للآية.","ar-tafsir-muyassar": "أوجز التفاسير وأيسرها عبارةً؛ مناسب لأول قراءة.","ar-tafsir-ibn-kathir": "تفسير بالمأثور: يفسّر القرآن بالقرآن ثم بالسنة وأقوال السلف.","ar-tafsir-al-tabari": "أمّ كتب التفسير بالمأثور، يسوق أقوال السلف بأسانيدها.","ar-tafseer-al-qurtubi": "يُعنى باستنباط الأحكام الفقهية من الآيات.","ar-tafsir-al-baghawi": "مختصر من تفسير الثعلبي، جامع للمأثور بعبارة سهلة.","ar-tafsir-as-saadi": "يُبرز المقاصد والفوائد التربوية بأسلوب واضح.","ar-tafsir-al-jalalayn": "غاية الإيجاز: كلمة بكلمة، بحجم المتن نفسه.","ar-tafsir-al-wasit": "تفسير معاصر متوسّط الحجم، يجمع بين المعنى واللغة.","tafsir-al-baydawi": "يُعنى بالبلاغة ووجوه الإعراب والاشتقاق.","tafsir-al-alusi": "موسوعة تجمع اللغة والقراءات وأقوال المفسّرين قبله.","al-bahr-al-muhit": "عمدة في الإعراب والنحو ووجوه القراءات.","fath-al-qadir-al-shawkani": "يجمع بين الرواية والدراية: المأثور مع النظر اللغوي.","tafsir-ibn-uthaymeen": "تفسير معاصر يستخرج الفوائد والأحكام مسألةً مسألة.","ar-tafseer-tahrir-al-tanwir": "أوسع تفسير حديث في البلاغة ونظم القرآن ومقاصده.","tafsir-al-razi": "يُعنى بالمسائل العقلية والكلامية ومناسبات الآيات.","al-muharrar-al-wajiz-ibn-atiyyah": "محرَّر في نقل الأقوال، مع ترجيح لغوي دقيق.","tafsir-ibn-al-jawzi": "يجمع وجوه التفسير المنقولة في الآية ويعدّدها."};

/* ── المصادر: زرّ واحد في أسفل الموقع ── */
const SOURCES=[
 ["متون الأحاديث وترقيمها المعتمد","الكتب العشرة بالترقيم المطبوع.","https://github.com/fawazahmed0/hadith-api"],
 ["سلاسل الإسناد وتراجم الرواة","سلاسل الرواة لكل حديث وتراجمهم ومشايخهم وتلاميذهم.","https://github.com/OmarShafie/hadith"],
 ["أحكام المحدّثين","الألباني، شعيب الأرناؤوط، زبير علي زئي، أحمد شاكر وغيرهم.","https://github.com/R3GENESI5/Itqan"],
 ["نصّ القرآن الكريم","الرسم الإملائي المعياري.","https://github.com/fawazahmed0/quran-api"],
 ["كتب التفسير","ثمانية عشر كتابًا من الطبري وابن كثير والقرطبي إلى ابن عاشور.","https://github.com/spa5k/tafsir_api"],
 ["شروح الأحاديث","تُجلب من الموسوعة الحديثية للدرر السنية عند توفّر الاتصال.","https://dorar.net"],
 ["شروح الحديث — أربعة كتب","فتح الباري لابن حجر، والمنهاج للنووي، وعون المعبود، وتحفة الأحوذي — من مدوّنة OpenITI الأكاديمية المنشورة، نصوصًا مرقونة لا ممسوحة ضوئيًّا.","https://github.com/OpenITI"],
];
function mountFooter(el){
  el.innerHTML=`<a class="srcbtn" href="#" id="srcOpen">
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h9a2 2 0 012 2V19H6a2 2 0 01-2-2z" stroke="currentColor" stroke-width="1.5"/><path d="M20 8v11H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    المصادر</a>
    <p>تُعرض النصوص كما وردت في مصادرها بلا تعديل ولا تلخيص.<br>
    تُراث تنقل أقوال أهل العلم ولا ترجّح بينها ولا تُصدر فتوى.</p>
    <dialog class="srcdlg" id="srcDlg"><div class="hd"><b>مصادر البيانات</b>
      <button class="x" id="srcX" aria-label="إغلاق">×</button></div>
      <div class="bd">${SOURCES.map(([t,d,u])=>`<div class="it"><b>${esc(t)}</b><span>${esc(d)}</span>
        <a href="${u}" target="_blank" rel="noopener">${esc(u.replace(/^https:\/\//,""))} ↗</a></div>`).join("")}
      <div class="it"><span>كل نصّ في المنصة يحمل كتابه وموضعه ورقمه المعتمد. لا يُضاف محتوى بلا مصدر.</span></div>
      </div></dialog>`;
  const dlg=el.querySelector("#srcDlg");
  el.querySelector("#srcOpen").onclick=(e)=>{e.preventDefault();dlg.showModal();};
  el.querySelector("#srcX").onclick=()=>dlg.close();
  dlg.addEventListener("click",e=>{ if(e.target===dlg)dlg.close(); });
}

/* ── شرح الحديث: يُجلب من الموسوعة الحديثية (الدرر السنية) عبر وسيط عام.
   لا يُخزَّن عندنا ولا يُختلق؛ فإن تعذّر الاتصال عُرض رابط مباشر للشرح. ── */
/* وسيط الشرح: الدرر السنية تُخرج الشرح صفحةَ HTML، وسياسة CORS تمنع المتصفح
   من قراءتها. فيلزم وسيطٌ يُنشره صاحب الموقع ويضع عنوانه هنا. ما دام فارغًا
   لا يُنتظر شيء: يُعرض رابط الشرح في الدرر مباشرةً بلا تعليق. */
const SHARH_HOST="";
async function fetchSharh(matn){
  if(!SHARH_HOST) return null;
  const q=encodeURIComponent(matn.slice(0,60));
  try{
    const c=new AbortController(); const to=setTimeout(()=>c.abort(),6000);
    const r=await fetch(`${SHARH_HOST}/v1/site/sharh/text/${q}`,{signal:c.signal});
    clearTimeout(to);
    if(!r.ok) return null;
    const j=await r.json(), d=j&&j.data;
    const t=d&&((d.sharhMetadata&&d.sharhMetadata.sharh)||d.sharh);
    return t?{text:t}:null;
  }catch(e){ return null; }
}
/* ألفاظ المتن المميِّزة: ما بعد آخر علامة رفعٍ إلى النبي ﷺ — فما قبلها إسناد.
   وإن لم تُوجد علامة، فآخر الحديث متنٌ لا إسناد. */
function matnPhrase(text,n=7){
  const t=norm(text);
  const MARK=/صلي الله عليه وسلم/g;
  let last=-1,m;
  while((m=MARK.exec(t))) last=m.index+m[0].length;
  let rest=last>0?t.slice(last):"";
  rest=rest.replace(/^\s*(?:يقول|قال|انه قال|قالت|فقال|أنه قال)\s*/,"").trim();
  const w=(rest||t).split(" ").filter(Boolean);
  if(w.length<3){ const all=t.split(" ").filter(Boolean); return all.slice(-n).join(" "); }
  return w.slice(0,n).join(" ");
}
/* الشرح على صفحة الحديث: لا يُدَّعى أنّ هذا شرحُ هذا الحديث — بل يُفتح
   البحث في كتب الشروح عندنا بألفاظ متنه، فيرى القارئ الموضع بجزئه وصفحته. */
const SHARH_ON={bukhari:"fath-albari",muslim:"minhaj-nawawi",
                abudawud:"awn-almabud",tirmidhi:"tuhfat-alahwadhi"};
const SHARH_ONAR={"fath-albari":"فتح الباري لابن حجر","minhaj-nawawi":"المنهاج للنووي",
                  "awn-almabud":"عون المعبود","tuhfat-alahwadhi":"تحفة الأحوذي"};
function sharhBlock(matn,mount,book){
  const slug=SHARH_ON[book];
  const q=matnPhrase(matn);
  if(!slug){
    mount.innerHTML='<div class="pane msg">لا شرحَ مفهرسًا لهذا الحديث، ولا كتابَ شرحٍ لهذا المصنَّف في المنصة بعدُ.'+
      '<div class="note" style="margin:.7rem 0 1rem">المشحون: فتح الباري، والمنهاج، وعون المعبود، وتحفة الأحوذي.</div>'+
      '<a class="act" href="sharh.html">تصفَّح كتب الشروح ←</a></div>';
    return;
  }
  mount.innerHTML='<div class="pane pad"><p style="margin:0 0 1rem;color:var(--mut);line-height:1.95">'+
    'لم يُفهرَس لهذا الحديث شرحٌ منسوبٌ إليه بعينه. و<b>'+esc(SHARH_ONAR[slug])+'</b> شرحُ هذا المصنَّف، '+
    'وهو عندنا كاملًا — ابحث فيه بألفاظ المتن وانظر الموضع بجزئه وصفحته.</p>'+
    '<div class="acts"><a class="act" href="sharh.html#/'+slug+'/q/'+encodeURIComponent(q)+'">'+
    'ابحث عن هذا المتن في '+esc(SHARH_ONAR[slug])+' ←</a>'+
    '<a class="act" href="sharh.html#/'+slug+'">تصفَّح الكتاب</a></div></div>';
}

const RJ={idx:null,sh:{}};
const shardOf=(n)=>{let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))|0;return Math.abs(h)%24;};
async function rijalIndex(){ if(!RJ.idx) RJ.idx=await api.local("rijal/index.json"); return RJ.idx; }
async function rijalGet(key){
  const i=shardOf(key);
  if(!RJ.sh[i]){const r=await fetch(`data/rijal/n${i}.json`);RJ.sh[i]=await r.json();}
  return RJ.sh[i][key]||null;
}
/* ── حركة ── */
function reveal(){}   /* بلا حركة — تصميم ثابت */
function mountStats(root,items){        /* أرقام ثابتة بلا عدّ */
  root.innerHTML=items.map(([n,l])=>`<div class="stat"><b>${AR(n)}</b><span>${esc(l)}</span></div>`).join("");
}

/* تعريب وصف الطبقة — من صيغ قاعدة الرواة */
const ORD={1:"الأولى",2:"الثانية",3:"الثالثة",4:"الرابعة",5:"الخامسة",6:"السادسة",
7:"السابعة",8:"الثامنة",9:"التاسعة",10:"العاشرة",11:"الحادية عشرة",12:"الثانية عشرة"};
function genAr(s){
  if(!s)return"";
  if(/^[؀-ۿ\s—،()]+$/.test(s))return s;
  let out="";
  if(/Comp\.?\s*\(RA\)|Companion/i.test(s)) out="صحابي";
  else if(/Succ\.?\s*\(Taba|Taba'? Tabi/i.test(s)) out="من أتباع التابعين";
  else if(/Follower\s*\(Tabi|Tabi'\)/i.test(s)) out="تابعي";
  else if(/Rasool Allah|Prophet/i.test(s)) out="النبي ﷺ";
  else {
    const c=s.match(/(\d+)(?:st|nd|rd|th)\s*Century\s*AH/i);
    if(c) out="من القرن "+AR(c[1])+" الهجري";
  }
  const g=s.match(/\[?\s*(\d+)(?:st|nd|rd|th)\s*generation\s*\]?/i);
  if(g){ const t="الطبقة "+(ORD[+g[1]]||AR(g[1])); out=out?out+" — "+t:t; }
  return out||s.replace(/[\[\]()]/g," ").trim();
}


/* تعريب البلدان والتواريخ والقبائل — من صيغ قاعدة الرواة */
const PLACE={basrah:"البصرة",basra:"البصرة",basrh:"البصرة",medina:"المدينة",madina:"المدينة",madinah:"المدينة",
makkah:"مكة",mecca:"مكة",makka:"مكة",kufah:"الكوفة",kufa:"الكوفة",koufa:"الكوفة",damascus:"دمشق",dimashq:"دمشق",
baghdad:"بغداد",egypt:"مصر",misr:"مصر",fustat:"الفسطاط",sham:"الشام",syria:"الشام",yemen:"اليمن",yaman:"اليمن",
marw:"مرو",merv:"مرو",nishapur:"نيسابور",naysabur:"نيسابور",ray:"الرَّي",rayy:"الرَّي",wasit:"واسط",homs:"حمص",
hims:"حمص",jerusalem:"بيت المقدس",isfahan:"أصفهان",bukhara:"بخارى",samarqand:"سمرقند",tarsus:"طرسوس",
alexandria:"الإسكندرية",aleppo:"حلب",qairawan:"القيروان",tabaristan:"طبرستان",yamama:"اليمامة",bahrain:"البحرين",
taif:"الطائف",jurjan:"جرجان",balkh:"بلخ",herat:"هراة",andalus:"الأندلس",khurasan:"خراسان",sijistan:"سجستان",
tirmidh:"ترمذ",nasa:"نسا",qazwin:"قزوين",asqalan:"عسقلان",raqqa:"الرقة",mosul:"الموصل",anbar:"الأنبار",
madain:"المدائن",hijaz:"الحجاز",iraq:"العراق",persia:"فارس",khwarizm:"خوارزم",samarkand:"سمرقند"};
function placeAr(s){
  if(!s)return"";
  if(/[؀-ۿ]/.test(s))return s.replace(/[()\[\]]/g," ").trim();
  const out=[];
  for(const raw of s.replace(/[()\[\]]/g," ").split(/[,،/]|\band\b/i)){
    const k=raw.toLowerCase().replace(/^al[- ]/,"").replace(/[^a-z]/g,"");
    const v=PLACE[k];
    if(v&&out.indexOf(v)<0) out.push(v);
  }
  return out.join("، ");
}
function dateAr(s){
  if(!s)return"";
  if(/^[؀-ۿ\s—،.٠-٩]+$/.test(s))return s.trim();
  const y=s.match(/(\d+)\s*AH/i);
  const pre=/\bafter\b/i.test(s)?"بعد ":/\bbefore\b/i.test(s)?"قبل ":/\b(circa|about|around)\b|\bc\./i.test(s)?"نحو ":"";
  const pl=placeAr((s.match(/\(([^)]*)\)/g)||[]).join(" "));
  if(!y) return pl?"في "+pl:"";
  const t=pre+"سنة "+AR(y[1])+"هـ";
  return pl?t+" — "+pl:t;
}
const TRIBE={
/* قبائل */
quraish:"قريش",quraysh:"قريش",ansar:"الأنصار",aws:"الأوس",khazraj:"الخزرج",azd:"الأزد",hamdan:"همدان",
kindah:"كندة",kinda:"كندة",thaqif:"ثقيف",khuzaa:"خزاعة",juhaynah:"جهينة",muzaynah:"مزينة",qays:"قيس",
mudar:"مضر",rabia:"ربيعة",tayy:"طيء",tamim:"تميم",hashim:"بنو هاشم",
bhashim:"بنو هاشم",bmakhzum:"بنو مخزوم",bumayya:"بنو أمية",btaym:"بنو تيم",badi:"بنو عدي",
bzuhra:"بنو زهرة",bzuhrah:"بنو زهرة",basad:"بنو أسد",bsahm:"بنو سهم",bjumah:"بنو جمح",
babdaldar:"بنو عبد الدار",babdshams:"بنو عبد شمس",bnaufal:"بنو نوفل",bamir:"بنو عامر",btamim:"بنو تميم",
bsulaym:"بنو سليم",bghifar:"بنو غفار",bnajjar:"بنو النجار",bsaida:"بنو ساعدة",bharith:"بنو الحارث",
babdqays:"عبد القيس",bbakr:"بنو بكر",btaghlib:"بنو تغلب",bhanifa:"بنو حنيفة",bmurra:"بنو مرة",
/* نِسَب البلدان */
albasri:"البصري",basri:"البصري",albasra:"البصرة",almadni:"المدني",madni:"المدني",almadani:"المدني",
alkufi:"الكوفي",kufi:"الكوفي",alkufa:"الكوفة",almakki:"المكي",makki:"المكي",makkah:"مكة",
almasri:"المصري",egypt:"مصر",aldamashqi:"الدمشقي",alshami:"الشامي",alhimsi:"الحمصي",
albaghdadi:"البغدادي",baghdad:"بغداد",alwasti:"الواسطي",alraqqi:"الرقّي",hijazi:"حجازي",
alyamani:"اليماني",yemeni:"يماني",almarwzi:"المروزي",alnisaburi:"النيسابوري",alharrani:"الحرّاني",
/* نِسَب القبائل */
alazdi:"الأزدي",altamimi:"التميمي",althaqifi:"الثقفي",alhamdani:"الهمداني",alsalmi:"السُّلَمي",
alkundi:"الكندي",alabdi:"العبدي",alhadrami:"الحضرمي",allaithi:"الليثي",alkhuzai:"الخزاعي",
alhanfi:"الحنفي",albajli:"البجلي",almazni:"المزني",alasadi:"الأسدي",alnakhai:"النخعي",
alaslami:"الأسلمي",alajli:"العجلي",aljuhni:"الجهني",alansari:"الأنصاري",alqurashi:"القرشي",
aldausi:"الدوسي",dausi:"دوسي",alghifari:"الغفاري",alkhathami:"الخثعمي",altai:"الطائي",
/* أوصاف */
client:"مولى",imam:"إمام",hafiz:"حافظ",judge:"قاضٍ",makhdaram:"مخضرم",female:"امرأة",
earlymuslim:"من السابقين إلى الإسلام",latemuslim:"متأخّر الإسلام",emigrant:"مهاجر",
badr:"شهد بدرًا",uhud:"شهد أُحدًا",khandaq:"شهد الخندق",ridwan:"من أهل بيعة الرضوان"};
function tribeAr(s){
  if(!s)return"";
  if(/[؀-ۿ]/.test(s))return s.trim();
  const seen=[],out=[];
  for(const raw of s.replace(/\[[^\]]*\]?/g," ").split(/[,،/]/)){
    const t=raw.trim(); if(!t)continue;
    const k=t.toLowerCase().replace(/[^a-z]/g,"");
    const v=TRIBE[k]||TRIBE[k.replace(/h$/,"")]||TRIBE[k.replace(/^al/,"")]||t;
    if(seen.indexOf(v)<0){seen.push(v);out.push(v);}
  }
  return out.join("، ");
}

/* ── الجانب ── */
function sidebar(el,{title,items,active}={}){
  if(!el)return;
  el.innerHTML=`<h4>${esc(title||"")}</h4><div class="lst">`+
    items.map(i=>`<a href="${i.href}" class="${i.key===active?'on':''}">
      ${i.n!=null?`<span class="n">${AR(i.n)}</span>`:""}<b>${esc(i.label)}</b>
      ${i.side?`<span class="side-n">${esc(i.side)}</span>`:""}</a>`).join("")+`</div>`;
}
function mountMenu(btn,side){ if(btn&&side) btn.onclick=()=>side.classList.toggle("open"); }
const MENU=`<button class="menu" id="mn" aria-label="القائمة"><svg viewBox="0 0 24 24" fill="none">
<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>`;

/* ── شريط متحرك: يتقدّم تلقائيًا، ويتوقّف عند المرور أو اللمس ── */
function carousel(root,{slides,interval=4200}={}){
  root.innerHTML=`<div class="track">${slides.map(s=>`<div class="slide">${s}</div>`).join("")}</div>
    <div class="dots"></div>`;
  const track=root.querySelector(".track"), dots=root.querySelector(".dots");

  /* هندسة الشريط: عرض الشريحة والفجوة كما هما فعلًا، لا تقديرًا من عرض الإطار.
     الحساب بعرض الإطار كان يُزيح المقدار فتُقصّ البطاقة عند الحافة. */
  function geo(){
    const sl=track.querySelector(".slide");
    const cs=getComputedStyle(track);
    const gap=parseFloat(cs.columnGap||cs.gap)||0;
    const inner=track.clientWidth-(parseFloat(cs.paddingInlineStart)||0)-(parseFloat(cs.paddingInlineEnd)||0);
    const sw=sl?sl.getBoundingClientRect().width:inner;
    return {sw,gap,inner,unit:sw+gap};
  }
  const per=()=>{const {sw,gap,inner}=geo();
    return Math.max(1,Math.min(slides.length,Math.round((inner+gap)/(sw+gap))));};
  /* مواقف الشريط كلها على بداية شريحة، وآخر موقف هو آخر ما يمكن بلوغه —
     فلا تظهر بطاقة نصفها مقصوص في أيّ حال. */
  function stops(){
    const p=per(),last=Math.max(0,slides.length-p),out=[];
    for(let i=0;i<last;i+=p)out.push(i);
    out.push(last);
    return out;
  }
  /* بعض المحركات تجعل scrollLeft سالبًا في RTL وبعضها موجبًا — يُكشف بالتجربة */
  let sign=0;
  function dir(){
    if(sign)return sign;
    const max=track.scrollWidth-track.clientWidth;
    if(max<=1)return (sign=-1);
    const keep=track.scrollLeft;
    track.scrollLeft=-max; sign=track.scrollLeft<-1?-1:1; track.scrollLeft=keep;
    return sign;
  }
  let cur=0,timer=null;
  function drawDots(){
    const n=stops().length;
    if(cur>=n)cur=n-1;
    dots.innerHTML=Array.from({length:n},(_,i)=>
      `<button aria-label="الموضع ${i+1}" aria-current="${i===cur}"></button>`).join("");
    dots.querySelectorAll("button").forEach((b,i)=>b.onclick=()=>{cur=i;go();reset();});
  }
  function mark(){dots.querySelectorAll("button").forEach((b,i)=>b.setAttribute("aria-current",i===cur));}
  function go(smooth=true){
    const st=stops(); cur=((cur%st.length)+st.length)%st.length;
    const off=st[cur]*geo().unit;
    track.scrollTo({left:dir()*off,behavior:smooth?"smooth":"auto"});
    mark();
  }
  function tick(){ cur++; go(); }
  function start(){ if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
    stop(); timer=setInterval(tick,interval); }
  function stop(){ if(timer){clearInterval(timer);timer=null;} }
  function reset(){ start(); }
  drawDots(); go(false);
  root.addEventListener("mouseenter",stop); root.addEventListener("mouseleave",start);
  root.addEventListener("touchstart",stop,{passive:true});
  track.addEventListener("scroll",()=>{
    const {unit}=geo(); if(!unit)return;
    const at=Math.abs(track.scrollLeft)/unit, st=stops();
    let best=0,bd=Infinity;
    st.forEach((v,i)=>{const d=Math.abs(v-at); if(d<bd){bd=d;best=i;}});
    if(best!==cur){cur=best;mark();}
  },{passive:true});
  addEventListener("resize",()=>{sign=0;drawDots();go(false);},{passive:true});
  start();
  return {stop,start};
}
