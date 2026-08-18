// فتح/إغلاق الآية — آيةٌ واحدة مفتوحة في المرة.
(function(){
  function closeAll(except){
    document.querySelectorAll('.verse.open').forEach(function(v){
      if(v===except)return;
      v.classList.remove('open');
      v.querySelector('.vrow').setAttribute('aria-expanded','false');
      v.querySelector('.detail').hidden=true;
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
})();
