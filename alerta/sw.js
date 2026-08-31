self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(clients.claim()));
self.addEventListener('push',e=>{
  const d=e.data?.json()||{};
  e.waitUntil(self.registration.showNotification(d.title||'Alerta Vilamore',{body:d.body||'Verifique a escala do dia.',icon:'/icon.png',badge:'/icon.png',requireInteraction:true,tag:'escala'}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.openWindow('https://pedroigor2026.github.io/alerta/'));
});
