(() => {
'use strict';
const cfg=window.ALTIS_SUPABASE;
const api=`${cfg.url}/rest/v1/games`;
const mediaApi='https://altigames-media-api.julia-correa-souza.workers.dev';
const mediaOrigin='https://audio.altigames.com.br';
const $=id=>document.getElementById(id);
const db=window.supabase.createClient(cfg.url,cfg.publishableKey);
let games=[],previewUrl=null,session=null,admin=false;
function feedback(id,text,error=false){const el=$(id);el.textContent=text;el.className='feedback '+(error?'error':'ok');}
function validImage(path){
 if(typeof path!=='string')return false;
 if(/^assets\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp|gif|avif)$/i.test(path)&&!path.includes('..'))return true;
 try{const u=new URL(path);return u.protocol==='https:'&&(
   (u.origin===new URL(cfg.url).origin&&u.pathname.startsWith('/storage/v1/object/public/game-images/'))||
   (u.origin===mediaOrigin&&u.pathname.startsWith('/portfolio/games/'))
 )&&!u.pathname.includes('..');}catch{return false;}
}
function validLink(v){if(!v)return true;try{return ['https:','http:'].includes(new URL(v).protocol)}catch{return false;}}
async function request(url,options={}){
 const token=session?.access_token;if(!token||!admin)throw Error('Sua sessão administrativa expirou. Entre novamente.');
 const r=await fetch(url,{...options,headers:{'apikey':cfg.publishableKey,'Authorization':`Bearer ${token}`,'Content-Type':'application/json',...options.headers}});
 if(!r.ok){const body=await r.text();throw Error(`Erro ${r.status}: ${body.slice(0,200)}`);}
 if(r.status===204||r.headers.get('content-length')==='0')return null;
 return r.json();
}
function showDashboard(on){$('login-panel').hidden=on;$('dashboard').hidden=!on;$('logout').hidden=!on;if(on)load();}
async function verifyAdmin(current){
 if(!current?.access_token||!current.user?.id)return false;
 const {data,error}=await db.from('altigames_admins').select('user_id').eq('user_id',current.user.id).limit(1);
 return !error&&Array.isArray(data)&&data.length===1;
}
async function applySession(current){
 session=current;admin=await verifyAdmin(current);
 showDashboard(admin);
 if(current&&!admin)feedback('login-error','Esta conta não tem permissão administrativa.',true);
 return admin;
}
async function login(e){
 e.preventDefault();const btn=$('login-form').querySelector('button[type=submit]');btn.disabled=true;feedback('login-error','Entrando...');
 try{
  const {data,error}=await db.auth.signInWithPassword({email:$('admin-email').value.trim(),password:$('admin-password').value});
  if(error)throw error;
  $('admin-password').value='';
  if(!(await applySession(data.session))){await db.auth.signOut();throw Error('Acesso negado: usuário não é administrador da AltiGames.');}
  feedback('login-error','');
 }catch(err){feedback('login-error',err.message||'Falha ao entrar.',true);}finally{btn.disabled=false;}
}
async function logout(){await db.auth.signOut();session=null;admin=false;showDashboard(false);reset();feedback('login-error','');}
async function load(){feedback('list-feedback','Carregando...');try{games=await request(`${api}?select=id,name,link,image_path,categories,sort_order,is_active,created_at&order=sort_order.asc,created_at.asc`);render();feedback('list-feedback','');}catch(e){feedback('list-feedback',e.message,true);}}
function render(){const list=$('games-list');list.replaceChildren();$('total-games').textContent=`${games.length} ${games.length===1?'JOGO':'JOGOS'}`;for(const g of games){const row=document.createElement('article');row.className='game-row';const img=document.createElement('img');if(validImage(g.image_path))img.src=g.image_path;img.alt=g.name;img.loading='lazy';const info=document.createElement('div');const title=document.createElement('h3');title.textContent=g.name;const meta=document.createElement('div');meta.className='meta';meta.textContent=`${g.is_active?'● Publicado':'○ Oculto'} · Ordem ${g.sort_order} · ${(g.categories||[]).join(', ')||'Sem categorias'}`;const url=document.createElement('p');url.textContent=g.link||'Link não cadastrado';const actions=document.createElement('div');actions.className='row-actions';const edit=document.createElement('button');edit.textContent='Editar';edit.addEventListener('click',()=>editGame(g.id));const del=document.createElement('button');del.textContent='Excluir';del.className='danger';del.addEventListener('click',()=>removeGame(g.id));actions.append(edit,del);info.append(title,meta,url,actions);row.append(img,info);list.append(row);}if(!games.length)list.textContent='Nenhum jogo cadastrado.';}
function reset(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}$('game-form').reset();$('game-id').value='';$('game-order').value='0';$('game-active').checked=true;$('form-title').textContent='Adicionar jogo';$('save').textContent='Salvar jogo →';$('cancel').hidden=true;$('image-preview').replaceChildren(document.createTextNode('Prévia do banner'));feedback('form-feedback','');}
function editGame(id){const g=games.find(g=>g.id===id);if(!g)return;$('game-id').value=g.id;$('game-name').value=g.name;$('game-link').value=g.link||'';$('game-image').value=g.image_path||'';$('game-image-file').value='';$('game-categories').value=(g.categories||[]).join(', ');$('game-order').value=g.sort_order;$('game-active').checked=g.is_active;$('form-title').textContent='Editar jogo';$('save').textContent='Salvar alterações →';$('cancel').hidden=false;preview();$('game-form').scrollIntoView({behavior:'smooth',block:'center'});}
function preview(){const file=$('game-image-file').files[0],box=$('image-preview');box.replaceChildren();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}let src=$('game-image').value.trim();if(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){box.textContent='Use PNG, JPG ou WebP de até 5 MB';return;}previewUrl=URL.createObjectURL(file);src=previewUrl;}if(src&&(file||validImage(src))){const img=document.createElement('img');img.src=src;img.alt='Prévia do banner';img.onerror=()=>box.replaceChildren(document.createTextNode('Não foi possível carregar a imagem'));box.append(img);}else box.textContent='Prévia do banner';}
async function uploadImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size===0||file.size>5*1024*1024)throw Error('Selecione PNG, JPG ou WebP de até 5 MB.');
 if(!session?.access_token)throw Error('Sessão expirada. Faça login novamente.');
 const form=new FormData();form.append('game','portfolio');form.append('file',file);
 const r=await fetch(`${mediaApi}/upload`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`},body:form});
 const data=await r.json().catch(()=>({}));if(!r.ok||!data.success||!validImage(data.url))throw Error(data.error||`Falha no upload para o R2 (${r.status}).`);
 return data;
}
async function deleteUploaded(key){
 if(!/^portfolio\/games\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$/i.test(key))return;
 try{await fetch(`${mediaApi}/file?key=${encodeURIComponent(key)}`,{method:'DELETE',headers:{Authorization:`Bearer ${session.access_token}`}});}catch(error){console.warn('Não foi possível limpar um upload não utilizado.',error);}
}
async function save(e){e.preventDefault();const id=$('game-id').value;const file=$('game-image-file').files[0];const data={name:$('game-name').value.trim(),link:$('game-link').value.trim(),image_path:$('game-image').value.trim(),categories:[...new Set($('game-categories').value.split(',').map(s=>s.trim()).filter(Boolean))],sort_order:Number($('game-order').value)||0,is_active:$('game-active').checked};if(!data.name||(!file&&!validImage(data.image_path))||!validLink(data.link)){feedback('form-feedback','Verifique nome, imagem e link HTTPS.',true);return;}if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)){feedback('form-feedback','Imagem inválida ou maior que 5 MB.',true);return;}const btn=$('save');btn.disabled=true;feedback('form-feedback',file?'Enviando imagem...':'Salvando...');let uploaded=null;try{if(file){uploaded=await uploadImage(file);data.image_path=uploaded.url;}feedback('form-feedback','Salvando jogo...');await request(id?`${api}?id=eq.${encodeURIComponent(id)}`:api,{method:id?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(data)});reset();await load();feedback('form-feedback','Jogo salvo com sucesso!');}catch(err){if(uploaded)await deleteUploaded(uploaded.key);feedback('form-feedback',err.message,true);}finally{btn.disabled=false;}}
async function removeGame(id){const g=games.find(g=>g.id===id);if(!g||!confirm(`Excluir "${g.name}" do catálogo? Essa ação não pode ser desfeita.`))return;try{await request(`${api}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});if($('game-id').value===id)reset();await load();feedback('list-feedback','Jogo excluído. A imagem no R2 foi preservada.');}catch(e){feedback('list-feedback',e.message,true);}}
$('login-form').addEventListener('submit',login);$('game-form').addEventListener('submit',save);$('game-image-file').addEventListener('change',preview);$('cancel').addEventListener('click',reset);$('refresh').addEventListener('click',load);$('logout').addEventListener('click',logout);
db.auth.getSession().then(async({data,error})=>{if(error)throw error;if(data?.session)await applySession(data.session);}).catch(err=>feedback('login-error',err.message,true));
})();
