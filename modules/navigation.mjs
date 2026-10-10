export function mountNavigation(root){
 if(!root)return;
 const doc=root.ownerDocument;
 root.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{root.open=false}));
 doc.addEventListener('pointerdown',event=>{if(root.open&&!root.contains(event.target))root.open=false});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.open){root.open=false;root.querySelector('summary').focus()}});
}
