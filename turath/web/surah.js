// فتح/إغلاق الآية + تبديل التبويبات. آيةٌ واحدة مفتوحة في المرة.
(function(){
  function closeAll(except){
    document.querySelectorAll('.verse.open').forEach(function(v){
      if(v===except)return;
      v.classList.remove('open');
      var b=v.querySelector('.vrow'), d=v.querySelector('.detail');
      b.setAttribute('aria-expanded','false'); d.hidden=true;
    });
  }
  document.querySelectorAll('.vrow').forEach(function(btn){
    btn.addEventListener('click',function(){
      var verse=btn.closest('.verse'), detail=verse.querySelector('.detail');
      var open=verse.classList.toggle('open');
      btn.setAttribute('aria-expanded',open?'true':'false');
      detail.hidden=!open;
      if(open){closeAll(verse); verse.scrollIntoView({behavior:'smooth',block:'nearest'});}
    });
  });
  document.querySelectorAll('.tab').forEach(function(tab){
    tab.addEventListener('click',function(e){
      e.stopPropagation();
      var detail=tab.closest('.detail'), key=tab.dataset.t;
      detail.querySelectorAll('.tab').forEach(function(t){t.classList.toggle('active',t===tab)});
      detail.querySelectorAll('.panel').forEach(function(p){
        p.classList.toggle('active',p.dataset.p===key)});
    });
  });
})();
