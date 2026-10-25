'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const P={add:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',back:'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',mark:'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z',list:'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',cloud:'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',moon:'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',more:'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'};
const ICON={theme:'moon',settings:'cloud',import:'add',back:'back',mark:'mark',marks:'list'};
const svgIcon=(k)=>`<svg viewBox="0 0 24 24"><path d="${P[k]}"/></svg>`;
function icons(){$$('[data-act]').forEach(b=>{const s=$('svg',b);if(s&&ICON[b.dataset.act])s.outerHTML=svgIcon(ICON[b.dataset.act])})}
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast=(m,t=2600)=>{const e=$('#toast');e.textContent=m;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),t)};
const cfg={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('folio.'+k))??d}catch{return d}},set:(k,v)=>localStorage.setItem('folio.'+k,JSON.stringify(v))};

/* ---------- storage (IndexedDB: files stay on device for offline use) ---------- */
const DB=(()=>{let p;const open=()=>p||(p=new Promise((ok,no)=>{const r=indexedDB.open('folio',1);r.onupgradeneeded=()=>r.result.createObjectStore('books',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}));
const tx=async(m,f)=>{const d=await open();return new Promise((ok,no)=>{const t=d.transaction('books',m);const o=f(t.objectStore('books'));t.oncomplete=()=>ok(o.result);t.onerror=()=>no(t.error)})};
return{all:()=>tx('readonly',s=>s.getAll()),get:id=>tx('readonly',s=>s.get(id)),put:b=>tx('readwrite',s=>s.put(b)),del:id=>tx('readwrite',s=>s.delete(id))}})();

/* ---------- theme ---------- */
function theme(toggle){let t=cfg.get('theme',null);if(toggle){t=document.documentElement.dataset.theme==='dark'?'light':'dark';cfg.set('theme',t)}
 t=t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;
 $('meta[name=theme-color]').content=t==='dark'?'#14121a':'#4f46c8'}

/* ---------- library ---------- */
let books=[],grp='folder',sel='All',query='';
const hash=s=>{let h=5381;for(const c of s)h=(h*33^c.charCodeAt(0))>>>0;return h.toString(36)};
async function refresh(){books=(await DB.all()).sort((a,b)=>b.updated-a.updated);renderLib()}
function renderLib(){
 const vals=[...new Set(books.map(b=>b[grp]).filter(Boolean))].sort();
 if(sel!=='All'&&!vals.includes(sel))sel='All';
 $('#chips').innerHTML=['All',...vals].map(v=>`<button class="chip ${v===sel?'on':''}" data-v="${esc(v)}">${esc(v)}</button>`).join('');
 const q=query.toLowerCase(),list=books.filter(b=>(sel==='All'||b[grp]===sel)&&b.name.toLowerCase().includes(q));
 $('#empty').hidden=books.length>0;
 $('#grid').innerHTML=list.map(b=>`<div class="card" data-id="${b.id}"><button class="more" data-more="${b.id}" aria-label="Edit ${esc(b.name)}"><svg viewBox="0 0 24 24"><path d="${P.more}"/></svg></button>
  <div class="cover" style="background-image:url(${b.cover||''})" role="button" tabindex="0" data-open="${b.id}"></div><b>${esc(b.name)}</b>
  <div class="bar"><i style="width:${Math.round((b.page+1)/b.pages*100)}%"></i></div><small>Page ${b.page+1} of ${b.pages}${b.folder?' · '+esc(b.folder):''}</small></div>`).join('');
}

/* ---------- import ---------- */
const thumb=async(src,w=320)=>{const c=document.createElement('canvas');const bmp=src;const r=w/bmp.width;c.width=w;c.height=Math.round(bmp.height*r);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.7)};
async function importFiles(files,meta={}){
 files=[...files];const pdfs=files.filter(f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name));
 const imgs=files.filter(f=>f.type.startsWith('image/')||/\.(jpe?g|png|webp|gif)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 for(const f of pdfs){toast('Importing '+f.name+'…');
  try{const doc=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,pg=await doc.getPage(1),vp=pg.getViewport({scale:1}),sc=320/vp.width,c=document.createElement('canvas');
   c.width=320;c.height=Math.round(vp.height*sc);await pg.render({canvasContext:c.getContext('2d'),viewport:pg.getViewport({scale:sc})}).promise;
   await save({id:hash(f.name+f.size),name:f.name.replace(/\.pdf$/i,''),kind:'pdf',data:f,pages:doc.numPages,cover:c.toDataURL('image/jpeg',.7)},meta)}
  catch(e){toast('Could not read '+f.name+' — is it a valid PDF?')}}
 if(imgs.length){const name=meta.title||(imgs.length>1?imgs[0].name.replace(/[\d_\-. ]*\.\w+$/,'')||'Image set':imgs[0].name.replace(/\.\w+$/,''));
  const bmp=await createImageBitmap(imgs[0]);
  await save({id:hash(name+imgs.length+imgs[0].size),name,kind:'images',data:imgs,pages:imgs.length,cover:await thumb(bmp)},meta)}
 if(!pdfs.length&&!imgs.length)toast('Add a PDF or image files (JPG, PNG, WebP).');
 await refresh()}
async function save(b,m){const old=await DB.get(b.id);Object.assign(b,{folder:m.folder||old?.folder||'',genre:m.genre||old?.genre||'',page:old?.page||0,bookmarks:old?.bookmarks||[],added:old?.added||Date.now(),updated:Date.now()});await DB.put(b);toast('Added “'+b.name+'”')}
async function importURL(url,meta){
 try{new URL(url)}catch{return toast('That doesn’t look like a link. Paste the full address.')}
 toast('Downloading…',8000);
 try{const r=await fetch(url);if(!r.ok)throw 0;const blob=await r.blob(),name=decodeURIComponent(new URL(url).pathname.split('/').pop())||'download';
  const type=blob.type||(/\.pdf$/i.test(name)?'application/pdf':'');await importFiles([new File([blob],name,{type})],meta)}
 catch{toast('Download blocked. The site may not allow in-browser downloads (CORS). Save the file, then add it from your device.',6000)}}

/* ---------- dialogs ---------- */
const dlg=$('#dlg');
function sheet(html){dlg.innerHTML=html;if(!dlg.open)dlg.showModal();return dlg}
dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.dataset.close!==undefined)dlg.close()});
const dl=(id,arr)=>`<datalist id="${id}">${[...new Set(arr.filter(Boolean))].map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
function importSheet(){sheet(`<h3>Add to library</h3><div class="drop" id="drop"><p>Drop files here, or</p><button class="btn" id="pick">Choose PDF or images</button></div>
 <h3 style="margin-top:20px;font-size:1.1rem">From a link</h3><input class="fld" id="url" type="url" inputmode="url" placeholder="https://…/book.pdf" aria-label="Link">
 <h3 style="margin-top:20px;font-size:1.1rem">Organize (optional)</h3>
 <input class="fld" id="fo" list="fl" placeholder="Folder"><input class="fld" id="ge" list="gl" placeholder="Genre">${dl('fl',books.map(b=>b.folder))}${dl('gl',books.map(b=>b.genre))}
 <div class="row"><button class="btn" id="go">Download link</button><button class="btn g" data-close>Cancel</button></div>`);
 const meta=()=>({folder:$('#fo').value.trim(),genre:$('#ge').value.trim()});
 $('#pick').onclick=()=>{$('#file').onchange=async e=>{dlg.close();await importFiles(e.target.files,meta());e.target.value=''};$('#file').click()};
 $('#go').onclick=async()=>{const u=$('#url').value.trim();if(!u)return;dlg.close();importURL(u,meta())};
 const d=$('#drop');d.ondragover=e=>{e.preventDefault();d.classList.add('over')};d.ondragleave=()=>d.classList.remove('over');d.ondrop=e=>{e.preventDefault();dlg.close();importFiles(e.dataTransfer.files,meta())};
 navigator.clipboard?.readText?.().then(t=>{if(/^https?:\/\//.test(t)&&!$('#url').value)$('#url').value=t.trim()}).catch(()=>{})}
function editSheet(id){const b=books.find(x=>x.id===id);if(!b)return;
 sheet(`<h3>Edit book</h3><input class="fld" id="en" value="${esc(b.name)}" aria-label="Title"><input class="fld" id="fo" list="fl" value="${esc(b.folder)}" placeholder="Folder"><input class="fld" id="ge" list="gl" value="${esc(b.genre)}" placeholder="Genre">${dl('fl',books.map(x=>x.folder))}${dl('gl',books.map(x=>x.genre))}
 <div class="row"><button class="btn" id="sv">Save</button><button class="btn d" id="rm">Delete</button><button class="btn g" data-close>Cancel</button></div>`);
 $('#sv').onclick=async()=>{Object.assign(b,{name:$('#en').value.trim()||b.name,folder:$('#fo').value.trim(),genre:$('#ge').value.trim(),updated:Date.now()});await DB.put(b);dlg.close();refresh()};
 $('#rm').onclick=async()=>{if(confirm('Delete “'+b.name+'” from this device?')){await DB.del(b.id);dlg.close();refresh()}}}

/* ---------- sync (progress, bookmarks, folders; your own JSON endpoint) ---------- */
const metaOf=b=>({name:b.name,folder:b.folder,genre:b.genre,page:b.page,bookmarks:b.bookmarks,updated:b.updated});
async function sync(){const url=cfg.get('syncUrl','');if(!url)return toast('Add a sync endpoint in settings first.');
 try{const h={'Content-Type':'application/json'};const tk=cfg.get('syncToken','');if(tk)h.Authorization='Bearer '+tk;
  let remote={};try{const r=await fetch(url,{headers:h});if(r.ok)remote=(await r.json()).books||{}}catch{}
  const merged={...remote};
  for(const b of books){const r=remote[b.id];if(r&&r.updated>b.updated){Object.assign(b,r);await DB.put(b)}else merged[b.id]=metaOf(b)}
  const r=await fetch(url,{method:'PUT',headers:h,body:JSON.stringify({books:merged,at:Date.now()})});if(!r.ok)throw 0;
  cfg.set('lastSync',Date.now());await refresh();toast('Synced')}catch{toast('Sync failed. Check the endpoint address and token.',4000)}}
function settingsSheet(){const ls=cfg.get('lastSync',0);
 sheet(`<h3>Cloud sync</h3><p style="color:var(--on2);margin:0 0 8px">Syncs reading progress, bookmarks and folders with an endpoint you control (GET returns and PUT stores JSON). Books themselves stay on each device; add the same file on each one.</p>
 <input class="fld" id="su" type="url" placeholder="Sync endpoint URL" value="${esc(cfg.get('syncUrl',''))}"><input class="fld" id="st" type="password" placeholder="Access token (optional)" value="${esc(cfg.get('syncToken',''))}">
 <p style="color:var(--on2)">${ls?'Last synced '+new Date(ls).toLocaleString():'Not synced yet'}</p>
 <div class="row"><button class="btn" id="sn">Save & sync</button><button class="btn t" id="ex">Export backup</button><button class="btn t" id="im">Import backup</button></div>`);
 $('#sn').onclick=()=>{cfg.set('syncUrl',$('#su').value.trim());cfg.set('syncToken',$('#st').value);dlg.close();sync()};
 $('#ex').onclick=()=>{const o={};books.forEach(b=>o[b.id]=metaOf(b));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({books:o})],{type:'application/json'}));a.download='folio-backup.json';a.click()};
 $('#im').onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.json';i.onchange=async()=>{try{const o=JSON.parse(await i.files[0].text()).books;for(const b of books){const r=o[b.id];if(r&&r.updated>b.updated){Object.assign(b,r);await DB.put(b)}}dlg.close();refresh();toast('Backup merged')}catch{toast('That backup file is not valid.')}};i.click()}}

/* ---------- reader ---------- */
let cur,flip,srcs=[],loaded=new Set(),pdfDoc,urls=[];
const stage=$('#stage'),zoomEl=$('#zoom');
async function pageURL(i){
 if(cur.kind==='images')return URL.createObjectURL(cur.data[i]);
 const pg=await pdfDoc.getPage(i+1),base=pg.getViewport({scale:1}),sc=Math.min(3,Math.max(1.2,Math.max(innerWidth,innerHeight)*Math.min(devicePixelRatio,2)/base.height*1.1)),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');
 c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
 return new Promise(r=>c.toBlob(b=>r(URL.createObjectURL(b)),'image/jpeg',.85))}
async function ensure(i){for(let j=Math.max(0,i-2);j<=Math.min(cur.pages-1,i+5);j++){if(loaded.has(j))continue;loaded.add(j);
 pageURL(j).then(u=>{urls.push(u);const el=$$('.page')[j];if(el){$('img',el).src=u;el.classList.remove('ld')}})}}
async function openBook(id){cur=await DB.get(id);if(!cur)return;$('#lib').hidden=true;$('#rd').hidden=false;$('#rt').textContent=cur.name;loaded.clear();resetZoom();
 let w=2,h=3;
 if(cur.kind==='pdf'){pdfDoc=await pdfjsLib.getDocument({data:await cur.data.arrayBuffer()}).promise;const v=(await pdfDoc.getPage(1)).getViewport({scale:1});w=v.width;h=v.height}
 else{const b=await createImageBitmap(cur.data[0]);w=b.width;h=b.height}
 const k=600/w;w=600;h=Math.round(h*k);
 $('#zoom').innerHTML='<div id="book"></div>';
 const frag=document.createDocumentFragment();
 for(let i=0;i<cur.pages;i++){const d=document.createElement('div');d.className='page ld';if(i===0||i===cur.pages-1)d.dataset.density='hard';d.innerHTML='<img alt="Page '+(i+1)+'" draggable="false">';frag.appendChild(d)}
 const bk=$('#book');bk.appendChild(frag);
 flip=new St.PageFlip(bk,{width:w,height:h,size:'stretch',minWidth:180,maxWidth:1000,minHeight:260,maxHeight:1600,showCover:true,usePortrait:true,startPage:cur.page,flippingTime:700,maxShadowOpacity:.5,drawShadow:true,swipeDistance:24,mobileScrollSupport:false,useMouseEvents:true});
 flip.loadFromHTML($$('.page',bk));flip.on('flip',e=>turned(e.data));
 const s=$('#seek');s.max=cur.pages;$('#pt').textContent=cur.pages;turned(cur.page,true)}
function turned(i,init){cur.page=i;if(!init){cur.updated=Date.now();DB.put(cur)}$('#pn').textContent=i+1;$('#seek').value=i+1;$('#markBtn').classList.toggle('on',cur.bookmarks.some(m=>m.page===i));ensure(i)}
async function closeBook(){try{flip.destroy()}catch{}urls.forEach(URL.revokeObjectURL);urls=[];pdfDoc?.destroy?.();pdfDoc=null;$('#rd').hidden=true;$('#lib').hidden=false;await refresh();if(cfg.get('syncUrl',''))sync()}
$('#seek').oninput=e=>{const i=+e.target.value-1;flip.turnToPage(i);turned(i)};
function toggleMark(){const i=cur.page,k=cur.bookmarks.findIndex(m=>m.page===i);if(k>=0)cur.bookmarks.splice(k,1);else cur.bookmarks.push({page:i,label:'Page '+(i+1),at:Date.now()});cur.bookmarks.sort((a,b)=>a.page-b.page);cur.updated=Date.now();DB.put(cur);turned(i,true);toast(k>=0?'Bookmark removed':'Bookmarked page '+(i+1),1400)}
function marksSheet(){const list=cur.bookmarks.map((m,i)=>`<div class="li"><button style="flex:1;text-align:left" data-go="${m.page}"><b>${esc(m.label)}</b></button><button class="ib" data-del="${i}" aria-label="Remove bookmark">✕</button></div>`).join('')||'<p style="color:var(--on2)">No bookmarks yet. Tap the bookmark icon on any page to save your spot.</p>';
 sheet(`<h3>Bookmarks</h3>${list}<div class="row"><button class="btn" id="bm">Bookmark this page</button><button class="btn g" data-close>Close</button></div>`);
 $('#bm').onclick=()=>{toggleMark();dlg.close()};
 $$('[data-go]',dlg).forEach(b=>b.onclick=()=>{const i=+b.dataset.go;flip.turnToPage(i);turned(i);dlg.close()});
 $$('[data-del]',dlg).forEach(b=>b.onclick=()=>{cur.bookmarks.splice(+b.dataset.del,1);DB.put(cur);turned(cur.page,true);marksSheet()});
 $$('.li b',dlg).forEach((b,i)=>b.ondblclick=()=>{const n=prompt('Rename bookmark',cur.bookmarks[i].label);if(n){cur.bookmarks[i].label=n;DB.put(cur);marksSheet()}})}

/* pinch-to-zoom, pan and double-tap (touch events captured before the page-flip engine sees them) */
let z=1,px=0,py=0,pinch=null,pan=null,lastTap=0;
const apply=()=>{zoomEl.style.transform=`translate(${px}px,${py}px) scale(${z})`};
const resetZoom=()=>{z=1;px=py=0;apply()};
const dist=e=>Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
const clampPan=()=>{const mx=innerWidth*(z-1)/2,my=innerHeight*(z-1)/2;px=Math.max(-mx,Math.min(mx,px));py=Math.max(-my,Math.min(my,py))};
stage.addEventListener('touchstart',e=>{
 if(e.touches.length===2){e.stopPropagation();pinch={d:dist(e),z:z};pan=null;return}
 const now=Date.now();if(now-lastTap<300){e.stopPropagation();e.preventDefault();z>1?resetZoom():(z=2.5,px=py=0,apply());lastTap=0;return}lastTap=now;
 if(z>1){e.stopPropagation();pan={x:e.touches[0].clientX-px,y:e.touches[0].clientY-py}}},{capture:true,passive:false});
stage.addEventListener('touchmove',e=>{
 if(pinch&&e.touches.length===2){e.stopPropagation();e.preventDefault();z=Math.max(1,Math.min(5,pinch.z*dist(e)/pinch.d));clampPan();apply()}
 else if(pan&&z>1){e.stopPropagation();e.preventDefault();px=e.touches[0].clientX-pan.x;py=e.touches[0].clientY-pan.y;clampPan();apply()}},{capture:true,passive:false});
stage.addEventListener('touchend',e=>{if(z<1.05)resetZoom();if(e.touches.length<2)pinch=null;if(!e.touches.length)pan=null;if(z>1)e.stopPropagation()},{capture:true});
stage.addEventListener('wheel',e=>{if(!e.ctrlKey&&z===1)return;e.preventDefault();z=Math.max(1,Math.min(5,z*(e.deltaY<0?1.1:.9)));if(z===1)px=py=0;clampPan();apply()},{passive:false});
addEventListener('keydown',e=>{if($('#rd').hidden||dlg.open)return;
 if(e.key==='ArrowRight')flip.flipNext();else if(e.key==='ArrowLeft')flip.flipPrev();else if(e.key==='Escape')closeBook();else if(e.key==='+')(z=Math.min(5,z+.5),apply());else if(e.key==='-'){z=Math.max(1,z-.5);if(z===1)px=py=0;apply()}});

/* ---------- wiring ---------- */
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-act]')?.dataset.act;
 if(a==='theme')theme(true);else if(a==='import')importSheet();else if(a==='settings')settingsSheet();else if(a==='back')closeBook();else if(a==='mark')toggleMark();else if(a==='marks')marksSheet();
 const m=e.target.closest('[data-more]');if(m)return editSheet(m.dataset.more);
 const o=e.target.closest('[data-open]');if(o)return openBook(o.dataset.open);
 const c=e.target.closest('.chip');if(c){sel=c.dataset.v;renderLib()}
 const g=e.target.closest('#grp button');if(g){grp=g.dataset.g;sel='All';$$('#grp button').forEach(x=>x.classList.toggle('on',x===g));renderLib()}});
$('#q').oninput=e=>{query=e.target.value;renderLib()};
addEventListener('dragover',e=>e.preventDefault());addEventListener('drop',e=>{if(e.target.closest('#drop'))return;e.preventDefault();importFiles(e.dataTransfer.files,{})});
if('launchQueue'in window)launchQueue.setConsumer(async p=>{const fs=await Promise.all((p.files||[]).map(h=>h.getFile()));if(fs.length)importFiles(fs,{})});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
theme();icons();refresh();
