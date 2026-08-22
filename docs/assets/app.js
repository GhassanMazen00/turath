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

function mountSearch(root,{autofocus=false,compact=false}={}){
  root.innerHTML=`<div class="sbox"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
    <input id="q" type="search" placeholder="ابحث في الأحاديث والسور والأبواب…" autocomplete="off"><kbd>/</kbd></div>
    <div class="chips" id="scope"></div><div class="sres" id="sres"></div>`;
  const inp=root.querySelector("#q"),out=root.querySelector("#sres"),sc=root.querySelector("#scope");
  sc.innerHTML=[["all","كل الكتب"]].concat(Object.keys(SEARCH.books).map(k=>[k,SEARCH.books[k].ar]))
    .map(([v,l])=>`<button class="chip" data-s="${v}" aria-pressed="${v===SEARCH.scope}">${esc(l)}</button>`).join("");
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
    const q=inp.value.trim(),my=++seq;
    if(!q){out.innerHTML="";return;}
    const quick=quickHits(q);
    const qh=quick.map(h=>`<a class="hit" href="${h.href}"><div class="m"><span class="tag c">${esc(h.kind)}</span>
      <span>${esc(h.sub)}</span></div><div class="tx">${esc(h.title)}</div></a>`).join("");
    const draw=(groups,stat)=>{ if(my!==seq)return;
      const gh=groups.map(g=>{
        const chips=g.books.map(h=>{
          const gr=(h.grades&&h.grades.length)?`<span class="g ${gclass(h.grades[0][1])}">${esc(h.grades[0][1])}</span>`:"";
          return `<a class="bchip" href="${h.href}"><b>${esc(h.bookAr)}</b><span class="n">${AR(h.num)}</span>${gr}</a>`;
        }).join("");
        return `<div class="grp"><div class="grp-t">${hl(g.snippet,g.q)}</div>
          <div class="grp-b">${chips}</div></div>`;}).join("");
      out.innerHTML=(stat||"")+qh+gh||`<div class="msg">لا نتائج لـ «${esc(q)}»</div>`;};
    draw([],`<div class="sstat"><span class="spin"></span><span>يبحث…</span><span class="bar"><i style="width:6%"></i></span></div>`);
    try{
      const hits=await textHits(q,SEARCH.scope,(d,t,c)=>{ if(my!==seq)return;
        const bar=out.querySelector(".bar i"); if(bar)bar.style.width=Math.round(d/t*100)+"%";
        const st=out.querySelector(".sstat span:nth-child(2)");
        if(st)st.textContent=`يبحث… ${AR(d)}/${AR(t)} — ${AR(c)} نتيجة`;});
      if(my!==seq)return;
      const groups=groupHits(hits);
      draw(groups,`<div class="sstat"><bdi>${AR(groups.length)} نصًّا</bdi> — <bdi>${AR(hits.length)} موضعًا</bdi>${hits.length>=80?" (أول ٨٠)":""}</div>`);
    }catch(e){ if(my===seq)draw([],`<div class="sstat">تعذّر البحث</div>`); }
  };
  inp.addEventListener("input",()=>{clearTimeout(tmr);tmr=setTimeout(run,240);});
  if(autofocus)setTimeout(()=>inp.focus(),300);
}

/* ── المصادر: زرّ واحد في أسفل الموقع ── */
const SOURCES=[
 ["متون الأحاديث وترقيمها المعتمد","الكتب العشرة بالترقيم المطبوع.","https://github.com/fawazahmed0/hadith-api"],
 ["سلاسل الإسناد وتراجم الرواة","سلاسل الرواة لكل حديث وتراجمهم ومشايخهم وتلاميذهم.","https://github.com/OmarShafie/hadith"],
 ["أحكام المحدّثين","الألباني، شعيب الأرناؤوط، زبير علي زئي، أحمد شاكر وغيرهم.","https://github.com/R3GENESI5/Itqan"],
 ["نصّ القرآن الكريم","الرسم الإملائي المعياري.","https://github.com/fawazahmed0/quran-api"],
 ["كتب التفسير","ثمانية عشر كتابًا من الطبري وابن كثير والقرطبي إلى ابن عاشور.","https://github.com/spa5k/tafsir_api"],
 ["شروح الأحاديث","تُجلب من الموسوعة الحديثية للدرر السنية عند توفّر الاتصال.","https://dorar.net"],
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

/* ── خلفية البطل: شبكة هندسية هادئة ── */
function heroCanvas(cv){
  if(!cv||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const ctx=cv.getContext("2d"); let w,h,t=0,raf;
  const col=()=>getComputedStyle(document.documentElement).getPropertyValue("--gold").trim()||"#9c7b33";
  function size(){const r=cv.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);
    w=cv.width=r.width*d; h=cv.height=r.height*d; ctx.setTransform(d,0,0,d,0,0);}
  function draw(){
    const rw=w/(Math.min(2,devicePixelRatio||1)), rh=h/(Math.min(2,devicePixelRatio||1));
    ctx.clearRect(0,0,rw,rh);
    const cx=rw/2, cy=rh*.46, R=Math.min(rw,rh)*.52;
    ctx.strokeStyle=col(); ctx.globalAlpha=.16; ctx.lineWidth=1;
    for(let ring=0;ring<3;ring++){
      const pts=8+ring*2, rad=R*(.5+ring*.26), rot=t*(ring%2?-1:1)*.00016;
      ctx.beginPath();
      for(let i=0;i<pts;i++){
        const a=rot+i*2*Math.PI/pts, b=rot+((i+ (ring===1?3:2))%pts)*2*Math.PI/pts;
        ctx.moveTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);
        ctx.lineTo(cx+Math.cos(b)*rad,cy+Math.sin(b)*rad);
      }
      ctx.stroke();
    }
    ctx.globalAlpha=.1;
    for(let ring=1;ring<=3;ring++){ctx.beginPath();ctx.arc(cx,cy,R*(.35+ring*.24),0,7);ctx.stroke();}
    t+=16; raf=requestAnimationFrame(draw);
  }
  size(); draw(); addEventListener("resize",size,{passive:true});
}

/* ── شرح الحديث: يُجلب من الموسوعة الحديثية (الدرر السنية) عبر وسيط عام.
   لا يُخزَّن عندنا ولا يُختلق؛ فإن تعذّر الاتصال عُرض رابط مباشر للشرح. ── */
const SHARH_HOSTS=["https://dorar-hadith-api.herokuapp.com","https://hadeethenc-api.vercel.app",
                   "https://dorar-hadith-api.vercel.app"];
async function fetchSharh(matn){
  const q=encodeURIComponent(matn.slice(0,60));
  for(const h of SHARH_HOSTS){
    try{
      const c=new AbortController(); const to=setTimeout(()=>c.abort(),6000);
      const r=await fetch(`${h}/v1/site/sharh/text/${q}`,{signal:c.signal});
      clearTimeout(to);
      if(!r.ok) continue;
      const j=await r.json();
      const d=j&&j.data;
      if(d&&(d.sharhMetadata?.sharh||d.sharh)) return {text:(d.sharhMetadata?.sharh||d.sharh),host:h};
    }catch(e){}
  }
  return null;
}
function sharhBlock(matn,mount){
  mount.innerHTML=`<div class="msg"><span class="spin"></span> جارٍ طلب الشرح…</div>`;
  fetchSharh(matn).then(r=>{
    if(r){ mount.innerHTML=`<div class="body">${paras(r.text)}</div>
      <div class="note">الشرح من الموسوعة الحديثية للدرر السنية.</div>`; }
    else{ mount.innerHTML=`<div class="msg">تعذّر جلب الشرح آليًّا من هنا.
      <div style="margin-top:.6rem"><a class="act" target="_blank" rel="noopener"
      href="https://dorar.net/hadith/search?q=${encodeURIComponent(matn.slice(0,50))}">افتح الشرح في الدرر السنية ↗</a></div></div>`; }
  }).catch(()=>{ mount.innerHTML=`<div class="msg">تعذّر جلب الشرح.</div>`; });
}

/* ── الرواة ── */
const RJ={idx:null,sh:{}};
const shardOf=(n)=>{let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))|0;return Math.abs(h)%24;};
async function rijalIndex(){ if(!RJ.idx) RJ.idx=await api.local("rijal/index.json"); return RJ.idx; }
async function rijalGet(key){
  const i=shardOf(key);
  if(!RJ.sh[i]){const r=await fetch(`data/rijal/n${i}.json`);RJ.sh[i]=await r.json();}
  return RJ.sh[i][key]||null;
}
/* ── حركة ── */
function reveal(sel=".rv"){
  const els=document.querySelectorAll(sel);
  if(!("IntersectionObserver" in window)){els.forEach(e=>e.classList.add("in"));return;}
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},
    {rootMargin:"0px 0px -6% 0px",threshold:.06});
  els.forEach(e=>io.observe(e));
}
function countUp(el,to,ms=1000){
  if(matchMedia("(prefers-reduced-motion:reduce)").matches){el.textContent=AR(to);return;}
  const t0=performance.now();
  const tick=t=>{const p=Math.min(1,(t-t0)/ms);el.textContent=AR(Math.round(to*(1-Math.pow(1-p,3))));
    if(p<1)requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
}
function mountStats(root,items){
  root.innerHTML=items.map(([n,l])=>`<div class="stat"><b data-to="${n}">٠</b><span>${esc(l)}</span></div>`).join("");
  const io=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;
    const b=e.target.querySelector("b"); if(b&&!b.dataset.done){b.dataset.done=1;countUp(b,+b.dataset.to);}
    io.unobserve(e.target);});},{threshold:.35});
  root.querySelectorAll(".stat").forEach(s=>io.observe(s));
}

/* تعريب وصف الطبقة */
const GEN=[[/companion|sahaba|صحاب/i,"صحابي"],[/follower.*2nd|tabi'?\)?\s*\[2nd/i,"تابعي — الطبقة الثانية"],
 [/follower|tabi'/i,"تابعي"],[/succ.*taba'?\s*tabi'|taba' tabi/i,"تابع التابعين"],
 [/(\d)(st|nd|rd|th)\s*century\s*ah/i,"من القرن $1 الهجري"],[/(\d+)(st|nd|rd|th)\s*generation/i,"الطبقة $1"],
 [/rasool allah|prophet/i,"النبي ﷺ"]];
function genAr(s){
  if(!s)return"";
  if(/^[؀-ۿ\s—،]+$/.test(s))return s;
  for(const [re,ar] of GEN){ if(re.test(s)) return s.replace(re,ar).replace(/\[.*?\]/g,"").replace(/\s+/g," ").trim(); }
  return s;
}
