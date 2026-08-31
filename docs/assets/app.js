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
/* رقمٌ كبير بفاصلة الآلاف العربية: ٤٩٬٧٣٧ لا ٤٩٧٣٧ */
const ARG=n=>AR(String(n).replace(/\B(?=(\d{3})+(?!\d))/g,"٬"));
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
const SEARCH={books:null,surahs:null,tafsirs:null,idx:{},scope:"all",kind:"all",quran:null,
  rijal:null,sira:null,asbab:null,shb:null,srb:null,fqb:null,fqm:null};

async function searchInit(){
  const [b,s,t]=await Promise.all([api.local("books.json"),api.local("surahs.json"),api.local("tafsirs.json")]);
  SEARCH.books=b; SEARCH.surahs=s; SEARCH.tafsirs=t; return SEARCH;
}
/* ── ما تحتاجه صفحةُ الحديث: بابُ الحديث وأحكامُه وسلسلتُه ──
 * كان يُنزَّل فهرسُ الكتاب كلُّه (٥٫٦ م.ب في البخاري) لأجل صفٍّ واحد
 * ولمعرفة رقمَي السابق والتالي. وقد قُطِّع في tools/build-web.mjs:
 *   h/{كتاب}/nav.json   [رقم، باب] لكل حديثٍ بترتيبه — ٧٢ ك.ب في أكبرها
 *   h/{كتاب}/{باب}.json  {رقم: [أحكام، سلسلة]} — ١٩٦ ك.ب في أكبرها
 * والفهرسُ الكامل يبقى لموضعه: البحثُ في المتون.
 */
const HN={};
async function hadNav(k){
  if(!HN[k]) HN[k]=api.local(`h/${k}/nav.json`).catch(()=>[]);
  return HN[k];
}
const HS={};
async function hadSec(k,sec){
  const key=k+":"+sec;
  if(!HS[key]) HS[key]=api.local(`h/${k}/${sec}.json`).catch(()=>({}));
  return HS[key];
}
/* صفُّ حديثٍ بعينه بالشكل الذي تعرفه الصفحات: [رقم، باب، متن، أحكام، سلسلة].
   والمتنُ فارغٌ هنا لأنّه للبحث لا للعرض، والعرضُ من واجهة المتون. */
async function hadRow(k,num){
  const nav=await hadNav(k);
  const at=nav.find(x=>x[0]===num); if(!at) return null;
  const m=await hadSec(k,at[1]);
  const g=m[num]||[[],[]];
  return [num,at[1],"",g[0],g[1]];
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
/* ما يُبحث فيه من البيانات الثقيلة يُجلب عند أوّل بحثٍ يحتاجه لا عند فتح
   الصفحة: فهرس الرواة وحده ٧٥٢ك.ب، ولا وجه لتحميله على من لم يبحث. */
async function loadRijalIdx(){ if(!SEARCH.rijal) SEARCH.rijal=await api.local("rijal/index.json").catch(()=>({})); return SEARCH.rijal; }
async function loadSiraIdx(){ if(!SEARCH.sira) SEARCH.sira=await api.local("sira/events.json").catch(()=>[]); return SEARCH.sira; }
async function loadAsbabIdx(){
  if(!SEARCH.asbab){
    const m=await api.local("asbab.json").catch(()=>({}));
    const rows=[];
    for(const k in m) for(const it of m[k]) rows.push([k,it,norm(it.t)]);
    SEARCH.asbab=rows;
  }
  return SEARCH.asbab;
}
async function loadColBooks(){
  if(!SEARCH.shb) SEARCH.shb=await bookSet("sharh").catch(()=>[]);
  if(!SEARCH.srb) SEARCH.srb=await bookSet("sira").catch(()=>[]);
  if(!SEARCH.fqb) SEARCH.fqb=await bookSet("fiqh").catch(()=>[]);
  return [...(SEARCH.shb||[]),...(SEARCH.srb||[]),...(SEARCH.fqb||[])];
}
/* مسائلُ الفقه: تُبحث في نصّها، ولكلٍّ موضعُه ووسمُه */
async function loadFiqhMasail(){
  if(!SEARCH.fqm){
    const [m,j]=await Promise.all([api.local("fiqh/masail.json").catch(()=>[]),
                                   api.local("fiqh/ijmac.json").catch(()=>[])]);
    SEARCH.fqm=[...m.map(x=>({...x,src:"khilaf"})),
                ...j.map(x=>({t:x.t,kitab:x.kitab,bab:x.bab,v:x.v,p:x.p,n:x.n,tags:["ijmac"],src:"ijmac"}))]
      .map(x=>[x,norm(x.t)]);
  }
  return SEARCH.fqm;
}
function fiqhHits(q,limit=20){
  const n=norm(q); if(n.length<3||!SEARCH.fqm) return [];
  const out=[];
  for(const [x,t] of SEARCH.fqm){ if(t.indexOf(n)<0) continue; out.push(x); if(out.length>=limit) break; }
  return out;
}
/* ما يلزم لكلّ مرشّح — يُجلب مرّةً ثم يُخزَّن */
async function searchNeeds(kind){
  const all=kind==="all";
  const jobs=[];
  if(all||kind==="rijal") jobs.push(loadRijalIdx());
  if(all||kind==="sira")  jobs.push(loadSiraIdx());
  if(all||kind==="asbab") jobs.push(loadAsbabIdx());
  if(all||kind==="sharh"||kind==="sira"||kind==="fiqh") jobs.push(loadColBooks());
  if(all||kind==="fiqh") jobs.push(loadFiqhMasail());
  await Promise.all(jobs);
}
/* أسبابُ النزول: بحثٌ في نصّها، ومفتاحُها سورةٌ وآية */
function asbabHits(q,limit=12){
  const n=norm(q); if(n.length<3||!SEARCH.asbab) return [];
  const out=[];
  for(const [key,it,t] of SEARCH.asbab){
    const at=t.indexOf(n); if(at<0) continue;
    out.push({key,it,at});
    if(out.length>=limit) break;
  }
  return out;
}
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
      /* كان يُعرض «الأحاديث ٠–٠»: حقلا first وlast لا وجود لهما في
         بطاقات الأبواب أصلًا. وعددُ أحاديث الباب موجودٌ ويدلّ. */
      if(norm(sc.ar).includes(n)) out.push({kind:"باب",title:sc.ar,
        sub:`${b.ar} · ${AR(sc.count||0)} حديثًا`,href:`hadith.html#/${k}/${sc.n}/1`});
    }
  }
  /* الرواة: بالاسم العربي أو الإنجليزي */
  if(want("rijal")&&SEARCH.rijal){
    let c=0;
    for(const key in SEARCH.rijal){ const r=SEARCH.rijal[key];
      if(!(norm(r.n).includes(n)||(r.en||"").toLowerCase().includes(q.toLowerCase())))continue;
      out.push({kind:"راوٍ",title:r.n,
        sub:[r.g,r.d?dateAr(r.d):"",r.c!=null?AR(r.c)+" حديثًا":""].filter(Boolean).join(" · "),
        href:`rijal.html#/${encodeURIComponent(key)}`});
      if(++c>=12)break; }
  }
  /* أحداث السيرة: بالاسم أو الموضع */
  if(want("sira")&&SEARCH.sira){
    for(const e of SEARCH.sira){
      if(!(norm(e.ar).includes(n)||(e.place&&norm(e.place).includes(n))))continue;
      out.push({kind:"حدث",title:e.ar,
        sub:[e.when,e.place,e.nh?AR(e.nh)+" حديثًا موصولًا":""].filter(Boolean).join(" · "),
        href:`sira.html#/${e.id}`});
    }
  }
  /* كتب الشروح والسيرة بأسمائها ومؤلّفيها */
  if(want("sharh")||want("sira")||want("fiqh")){
    for(const b of [...(SEARCH.shb||[]),...(SEARCH.srb||[]),...(SEARCH.fqb||[])]){
      if(!(norm(b.ar).includes(n)||norm(b.full||"").includes(n)||norm(b.author||"").includes(n)))continue;
      const page=(SEARCH.srb||[]).some(x=>x.slug===b.slug)?`sira.html#/b/${b.slug}`
                :(SEARCH.fqb||[]).some(x=>x.slug===b.slug)?`fiqh.html#/b/${b.slug}`
                :`sharh.html#/${b.slug}`;
      out.push({kind:"كتاب",title:b.ar,sub:`${b.author} · ${AR(b.paras)} فقرة`,href:page});
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

/* «كل المحتوى» يشمل ما يُبحث فيه سريعًا: الأسماء والعناوين والرواة
   والأحداث، ومتونَ الأحاديث وآياتِ المصحف وأسبابَ النزول. وأمّا نصوصُ
   الشروح وكتبِ السيرة — ثلاثةٌ وثلاثون مليون حرفٍ في ثمانية كتب — فلا
   تُمسح إلا حين يطلبها القارئ بمرشّحها، فمسحُها في كلّ ضغطةِ مفتاحٍ
   يُنزل عشرات الميغابايتات على من لم يردها. */
const KINDS=[["all","كل المحتوى"],["hadith","الحديث"],["quran","القرآن"],
  ["rijal","الرواة"],["sharh","الشروح"],["sira","السيرة"],
  ["fiqh","الفقه"],["asbab","أسباب النزول"],["tafsir","كتب التفسير"]];

/* بحثٌ في نصوص كتب الشروح والسيرة — بالآلة نفسها المستعملة في صفحاتها */
async function colTextHits(q,which,onprog){
  const books=await loadColBooks();
  const set=which==="sharh"?SEARCH.shb:which==="sira"?SEARCH.srb:SEARCH.fqb;
  const pick=books.filter(b=>(set||[]).some(x=>x.slug===b.slug));
  const out=[]; let done=0;
  for(const b of pick){
    try{
      const hits=await sharhFind(b.slug,q,{limit:6,scan:6});
      for(const h of hits) out.push({b,h});
    }catch(e){}
    if(onprog) onprog(++done,pick.length,out.length);
  }
  out.sort((a,x)=>x.h.score-a.h.score);
  return out.slice(0,24);
}

function mountSearch(root,{autofocus=false}={}){
  root.innerHTML=`<div class="sbox"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
    <input id="q" type="search" placeholder="ابحث في المتون والآيات والرواة والشروح وأحداث السيرة وأسباب النزول…" autocomplete="off"><kbd>/</kbd></div>
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
    /* النتائجُ الفورية تُحسب عند كل رسمٍ لا مرّةً واحدة: فهرسُ الرواة
       وأحداثُ السيرة تُجلب بعد أوّل رسم، فحسابُها مرّةً قبلها يُسقطها
       من النتيجة أبدًا. (وبهذا كان «أبو هريرة» لا يُخرج راويًا.) */
    const quickHTML=()=>quickHits(q,kind).map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
      <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("");

    const draw=(stat,ayat,groups)=>{ if(my!==seq)return;
      const qh=quickHTML();
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
      const abh=(kind==="all"?asbabHits(q,4):[]).map(({key,it})=>{
        const [sn,av]=key.split(":").map(Number);
        const su=SEARCH.surahs.find(x=>x.n===sn);
        const t=it.t.length>300?it.t.slice(0,300)+"…":it.t;
        return `<a class="hit" href="tafsir.html#/${sn}/ar-tafsir-ibn-kathir/${av}">
          <div class="m"><span class="tag c">سبب نزول</span><span>سورة ${esc(su?su.ar:"")} <bdi>${AR(sn)}:${AR(av)}</bdi></span></div>
          <div class="tx amiri">${sharhMark(t,q)}</div></a>`;}).join("");
      const body=qh+ah+abh+gh;
      const note=gh?`<div class="note">مقتطف المطابقة يُعرض بالرسم المجرَّد من التشكيل، وهو صورة البحث لا صورة الكتاب. النصّ كما ورد في صفحة الحديث.</div>`:"";
      out.innerHTML=(stat||"")+(body||`<div class="msg">لا نتائج لـ «${esc(q)}»</div>`)+note;};

    const wantQuran=kind==="all"||kind==="quran";
    const wantHadith=kind==="all"||kind==="hadith";

    /* المرشّحاتُ التي تحتاج جلبًا: يُنتظر جلبُها ثم تُعاد النتائج الفورية */
    if(kind!=="quran"&&kind!=="tafsir"){
      draw(`<div class="sstat"><span class="spin"></span><span>يجهّز…</span></div>`,[],[]);
      await searchNeeds(kind); if(my!==seq)return;
    }

    /* نصوصُ الشروح وكتب السيرة: تُمسح بطلبٍ صريح لثقلها */
    /* الفقه: مسائلُه أوّلًا فهي المقصودة، ثم نصوصُ كتبه */
    if(kind==="fiqh"){
      const ms=fiqhHits(q,20);
      const cards=ms.map(x=>{
        const t=x.t.length>420?x.t.slice(0,420)+"…":x.t;
        const href=x.src==="ijmac"?`fiqh.html#/ijmac/${encodeURIComponent(x.kitab||"")}`
                                  :`fiqh.html#/khilaf/${encodeURIComponent(x.kitab||"")}`;
        return `<a class="hit" href="${href}"><div class="m">${fiqhTags(x.tags)}
          <span>${esc(x.kitab||"")}${x.bab?" <span class=\"sep\">•</span> "+esc(x.bab):""} <span class="sep">•</span> <bdi>ج${AR(x.v)} ص${AR(x.p)}</bdi></span></div>
          <div class="tx amiri">${sharhMark(t,q)}</div></a>`;}).join("");
      const qk=quickHits(q,kind).map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
        <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("");
      out.innerHTML=`<div class="sstat"><bdi>${AR(ms.length)} مسألة</bdi></div>`+qk+
        (cards||`<div class="msg">لا مسائل لـ «${esc(q)}»</div>`)+
        `<div class="note">القسمُ يعرض ولا يُفتي؛ والمسألةُ بلفظ صاحبها وموضعِه.</div>`;
      return;
    }

    if(kind==="sharh"||kind==="sira"){
      draw(`<div class="sstat"><span class="spin"></span><span>يبحث في الكتب…</span><span class="bar"><i style="width:8%"></i></span></div>`,[],[]);
      const res=await colTextHits(q,kind,(d,t,c)=>{ if(my!==seq)return;
        const bar=out.querySelector(".bar i"); if(bar)bar.style.width=Math.round(8+d/t*92)+"%";
        const st=out.querySelector(".sstat span:nth-child(2)");
        if(st)st.textContent=`يبحث في الكتب… ${AR(d)}/${AR(t)}، ${AR(c)} موضعًا`;});
      if(my!==seq)return;
      const cards=res.map(({b,h})=>{
        const page=(SEARCH.srb||[]).some(x=>x.slug===b.slug)
          ? `sira.html#/b/${b.slug}/r/${h.c}/${h.i}` : `sharh.html#/${b.slug}/r/${h.c}/${h.i}`;
        const t=h.t.length>420?h.t.slice(0,420)+"…":h.t;
        return `<a class="hit" href="${page}"><div class="m"><span class="tag c">${esc(b.ar)}</span>
          <span><bdi>ج${AR(h.v)} ص${AR(h.p)}</bdi></span></div>
          <div class="tx amiri">${h.qn?sharhMark(t,h.qn):esc(t)}</div></a>`;}).join("");
      const quickCol=quickHits(q,kind).map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
        <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("");
      out.innerHTML=`<div class="sstat"><bdi>${AR(res.length)} موضعًا</bdi> في <bdi>${AR(res.length?new Set(res.map(r=>r.b.slug)).size:0)}</bdi> من الكتب</div>`+
        quickCol+(cards||`<div class="msg">لا مواضع لـ «${esc(q)}»</div>`);
      return;
    }

    /* أسباب النزول وحدها */
    if(kind==="asbab"){
      const ab=asbabHits(q,20);
      const cards=ab.map(({key,it})=>{
        const [sn,av]=key.split(":").map(Number);
        const su=SEARCH.surahs.find(x=>x.n===sn);
        const t=it.t.length>420?it.t.slice(0,420)+"…":it.t;
        return `<a class="hit" href="tafsir.html#/${sn}/ar-tafsir-ibn-kathir/${av}">
          <div class="m"><span class="tag c">سبب نزول</span><span>سورة ${esc(su?su.ar:"")} <bdi>${AR(sn)}:${AR(av)}</bdi> <span class="sep">•</span> <bdi>ج${AR(it.v)} ص${AR(it.p)}</bdi></span></div>
          <div class="tx amiri">${sharhMark(t,q)}</div></a>`;}).join("");
      out.innerHTML=`<div class="sstat"><bdi>${AR(ab.length)} موضعًا</bdi> في أسباب النزول للواحدي</div>`+
        (cards||`<div class="msg">لا مواضع لـ «${esc(q)}»</div>`);
      return;
    }

    if(!wantQuran&&!wantHadith){
      const qk=quickHits(q,kind);
      out.innerHTML=`<div class="sstat"><bdi>${AR(qk.length)} نتيجة</bdi></div>`+
        (qk.map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
          <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("")
         ||`<div class="msg">لا نتائج لـ «${esc(q)}»</div>`);
      return; }
    draw(`<div class="sstat"><span class="spin"></span><span>يبحث…</span><span class="bar"><i style="width:6%"></i></span></div>`,[],[]);
    try{
      let ayat=[];
      if(wantQuran){ await loadQuran(); if(my!==seq)return; ayat=quranHits(q,kind==="quran"?60:8); }
      if(!wantHadith){
        /* العدُّ يشمل ما عُرض كلَّه لا الآياتِ وحدها: «الفاتحة» لا تَرِد
           في متن آيةٍ فيُقال «٠ آية» وتحتها بطاقةُ السورة، فيتناقض العدّ
           مع المعروض. */
        const nq=quickHits(q,kind).length;
        const parts=[];
        if(ayat.length)parts.push(`<bdi>${AR(ayat.length)} آية</bdi>`);
        if(nq)parts.push(`<bdi>${AR(nq)} نتيجة أخرى</bdi>`);
        draw(`<div class="sstat">${parts.join(' <span class="sep">•</span> ')||"لا نتائج"}</div>`,ayat,[]); return; }
      draw(`<div class="sstat"><span class="spin"></span><span>يبحث في المتون…</span><span class="bar"><i style="width:18%"></i></span></div>`,ayat,[]);
      const hits=await textHits(q,SEARCH.scope,(d,t,c)=>{ if(my!==seq)return;
        const bar=out.querySelector(".bar i"); if(bar)bar.style.width=Math.round(18+d/t*82)+"%";
        const st=out.querySelector(".sstat span:nth-child(2)");
        if(st)st.textContent=`يبحث في المتون… ${AR(d)}/${AR(t)}، ${AR(c)} نتيجة`;});
      if(my!==seq)return;
      const groups=groupHits(hits);
      const parts=[];
      const nq=quickHits(q,kind).length;
      if(nq)parts.push(`<bdi>${AR(nq)} نتيجة</bdi>`);
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
async function fiqhBooks(){ return bookSet("fiqh"); }
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
/* ── القراءة بابًا بابًا ──
 * كان القارئ ينتقل بأربعَ عشرةَ فقرةً في كلّ ضغطة: عددٌ لا معنى له في
 * الكتاب، فيبدأ الموضعُ في وسط كلامٍ وينتهي في وسط آخر، و«السابق»
 * و«التالي» لا يدلّان على شيءٍ يعرفه القارئ. وفهرسُ الكتاب فيه حدودُ
 * أبوابه أصلًا، فتُتّخذ حدودًا للصفحات: الصفحةُ بابٌ من عنوانه إلى
 * العنوان الذي يليه، والتنقّلُ من بابٍ إلى بابٍ باسمه.
 */
const BAB_MAX=40;   // بابٌ أطولُ من هذا يُقسَّم، ويُقال إنّه تتمّة
/* عنوانٌ حاوٍ: لا فقرةَ تحته لأنّ عنوانَ بابه يتلوه رأسًا («كتاب الوضوء»
   ثم «الباب الأول») — فليس صفحةً تُقرأ، وإنّما ظرفٌ لما بعده. وعددُ
   فقراته مثبتٌ في الفهرس، فتُعرف بلا فتحِ الكتاب. */
const isBox=(t)=>!(t[5]===undefined?1:t[5]);
/* اسمُ الموضع كما يُعرض: عنوانُه، فإن كان عاطلًا («باب» مجرَّدًا) أو ذهب
   بالتنظيف قامت فاتحةُ كلامه مقامه أو تلته. */
function tocName(t){
  const ttl=babClean(t[0]||""), hint=(t[6]||"").trim();
  if(!ttl) return hint||"موضع";
  return hint?ttl+" · "+hint:ttl;
}
/* ما يقع تحت الحاوي.
   الحاويات تتداخل: «كتاب الطهارة من الحدث» يليه «كتاب الوضوء» يليه أبوابُه.
   فالوقوفُ عند أوّل حاوٍ يُخرج الأوّلَ فارغًا. والحدُّ الصحيح: يُمضى حتى
   يُبلَغ حاوٍ بينه وبين أوّلِنا نصٌّ — فذاك قسيمُه لا قسمٌ منه. */
function boxKids(toc,k){
  const out=[]; let seen=false;
  for(let j=k+1;j<toc.length;j++){
    if(isBox(toc[j])&&seen) break;
    if(!isBox(toc[j])) seen=true;
    out.push({k:j,t:toc[j]});
  }
  return out;
}
async function readBab(slug,ci,pi,part){
  const toc=await sharhToc(slug);
  const meta=await sharhMeta(slug);
  if(!toc||!toc.length) return null;
  let k=0;
  for(let j=0;j<toc.length;j++){ const t=toc[j];
    if(t[1]<ci||(t[1]===ci&&t[2]<=pi)) k=j; else break; }
  /* إن وقع على حاوٍ فليس صفحةً: يُعرض فهرسُ ما تحته.
     ويُعرَف الحاوي بوجود «kids» لا بحقلٍ اسمُه «box»: كان الاسمان واحدًا —
     «box» في صفحة الحاوي معناه «هذه حاوية»، وفي صفحة الباب معناه «الحاويةُ
     التي يقع فيها». وكلاهما صادق، فكان كلُّ بابٍ داخل كتابٍ يُحسب حاويةً
     فيُطلب فهرسُ أبنائه ولا أبناءَ له: «Cannot read properties of undefined
     (reading 'map')». ويُبتلع معه شريطُ «الباب السابق والتالي». */
  if(isBox(toc[k])){
    const kids=boxKids(toc,k);
    if(kids.length) return {k,total:toc.length,title:tocName(toc[k]),
      v:toc[k][3],p:toc[k][4],kids};
  }
  /* السابقُ والتاليَ يتخطّيان الحاويات، فلا يُنقل القارئ إلى صفحةٍ خاوية */
  const step=(dir)=>{ let j=k+dir;
    while(j>=0&&j<toc.length&&isBox(toc[j])) j+=dir;
    return (j>=0&&j<toc.length)?{k:j,ar:tocName(toc[j]),c:toc[j][1],i:toc[j][2]}:null; };
  const cur=toc[k], nxt=toc[k+1];
  const from={c:cur[1],i:cur[2]};
  const to=nxt?{c:nxt[1],i:nxt[2]}:{c:meta.chunks-1,i:Infinity};
  const rows=[];
  for(let c=from.c;c<=to.c;c++){
    const r=await sharhChunk(slug,c);
    const a=(c===from.c)?from.i:0;
    const b=(c===to.c)?Math.min(to.i,r.length):r.length;
    for(let x=a;x<b;x++) rows.push(r[x]);
  }
  /* الظرفُ الذي يقع فيه الباب، يُعرض فوق عنوانه */
  let within=null;
  for(let j=k-1;j>=0;j--) if(isBox(toc[j])){ within={ar:tocName(toc[j]),c:toc[j][1],i:toc[j][2]}; break; }
  const parts=Math.max(1,Math.ceil(rows.length/BAB_MAX));
  const pt=Math.min(Math.max(0,part|0),parts-1);
  return {k,total:toc.length,title:tocName(cur),v:cur[3],p:cur[4],within,
          rows:rows.slice(pt*BAB_MAX,(pt+1)*BAB_MAX),parts,part:pt,
          prev:step(-1),next:step(1)};
}
/* فهرسُ ما تحت الحاوي، يحلّ محلّ الصفحة الخاوية */
function boxBody(base,b){
  return '<div class="pane pad">'+
    '<p class="evlead">هذا عنوانٌ حاوٍ لا نصَّ تحته، وإنّما تليه أبوابُه. اخترْ منها:</p>'+
    '<div class="tiles">'+b.kids.map(x=>
      '<a class="tile wrap" href="'+base+'/'+x.t[1]+'/'+x.t[2]+'">'+
      '<span class="n">'+(isBox(x.t)?'▣':'<bdi>'+AR(x.t[5]||0)+'</bdi>')+'</span>'+
      '<span class="t"><b>'+esc(tocName(x.t))+'</b>'+
      '<span>'+(isBox(x.t)?'قسمٌ فيه أبواب':'<bdi>'+AR(x.t[5]||0)+'</bdi> فقرة')+
      ' <span class="sep">•</span> ج'+AR(x.t[3])+' ص'+AR(x.t[4])+'</span></span></a>').join('')+
    '</div></div>';
}

/* شريطُ التنقّل بين الأبواب: يُسمّى البابُ ولا يُقال «التالي» مجرَّدًا */
function babNav(base,b){
  const lnk=(x,dir)=>x
    ? `<a href="${base}/${x.c}/${x.i}"><span class="bd">${dir}</span><span class="bn">${esc(x.ar.slice(0,42))}</span></a>`
    : `<span class="off"><span class="bd">${dir}</span></span>`;
  const mid=b.parts>1
    ? `<span class="mid"><bdi>${AR(b.part+1)}/${AR(b.parts)}</bdi> من الباب</span>`
    : `<span class="mid"><bdi>باب ${AR(b.k+1)}</bdi> من <bdi>${AR(b.total)}</bdi></span>`;
  if(b.kids) return "";
  return `<div class="pager babnav">${lnk(b.prev,"الباب السابق")}${mid}${lnk(b.next,"الباب التالي")}</div>`;
}
/* تتمّةُ بابٍ طال: تنقّلٌ داخله لا خروجٌ منه */
function babParts(base,b,ci,pi){
  if(b.parts<2) return "";
  const at=(n)=>`${base}/${ci}/${pi}/${n}`;
  return `<div class="pager sub">`+
    (b.part>0?`<a href="${at(b.part-1)}">‹ ما قبله من الباب</a>`:`<span class="off">‹ ما قبله</span>`)+
    `<span class="mid">الباب طويل، فقُسّم</span>`+
    (b.part<b.parts-1?`<a href="${at(b.part+1)}">تتمّة الباب ›</a>`:`<span class="off">تتمّته ›</span>`)+
    `</div>`;
}
/* جسمُ الصفحة: عنوانُ الباب ثم فقراته كما وردت */
function babBody(b,bookFull){
  return '<div class="pane pad prose">'+
    '<h3 class="shh babt">'+esc(b.title)+'</h3>'+
    b.rows.map((r,k)=>(r[3]&&k===0)?'':
      (r[3]?'<h3 class="shh">'+esc(babClean(r[0]))+'</h3>'
           :'<p class="para">'+esc(r[0])+'</p>')).join('')+'</div>'+
    '<div class="note">'+esc(bookFull)+'، ج'+AR(b.v)+' ص'+AR(b.p)+'. النصّ كما ورد في المصدر.</div>';
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
/* عنوان الباب كما يُعرض. والتنظيفُ صار عند البناء، فهذا حارسٌ لما بقي
   من بياناتٍ قديمة لا غير. */
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

const FOOTER_TAG='<footer class="foot" id="foot"></footer>';
function mountFooter(el){
  /* زرٌّ واحدٌ يفتح صفحةً كاملة، بدل نافذةٍ صغيرةٍ لا تكفي التعريف */
  el.innerHTML=`<span id="pwa"></span><a class="srcbtn" href="about.html">
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5h9a2 2 0 012 2V19H6a2 2 0 01-2-2z" stroke="currentColor" stroke-width="1.5"/><path d="M20 8v11H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    من نحن · مصادرنا</a>
    <p>تُعرض النصوص كما وردت في مصادرها بلا تعديل ولا تلخيص.<br>
    تُراث تنقل أقوال أهل العلم ولا ترجّح بينها ولا تُصدر فتوى.</p>
`;
  installBtn(el.querySelector("#pwa"));
}

/* ═══ تثبيتُ الموقع تطبيقًا على الهاتف ═══
 *
 * الموقعُ يحمل بطاقةَ تطبيق (manifest.webmanifest) وعاملَ خدمة، فيقبله
 * أندرويد وiOS إضافةً إلى الشاشة الرئيسية: يُفتح بلا شريط متصفّح، ويعمل
 * بما حُفظ منه إن انقطعت الشبكة. وليس تطبيقًا يُنزَّل من متجر — هو الموقعُ
 * نفسه في إطارٍ مستقلّ.
 *
 * وأندرويد يُنبئ المتصفّحَ أنّ التثبيت متاح (beforeinstallprompt) فيُعرض
 * زرٌّ يفتح نافذته. وأمّا iOS فلا يُنبئ ولا يُتيح النافذة، والإضافةُ فيه
 * بيد القارئ من زرّ المشاركة — فيُقال له ذلك بدل أن يُعرض زرٌّ لا يعمل.
 * ومن فتح الموقعَ مثبَّتًا أصلًا لا يُعرض له شيء.
 */
let _prompt=null;
addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); _prompt=e;
  document.querySelectorAll("#pwa").forEach(n=>installBtn(n)); });
function installBtn(el){
  if(!el) return;
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  if(standalone){ el.innerHTML=""; return; }
  /* الدعوةُ للهاتف وحدَه: عرضُ الحاسوب لا يُغيَّر منه شيء */
  if(innerWidth>=900){ el.innerHTML=""; return; }
  try{ if(localStorage.getItem("turath-nopwa")){ el.innerHTML=""; return; } }catch(e){}
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
  if(!_prompt&&!ios){ el.innerHTML=""; return; }
  el.innerHTML='<div class="pwa"><b>ثبّته على هاتفك</b>'+
    '<span>'+(ios
      ? 'من زرّ المشاركة في أسفل سفاري، اختر «إضافة إلى الشاشة الرئيسية». يُفتح حينها كالتطبيق، ويعمل بما حُفظ منه بلا شبكة.'
      : 'يُفتح كالتطبيق بلا شريط متصفّح، ويعمل بما حُفظ منه بلا شبكة.')+'</span>'+
    (ios?'':'<button class="act" id="pwaGo">ثبّت الآن</button>')+
    '<button class="pwax" id="pwaNo" aria-label="إخفاء">لا، شكرًا</button></div>';
  const go=el.querySelector("#pwaGo");
  if(go) go.onclick=async()=>{ if(!_prompt)return; const p=_prompt; _prompt=null;
    p.prompt(); await p.userChoice.catch(()=>{}); el.innerHTML=""; };
  el.querySelector("#pwaNo").onclick=()=>{ el.innerHTML="";
    try{ localStorage.setItem("turath-nopwa","1"); }catch(e){} };
}

/* عاملُ الخدمة: يُسجَّل بعد اكتمال التحميل فلا يزاحم أوّلَ عرضٍ للصفحة */
if("serviceWorker" in navigator)
  addEventListener("load",()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
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
/* أيُّ شرحٍ لأيّ مصنَّف: يُقرأ من بطاقات الكتب نفسها لا من جدولٍ منسوخٍ
   هنا. كان منسوخًا، فلمّا زِيدت ثمانيةُ شروحٍ لزم أن يُزاد في موضعين
   ويُنسى ثالث. والآن: كتابُ الشرح يحمل اسمَ ما يشرحه، فيُسأل عنه. */
async function sharhFor(book){
  const bs=await sharhBooks().catch(()=>[]);
  return (bs||[]).find(x=>x.on===book)||null;
}
const shName=(b)=>b?(b.short||b.ar):"";

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
  const sb=await sharhFor(book);
  if(!sb){
    const all=(await sharhBooks().catch(()=>[]))||[];
    mount.innerHTML='<div class="pane msg">لا كتابَ شرحٍ لهذا المصنَّف في المنصة بعدُ.'+
      (all.length?'<div class="note" style="margin:.7rem 0 1rem">المشحون: '+
        all.map(x=>esc(x.ar)).join('، ')+'.</div>':'')+
      '<a class="act" href="sharh.html">تصفَّح كتب الشروح ←</a></div>';
    return;
  }
  const slug=sb.slug;
  const bar=esc(shName(sb));
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
    const head='<p class="evlead">هذه مواضعُ من <b>'+bar+'</b>، وهو شرحُ هذا المصنَّف، عُثر عليها '+
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
/* اسمُ الراوي وحكمُه وطبقتُه — ما تعرضه سلسلةُ الإسناد لا غير. يُجلب قسمًا
   قسمًا (١٨ ك.ب لأكبرها) بدل فهرس الرواة كلِّه (٧٤٩ ك.ب) لأجل ثمانية أسماء. */
const RB={};
async function rijalBrief(keys){
  const need=[...new Set((keys||[]).map(shardOf))];
  await Promise.all(need.map(async i=>{
    if(!RB[i]) RB[i]=api.local(`rijal/b${i}.json`).catch(()=>({}));
    return RB[i];
  }));
  const out={};
  for(const k of keys||[]){ const m=await RB[shardOf(k)]; const v=m&&m[k];
    if(v) out[k]={n:v[0],g:v[1],gen:v[2]}; }
  return out;
}
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
/* arrows: سهمان يقلّبهما القارئ بيده إلى جانب النقاط
   full:   شريحةٌ واحدةٌ بعرض الإطار — للنماذج لا للبطاقات */
function carousel(root,{slides,interval=4200,arrows=false,full=false}={}){
  const A=(c,l,g)=>arrows?'<button class="carw '+c+'" aria-label="'+l+'">'+g+'</button>':"";
  root.innerHTML=`<div class="track${full?" full":""}">${slides.map(s=>`<div class="slide">${s}</div>`).join("")}</div>
    <div class="cnav">${A("prev","السابق","\u203a")}<div class="dots"></div>${A("next","التالي","\u2039")}</div>`;
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
  const pv=root.querySelector(".carw.prev"), nx=root.querySelector(".carw.next");
  if(pv) pv.onclick=()=>{cur--;go();reset();};
  if(nx) nx.onclick=()=>{cur++;go();reset();};
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
const AS={m:{}};
/* سورةً سورة لا المصحفَ كلَّه: كان يُنزَّل مليونُ حرفٍ لأجل آيةٍ واحدة */
async function asbab(sura,aya){
  if(!AS.m[sura]) AS.m[sura]=api.local(`asbab/${sura}.json`).catch(()=>({}));
  return (await AS.m[sura])[sura+":"+aya]||[];
}
/* عرضُ سبب النزول — نصًّا كما ورد بجزئه وصفحته، ولا يُلخَّص */
function asbabBlock(list){
  if(!list||!list.length) return "";
  return '<div class="sh"><h2>سبب نزولها</h2><span class="cnt"><bdi>'+AR(list.length)+
    '</bdi></span><span class="ln"></span></div>'+
    '<p class="evlead">من <b>أسباب النزول</b> للواحدي (ت٤٦٨هـ)، وُصل بالآية بمطابقة اللفظ '+
    'الذي اقتبسه بنصّ المصحف. والنصّ كما ورد بجزئه وصفحته.</p>'+
    /* الرواياتُ تُساق بأسانيدها فتطول: أربعُ رواياتٍ في آيةٍ واحدة بلغت
       على الهاتف أربعةَ آلاف بكسل قبل أن يبلغ القارئ التفسيرَ نفسه. فعلى
       الهاتف تُعرض الأولى ويُطوى ما بعدها خلف زرٍّ يقول عددَه — ولا يُحذف
       منها حرف. وعلى الحاسوب تُعرض كلُّها كما كانت. */
    list.map((x,i)=>'<div class="ev ev-bab'+(i?' asbmore':'')+'"><div class="evh"><span class="evb">أسباب النزول</span>'+
      '<span class="evp"><bdi>ج'+AR(x.v)+' ص'+AR(x.p)+'</bdi></span></div>'+
      '<div class="evt amiri" style="border-top:0;padding-top:0">'+paras(x.t)+'</div></div>').join("")+
    (list.length>1?'<button class="act asbtog" type="button">بقيّة الروايات '+
      '<bdi>('+AR(list.length-1)+')</bdi></button>':'')+
    '<div class="note">كتابُ أسبابِ نزولٍ يسوق الرواية بإسنادها، وفيه المرسلُ والضعيف. '+
    'يُقرأ على أنّه كذلك، والمنصة تنقل ولا ترجّح.</div>';
}

/* زرُّ «بقيّة الروايات»: يُصغى له مرّةً على المستند، فلا يُكتب في كل زرّ */
addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest(".asbtog"); if(!b)return;
  e.preventDefault();
  const root=b.parentNode||document;
  root.querySelectorAll(".asbmore").forEach(n=>n.classList.add("on"));
  b.remove();
});

/* ── الفقه ──
 * القسمُ خريطةُ خلافٍ لا فتوى. تُعرض المسألةُ بلفظ صاحبها، وتُوسَم بما
 * صرّح به هو: «اتفقوا» و«واختلفوا» و«وسبب اختلافهم». ولا يُقال فيها
 * «الراجح» ولا يُجاب عن «ما حكم كذا» — وهذا شرطُ المنصة لا زينةَ قول.
 */
const FQ={m:null,j:null};
async function fiqhMasail(){ if(!FQ.m) FQ.m=await api.local("fiqh/masail.json"); return FQ.m; }
async function fiqhIjmac(){ if(!FQ.j) FQ.j=await api.local("fiqh/ijmac.json"); return FQ.j; }
async function fiqhSummary(){ if(!FQ.s) FQ.s=await api.local("fiqh/summary.json"); return FQ.s; }
const FQTAG={ijmac:["موضع اتّفاق","ok"],khilaf:["موضع خلاف","mid"],sabab:["سبب الخلاف","acc"]};
function fiqhTags(tags){
  return (tags||[]).map(t=>{const [ar,c]=FQTAG[t]||[t,""];
    return '<span class="ftag f-'+c+'">'+esc(ar)+'</span>';}).join("");
}
const FIQH_NOTE='<div class="note fnote">هذا القسم <b>يعرض ولا يُفتي</b>. تُنقل المسألة بلفظ '+
 'صاحبها وموضعِه من كتابه، ويُبيَّن ما صرّح به من اتّفاقٍ أو خلافٍ أو سببٍ للخلاف. '+
 'ولا تقول المنصة «الراجح» ولا تُجيب عن «ما حكم كذا» — ومن أراد العمل فليسأل أهل العلم.</div>';

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
    '<span class="tw '+(t[k]?"on":"off")+'"'+(full?'':' title="'+esc(ar+"؛ "+note)+'"')+'>'+
    '<i></i>'+esc(ar)+'</span>').join("")+'</div>';
}

/* فهرسُ الكتاب مجموعاتٍ: الحاوي عنوانُ مجموعةٍ وما تحته أبوابُها بعددِ
   فقراتها — بدل قائمةٍ مسطّحة يُنقر فيها على عناوينَ لا نصَّ تحتها. */
function tocGroups(toc,hrefBase){
  let out="",open=false,shown=0;
  const tile=(t)=>'<a class="tile wrap" href="'+hrefBase+t[1]+'/'+t[2]+'">'+
    '<span class="n"><bdi>'+AR(t[5]==null?0:t[5])+'</bdi></span>'+
    '<span class="t"><b>'+esc(tocName(t))+'</b>'+
    '<span>ج'+AR(t[3])+' ص'+AR(t[4])+'</span></span></a>';
  /* حاوٍ يتلوه حاوٍ كان يُخرج مجموعةً فارغة، وهو الذي يُرى عنوانَ كتابٍ
     لا شيءَ تحته. فلا تُفتح المجموعةُ إلا عند أوّل بابٍ فيها، وتُجمع
     عناوينُ الحاويات المتتابعة في ترويسةٍ واحدة. */
  let pend=[];
  for(const t of toc){
    if(shown>=700) break;
    if(isBox(t)){ pend.push(tocName(t)); continue; }
    if(pend.length){
      if(open){ out+='</div>'; open=false; }
      out+='<div class="tocg"><h3>'+esc(pend.join(" › "))+'</h3></div>';
      pend=[];
    }
    if(!open){ out+='<div class="tiles">'; open=true; }
    out+=tile(t); shown++;
  }
  if(open) out+='</div>';
  return out+(toc.filter(t=>!isBox(t)).length>700
    ? '<div class="note">عُرض أوّل <bdi>٧٠٠</bdi> باب؛ والبحثُ يبلغ ما وراءها.</div>':'');
}

/* ═══ نماذجُ حيّة للرئيسية ═══
 *
 * كانت الرئيسيةُ ستّةَ أشرطةٍ كلُّها بطاقاتُ كتب، فتقول للزائر: عندنا رفٌّ.
 * والرفُّ ليس المنتَج — المنتَجُ الوصلُ بين ما فيه. فصار لكلّ قسمٍ نموذجٌ
 * واحدٌ يُسحب من المنصّة نفسها حيًّا: لا صورةً ولا وصفًا، بل الشيءَ نفسَه
 * كما يراه من دخل. وإن تغيّرت البيانات تغيّر النموذج، فلا يكذب أبدًا.
 */
const DEMO={
  hadith:[["abudawud",229],["abudawud",2030],["tirmidhi",1873],["ibnmajah",1502],["nasai",2475]],
  ayah:[[2,189],[58,1],[9,84],[2,222]],
  rijal:["13","53","18","19","17","11013","20020","30367"],
  ev:"badr",
};

/* يُؤجَّل الجلبُ حتى يقترب النموذج من العين، فلا يُثقَل أوّلُ التحميل */
function whenSeen(el,fn){
  if(!el) return;
  if(!("IntersectionObserver" in window)) return fn();
  const io=new IntersectionObserver((es)=>{ for(const e of es) if(e.isIntersecting){ io.disconnect(); fn(); } },
    {rootMargin:"340px"});
  io.observe(el);
}
const demoSkel=(n)=>'<div class="demo skel">'+Array.from({length:n||3},()=>'<i></i>').join("")+'</div>';
const cut=(t,n)=>String(t||"").replace(/\s+/g," ").slice(0,n).trim()+"…";

/* ── حديثٌ اختُلف في حكمه ── */
async function oneHadith(bk,num){
  const [d,row]=await Promise.all([api.hadith(bk,num),hadRow(bk,num)]);
  const h=(d&&d.hadiths&&d.hadiths[0])||{};
  const b=(SEARCH.books||{})[bk]||{};
  /* الأحكامُ من فهرسنا لا من واجهة المتون — وهي خاليةٌ منها. ويُقدَّم
     المكتوبُ بالعربية على المنقول بحروفٍ لاتينية، ولا يُبدَّل حكمُ أحد. */
  const g=((row&&row[3])||[]).filter(x=>x[0]&&x[1]).map(x=>({name:x[0],grade:x[1]}))
    .sort((a,b)=>(/[ء-ي]/.test(b.grade)?1:0)-(/[ء-ي]/.test(a.grade)?1:0));
  const kinds=new Set(g.map(x=>gclass(x.grade)).filter(k=>k!=="na"));
  const sp=splitIsnad(h.text||"");
  return '<div class="demo">'+
    '<div class="dmh"><span class="dmk">حديث</span>'+
      '<a class="dmref" href="hadith.html#/'+bk+'/h/'+num+'">'+esc(b.ar||bk)+' <bdi>'+AR(num)+'</bdi> ←</a></div>'+
    '<p class="dmtx amiri">'+esc(cut((sp&&sp.matn)||h.text,230))+'</p>'+
    (kinds.size>1?'<div class="dmwarn">العلماء لم يتّفقوا على حكم هذا الحديث. نعرض كلامهم كلَّه بأسمائهم، ولا نختار بينهم.</div>':'')+
    '<div class="dmg">'+g.map(x=>'<span class="gp"><b>'+esc(x.name)+'</b>'+
      '<span class="g '+gclass(x.grade)+'">'+esc(x.grade)+'</span></span>').join("")+'</div>'+
    '<div class="dmf">وفي صفحته: رواتُه واحدًا واحدًا، ومواضعُه في بقيّة الكتب، وشرحُه مع سبب اختيار كل موضع.</div>'+
  '</div>';
}
/* ── آيةٌ بسبب نزولها وتفسيرين ── */
async function oneAyah(sn,an){
  const [av,t1,t2,sb]=await Promise.all([
    api.ayah(sn,an),
    api.tafsir("ar-tafsir-muyassar",sn,an).catch(()=>null),
    api.tafsir("ar-tafsir-ibn-kathir",sn,an).catch(()=>null),
    asbab(sn,an)]);
  const su=(SEARCH.surahs||[]).find(x=>x.n===sn);
  return '<div class="demo">'+
    '<div class="dmh"><span class="dmk">آية</span>'+
      '<a class="dmref" href="tafsir.html#/'+sn+'/ar-tafsir-ibn-kathir/'+an+'">سورة '+esc(su?su.ar:"")+
      ' <bdi>'+AR(an)+'</bdi> ←</a></div>'+
    '<p class="dmtx amiri qv">'+esc(av.text)+'</p>'+
    (sb&&sb.length?'<div class="dmsb"><b>سبب نزولها</b>'+esc(cut(sb[0].t,190))+
      ' <span class="dmsrc">أسباب النزول للواحدي · ج'+AR(sb[0].v)+' ص'+AR(sb[0].p)+'</span></div>':'')+
    '<div class="dmtwo">'+
      (t1?'<div class="dmcol"><b>الميسّر</b><p>'+esc(cut(t1.text,200))+'</p></div>':'')+
      (t2?'<div class="dmcol"><b>ابن كثير</b><p>'+esc(cut(t2.text,200))+'</p></div>':'')+
    '</div>'+
    '<div class="dmf">وثمانيةَ عشرَ تفسيرًا لهذه الآية وحدها، تقرأها جنبًا إلى جنب.</div>'+
  '</div>';
}
/* ── بطاقةُ راوٍ مصغَّرة: صورةٌ صغيرة من ترجمته ── */
function rijalCard(key,r){
  const bits=[genAr(r.gen),placeAr(r.p)].filter(Boolean);
  return '<a class="rcard" href="rijal.html#/'+encodeURIComponent(key)+'">'+
    '<span class="rct">'+esc(r.g||"راوٍ")+'</span>'+
    '<b>'+esc(r.n)+'</b>'+
    '<span class="rcb">'+esc(bits.slice(0,2).join(" · ")||"—")+'</span>'+
    (r.d?'<span class="rcb">'+esc("توفّي "+dateAr(r.d))+'</span>':'')+
    '<span class="rcn"><bdi>'+AR(r.c||0)+'</bdi> حديثًا في الكتب</span></a>';
}
/* ── موضعُ فقهٍ مصغَّر ── */
function fiqhCard(m){
  const B=SEARCH.books||{}, S=SEARCH.surahs||[];
  const ay=m.ayat.slice(0,2).map(a=>{const su=S.find(x=>x.n===a.s);
    return '<a class="dlink" href="tafsir.html#/'+a.s+'/ar-tafsir-ibn-kathir/'+a.v+'">'+
    '<span class="dk">آية</span>'+esc(su?su.ar:"")+' <bdi>'+AR(a.v)+'</bdi></a>';}).join("");
  const hd=(m.ahadith[0]?m.ahadith[0].at.slice(0,2):[]).map(([k,n])=>
    '<a class="dlink" href="hadith.html#/'+k+'/h/'+n+'"><span class="dk">حديث</span>'+
    esc((B[k]||{}).ar||k)+' <bdi>'+AR(n)+'</bdi></a>').join("");
  return '<div class="demo">'+
    '<div class="dmh"><span class="dmk">مسألة</span>'+
      '<a class="dmref" href="fiqh.html#/khilaf/'+encodeURIComponent(m.kitab||"")+'">'+esc(m.kitab||"")+' ←</a></div>'+
    '<div class="mhead">'+fiqhTags(m.tags)+'<span class="mp">بداية المجتهد · ج'+AR(m.v)+' ص'+AR(m.p)+'</span></div>'+
    '<p class="dmtx amiri">'+esc(cut(m.t,290))+'</p>'+
    ((ay||hd)?'<div class="dl"><span class="dlh">ما استدلّوا به</span>'+ay+hd+'</div>':'')+
    '<div class="dmf">لا نقول «الراجح». ننقل المسألة بكلام صاحبها وموضعِه من كتابه.</div>'+
  '</div>';
}
/* ── حدثٌ من السيرة ── */
async function oneSira(id){
  const ev=(await siraEvents()).find(x=>x.id===id);
  if(!ev) return "";
  const g=ev.quran[0], v=g&&g.vs[0];
  const su=(SEARCH.surahs||[]).find(x=>x.n===(v?v.s:0));
  return '<div class="demo">'+
    '<div class="dmh"><span class="dmk">حدث</span>'+
      '<a class="dmref" href="sira.html#/'+ev.id+'">'+esc(ev.ar)+' ←</a></div>'+
    siraTier(ev.tier,{full:true})+
    (v?'<p class="dmtx amiri qv">'+esc(v.t)+'</p>'+
       '<div class="dmsrc">'+esc(su?"سورة "+su.ar:"")+' <bdi>'+AR(v.v)+'</bdi> · '+esc(g.why)+'</div>':'')+
    '<div class="dmf">ومعه <bdi>'+AR(ev.nh)+'</bdi> حديثًا موصولًا به، و<bdi>'+AR(ev.anchor.length)+
      '</bdi> موضعًا من كتب السيرة بجزئه وصفحته.</div>'+
  '</div>';
}
/* شريطُ نماذجَ يتبدّل: تُبنى كلُّها ثم تُعرض شريحةً شريحة */
async function demoStrip(el,make,items,{interval=7500}={}){
  try{
    /* تُجلب معًا لا واحدًا بعد واحد: التتابعُ يُطيل الانتظار، وتأخّرُ
       واحدٍ كان يُسقط ما بعده. وما أخفق منها يُترك ويمضي الباقي. */
    const res=await Promise.allSettled(items.map(it=>Array.isArray(it)?make.apply(null,it):make(it)));
    const out=res.filter(r=>r.status==="fulfilled"&&r.value).map(r=>r.value);
    if(!out.length) throw new Error("لا نماذج");
    el.innerHTML="";
    carousel(el,{slides:out,interval,full:true,arrows:true});
  }catch(e){ el.innerHTML='<div class="note">تعذّر جلب النماذج.</div>'; }
}

/* ═══ صفحة «من نحن ومصادرنا» ═══
 * الكتبُ تُسمّى وتُشرح ولا تُوضع لها روابط: القارئ يريد أن يعرف على أيّ
 * شيءٍ يقرأ، لا أن يُساق إلى مستودعاتٍ تقنية.
 */
const SRCBOOKS=[
 ["كتب الحديث",[
  ["صحيح البخاري","جمعه الإمام محمد بن إسماعيل البخاري في نحو ستة عشر عامًا. أصحّ الكتب بعد كتاب الله عند جمهور أهل العلم. ٧٬٥٨٩ حديثًا بترقيمه المطبوع."],
  ["صحيح مسلم","للإمام مسلم بن الحجاج. ثاني الصحيحين، امتاز بجمع طرق الحديث الواحد في موضع واحد وحسن ترتيبه. ٧٬٥٦٣ حديثًا."],
  ["سنن أبي داود","للإمام أبي داود السجستاني. عُني بأحاديث الأحكام التي يبني عليها الفقهاء. ٥٬٢٧٤ حديثًا."],
  ["جامع الترمذي","للإمام الترمذي. يذكر الحديث ثم حكمه ثم أقوال الفقهاء فيه، وهو من أنفع الكتب لمن أراد أن يعرف الخلاف. ٣٬٩٩٨ حديثًا."],
  ["سنن النسائي","المجتبى للإمام النسائي. أدقّ السنن شرطًا في الرجال. ٥٬٧٦٥ حديثًا."],
  ["سنن ابن ماجه","رابع السنن، وفيه زوائد كثيرة لا توجد في غيره. ٤٬٣٤٣ حديثًا."],
  ["موطأ مالك","أقدم كتب السنّة المصنّفة، جمع فيه الإمام مالك الحديث مع عمل أهل المدينة. ١٬٨٥٨ حديثًا."],
  ["الأربعون النووية","أربعون حديثًا جوامع اختارها الإمام النووي، عليها مدار كثير من الدين."],
  ["الأربعون القدسية","أربعون من الأحاديث القدسية."],
  ["أربعون الشاه ولي الله","اختارها الشاه ولي الله الدهلوي."]]],
 ["كتب التفسير",[
  ["جامع البيان للطبري","أمّ كتب التفسير بالمأثور، يسوق أقوال السلف بأسانيدها."],
  ["تفسير ابن كثير","يفسّر القرآن بالقرآن ثم بالسنة ثم بأقوال السلف."],
  ["الجامع لأحكام القرآن للقرطبي","يُعنى باستخراج الأحكام الفقهية من الآيات."],
  ["التحرير والتنوير لابن عاشور","أوسع تفسير حديث في البلاغة ونظم القرآن ومقاصده."],
  ["وأربعة عشر تفسيرًا غيرها","منها الميسّر والمختصر والجلالان والبغوي والسعدي والبيضاوي والألوسي والبحر المحيط وفتح القدير للشوكاني وتفسير ابن عثيمين والرازي وابن عطية وابن الجوزي والوسيط. ثمانية عشر تفسيرًا للآية الواحدة."]]],
 ["كتب شرح الحديث",[
  ["فتح الباري لابن حجر العسقلاني","أشهر شروح صحيح البخاري وأوسعها."],
  ["المنهاج شرح صحيح مسلم للنووي","شرح صحيح مسلم، جامع مختصر العبارة."],
  ["عون المعبود شرح سنن أبي داود","لمحمد أشرف العظيم آبادي."],
  ["تحفة الأحوذي بشرح جامع الترمذي","للمباركفوري."],
  ["حاشية السندي على سنن النسائي","لنور الدين السندي، تعليق موجز يحلّ غريب اللفظ ويبيّن المعنى."],
  ["حاشية السندي على سنن ابن ماجه","له أيضًا، على منوال حاشيته على النسائي."],
  ["المنتقى شرح الموطّأ لأبي الوليد الباجي","شرح مالكيّ مبسوط، يذكر المسألة وأقوال الفقهاء فيها ودليل كل قول."],
  ["جامع العلوم والحكم لابن رجب الحنبلي","شرح الأربعين النووية وزاد عليها، من أنفس ما كُتب في شرح الجوامع."]]],
 ["كتب السيرة",[
  ["السيرة النبوية لابن هشام","تهذيب ابن هشام لسيرة ابن إسحاق، وهو الأصل الذي تدور عليه كتب السيرة بعده."],
  ["مغازي الواقدي","أوسع الكتب في تفاصيل الغزوات وتواريخها وأعداد من شهدها، ومرتّب على التاريخ."],
  ["دلائل النبوة للبيهقي","يسوق أخبار السيرة بأسانيدها كما تُساق الأحاديث، فهو بين كتب الحديث وكتب الأخبار."],
  ["الطبقات الكبرى لابن سعد","تراجم من شهد الأحداث، مرتّبة على الطبقات."]]],
 ["كتب الفقه",[
  ["بداية المجتهد ونهاية المقتصد لابن رشد الحفيد","أشهر كتب الفقه المقارن: يذكر المسألة، ثم ما اتفق عليه وما اختُلف فيه، ثم سبب الاختلاف نفسه وأدلّة كل قول. وهو عمود قسم الفقه عندنا."],
  ["الإجماع لابن المنذر النيسابوري","مسائل مرقّمة فيما أجمع عليه أهل العلم، وهو أقدم ما صُنّف في بابه."],
  ["المغني لابن قدامة المقدسي","أوسع كتب الفقه المقارن، يسوق المسألة بأقوال المذاهب وأدلّتها."]]],
 ["كتب أخرى",[
  ["أسباب النزول للواحدي","يذكر سبب نزول الآية بإسناده. وصلناه بالآيات بمطابقة اللفظ الذي يقتبسه بنصّ المصحف."],
  ["أحكام المحدّثين على الأحاديث","أحكام الألباني وشعيب الأرناؤوط وزبير علي زئي وأحمد شاكر ومحمد محيي الدين عبد الحميد وغيرهم، كلٌّ منسوب إلى قائله."],
  ["تراجم الرواة وسلاسل الأسانيد","٤٬٢١٠ راويًا بأزمانهم وبلدانهم وشيوخهم وتلاميذهم، وسلسلة رواة كل حديث حيث وردت."],
  ["نصّ القرآن الكريم","بالرسم الإملائي المعياري."]]],
 ["ما نقصنا فنقوله",[
  ["ثغرة في متون ٤٠٨ أحاديث","من ٣٦٬٥١٢ حديثًا (١٫١٪) خلا مصدرُ متونها من نصّها، أكثرها في مقدّمتي صحيح مسلم وسنن النسائي. أرقامها وأبوابها وأحكامها ثابتة، ويُقال في صفحاتها صراحةً إنّ المتن لم يرد، ولا يُملأ من عندنا. وقد فُحصت نسخة عربية أخرى من المصدر نفسه فوُجدت الثغرة فيها كما هي."],
  ["الأربعينات بلا أحكام","الأحكام المنسوبة إلى قائليها موجودة لأحاديث الكتب الستة والموطأ. وأمّا الأربعون النووية والقدسية وأربعون الشاه ولي الله فلم نجد لها مصدرًا يذكر الحكم ومن قاله معًا. وحكمٌ بلا قائل لا نعرضه، وقائلٌ نخمّنه كذب. فحيث وُجد الحديث نفسه في كتابٍ له أحكام دللنا على موضعه منه؛ ننقل الموضع، لا الحكم."],
  ["كتابان بلا شرح مشحون","الأربعون القدسية وأربعون الشاه ولي الله: لم نجد لهما شرحًا مهيكلًا في المدوّنات المنشورة، فيُقال ذلك في تبويب الشرح ولا يُوضع مكانه شيء."],
 ]],
];

const ABOUT_HTML=`
<section id="who" class="abs">
  <h2>من نحن</h2>
  <p>تُراث موقع يجمع كتب التراث الإسلامي في مكان واحد، ويصل بعضها ببعض. ليس مكتبة تضع بين يديك كتبًا وتتركك، بل محاولة أن ترى الصورة كاملة: حين تفتح حديثًا ترى معه من رواه، وماذا قال العلماء في تصحيحه أو تضعيفه بأسمائهم، وأين ورد الحديث نفسه في بقية الكتب، وماذا قال الشرّاح فيه. وحين تفتح آية ترى سبب نزولها وثمانية عشر تفسيرًا لها جنبًا إلى جنب.</p>
  <p>هذا العمل ليس وراءه مؤسسة ولا جهة. هو جهد شخصي، وما زال يُبنى.</p>
</section>

<section id="why" class="abs">
  <h2>لماذا نفعل هذا</h2>
  <div class="abox">
    <b>نبتغي الثواب، ولا نبتغي الربح.</b>
    <p>لا إعلانات، ولا اشتراكات، ولا بيع بيانات، ولا مقابل من أحد. الموقع مجاني بالكامل ولن يتغيّر هذا. وكل ما نرجوه أن ينفع الله به، وأن يكون في ميزان من أعان عليه. فإن انتفعت به فادعُ لمن كتبه ولمن حفظ هذه الكتب قبلنا.</p>
  </div>
  <p>والسبب الثاني أن كتب التراث موجودة على الشابكة لكنها متفرّقة: القرآن في موقع، والتفسير في آخر، والحديث في ثالث، وحكم العلماء عليه في رابع. فيفتح الباحث ستة مواقع ليتحقّق من حديث واحد. القيمة عندنا ليست في امتلاك النصوص — النصوص متاحة — بل في الوصل بينها.</p>
</section>

<section id="app" class="abs">
  <h2>تُراث على هاتفك</h2>
  <p>يمكنك إضافة الموقع إلى شاشة هاتفك الرئيسية فيصير كالتطبيق: يُفتح بأيقونته بلا شريط متصفّح، ويعمل بما حُفظ منه على جهازك حتى لو انقطعت الشبكة. وليس تطبيقًا يُنزَّل من متجر — هو الموقع نفسه، بلا حساب ولا أذونات ولا شيء يُرسل عنك.</p>
  <div class="abox">
    <b>على الآيفون</b>
    <p>افتح الموقع في سفاري، ثم اضغط زرّ المشاركة في الأسفل، ثم اختر «إضافة إلى الشاشة الرئيسية».</p>
  </div>
  <div class="abox">
    <b>على الأندرويد</b>
    <p>افتح الموقع في كروم، فيظهر لك في أسفل الصفحة زرّ «ثبّت الآن»، أو اخترها من قائمة المتصفّح: «تثبيت التطبيق».</p>
  </div>
</section>

<section id="rules" class="abs">
  <h2>قواعد نلتزم بها</h2>
  <ol class="abr">
    <li><b>لا نفتي.</b> لا نقول «الراجح» ولا نجيب عن «ما حكم كذا». نعرض ما قاله أهل العلم فقط، ومن أراد العمل فليسأل أهل العلم.</li>
    <li><b>لا نختار بين العلماء.</b> إذا اختلفوا في حكم حديث عرضنا كلامهم كله بأسمائهم ومواضعه، ونبّهنا أنّه مختلَف فيه.</li>
    <li><b>لا معلومة بلا مصدر.</b> كل نصّ تراه يحمل كتابه وجزءه وصفحته أو رقمه المعتمد.</li>
    <li><b>لا نكتب نصًّا دينيًّا من عندنا.</b> ولا يكتبه الذكاء الاصطناعي. كل ما تقرأه منقول من كتابه.</li>
    <li><b>النصوص كما وردت.</b> لا نصحّح ولا نلخّص ولا نغيّر.</li>
    <li><b>ما نقص نقوله.</b> إن لم نجد شيئًا قلنا ذلك ولم نملأ الفراغ بالظنّ. وإن خلا مصدرنا من نصّ حديث قلناه في صفحته.</li>
  </ol>
</section>

<section id="src" class="abs">
  <h2>مصادرنا</h2>
  <p>هذه الكتب التي بُني عليها كل ما في الموقع. كلها كتب منشورة معروفة، أخذناها من مدوّنات علمية نصوصها مكتوبة لا ممسوحة ضوئيًّا. ولم نُدخل كتابًا واحدًا عن طريق تصوير أو استخراج آليّ من ملفّات، لأنّ ذلك يورث أخطاءً لا تُكتشف.</p>
  ${SRCBOOKS.map(([g,items])=>`<div class="absec"><h3>${esc(g)}</h3>
    <div class="abl">${items.map(([t,d])=>`<div class="abi"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div></div>`).join("")}
  <p class="note">أرقام الأحاديث والأجزاء والصفحات في الموقع هي أرقام الطبعات المعتمدة لهذه الكتب، فما تراه هنا تجده هناك.</p>
</section>`;

/* ═══ تنبيهُ أوّل زيارة ═══
 * يُعرض مرّةً واحدة لمن دخل أوّل مرّة، ولا يعود بعد الموافقة. ولا يُغلق
 * إلا بالضغط على «موافق» — فالمقصود أن يُقرأ لا أن يُزاح.
 */
function firstVisitNotice(){
  const KEY="turath-agreed";
  try{ if(localStorage.getItem(KEY)) return; }catch(e){ return; }
  const d=document.createElement("dialog");
  d.className="agree";
  d.innerHTML=`<div class="agh">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.2l2.3 1.9 3-.3.8 2.9 2.6 1.6-1.2 2.8 1.2 2.8-2.6 1.6-.8 2.9-3-.3L12 21.8l-2.3-1.9-3 .3-.8-2.9L3.3 15.7l1.2-2.8-1.2-2.8 2.6-1.6.8-2.9 3 .3z" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="3.6" stroke="currentColor" stroke-width="1.2"/></svg>
      <b>قبل أن تبدأ</b></div>
    <div class="agb">
      <p class="agl">هذا الموقع <b>لا يُفتي</b>.</p>
      <p>نحن ننقل ما في الكتب ونصل بعضه ببعض، ولا نقول لك ما الحكم ولا أيّ الأقوال أصحّ. وإذا اختلف العلماء عرضنا كلامهم كلَّه بأسمائهم.</p>
      <ul class="agu">
        <li>إن أردت العمل بشيء فتحقّق منه بنفسك، واسأل أهل العلم.</li>
        <li>راجع كل نصّ في مصدره — وقد وضعنا مع كل شيء كتابه وموضعه.</li>
        <li>والخطأ وارد: في النقل، وفي الوصل بين النصوص، وفي البرمجة. فإن رأيت خطأً فلا تبنِ عليه.</li>
      </ul>
      <p class="agf">وليس وراء هذا العمل ربح ولا جهة؛ إنّما نبتغي به الثواب.</p>
    </div>
    <div class="aga"><button class="agbtn" id="agOK">موافق</button>
      <a class="aglink" href="about.html">من نحن ومصادرنا</a></div>`;
  document.body.appendChild(d);
  const ok=()=>{ try{ localStorage.setItem(KEY,"1"); }catch(e){} d.close(); d.remove(); };
  d.querySelector("#agOK").onclick=ok;
  /* لا يُغلق بالمفتاح: التنبيهُ يُقرأ ويُوافَق عليه */
  d.addEventListener("cancel",(e)=>e.preventDefault());
  if(d.showModal) d.showModal(); else d.setAttribute("open","");
}
