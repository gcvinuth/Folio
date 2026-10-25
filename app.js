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

/* ---------- reader: custom corner-peel page curl ---------- */
let cur,pdfDoc,pu={},ld=new Set(),urls=[],ar=.7,spread=false,st=0,S=0,pw=0,ph=0,bw=0,busy=false,pl=null,drag=null;const ptrs=new Set();
const stage=$('#stage'),zoomEl=$('#zoom'),E=id=>document.getElementById(id);
const url=i=>(i>=0&&i<cur.pages&&pu[i])||'';
async function pageURL(i){
 if(cur.kind==='images')return URL.createObjectURL(cur.data[i]);
 const pg=await pdfDoc.getPage(i+1),base=pg.getViewport({scale:1}),sc=Math.min(3,Math.max(1.2,Math.max(innerWidth,innerHeight)*Math.min(devicePixelRatio,2)/base.height*1.1)),vp=pg.getViewport({scale:sc}),c=document.createElement('canvas');
 c.width=vp.width;c.height=vp.height;await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
 return new Promise(r=>c.toBlob(b=>r(URL.createObjectURL(b)),'image/jpeg',.85))}
function ensure(i){for(let j=Math.max(0,i-3);j<=Math.min(cur.pages-1,i+5);j++){if(pu[j]!==undefined||ld.has(j))continue;ld.add(j);pageURL(j).then(u=>{if(!cur)return;pu[j]=u;urls.push(u);paint()})}}
const setImg=(im,u)=>{if(u){if(im.getAttribute('src')!==u)im.src=u}else im.removeAttribute('src')};
function slot(el,i){setImg($('img',el),url(i));el.classList.toggle('no',i<0||i>=cur.pages)}
function paint(){let a=spread?2*st-1:st,b=2*st;if(pl){if(spread&&pl.dir>0)b=pl.up;else a=pl.up}
 slot(E('sA'),a);if(spread)slot(E('sB'),b);if(pl){setImg($('img',E('top')),url(pl.tp));setImg($('img',E('flap')),url(pl.tp))}}
function layout(){spread=innerWidth>innerHeight*1.15;const aw=innerWidth-24,ah=innerHeight-170;pw=Math.min(spread?aw/2:aw,ah*ar);ph=pw/ar;bw=spread?pw*2:pw;
 const b=E('book');b.style.cssText=`width:${bw}px;height:${ph}px`;b.classList.toggle('sp',spread);
 E('sA').style.cssText=`width:${pw}px;height:${ph}px;left:0`;E('sB').style.cssText=`width:${pw}px;height:${ph}px;left:${pw}px;display:${spread?'block':'none'}`;
 [E('top'),E('flap'),E('shw')].forEach(e=>{e.style.width=bw+'px';e.style.height=ph+'px'});
 S=spread?Math.ceil((cur.pages-1)/2):cur.pages-1;st=spread?Math.ceil(cur.page/2):cur.page}
async function openBook(id){cur=await DB.get(id);if(!cur)return;$('#lib').hidden=true;$('#rd').hidden=false;$('#rt').textContent=cur.name;pu={};ld.clear();pl=null;busy=false;resetZoom();
 let w,h;if(cur.kind==='pdf'){pdfDoc=await pdfjsLib.getDocument({data:await cur.data.arrayBuffer()}).promise;const v=(await pdfDoc.getPage(1)).getViewport({scale:1});w=v.width;h=v.height}
 else{const b=await createImageBitmap(cur.data[0]);w=b.width;h=b.height}
 ar=w/h;
 zoomEl.innerHTML='<div id="book"><div class="slot" id="sA"><img alt="" draggable="false"></div><div class="slot" id="sB"><img alt="" draggable="false"></div><div class="pl" id="top"><img alt="" draggable="false"></div><div id="shw"><div id="shade"></div></div><div class="pl" id="flap"><img alt="" draggable="false"></div></div>';
 layout();$('#seek').max=cur.pages;$('#pt').textContent=cur.pages;paint();turned(true)}
function turned(init){cur.page=spread?(st?2*st-1:0):st;if(!init){cur.updated=Date.now();DB.put(cur)}$('#pn').textContent=cur.page+1;$('#seek').value=cur.page+1;$('#markBtn').classList.toggle('on',cur.bookmarks.some(m=>m.page===cur.page));ensure(cur.page)}
function goPage(p){st=spread?Math.ceil(p/2):p;paint();turned()}
async function closeBook(){urls.forEach(URL.revokeObjectURL);urls=[];pu={};pdfDoc?.destroy?.();pdfDoc=null;pl=null;$('#rd').hidden=true;$('#lib').hidden=false;await refresh();if(cfg.get('syncUrl',''))sync()}
$('#seek').oninput=e=>goPage(+e.target.value-1);

/* geometry: fold line is the perpendicular bisector of corner C and drag point P; the flap is the C-side of the page mirrored across it */
function clip(poly,n,m,sg){const o=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sg*((a[0]-m[0])*n[0]+(a[1]-m[1])*n[1]),db=sg*((b[0]-m[0])*n[0]+(b[1]-m[1])*n[1]);
 if(da>=0)o.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);o.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])])}}return o}
const css=p=>p.length>2?'polygon('+p.map(q=>q[0].toFixed(1)+'px '+q[1].toFixed(1)+'px').join(',')+')':'polygon(0 0,0 0,0 0)';
function peel(P){const C=pl.C,dx=C[0]-P[0],dy=C[1]-P[1],d=Math.hypot(dx,dy),top=E('top'),flap=E('flap'),sh=E('shade');
 if(d<2){top.style.clipPath='none';flap.style.clipPath=css([]);sh.style.opacity=0;return}
 const n=[dx/d,dy/d],M=[(C[0]+P[0])/2,(C[1]+P[1])/2],x0=pl.x0,rect=[[x0,0],[x0+pw,0],[x0+pw,ph],[x0,ph]];
 top.style.clipPath=css(clip(rect,n,M,-1));flap.style.clipPath=css(clip(rect,n,M,1));
 const k=2*(M[0]*n[0]+M[1]*n[1]);flap.style.transform=`matrix(${1-2*n[0]*n[0]},${-2*n[0]*n[1]},${-2*n[0]*n[1]},${1-2*n[1]*n[1]},${k*n[0]},${k*n[1]})`;
 const H=2*(bw+ph);sh.style.opacity=1;sh.style.height=H+'px';sh.style.transform=`translate(${M[0]}px,${M[1]}px) rotate(${Math.atan2(-n[1],-n[0])}rad) translate(0,-50%)`}
const can=dir=>dir>0?st<S:st>0;
function startPeel(dir){const tp=spread?(dir>0?2*st:2*st-1):st,up=spread?(dir>0?2*st+2:2*st-3):st+dir,x0=spread&&dir>0?pw:0;
 pl={dir,tp,up,x0,C:[dir>0?bw:0,ph],T:[dir>0?(spread?0:-bw):(spread?bw:2*bw),ph*.88]};
 for(const id of['top','flap','shw']){const e=E(id);e.style.display='block';const im=$('img',e);if(im)im.style.cssText=`left:${x0}px;width:${pw}px;height:${ph}px`}
 paint();peel(pl.C)}
function endPeel(commit){if(commit){st+=pl.dir;turned()}pl=null;busy=false;for(const id of['top','flap','shw'])E(id).style.display='none';paint()}
function anim(a,b,ms,done){const t0=performance.now();busy=true;(function f(t){const k=Math.min(1,(t-t0)/ms),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 peel([a[0]+(b[0]-a[0])*e,a[1]+(b[1]-a[1])*e-Math.sin(Math.PI*e)*ph*.06]);k<1?requestAnimationFrame(f):done()})(t0)}
const settle=c=>anim(pl.P||pl.C,c?pl.T:pl.C,c?560:320,()=>endPeel(c));
function go(dir){if(busy||!cur||!can(dir))return;startPeel(dir);const C=pl.C;anim([C[0]-dir*24,C[1]-8],pl.T,640,()=>endPeel(true))}
stage.addEventListener('pointerdown',e=>{ptrs.add(e.pointerId);if(z>1)return;if(ptrs.size>1){const w=drag?.dir;drag=null;if(w)settle(false);return}if(busy)return;drag={x:e.clientX,y:e.clientY,t:performance.now(),dir:0}});
stage.addEventListener('pointermove',e=>{if(!drag||ptrs.size>1)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.dir){if(Math.abs(dx)<10)return;const dir=dx<0?1:-1;if(!can(dir)){drag=null;return}drag.dir=dir;busy=true;startPeel(dir);try{stage.setPointerCapture(e.pointerId)}catch{}}
 const C=pl.C,mx=drag.dir>0?Math.min(dx,0):Math.max(dx,0);pl.P=[C[0]+mx,C[1]+Math.min(dy,0)*.4-Math.min(Math.abs(mx),pw)*.14];peel(pl.P)});
const up=e=>{ptrs.delete(e.pointerId);if(!drag)return;const d=drag;drag=null;
 if(!d.dir){if(Math.abs(e.clientX-d.x)<8&&Math.abs(e.clientY-d.y)<8){const r=e.clientX/innerWidth;if(r<.3)go(-1);else if(r>.7)go(1)}return}
 const dx=Math.abs(e.clientX-d.x);settle(dx>pw*.28||dx/(performance.now()-d.t)>.6)};
stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
addEventListener('resize',()=>{if(!cur||$('#rd').hidden||busy)return;layout();paint();turned(true)});
function toggleMark(){const i=cur.page,k=cur.bookmarks.findIndex(m=>m.page===i);if(k>=0)cur.bookmarks.splice(k,1);else cur.bookmarks.push({page:i,label:'Page '+(i+1),at:Date.now()});cur.bookmarks.sort((a,b)=>a.page-b.page);cur.updated=Date.now();DB.put(cur);turned(true);toast(k>=0?'Bookmark removed':'Bookmarked page '+(i+1),1400)}
function marksSheet(){const list=cur.bookmarks.map((m,i)=>`<div class="li"><button style="flex:1;text-align:left" data-go="${m.page}"><b>${esc(m.label)}</b></button><button class="ib" data-del="${i}" aria-label="Remove bookmark">✕</button></div>`).join('')||'<p style="color:var(--on2)">No bookmarks yet. Tap the bookmark icon on any page to save your spot.</p>';
 sheet(`<h3>Bookmarks</h3>${list}<div class="row"><button class="btn" id="bm">Bookmark this page</button><button class="btn g" data-close>Close</button></div>`);
 $('#bm').onclick=()=>{toggleMark();dlg.close()};
 $$('[data-go]',dlg).forEach(b=>b.onclick=()=>{goPage(+b.dataset.go);dlg.close()});
 $$('[data-del]',dlg).forEach(b=>b.onclick=()=>{cur.bookmarks.splice(+b.dataset.del,1);DB.put(cur);turned(true);marksSheet()});
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
 if(e.key==='ArrowRight')go(1);else if(e.key==='ArrowLeft')go(-1);else if(e.key==='Escape')closeBook();else if(e.key==='+')(z=Math.min(5,z+.5),apply());else if(e.key==='-'){z=Math.max(1,z-.5);if(z===1)px=py=0;apply()}});

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
