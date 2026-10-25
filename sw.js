const V='folio-v1',SHELL=['./','index.html','style.css','app.js','manifest.json','icon.svg'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js','https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(V);await c.addAll(SHELL);await Promise.allSettled(LIBS.map(u=>c.add(u)));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V)await caches.delete(k);self.clients.claim()})())});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 const own=u.origin===location.origin,lib=LIBS.includes(r.url)||/fonts\.(googleapis|gstatic)\.com/.test(u.host);
 if(!own&&!lib)return; // user-imported URLs and sync calls always go to the network
 e.respondWith((async()=>{const c=await caches.open(V);
  if(lib){const h=await c.match(r);if(h)return h}
  try{const n=await fetch(r);if(n.ok||n.type==='opaque')c.put(r,n.clone());return n}
  catch{return (await c.match(r))||(r.mode==='navigate'?await c.match('index.html'):Response.error())}})())});
