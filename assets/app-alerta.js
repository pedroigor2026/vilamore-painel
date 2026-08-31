// App do Alerta de Escala — arquivo REAL (fora de template literal desde a Fase 1
// do plano 10/10). Servido em /assets/app-alerta.js pelo GitHub Pages.
const ALARM_HOURS=[15,16,17,18,19,20,21];
let _alarmFired=false,_audioCtx=null;

// confirmação vinda de OUTRO aparelho (vg_health é leitura pública — sem login aqui)
let _cloudOkDia=null;
async function _checkCloudConfirm(){
  try{
    const r=await fetch('https://imdypwtgqpgouwlhyfik.supabase.co/rest/v1/vg_health?processo=eq.escala_confirmada&select=detalhe',
      {headers:{apikey:'sb_publishable_5EbpdievXaj7uw_Cdul2QQ_Mo77EgXg'}}); // forja:segredo-ok chave anon publica do Supabase protegida por RLS
    if(!r.ok)return;
    const rows=await r.json();
    _cloudOkDia=(rows.length&&rows[0].detalhe===_todayKey())?rows[0].detalhe:null;
    check();
  }catch(e){}
}
_checkCloudConfirm();
setInterval(_checkCloudConfirm,60000);

function _todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _fmt(d){return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}

function _playSound(){
  try{
    if(!_audioCtx)_audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(_audioCtx.state==='suspended')_audioCtx.resume();
    [0,.4,.8].forEach((t,i)=>{
      const o=_audioCtx.createOscillator(),g=_audioCtx.createGain();
      o.connect(g);g.connect(_audioCtx.destination);
      o.type='square';o.frequency.value=i%2===0?880:660;
      g.gain.setValueAtTime(.25,_audioCtx.currentTime+t);
      g.gain.exponentialRampToValueAtTime(.001,_audioCtx.currentTime+t+.35);
      o.start(_audioCtx.currentTime+t);o.stop(_audioCtx.currentTime+t+.36);
    });
  }catch(e){}
}

function _showNotif(title,body){
  if(Notification.permission==='granted'){
    try{new Notification(title,{body,icon:'/icon.png',requireInteraction:true,tag:'escala-vilamore'});}catch{}
  }
}

function ativarNotif(){
  Notification.requestPermission().then(p=>{
    document.getElementById('nBadge').textContent='🔔 Notificações: '+(p==='granted'?'Ativadas ✅':'Negadas ❌');
    document.getElementById('btnNotif').style.display=p==='granted'?'none':'block';
    if(p==='granted'&&'serviceWorker' in navigator)navigator.serviceWorker.register('/alerta/sw.js').catch(()=>{});
  });
}

function dismiss(){
  const until=Date.now()+3600000;
  localStorage.setItem('vg_alerta_dismiss',String(until));
  _alarmFired=false;
  setUI('card','🔕','Silenciado por 1h','O alarme volta em 1h se a escala não for confirmada',false,false);
  document.getElementById('nextTxt').textContent='Próximo alarme automático em 1h';
}

function setUI(cls,ico,txt,stxt,showApp,showDismiss){
  document.getElementById('card').className='card '+cls;
  document.getElementById('ico').textContent=ico;
  document.getElementById('txt').textContent=txt;
  document.getElementById('stxt').textContent=stxt;
  document.getElementById('btnApp').style.display=showApp?'block':'none';
  document.getElementById('btnDismiss').style.display=showDismiss?'block':'none';
}

function check(){
  const now=new Date();
  const h=now.getHours(),min=now.getMinutes();
  const key=_todayKey();
  const confirmed=!!localStorage.getItem('vg_escala_ok_'+key)||_cloudOkDia===key;
  const dismissed=parseInt(localStorage.getItem('vg_alerta_dismiss')||'0')>Date.now();
  const nextH=ALARM_HOURS.find(ah=>ah>h);
  const nextTxt=nextH?('Próximo alarme: '+nextH+'h'):'Último alarme do dia';
  document.getElementById('nextTxt').textContent=nextTxt;

  if(confirmed){
    _alarmFired=false;
    setUI('card-ok','✅','Escala confirmada!','A escala de hoje foi preenchida e confirmada. Obrigado!',false,false);
    document.getElementById('nextTxt').textContent='Nenhum alarme pendente para hoje ✅';
    return;
  }

  const inWindow=h>=15&&h<=21;
  if(!inWindow){
    setUI('card','📅','Escala ainda não confirmada','O alarme começa às 15h se a escala não for confirmada.',true,false);
    document.getElementById('nextTxt').textContent='Próximo alarme: 15h de hoje';
    return;
  }

  const isAlarmMin=ALARM_HOURS.includes(h)&&min<5;
  if(isAlarmMin&&!dismissed){
    if(!_alarmFired){
      _alarmFired=true;
      _playSound();
      setTimeout(_playSound,1500);
      setTimeout(_playSound,3000);
      _showNotif('🚨 Escala Vilamore — '+_fmt(now),'A escala de hoje ainda não foi confirmada! Toque para abrir o app.');
    }
    setUI('card-alert','🚨','ESCALA NÃO CONFIRMADA!','São '+_fmt(now)+' — preencha agora!',true,true);
  } else if(dismissed){
    setUI('card','🔕','Silenciado','O alarme está silenciado temporariamente.',true,false);
  } else {
    _alarmFired=false;
    setUI('card-warn','⚠️','Escala não confirmada','Preencha antes do próximo alarme!',true,false);
  }
}

// Init
if(Notification.permission==='granted'){
  document.getElementById('nBadge').textContent='🔔 Notificações: Ativadas ✅';
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/alerta/sw.js').catch(()=>{});
}else if(Notification.permission==='default'){
  document.getElementById('btnNotif').style.display='block';
  document.getElementById('nBadge').textContent='🔔 Toque para ativar notificações';
}else{
  document.getElementById('nBadge').textContent='🔔 Notificações bloqueadas';
}

check();
setInterval(check,15000);
