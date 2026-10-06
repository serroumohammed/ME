(function(){
  var C=window.SITE_CONFIG||{}, root=document.documentElement, btns=document.querySelectorAll('.lang button');
  function isEn(){return root.getAttribute('data-lang')==='en';}
  function setLang(l){root.setAttribute('data-lang',l);root.setAttribute('lang',l);
    btns.forEach(function(b){b.setAttribute('aria-pressed',b.dataset.set===l?'true':'false');});
    document.querySelectorAll('[data-ph-fr]').forEach(function(i){i.placeholder=i.getAttribute('data-ph-'+l);});
    document.querySelectorAll('option[data-fr]').forEach(function(o){o.textContent=o.getAttribute('data-'+l);});
    try{localStorage.setItem('ms-lang',l);}catch(e){}}
  var saved=null;try{saved=localStorage.getItem('ms-lang');}catch(e){}
  setLang(saved==='en'?'en':'fr');
  btns.forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.set);});});
  // booking link
  if(C.bookingUrl){
    document.querySelectorAll('[data-booking]').forEach(function(a){a.href=C.bookingUrl.replace(/\/$/,'')+(a.dataset.booking?'/'+a.dataset.booking:'');a.target='_blank';a.rel='noopener';});
    document.querySelectorAll('[data-booking-block]').forEach(function(b){b.hidden=false;});
  }
  // social links
  document.querySelectorAll('[data-social]').forEach(function(a){var u=C[a.dataset.social];if(u){a.href=u;a.hidden=false;}});
  function send(data,onOk,onErr,form){
    var hp=form&&form.querySelector('[name=_gotcha]');if(hp&&hp.value){onOk();return;}
    if(hp)data._gotcha='';
    fetch(C.formEndpoint,{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){r.ok?onOk():onErr();}).catch(onErr);
  }
  // waitlist forms
  document.querySelectorAll('form.wl').forEach(function(f){
    var msg=f.querySelector('.wl-msg'), inp=f.querySelector('input');
    f.addEventListener('submit',function(e){e.preventDefault();
      if(!inp.value.trim()||!inp.checkValidity()){msg.textContent=isEn()?'Enter a valid email address.':'Saisissez une adresse email valide.';inp.focus();return;}
      var course=f.dataset.course;
      if(!C.formEndpoint){window.location.href='mailto:contact@serroumohammed.com?subject='+encodeURIComponent('Liste d’attente : '+course)+'&body='+encodeURIComponent('Email : '+inp.value.trim());return;}
      msg.textContent=isEn()?'Sending…':'Envoi…';
      send({type:'Liste d’attente',formation:course,email:inp.value.trim()},
        function(){f.reset();msg.textContent=isEn()?'Done. You’ll be notified when enrolment opens.':'C’est noté. Vous serez prévenu à l’ouverture des inscriptions.';},
        function(){msg.textContent=isEn()?'Sending failed. Write to contact@serroumohammed.com.':'L’envoi a échoué. Écrivez à contact@serroumohammed.com.';},f);
    });
  });
  // contact form
  var f=document.getElementById('contactForm');
  if(f){var hint=document.getElementById('formHint'), sub=f.querySelector('button[type=submit]');
    f.addEventListener('submit',function(e){e.preventDefault();
      if(!f.name.value.trim()||!f.email.value.trim()||!f.email.checkValidity()){
        hint.textContent=isEn()?'Add your name and a valid email address to send the request.':'Indiquez votre nom et une adresse email valide pour envoyer la demande.';
        (f.name.value.trim()?f.email:f.name).focus();return;}
      var d={type:'Contact',nom:f.name.value.trim(),email:f.email.value.trim(),besoin:f.need.value,message:f.msg.value.trim()};
      if(!C.formEndpoint){
        window.location.href='mailto:contact@serroumohammed.com?subject='+encodeURIComponent('Demande : '+d.besoin+' — '+d.nom)+'&body='+encodeURIComponent('Nom : '+d.nom+'\nEmail : '+d.email+'\nBesoin : '+d.besoin+'\n\n'+d.message);return;}
      sub.disabled=true;hint.textContent=isEn()?'Sending…':'Envoi…';
      send(d,function(){f.reset();sub.disabled=false;hint.textContent=isEn()?'Request sent. I’ll reply within 48 hours.':'Demande envoyée. Je vous réponds sous 48 heures.';},
        function(){sub.disabled=false;hint.textContent=isEn()?'Sending failed. Write to contact@serroumohammed.com.':'L’envoi a échoué. Écrivez directement à contact@serroumohammed.com.';},f);
    });}
})();

(function(){var b=document.querySelector('.menu-btn'),n=document.getElementById('mainnav');if(!b||!n)return;
function set(o){n.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');}
b.addEventListener('click',function(){set(!n.classList.contains('open'));});
n.addEventListener('click',function(e){if(e.target.closest('a'))set(false);});
document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});
window.addEventListener('hashchange',function(){set(false);});})();