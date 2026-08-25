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
    // النهاري هو الأصل، فما لم يُختَر شيءٌ فالحالُ نهاريّ
    const cur=document.documentElement.getAttribute("data-theme")||"light";
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
  .map(x=>`<p class="para">${esc(x)}</p>`).join("")||'<p class="para">…</p>';
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
      const note=gh?`<div class="note">مقتطف المطابقة يُعرض بالرسم المجرَّد من التشكيل، وهو صورة البحث لا صورة الكتاب. النصّ كما ورد في صفحة الحديث.</div>`:"";
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
        if(st)st.textContent=`يبحث في المتون… ${AR(d)}/${AR(t)}، ${AR(c)} نتيجة`;});
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
/* الشروح وكتب السيرة تُشحن بالشكل نفسه (meta/toc/idx/c{N})، فآلةُ القراءة
   والبحث واحدة. ويُسجَّل لكلّ كتابٍ مجموعتُه عند تحميل فهرسها، فتعرف
   الدوالُّ من أين تجلب بلا أن يُمرَّر المسار في كل نداء. */
const SH={books:null,idx:{},chunk:{},meta:{},dir:{}};
async function bookSet(col){
  if(!SH[col+"Books"]){
    const bs=await api.local(col+"/books.json");
    for(const b of bs){ SH.dir[b.slug]=col; SH.meta[b.slug]=b; }
    SH[col+"Books"]=bs;
  }
  return SH[col+"Books"];
}
const bookDir=(slug)=>SH.dir[slug]||"sharh";
async function sharhBooks(){ SH.books=await bookSet("sharh"); return SH.books; }
async function siraBooks(){ return bookSet("sira"); }
async function sharhMeta(slug){
  if(SH.meta[slug]) return SH.meta[slug];
  const bs=await sharhBooks(); return bs.find(b=>b.slug===slug);
}
async function sharhIdx(slug){
  if(!SH.idx[slug]) SH.idx[slug]=await api.local(`${bookDir(slug)}/${slug}/idx.json`);
  return SH.idx[slug];
}
async function sharhToc(slug){
  const k="toc:"+slug;
  if(!SH.idx[k]) SH.idx[k]=await api.local(`${bookDir(slug)}/${slug}/toc.json`);
  return SH.idx[k];
}
async function sharhChunk(slug,n){
  const k=slug+":"+n;
  if(!SH.chunk[k]) SH.chunk[k]=await api.local(`${bookDir(slug)}/${slug}/c${n}.json`);
  return SH.chunk[k];
}
/* ألفاظٌ لا تدلّ على موضع: أدوات وألفاظ إسنادٍ ورفع، تَرِد في كل صفحة */
const SH_STOP=new Set(("عن قال قالت قوله انه اني اذا الذي التي هذا هذه ذلك وقد كان كانت ثم "+
 "لا ما لم في من الي علي هو هي به له بن ابن ابي ابو رسول الله النبي صلي عليه وسلم "+
 "حدثنا اخبرنا انبانا وهو وهي وقال فقال ايضا كذا وفي وقيل قلت "+
 /* ألفاظ الرواية والتحمّل: تدور في كل صفحةٍ من الشرح فلا تميّز حديثًا */
 "اسناد بالاسناد بهذا نحوه مثله بلفظ بمعناه رواه روي ورواه واخرجه اخرجه حدثني "+
 "اخبرني يسنده مرفوعا موقوفا طريق وجه رضي عنه عنها عنهم اخر اخري لفظه سنده "+
 "متنه معناه ورد وردت وذكره ذكره تقدم ياتي سياتي مضي المصنف الشارح المولف").split(" "));

/* آخر عنوانٍ قبل جزءٍ بعينه — يُؤخذ من الفهرس لا بتحميل الجزء السابق */
async function sharhBabBefore(slug,ci){
  if(!ci) return null;
  const toc=await sharhToc(slug);
  let last=null;
  for(const t of toc){ if(t[1]>=ci) break; last=t[0]; }
  return last;
}
/* عنوان الباب كما يُعرض: تُزال منه علامات الترقيم وأرقام الطبعة و«قوله»
   كما يُفعل في فهرس الكتاب، ويبقى اللفظ كما ورد. */
function babClean(t){
  return String(t||"").replace(/^\d+\s*/,"").replace(/^[(]\s*/,"").replace(/\s*[)]\s*$/,"")
    .replace(/^\d+\s*/,"").replace(/^[(]\s*/,"").replace(/^قوله\s+/,"")
    .replace(/\s*[)]\s*$/,"").replace(/\s+/g," ").trim();
}
/* كلمات الباب المميِّزة — «باب» و«كتاب» و«ما جاء في» لا تفرّق بابًا عن باب */
const BAB_STOP=new Set(("باب كتاب ابواب ما جاء في من الي علي عن ذكر ذلك اذا قول قوله وما "+
 "الرجل النبي رسول الله صلي عليه وسلم و هو هي التي الذي بين لا وفي كان").split(" "));
const babWords=(s)=>[...new Set(norm(s).split(" ").filter(w=>w.length>2&&!BAB_STOP.has(w)))];
/* أَعنوانُ الباب من ألفاظ هذا الحديث؟
 * أبواب البخاري والترمذي وغيرِهما تُصاغ غالبًا من لفظ الحديث نفسه، فوجودُ
 * كلمات العنوان في المتن دليلٌ على أنّ الباب بابُه. ويُقاس بنسبتها من كلمات
 * العنوان وحده — فالمتن أطولُ منه، فأخذُ الأقصر يرفع النسبة بلا وجه.
 * (وبابُ الحديث في مصدرنا كتابٌ لا باب — «كتاب الإيمان» — فلا يصلح للمقابلة.)
 */
function babInText(bab,text){
  const A=babWords(bab); if(A.length<2) return 0;
  const t=" "+norm(text)+" ";
  let n=0; for(const w of A) if(t.includes(" "+w)) n++;
  return n/A.length;
}
/* موضع بابٍ عنوانه من ألفاظ المتن — يُستعمل حين يخفق البحث في الفقرات */
async function sharhBabFind(slug,matn){
  const toc=await sharhToc(slug);
  let best=null,bs=0;
  for(const t of toc){ const r=babInText(t[0],matn);
    if(r>bs){ bs=r; best={ar:babClean(t[0]),c:t[1],i:t[2],v:t[3],p:t[4],ratio:+r.toFixed(2)}; } }
  return bs>=0.75?best:null;
}

/* بحثٌ في كتاب.
 * الشروح تقتبس المتن مُقطَّعًا («قوله: كذا» ثم كلام، ثم «قوله: كذا»)، فاشتراط
 * ورود كل كلمات العبارة في فقرةٍ واحدة يُسقط الموضع الصحيح غالبًا. وكذلك أخذُ
 * تقاطع مواضع أندر الكلمات يحذف الجزء الصحيح قبل مسحه. فصار الترشيح باتّحادها
 * مرتَّبًا بعدد ما تحويه، والقبول بدرجةٍ لا بشرطٍ قاطع.
 */
async function sharhFind(slug,q,{limit=40,onprog,minScore=0.5,scan=16,noRetry=false}={}){
  const n=norm(q); if(n.length<3) return [];
  const all=n.split(" ").filter(Boolean);
  const words=[...new Set(all.filter(w=>w.length>2&&!SH_STOP.has(w)))];
  if(!words.length) return [];
  const idx=await sharhIdx(slug), meta=await sharhMeta(slug);

  // أجزاءٌ مرشَّحة: اتّحادُ مواضع الكلمات، مرتَّبةً بعدد كلمات الاستعلام فيها
  const posted=words.map(w=>idx[w]).filter(Boolean).sort((a,b)=>a.length-b.length);
  let list;
  if(!posted.length) list=Array.from({length:meta.chunks},(_,i)=>i);
  else{
    const cnt=new Map();
    for(const l of posted.slice(0,8)) for(const c of l) cnt.set(c,(cnt.get(c)||0)+1);
    list=[...cnt.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(x=>x[0]).slice(0,scan);
  }

  // نوافذ متتابعة: ورودُها متّصلةً أقوى دلالةً من تناثر الكلمات
  const W=3, wins=[], winDist=[];
  for(let i=0;i+W<=all.length;i++){
    const seg=all.slice(i,i+W);
    wins.push(seg.join(" "));
    winDist.push(seg.filter(w=>w.length>2&&!SH_STOP.has(w)).length);
  }

  const out=[]; let done=0;
  for(const ci of list){
    const rows=await sharhChunk(slug,ci);
    /* عنوان الباب الذي يقع الموضع تحته: عناوين هذه الكتب أبوابُ المصنَّف
       نفسه، فهي أوثق دليلٍ يراه القارئ — يقابل باب الحديث بباب الشرح. */
    let bab=null, babAt=-1;
    for(let k=0;k<rows.length;k++) if(rows[k][3]){ bab=rows[k][0]; babAt=k; break; }
    if(babAt!==0) bab=await sharhBabBefore(slug,ci);
    for(let i=0;i<rows.length;i++){
      if(rows[i][3]){ bab=rows[i][0]; babAt=i; }
      const t=norm(rows[i][0]);
      const exact=n.length>10&&t.includes(n);
      let winHit=0, bestWin=-1, bestDist=-1;
      for(let k=0;k<wins.length;k++) if(t.includes(wins[k])){ winHit++;
        /* تُختار أكثرُ النوافذ ألفاظًا مميِّزة لا أوّلُها: صدرُ المتن كثيرًا
           ما يكون «وقد روي عن النبي صلى الله عليه وسلم» وأمثالَه، فيُعرَض
           على القارئ اقتباسٌ طويلٌ لا يدلّ على حديثه بشيء. */
        const d=winDist[k]; if(d>bestDist){ bestDist=d; bestWin=k; } }
      /* الاقتباس الحرفي شرطٌ لا مكافأة: تغطيةُ الكلمات وحدها تُخرج مواضع
         لا صلة لها (طُلب «لا صلاة لمن لم يقرأ بفاتحة الكتاب» فجاء شرحُ حديثٍ
         آخر فيه «صلاة» و«يقرأ» و«الكتاب» متفرّقةً). فلا يُقبل موضعٌ إلا وفيه
         سلسلةُ أربع كلماتٍ من المطلوب متّصلةً، أو المطلوبُ كلّه. */
      if(!exact && !winHit){ if(all.length>=W || !t.includes(n)) continue; }
      let cov=0; for(const w of words) if(t.includes(w)) cov++;
      cov/=words.length;
      /* سلسلةٌ واحدة قصيرة مع تغطيةٍ ضعيفة قد تقع اتفاقًا، فتُخرج موضعًا
         لا صلة له. فيلزم إمّا اقتباسان، أو اقتباسٌ مع تغطيةٍ معتبرة. */
      if(!exact && winHit<2 && cov<minScore) continue;
      const score=(exact?2:0)+winHit+cov*0.5;
      /* أطول لفظٍ من المطلوب ورد في الموضع متّصلًا — هو الدليل الذي يُعرَض:
         بغيره لا يدري القارئ لِمَ سيق له هذا الكلام. */
      let qn="";
      if(exact) qn=n;
      else if(bestWin>=0){
        let a=bestWin,b=bestWin+W;
        while(b<all.length && t.includes(all.slice(a,b+1).join(" "))) b++;
        while(a>0 && t.includes(all.slice(a-1,b).join(" "))) a--;
        qn=all.slice(a,b).join(" ");
      }
      out.push({t:rows[i][0],v:rows[i][1],p:rows[i][2],c:ci,i,exact,
                bab:babAt>=0||bab?bab:null,babAt:babAt>=0?babAt:null,
                qn,quote:qn?origOf(rows[i][0],qn):"",
                words:qn?qn.split(" ").length:0,
                dist:qn?qn.split(" ").filter(w=>w.length>2&&!SH_STOP.has(w)).length:0,
                cov:+cov.toFixed(2),
                win:winHit>0,score:+score.toFixed(3)});
    }
    if(onprog) onprog(++done,list.length,out.length);
    if(out.length>=limit*6) break;
  }
  out.sort((a,b)=>b.score-a.score);
  if(out.length) return out.slice(0,limit);

  /* لا شيء: قد تكون النافذة المختارة من المتن ممّا لم يُعلّق عليه الشارح.
     تُجرَّب نوافذُ أخرى منه قبل الإقرار بالخيبة. وخفضُ العتبة ليس بديلًا:
     جُرِّب فأخرج مواضع لا صلة لها (شرحُ «القنع» لحديث الكسوف). */
  if(!noRetry && all.length>7){
    for(const st of [Math.floor(all.length/3),Math.floor(all.length/2),Math.max(0,all.length-7)]){
      const sub=all.slice(st,st+7).join(" ");
      if(sub.split(" ").filter(w=>w.length>2&&!SH_STOP.has(w)).length<3) continue;
      const r=await sharhFind(slug,sub,{limit,minScore,scan,noRetry:true});
      if(r.length) return r;
    }
  }
  return [];
}
/* خريطة بين النصّ المطبَّع وموضع كل حرف في الأصل — للإبراز واقتطاع
   اللفظ كما ورد. النصّ لا يُعرض إلا أصلًا، والمطبَّع للمطابقة فقط. */
function normMap(text){
  const map=[]; let acc="";
  for(let i=0;i<text.length;i++){
    const c=norm(text[i]);
    if(c){ acc+=c; for(let k=0;k<c.length;k++) map.push(i); }
    else if(acc && !acc.endsWith(" ")){ acc+=" "; map.push(i); }
  }
  return {acc,map};
}
/* موضع عبارةٍ مطبَّعة في الأصل: [بداية، نهاية] أو null */
function origSpan(text,n){
  if(!n) return null;
  const {acc,map}=normMap(text);
  const at=acc.indexOf(n);
  if(at<0||at>=map.length) return null;
  return [map[at],map[Math.min(at+n.length,map.length-1)]];
}
/* اللفظ كما ورد في الأصل، مقابلًا لعبارةٍ مطبَّعة */
function origOf(text,n){
  const sp=origSpan(text,n);
  return sp?text.slice(sp[0],sp[1]+1).trim():"";
}
/* إبراز الموضع في النصّ الأصلي: المطابقة على المطبَّع والقصّ على الأصل */
function sharhMark(text,q){
  const sp=origSpan(text,norm(q));
  if(!sp) return esc(text);
  return esc(text.slice(0,sp[0]))+"<mark>"+esc(text.slice(sp[0],sp[1]+1))+"</mark>"+esc(text.slice(sp[1]+1));
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
 ["شروح الحديث: أربعة كتب","فتح الباري لابن حجر، والمنهاج للنووي، وعون المعبود، وتحفة الأحوذي، من مدوّنة OpenITI الأكاديمية المنشورة، نصوصًا مرقونة لا ممسوحة ضوئيًّا.","https://github.com/OpenITI"],
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
function matnPhrase(text,n=12){
  const t=norm(text);
  const MARK=/صلي الله عليه وسلم/g;
  let last=-1,m;
  while((m=MARK.exec(t))) last=m.index+m[0].length;
  let rest=last>0?t.slice(last):"";
  // القطعُ قد يقع داخل كلمة، فيُسقَط ما قبل أوّل مسافة
  if(rest && !/^\s/.test(rest)){ const sp=rest.indexOf(" "); rest=sp<0?"":rest.slice(sp); }
  rest=rest.replace(/^\s*(?:يقول|قال|انه قال|قالت|فقال|انه)\s*/,"").trim();
  const w=(rest||t).split(" ").filter(Boolean);
  if(w.length<4){ const a=t.split(" ").filter(Boolean); return a.slice(-n).join(" "); }
  return w.slice(0,n).join(" ");
}

/* الشرح على صفحة الحديث.
 *
 * الإشكال الذي عولج هنا: كان يُعرض الموضع مجرَّدًا، فلا يدري القارئ أَشَرحُ
 * حديثِه هو أم كلامٌ آخر وقعت فيه ألفاظٌ متشابهة. والحكم بالظنّ عليه وحده
 * مخالفٌ لأصل المنصة: لا معلومة بلا دليلٍ ظاهر.
 * فصار كلّ موضعٍ يُساق بدليله معروضًا: اللفظ المقتبَس من المتن كما ورد،
 * والبابُ الذي وقع تحته في الشرح مقابَلًا بباب الحديث في أصله. والمنصة
 * تُبيّن قوّة الدليل ولا تجزم بما لم يقم عليه.
 */
const SHARH_ON={bukhari:"fath-albari",muslim:"minhaj-nawawi",
                abudawud:"awn-almabud",tirmidhi:"tuhfat-alahwadhi"};
const SHARH_ONAR={"fath-albari":"فتح الباري لابن حجر","minhaj-nawawi":"المنهاج للنووي",
                  "awn-almabud":"عون المعبود","tuhfat-alahwadhi":"تحفة الأحوذي"};

/* وزن الدليل: اقتباسٌ حرفي من المتن، وعنوانُ بابٍ من ألفاظه. لا يُرفع الموضع
   إلى «مؤكَّد» إلا باجتماعهما — فاللفظ وحده قد يتكرّر في الكتاب، والعنوانُ
   وحده يجمع تحته أحاديث الباب كلَّها. */
/* ألفاظ الاقتباس المميِّزة: ما ليس من أدوات الرواية ولا من أسماء رجال السند */
function distOf(qn,isnad){
  if(!qn) return 0;
  const bad=isnad||new Set();
  return qn.split(" ").filter(w=>w.length>2&&!SH_STOP.has(w)&&!bad.has(w)).length;
}
/* أسماء رجال السند مُطبَّعة، كلمةً كلمة */
function isnadWords(names){
  const s=new Set();
  for(const n of names||[]) for(const w of norm(n).split(" ")) if(w.length>2) s.add(w);
  return s.size?s:null;
}
function sharhEvid(h,matn,isnad,term){
  /* البطاقةُ تُعرض في موضعين: شرحُ حديثٍ بعينه — فالمقابَل متنُه — وبحثٌ
     حرٌّ يكتبه القارئ. فيُسمّى المقابَل باسمه في الحالين ولا يُقال «المتن»
     لمن بحث عن «حفر زمزم». */
  const T=term||"المطلوب";
  /* طولُ الاقتباس وحده لا يزن: ثمانُ كلماتٍ من ألفاظ الإسناد لا تدلّ على
     حديثٍ بعينه، وثلاثٌ من لفظ المتن تدلّ. فالعبرة بالمميِّز منها. */
  /* لا يُعدّ الاقتباس حجّةً إلا بلفظين من صُلب المتن: أسماءُ رجال السند
     وألفاظُ الرواية تَرِد في كل بابٍ، فاقتباسها لا يدلّ على حديثٍ بعينه ولو
     طال. وأسماءُ رجال هذا السند تُعرَف من سلسلته المفهرسة، فتُطرح. */
  const w=h.words||0, d=isnad?distOf(h.qn,isnad):(h.dist==null?w:h.dist);
  const quoted=d>=2&&(h.exact||w>=3);
  const bab=h.bab?babClean(h.bab):"";
  const br=bab&&matn?babInText(bab,matn):0;
  const same=br>=0.75;
  const why=[];
  if(h.quote){
    why.push([quoted?"ok":"mid",
      (quoted?"يقتبس "+T+" لفظًا بلفظ":"فيه من ألفاظ "+T)+
      ": «"+esc(h.quote)+"»"+(w?' <bdi class="wc">'+AR(w)+" "+(w<=10?"كلمات":"كلمة")+'</bdi>':"")]);
    if(!quoted) why.push(["no","وأكثرُه أسماءُ رجالٍ أو ألفاظُ رواية، تَرِد في كل بابٍ فلا تخصّ موضعًا بعينه"]);
  }else why.push(["no","لم يرد لفظٌ متّصل من "+T+" في هذا الموضع، وإنما تفرّقت كلماته"]);
  if(bab) why.push([same?"ok":"mid","تحت باب «"+esc(bab)+"»"+
    (same?" — وعنوانه من ألفاظ "+T:"")]);
  const lvl=quoted&&same?"sure":quoted?"strong":same?"bab":"weak";
  return {lvl,why,quoted,same,bab,
    label:{sure:"مطابقة مؤكَّدة",strong:"اقتباس حرفي",bab:"الباب موافق",weak:"موضع محتمل"}[lvl]};
}
/* بطاقة موضع: الدليل أوّلًا ثم النصّ، لا العكس */
function sharhCard(slug,h,matn,isnad,{open=true,term}={}){
  const e=sharhEvid(h,matn,isnad,term);
  const t=h.t.length>700?h.t.slice(0,700)+"…":h.t;
  return '<div class="ev ev-'+e.lvl+'">'+
    '<div class="evh"><span class="evb">'+e.label+'</span>'+
    '<span class="evp"><bdi>ج'+AR(h.v)+' ص'+AR(h.p)+'</bdi></span></div>'+
    '<ul class="evw">'+e.why.map(x=>'<li class="'+x[0]+'">'+x[1]+'</li>').join("")+'</ul>'+
    '<div class="evt amiri">'+(h.qn?sharhMark(t,h.qn):esc(t))+'</div>'+
    (open?'<a class="evgo" href="sharh.html#/'+slug+'/r/'+h.c+'/'+h.i+'">اقرأ الموضع في الكتاب وما حوله ←</a>':"")+
  '</div>';
}
/* ترتيبٌ يقدّم ما وافق بابه: اللفظ يتكرّر في الكتاب، والبابُ يحصر الموضع */
function sharhRank(hits,matn,isnad){
  return hits.map(h=>{const e=sharhEvid(h,matn,isnad);
    return {h,k:(e.same?2:0)+(e.quoted?1.5:0)+h.score/10};})
   .sort((a,b)=>b.k-a.k).map(x=>x.h);
}

async function sharhBlock(matn,mount,book,names){
  const slug=SHARH_ON[book];
  if(!slug){
    mount.innerHTML='<div class="pane msg">لا كتابَ شرحٍ لهذا المصنَّف في المنصة بعدُ.'+
      '<div class="note" style="margin:.7rem 0 1rem">المشحون: فتح الباري، والمنهاج، وعون المعبود، وتحفة الأحوذي.</div>'+
      '<a class="act" href="sharh.html">تصفَّح كتب الشروح ←</a></div>';
    return;
  }
  const bar=esc(SHARH_ONAR[slug]);
  const q=matnPhrase(matn);
  mount.innerHTML='<div class="sstat"><span class="spin"></span><span>يبحث في '+bar+'…</span>'+
    '<span class="bar"><i style="width:8%"></i></span></div>';
  try{
    const [hits,babAt]=await Promise.all([
      sharhFind(slug,q,{limit:12,onprog:(d,t)=>{const i=mount.querySelector(".bar i");
        if(i)i.style.width=Math.round(8+d/t*92)+"%";}}),
      sharhBabFind(slug,matn).catch(()=>null)]);
    const isnad=isnadWords(names);
    const top=sharhRank(hits,matn,isnad).slice(0,3);
    const head='<p class="evlead">هذه مواضعُ من <b>'+bar+'</b> — شرحِ هذا المصنَّف — عُثر عليها '+
      'بألفاظ متن الحديث. مع كلّ موضعٍ دليلُ اختياره لتحكم بنفسك؛ '+
      'والمنصة لا تنسب شرحًا إلى حديثٍ بغير دليلٍ ظاهر.</p>';
    const acts='<div class="acts"><a class="act" href="sharh.html#/'+slug+'/q/'+encodeURIComponent(q)+'">'+
      'كل المواضع في '+bar+' ←</a>'+
      (babAt?'<a class="act" href="sharh.html#/'+slug+'/r/'+babAt.c+'/'+babAt.i+'">افتح الباب في الشرح</a>':"")+
      '<a class="act" href="sharh.html#/'+slug+'">تصفَّح الكتاب</a></div>';
    if(top.length){
      mount.innerHTML=head+top.map(h=>sharhCard(slug,h,matn,isnad,{term:"متن الحديث"})).join("")+acts+
        '<div class="note">النصّ كما ورد في '+bar+'، بجزئه وصفحته. '+
        'الشروح كلامٌ متّصل، فقد يقع شرح الحديث في مواضع أخرى منها.</div>';
    }else if(babAt){
      mount.innerHTML='<p class="evlead">لم يُعثر على موضعٍ يقتبس ألفاظ هذا المتن في <b>'+bar+'</b>. '+
        'لكنّ بابه موجود، فيُفتح لتقرأه:</p>'+
        '<div class="ev ev-bab"><div class="evh"><span class="evb">الباب نفسه</span>'+
        '<span class="evp"><bdi>ج'+AR(babAt.v)+' ص'+AR(babAt.p)+'</bdi></span></div>'+
        '<ul class="evw"><li class="ok">عنوان الباب «'+esc(babAt.ar)+'» من ألفاظ هذا الحديث</li>'+
        '<li class="no">وليس في الباب اقتباسٌ حرفي من هذا المتن، فقد يشرح غيره من أحاديثه</li></ul>'+
        '<a class="evgo" href="sharh.html#/'+slug+'/r/'+babAt.c+'/'+babAt.i+'">اقرأ الباب في الكتاب ←</a></div>'+acts;
    }else{
      mount.innerHTML='<div class="pane msg">لم يُعثر في <b>'+bar+'</b> على موضعٍ يقتبس ألفاظ هذا المتن.'+
        '<div class="note" style="margin:.7rem 0 1rem">لا يعني هذا أنّه غير مشروح: قد يشرحه الشارح بلفظٍ '+
        'آخر أو في موضعٍ لم تبلغه المطابقة. ابحث بلفظٍ من المتن تختاره أنت.</div></div>'+acts;
    }
  }catch(e){
    mount.innerHTML='<div class="pane msg">تعذّر البحث في '+bar+'.'+
      '<div class="acts" style="margin-top:1rem"><a class="act" href="sharh.html#/'+slug+'/q/'+
      encodeURIComponent(q)+'">جرّب في صفحة الشروح ←</a></div></div>';
  }
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
  if(g){ const t="الطبقة "+(ORD[+g[1]]||AR(g[1])); out=out?out+"، "+t:t; }
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
  return pl?t+"، "+pl:t;
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
    // يُعطَّل الانسياب أثناء الاختبار، وإلا لم يُطبَّق الإسناد فورًا فتُقرأ صفرًا
    const keepB=track.style.scrollBehavior;
    track.style.scrollBehavior="auto";
    const keep=track.scrollLeft;
    track.scrollLeft=-max; sign=track.scrollLeft<-1?-1:1; track.scrollLeft=keep;
    track.style.scrollBehavior=keepB;
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

/* ═══ السيرة: خطُّ الأحداث ═══
 *
 * كتب السيرة على الشابكة إمّا نصٌّ متّصلٌ لا يُقرأ، وإمّا حكايةٌ حديثةٌ
 * لا يُدرى على أيّ شيءٍ قامت. وأكثرُ مادّة السيرة أخبارٌ لا أحاديثُ على
 * شرط الصحيح، وكلُّ روايةٍ تختار وجهًا وتُخفي عن قارئها أنّها اختارت.
 *
 * فليس هذا سردًا للسيرة. هو عرضٌ لما قام عليه كلُّ حدثٍ من المصادر،
 * مرتَّبًا بقوّته: ما في القرآن، ثم ما في كتب الحديث بدرجاته، ثم ما في
 * كتب السيرة. والقارئ يرى الطبقات ويحكم؛ والمنصة تنقل ولا ترجّح.
 *
 * ولا يُنسَب حديثٌ إلى حدثٍ بالمطابقة العمياء: يُشترط مفتاحان مستقلّان
 * يقدّمهما المصدر نفسه — تصنيفُ المصنِّف (كتاب المغازي والسير) وورودُ
 * اسم الحدث في المتن — ويُعرض موضعُ الذكر مُبرَزًا مع كل حديث.
 */
/* أسباب النزول: مفاتيحُها سورةٌ وآية، فتُقرأ بالمفتاح لا بالمطابقة */
const AS={m:null};
async function asbab(sura,aya){
  if(!AS.m) AS.m=await api.local("asbab.json").catch(()=>({}));
  return AS.m[sura+":"+aya]||[];
}
/* عرضُ سبب النزول — نصًّا كما ورد بجزئه وصفحته، ولا يُلخَّص */
function asbabBlock(list){
  if(!list||!list.length) return "";
  return '<div class="sh"><h2>سبب نزولها</h2><span class="cnt"><bdi>'+AR(list.length)+
    '</bdi></span><span class="ln"></span></div>'+
    '<p class="evlead">من <b>أسباب النزول</b> للواحدي (ت٤٦٨هـ)، وُصل بالآية بمطابقة اللفظ '+
    'الذي اقتبسه بنصّ المصحف. والنصّ كما ورد بجزئه وصفحته.</p>'+
    list.map(x=>'<div class="ev ev-bab"><div class="evh"><span class="evb">أسباب النزول</span>'+
      '<span class="evp"><bdi>ج'+AR(x.v)+' ص'+AR(x.p)+'</bdi></span></div>'+
      '<div class="evt amiri" style="border-top:0;padding-top:0">'+paras(x.t)+'</div></div>').join("")+
    '<div class="note">كتابُ أسبابِ نزولٍ يسوق الرواية بإسنادها، وفيه المرسلُ والضعيف. '+
    'يُقرأ على أنّه كذلك، والمنصة تنقل ولا ترجّح.</div>';
}

const SR={ev:null};
async function siraEvents(){ if(!SR.ev) SR.ev=await api.local("sira/events.json"); return SR.ev; }

/* عمر النبي ﷺ عند الحدث — حسابٌ على المشهور: بُعث على رأس الأربعين،
   وهاجر بعد ثلاث عشرة من مبعثه. يُعرض تقريبًا ويُبيَّن أنّه حساب. */
/* لا سنَّ لمن لا تاريخَ له: كان «٥٣ + null» يساوي ٥٣، فادّعى كلُّ حدثٍ
   غيرِ مؤرَّخٍ أنّ النبيَّ ﷺ كان ابن ثلاثٍ وخمسين — وهو خبرٌ لا أصل له.
   ولا يُقال في المولد «ابن نحو صفر». */
const siraAge=(y)=>(y==null?null:53+y);
const siraAgeAr=(y)=>{const a=siraAge(y);
  return (a==null||a<=0)?"":'ﷺ ابن نحو <bdi>'+AR(a)+'</bdi> سنة';};
function siraYear(y){
  if(y==null||y===0) return "";
  return y>0 ? "سنة "+AR(y)+"هـ" : "قبل الهجرة بـ"+AR(-y);
}
/* شريط التوثيق: على أيّ الطبقات قام الحدث */
const TIERS=[["q","القرآن","ما نزل فيه من المصحف"],
             ["h","كتب الحديث","ما رُوي فيه في الصحاح والسنن بدرجاته"],
             ["m","مُسنَد السيرة","ما ساقه البيهقي في دلائل النبوة بأسانيده"],
             ["s","كتب الأخبار","ما ساقه ابن هشام والواقدي وابن سعد"]];
function siraTier(t,{full=false}={}){
  return '<div class="tier'+(full?" tier-full":"")+'">'+TIERS.map(([k,ar,note])=>
    '<span class="tw '+(t[k]?"on":"off")+'"'+(full?'':' title="'+esc(ar+" — "+note)+'"')+'>'+
    '<i></i>'+esc(ar)+'</span>').join("")+'</div>';
}
