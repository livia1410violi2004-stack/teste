(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem('ln_'+k))??d}catch{return d}};
const write=(k,v)=>localStorage.setItem('ln_'+k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getCurrent=()=>{const id=new URLSearchParams(location.search).get('id')||'python';return {id,all:read('communities',[])}};
function applyCommunity(c){
 const root=$('#detailRoot'); if(!root||!c)return;
 const style=document.documentElement.style;
 const defaults={accent:'#8b5cf6',bannerBg:'#171a25',panelBg:'#080c18',button:'#8b5cf6',text:'#e9eef7',bannerText:'#f5f2ff',border:'#34384b'};
 const v={...defaults,...(c.design||{}),accent:c.color||c.design?.accent||defaults.accent};
 style.setProperty('--community-accent',v.accent);style.setProperty('--community-accent-soft',v.accent+'33');
 style.setProperty('--community-banner-bg',v.bannerBg);style.setProperty('--community-panel-bg',v.panelBg);
 style.setProperty('--community-button',v.button);style.setProperty('--community-text',v.text);
 style.setProperty('--community-banner-text',v.bannerText);style.setProperty('--community-border',v.border);
 if(c.cover){style.setProperty('--community-banner-image',`linear-gradient(90deg,rgba(4,6,15,.58),rgba(4,6,15,.12)),url("${c.cover}")`)}else style.setProperty('--community-banner-image','');
 document.body.style.backgroundColor=c.pageBgColor||'#080b16';
 if(c.pageBackground)document.body.style.backgroundImage=`linear-gradient(rgba(4,6,15,.72),rgba(4,6,15,.86)),url("${c.pageBackground}")`;
 else document.body.style.backgroundImage='';
}
function fileAsData(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');if(file.size>700*1024)return reject(Error('Escolha uma imagem de até 700 KB para garantir que fique salva no navegador.'));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function addCustomizer(){
 const modal=$('#customizeModal'),form=$('#customizeForm');if(!modal||!form)return;
 const grid=document.createElement('div');grid.className='ln-customizer-grid';grid.id='lnAdvancedCustomization';
 grid.innerHTML=`
 <div class="ln-field"><label for="lnAccent">Cor principal</label><input id="lnAccent" type="color" value="#8b5cf6"></div>
 <div class="ln-field"><label for="lnButton">Cor dos botões</label><input id="lnButton" type="color" value="#8b5cf6"></div>
 <div class="ln-field"><label for="lnBannerBg">Fundo da capa</label><input id="lnBannerBg" type="color" value="#171a25"></div>
 <div class="ln-field"><label for="lnPanelBg">Fundo dos painéis</label><input id="lnPanelBg" type="color" value="#080c18"></div>
 <div class="ln-field"><label for="lnText">Cor dos textos</label><input id="lnText" type="color" value="#e9eef7"></div>
 <div class="ln-field"><label for="lnBannerText">Texto da capa</label><input id="lnBannerText" type="color" value="#f5f2ff"></div>
 <div class="ln-field"><label for="lnBorder">Cor das bordas</label><input id="lnBorder" type="color" value="#34384b"></div>
 <div class="ln-field"><label for="lnCover">Foto de capa (até 700 KB)</label><input id="lnCover" type="file" accept="image/*"></div>
 <div class="ln-field"><label for="lnPageBg">Imagem de fundo da página (até 700 KB)</label><input id="lnPageBg" type="file" accept="image/*"></div>
 <div class="ln-field"><label for="lnPageBgColor">Cor de fundo da página</label><input id="lnPageBgColor" type="color" value="#080b16"></div>
 <div class="ln-field"><label for="lnBorderColor">Cor dos detalhes/realces</label><input id="lnBorderColor" type="color" value="#8b5cf6"></div>
 <div class="ln-field"><label for="lnMoveWidgets">Organização dos widgets</label><p class="ln-notice">Depois de salvar, use os controles ↕ Mover nas caixas da comunidade para arrastá-las e reorganizar.</p></div>`;
 form.querySelector('.ln-setting-grid')?.after(grid);
 const privacy=form.querySelector('#editPrivacy')?.closest('.ln-setting-grid');
 if(privacy)privacy.after(grid);
 const oldOpen=window.openCustomize;
 $('#customizeCommunity')?.addEventListener('click',()=>fill(),{capture:true});
 function fill(){
   const {id,all}=getCurrent(),c=all.find(x=>x.id===id);if(!c)return;
   const d={accent:c.color||'#8b5cf6',bannerBg:'#171a25',panelBg:'#080c18',button:c.color||'#8b5cf6',text:'#e9eef7',bannerText:'#f5f2ff',border:'#34384b',...(c.design||{})};
   Object.entries({lnAccent:d.accent,lnButton:d.button,lnBannerBg:d.bannerBg,lnPanelBg:d.panelBg,lnText:d.text,lnBannerText:d.bannerText,lnBorder:d.border,lnPageBgColor:c.pageBgColor||'#080b16',lnBorderColor:d.accent}).forEach(([id,v])=>{const el=$('#'+id);if(el)el.value=v});
 }
 const originalSubmit=()=>{};
 form.addEventListener('submit',async e=>{
   e.preventDefault();e.stopImmediatePropagation();
   const {id,all}=getCurrent(),c=all.find(x=>x.id===id);if(!c)return;
   const privacy=$('#editPrivacy').value,password=$('#editPassword').value;
   if(privacy==='private'&&password&&password.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}
   if(privacy==='private'&&!password&&!c.password){alert('Defina uma senha com pelo menos 4 caracteres para ativar o acesso privado.');return}
   try{
    const cover=await fileAsData($('#lnCover').files[0]),pageBg=await fileAsData($('#lnPageBg').files[0]);
    c.name=$('#editName').value.trim();c.desc=$('#editDesc').value.trim();c.theme=$('#editTheme').value;c.privacy=privacy;
    if(password)c.password=password;if(privacy==='public')c.password='';
    c.color=$('#lnAccent').value;
    c.design={accent:$('#lnAccent').value,button:$('#lnButton').value,bannerBg:$('#lnBannerBg').value,panelBg:$('#lnPanelBg').value,text:$('#lnText').value,bannerText:$('#lnBannerText').value,border:$('#lnBorder').value};
    c.pageBgColor=$('#lnPageBgColor').value;
    if(cover)c.cover=cover;if(pageBg)c.pageBackground=pageBg;
    write('communities',all);modal.classList.remove('open');applyCommunity(c);
    // Re-render using the existing app, preserving its original navigation/menu.
    $('#detailRoot').dispatchEvent(new CustomEvent('ln:refresh'));
    location.reload();
   }catch(err){alert(err.message||'Não foi possível salvar as imagens.')}
 },true);
}
function enableWidgetMoving(){
 const root=$('#detailRoot');if(!root)return;
 const {id,all}=getCurrent(),c=all.find(x=>x.id===id);if(!c)return;
 const holder=$('#communitySection');if(!holder)return;
 // Restore saved order among movable cards within each shared parent.
 const order=read('widgetOrder_'+id,{});
 function decorate(){
   $$('.ln-panel,.ln-feature-grid>article,.ln-award-grid>article,.ln-community-meta',root).forEach((el,i)=>{
     if(el.closest('#customizeModal'))return;
     if(el.dataset.moveReady)return;el.dataset.moveReady='1';el.classList.add('ln-widget-move');el.draggable=true;
     const key=el.dataset.widgetKey||(el.dataset.widgetKey='w'+i);
     const handle=document.createElement('button');handle.type='button';handle.className='ln-move-handle';handle.textContent='↕ Mover';handle.title='Arraste para reorganizar';
     handle.addEventListener('mousedown',()=>el.draggable=true);el.prepend(handle);
     el.addEventListener('dragstart',e=>{el.classList.add('ln-dragging');e.dataTransfer.setData('text/plain',key);e.dataTransfer.effectAllowed='move'});
     el.addEventListener('dragend',()=>{$$('.ln-dragging, .ln-drop-target',root).forEach(x=>x.classList.remove('ln-dragging','ln-drop-target'));persist()});
     el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('ln-drop-target');e.dataTransfer.dropEffect='move'});
     el.addEventListener('dragleave',()=>el.classList.remove('ln-drop-target'));
     el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('ln-drop-target');const dragged=$('.ln-dragging',root);if(dragged&&dragged!==el&&dragged.parentElement===el.parentElement){const rect=el.getBoundingClientRect();el.parentElement.insertBefore(dragged,e.clientY>rect.top+rect.height/2?el.nextSibling:el);persist()}});
   });
 }
 function persist(){const parents=new Set($$('.ln-widget-move',root).map(x=>x.parentElement));const result={};parents.forEach((p,i)=>result['parent'+i]=$$('.ln-widget-move',p).map(x=>x.dataset.widgetKey));write('widgetOrder_'+id,result)}
 const observer=new MutationObserver(()=>decorate());observer.observe(root,{childList:true,subtree:true});decorate();
}
function init(){const {id,all}=getCurrent(),c=all.find(x=>x.id===id);if(c)applyCommunity(c);addCustomizer();enableWidgetMoving();}
document.addEventListener('DOMContentLoaded',init);
})();