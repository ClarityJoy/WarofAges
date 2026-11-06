'use strict';
/* ================= MATERIALS / GEOMETRY ================= */
const matC={}, geoC={};
function M(c){ if(c&&c.isMaterial) return c; return matC[c]||(matC[c]=new THREE.MeshLambertMaterial({color:c})); }
function MG(c){ const k='g'+c; return matC[k]||(matC[k]=new THREE.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:.9})); }
const CHAR=new THREE.MeshLambertMaterial({color:0x1d1b19});
function BG(w,h,d){const k='b'+w+'_'+h+'_'+d; return geoC[k]||(geoC[k]=new THREE.BoxGeometry(w,h,d));}
function CG(r,h,s,r2){const k='c'+r+'_'+h+'_'+(s||10)+'_'+(r2||r); return geoC[k]||(geoC[k]=new THREE.CylinderGeometry(r2||r,r,h,s||10));}
function KG(r,h,s){const k='k'+r+'_'+h+'_'+(s||8); return geoC[k]||(geoC[k]=new THREE.ConeGeometry(r,h,s||8));}
function SG(r){const k='s'+r; return geoC[k]||(geoC[k]=new THREE.SphereGeometry(r,12,9));}
function mesh(geo,c,x,y,z,p){const m=new THREE.Mesh(geo,M(c)); m.position.set(x||0,y||0,z||0); m.castShadow=true; if(p)p.add(m); return m;}
function bx(w,h,d,c,x,y,z,p){return mesh(BG(w,h,d),c,x,y,z,p);}
function cylY(r,h,c,p,x,y,z,s){return mesh(CG(r,h,s),c,x,y,z,p);}
function cylZ(r,h,c,p,x,y,z,s){const m=cylY(r,h,c,p,x,y,z,s); m.rotation.x=Math.PI/2; return m;}
function cylX(r,h,c,p,x,y,z,s){const m=cylY(r,h,c,p,x,y,z,s||14); m.rotation.z=Math.PI/2; return m;}
function grp(p,x,y,z){const g=new THREE.Group(); g.position.set(x||0,y||0,z||0); if(p)p.add(g); return g;}

/* ---------- patterned skins: each pattern is drawn once on a small canvas and reused ---------- */
const skinTexC={}, skinMatC={};
const hexs=c=>'#'+c.toString(16).padStart(6,'0');
function skinCanvas(sk){
  if(skinTexC[sk.id]) return skinTexC[sk.id];
  const N=64, cv=document.createElement('canvas'); cv.width=cv.height=N; const x=cv.getContext('2d'), C=sk.cols.map(hexs);
  let em=null;   // a second canvas for parts that glow in the dark
  const rnd=(()=>{ let a=0; for(const ch of sk.id) a=(a*31+ch.charCodeAt(0))>>>0; return ()=>{ a=(a*1664525+1013904223)>>>0; return a/4294967296; }; })();
  const blob=(c,n,r0,r1)=>{ x.fillStyle=c; for(let i=0;i<n;i++){ const px=rnd()*N, py=rnd()*N, r=r0+rnd()*(r1-r0); x.beginPath(); for(let k=0;k<7;k++){ const a=k/7*6.283, rr=r*(.6+rnd()*.6); x.lineTo(px+Math.cos(a)*rr,py+Math.sin(a)*rr); } x.fill(); } };
  const emc=()=>{ em=document.createElement('canvas'); em.width=em.height=N; const e=em.getContext('2d'); e.fillStyle='#000'; e.fillRect(0,0,N,N); return e; };
  switch(sk.fx){
    case 'camo': x.fillStyle=C[0]; x.fillRect(0,0,N,N); blob(C[1],9,6,12); blob(C[2],7,5,10); blob(C[3],6,3,7); break;
    case 'pixcamo': x.fillStyle=C[0]; x.fillRect(0,0,N,N); for(let i=0;i<220;i++){ x.fillStyle=C[1+Math.floor(rnd()*3)]; const s=4*(1+Math.floor(rnd()*2)); x.fillRect(Math.floor(rnd()*16)*4,Math.floor(rnd()*16)*4,s,s); } break;
    case 'grad': { const g=x.createLinearGradient(0,0,0,N); C.forEach((c,i)=>g.addColorStop(i/(C.length-1),c)); x.fillStyle=g; x.fillRect(0,0,N,N); break; }
    case 'stripes': { const w=C.length>2?N/C.length:8; for(let i=0;i*w<N*2;i++){ x.fillStyle=C[i%C.length]; x.save(); x.translate(0,0); x.beginPath(); x.moveTo(i*w-N,0); x.lineTo(i*w-N+w,0); x.lineTo(i*w+w,N); x.lineTo(i*w,N); x.fill(); x.restore(); } break; }
    case 'tiger': x.fillStyle=C[0]; x.fillRect(0,0,N,N); x.fillStyle=C[1]; for(let i=0;i<7;i++){ const y=i*9+rnd()*4; x.beginPath(); x.moveTo(0,y); x.quadraticCurveTo(N*.3,y+6*(rnd()-.5),N*.55,y+2); x.lineTo(N*.55,y+3.5); x.quadraticCurveTo(N*.3,y+5,0,y+4); x.fill(); x.beginPath(); x.moveTo(N,y+4); x.quadraticCurveTo(N*.7,y+3,N*.45,y+5); x.lineTo(N*.45,y+6.5); x.quadraticCurveTo(N*.7,y+8,N,y+8); x.fill(); } break;
    case 'spots': x.fillStyle=C[0]; x.fillRect(0,0,N,N); for(let i=0;i<26;i++){ const px=rnd()*N, py=rnd()*N, r=2+rnd()*2.5; x.fillStyle=C[1]; x.beginPath(); x.arc(px,py,r+1.3,0,6.283); x.fill(); x.fillStyle=C[2]; x.beginPath(); x.arc(px,py,r*.6,0,6.283); x.fill(); } break;
    case 'carbon': for(let j=0;j<N;j+=4) for(let i=0;i<N;i+=4){ x.fillStyle=((i+j)/4)%2?C[0]:C[1]; x.fillRect(i,j,4,4); x.fillStyle='rgba(255,255,255,.06)'; x.fillRect(i,j,4,1); } break;
    case 'marble': x.fillStyle=C[0]; x.fillRect(0,0,N,N); x.strokeStyle=C[1]; for(let i=0;i<6;i++){ x.lineWidth=.4+rnd()*1.2; x.globalAlpha=.35+rnd()*.4; x.beginPath(); let px=rnd()*N, py=0; x.moveTo(px,py); while(py<N){ px+=(rnd()-.5)*10; py+=4+rnd()*6; x.lineTo(px,py); } x.stroke(); } x.globalAlpha=1; break;
    case 'checker': for(let j=0;j<4;j++) for(let i=0;i<4;i++){ x.fillStyle=C[(i+j*2)%C.length]; x.fillRect(i*16,j*16,16,16); } break;
    case 'toxic': { x.fillStyle=C[0]; x.fillRect(0,0,N,N); const e=emc(); for(let i=0;i<16;i++){ const px=rnd()*N, py=rnd()*N, r=1.5+rnd()*4; for(const g of [x,e]){ g.fillStyle=C[1]; g.beginPath(); g.arc(px,py,r,0,6.283); g.fill(); } } break; }
    case 'lava': { x.fillStyle=C[0]; x.fillRect(0,0,N,N); const e=emc(); for(const g of [x,e]){ g.strokeStyle=C[1]; g.lineCap='round'; } for(let i=0;i<9;i++){ let px=rnd()*N, py=rnd()*N; const w=.8+rnd()*1.8; for(const g of [x,e]){ g.lineWidth=w; g.beginPath(); g.moveTo(px,py); } for(let k=0;k<5;k++){ px+=(rnd()-.5)*18; py+=(rnd()-.5)*18; x.lineTo(px,py); e.lineTo(px,py); } x.stroke(); e.stroke(); } break; }
    case 'shadow': { x.fillStyle=C[0]; x.fillRect(0,0,N,N); const e=emc(); for(const g of [x,e]){ g.strokeStyle=C[1]; g.lineWidth=1; } for(let i=0;i<5;i++){ const y=8+i*12+rnd()*4; for(const g of [x,e]){ g.beginPath(); g.moveTo(0,y); g.lineTo(N*.3,y+3); g.lineTo(N*.6,y-2); g.lineTo(N,y+1); g.stroke(); } } break; }
    case 'galaxy': { const g=x.createRadialGradient(N*.4,N*.4,4,N*.5,N*.5,N*.7); g.addColorStop(0,C[1]); g.addColorStop(1,C[0]); x.fillStyle=g; x.fillRect(0,0,N,N); const e=emc(); for(let i=0;i<40;i++){ const px=rnd()*N, py=rnd()*N, s=rnd()<.15?1.6:.8; for(const c of [x,e]){ c.fillStyle=rnd()<.3?'#9fd8ff':'#ffffff'; c.fillRect(px,py,s,s); } } break; }
    case 'scales': x.fillStyle=C[1]; x.fillRect(0,0,N,N); for(let j=0;j<9;j++) for(let i=0;i<9;i++){ const px=i*8+(j%2)*4, py=j*8; const g=x.createRadialGradient(px,py+2,1,px,py+3,6); g.addColorStop(0,'#d24a3a'); g.addColorStop(1,C[0]); x.fillStyle=g; x.beginPath(); x.arc(px,py+3,4.6,0,3.1416); x.fill(); } break;
    case 'circuit': { x.fillStyle=C[0]; x.fillRect(0,0,N,N); const e=emc(); for(const g of [x,e]){ g.strokeStyle=C[1]; g.fillStyle=C[1]; g.lineWidth=1; } for(let i=0;i<10;i++){ let px=Math.floor(rnd()*8)*8, py=Math.floor(rnd()*8)*8; for(const g of [x,e]){ g.beginPath(); g.moveTo(px,py); } for(let k=0;k<3;k++){ if(rnd()<.5) px+=8*(rnd()<.5?-1:1); else py+=8*(rnd()<.5?-1:1); x.lineTo(px,py); e.lineTo(px,py); } x.stroke(); e.stroke(); for(const g of [x,e]) g.fillRect(px-1.5,py-1.5,3,3); } break; }
    default: x.fillStyle=C[0]; x.fillRect(0,0,N,N);
  }
  return skinTexC[sk.id]={cv,em};
}
function skinMat(sk,part){
  const k=sk.id+part; if(skinMatC[k]) return skinMatC[k];
  const base=sk.cols[0]; let m;
  if(sk.fx==='metal') m=new THREE.MeshPhongMaterial({color:base,specular:0x8a8a8a,shininess:part==='veh'?45:35,emissive:base,emissiveIntensity:.05});
  else if(sk.fx==='crystal') m=new THREE.MeshPhongMaterial({color:base,specular:0xffffff,shininess:110,transparent:true,opacity:.78,emissive:base,emissiveIntensity:.45});
  else if(sk.fx==='ghost') m=new THREE.MeshLambertMaterial({color:base,transparent:true,opacity:.45,emissive:0x9fc6ff,emissiveIntensity:.35,depthWrite:false});
  else { const {cv,em}=skinCanvas(sk), t=new THREE.CanvasTexture(cv); t.magFilter=THREE.NearestFilter; if(part==='veh'){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,2); }
    const o={map:t}; if(em){ const e=new THREE.CanvasTexture(em); e.magFilter=THREE.NearestFilter; if(part==='veh'){ e.wrapS=e.wrapT=THREE.RepeatWrapping; e.repeat.set(2,2); } o.emissive=0xffffff; o.emissiveMap=e; o.emissiveIntensity=1; }
    m=new THREE.MeshLambertMaterial(o); }
  return skinMatC[k]=m;
}
// a CSS background that previews a skin in the menu
function skinPreviewCSS(sk,part){
  const hx=hexs;
  if(!sk.fx){ const c=part==='veh'?(sk.veh!=null?sk.veh:TEAMS.blue.veh):(sk.uni!=null?sk.uni:TEAMS.blue.main); return hx(c)+(sk.glow?';box-shadow:0 0 12px '+hx(c)+' inset':''); }
  if(sk.fx==='metal') return `linear-gradient(135deg,${hx(sk.cols[0])},#ffffff 45%,${hx(sk.cols[0])} 60%,#333)`;
  if(sk.fx==='crystal') return `linear-gradient(135deg,${hx(sk.cols[0])}cc,#ffffffdd 40%,${hx(sk.cols[0])}99 70%,#ffffff)`;
  if(sk.fx==='ghost') return `radial-gradient(circle,#ffffffaa,${hx(sk.cols[0])}55)`;
  return `url(${skinCanvas(sk).cv.toDataURL()}) center/${part==='veh'?'50%':'100%'}`;
}
function teamColors(team,skinId){
  const T=TEAMS[team], sk=SKINS.find(s=>s.id===skinId)||SKINS[0];
  if(sk.fx) return {main:T.main,dark:T.dark,uni:skinMat(sk,'uni'),veh:skinMat(sk,'veh'),glow:false};
  const uni=sk.uni!=null?(sk.glow?MG(sk.uni):sk.uni):T.main;
  const veh=sk.veh!=null?(sk.glow?MG(sk.veh):sk.veh):T.veh;
  return {main:T.main,dark:T.dark,uni,veh,glow:!!sk.glow};
}
const SKIN_TONE=0xe2b68c, METAL=0xa9afb6, WOOD=0x7a5530, DARKG=0x222222;

/* ================= INFANTRY ================= */
function buildInf(d,C){
  const L=d.look||{}, g=new THREE.Group(), body=grp(g);
  const legC=L.bare?SKIN_TONE:0x3d4230, legs=[];
  for(const s of [-1,1]){const p=grp(body,.16*s,.86,0); bx(.24,.86,.28,legC,0,-.43,0,p); legs.push(p);}
  const tc=L.torso||(L.bare?0xc99a6c:C.uni);
  bx(.64,.74,.4,tc,0,1.23,0,body);
  const arms=[]; for(const s of [1,-1]){const a=grp(body,.4*s,1.5,.1); bx(.18,.6,.2,L.bare?SKIN_TONE:tc,0,-.3,0,a); arms.push(a);}
  if(L.bare) bx(.66,.3,.42,C.uni,0,.95,0,body); // loincloth in uniform colour
  if(!L.civ) bx(.66,.1,.42,C.main,0,1.5,0,body); // team band across shoulders
  const skin=L.alien?0x7fd36a:SKIN_TONE;
  if(L.alien){bx(.5,.5,.46,skin,0,1.86,0,body); bx(.14,.1,.03,0x111111,.11,1.88,.24,body); bx(.14,.1,.03,0x111111,-.11,1.88,.24,body);}
  else bx(.34,.34,.34,SKIN_TONE,0,1.79,0,body);
  switch(L.h){
    case 'helmet': bx(.44,.2,.46,C.main,0,1.96,0,body); break;
    case 'fur': bx(.44,.16,.46,0x7a5530,0,1.96,0,body); bx(.46,.06,.48,C.main,0,1.9,0,body); break;
    case 'band': bx(.36,.1,.36,0x3a2a1a,0,1.98,0,body); bx(.38,.07,.38,C.main,0,1.88,0,body); break;
    case 'hood': bx(.42,.28,.44,C.dark,0,1.9,-.03,body); bx(.44,.06,.46,C.main,0,2.02,0,body); break;
    case 'roman': bx(.44,.2,.46,METAL,0,1.96,0,body); bx(.07,.2,.42,C.main,0,2.14,0,body); break;
    case 'kettle': bx(.62,.05,.62,METAL,0,1.92,0,body); bx(.4,.17,.4,METAL,0,2.02,0,body); bx(.42,.05,.42,C.main,0,1.95,0,body); break;
    case 'knight': bx(.42,.46,.44,0xb7bcc2,0,1.82,0,body); bx(.3,.04,.02,DARKG,0,1.86,.23,body); bx(.08,.3,.3,C.main,0,2.15,-.05,body); break;
    case 'tricorn': bx(.56,.12,.5,0x1a1a1a,0,2.0,0,body); bx(.1,.1,.04,C.main,.18,2.02,.26,body); break;
    case 'brodie': bx(.6,.04,.6,0x55603a,0,1.94,0,body); bx(.4,.14,.4,0x55603a,0,2.0,0,body); bx(.42,.04,.42,C.main,0,1.97,0,body); break;
    case 'gasmask': bx(.44,.2,.46,C.main,0,1.96,0,body); bx(.24,.2,.12,0x444444,0,1.74,.2,body); break;
    case 'beret': bx(.42,.08,.44,C.main,.03,1.98,0,body); break;
    case 'cap': bx(.44,.1,.46,0x222222,0,1.99,0,body); bx(.3,.03,.18,0x222222,0,1.95,.28,body); bx(.1,.08,.02,C.main,0,2.0,.24,body); break;
    case 'visorM': bx(.44,.22,.46,0x2d3238,0,1.96,0,body); bx(.36,.12,.03,0x8fb2c8,0,1.8,.18,body); bx(.45,.05,.47,C.main,0,1.9,0,body); break;
    case 'horned': bx(.44,.2,.46,METAL,0,1.96,0,body); bx(.07,.3,.07,0xeee6d0,.26,2.1,0,body).rotation.z=-.5; bx(.07,.3,.07,0xeee6d0,-.26,2.1,0,body).rotation.z=.5; bx(.46,.05,.48,C.main,0,1.88,0,body); break;
    case 'kabuto': bx(.5,.18,.5,0x2a2a2a,0,1.98,0,body); bx(.66,.05,.5,0x2a2a2a,0,1.9,-.05,body); bx(.3,.18,.04,0xd4b04a,0,2.12,.2,body); bx(.48,.06,.5,C.main,0,1.92,0,body); break;
    case 'ninja': bx(.38,.38,.38,0x1a1a1a,0,1.8,0,body); bx(.3,.06,.02,SKIN_TONE,0,1.83,.2,body); bx(.4,.06,.4,C.main,0,1.98,0,body); break;
    case 'shako': bx(.36,.36,.36,0x1a1a1a,0,2.08,0,body); bx(.38,.06,.38,C.main,0,1.95,0,body); bx(.06,.2,.06,0xd4b04a,0,2.34,.12,body); break;
    case 'space': {const h=mesh(SG(.32),0xe8eef4,0,1.84,0,body); bx(.4,.2,.05,MG(0xffb040),0,1.86,.28,body); bx(.5,.06,.5,C.main,0,1.6,0,body); break;}
    case 'alien': bx(.52,.06,.48,C.main,0,2.12,0,body); break;
    case 'visor': bx(.46,.44,.48,0xdfe6ee,0,1.86,0,body); bx(.38,.1,.03,MG(0x33e0ff),0,1.84,.24,body); bx(.48,.05,.5,C.main,0,2.0,0,body); break;
    case 'civ': bx(.36,.1,.36,L.hair||0x3a2a1a,0,1.98,0,body); break;
    case 'chief': bx(.44,.12,.46,0x7a5530,0,1.95,0,body); for(let i=0;i<7;i++){const f=bx(.07,.5,.03,[0xd9534f,0xf0ad4e,0xffffff,C.main][i%4],(i-3)*.07,2.2,-.12,body); f.rotation.z=(i-3)*.18;} break;
    case 'crown': bx(.4,.14,.42,0xd4a72c,0,2.0,0,body); for(const [x,z] of [[.16,.16],[-.16,.16],[.16,-.16],[-.16,-.16],[0,.18]]) bx(.07,.14,.07,0xd4a72c,x,2.13,z,body); bx(.06,.06,.03,0xdd2222,0,2.0,.22,body); break;
    default: bx(.36,.1,.36,0x3a2a1a,0,1.98,0,body);
  }
  if(L.cross){bx(.28,.08,.02,0xdd2222,0,1.3,.21,body); bx(.08,.28,.02,0xdd2222,0,1.3,.21,body);}
  if(L.cape) bx(.6,1.0,.05,C.main,0,1.15,-.24,body);
  if(L.flag){bx(.05,1.5,.05,0x555555,-.25,1.9,-.28,body); bx(.03,.42,.62,C.main,-.25,2.45,-.6,body);}
  if(L.pk==='jet'){bx(.5,.6,.25,0x555a62,0,1.25,-.32,body); cylY(.1,.3,MG(0xff8a2a),body,.15,.85,-.35); cylY(.1,.3,MG(0xff8a2a),body,-.15,.85,-.35);}
  if(L.pk==='flame'){cylY(.15,.8,0xb04a1a,body,-.13,1.25,-.32); cylY(.15,.8,0xb04a1a,body,.13,1.25,-.32);}
  const gun=grp(body,.24,1.18,.3), tip=new THREE.Object3D(); gun.add(tip);
  addWeapon(L.g,gun,tip,body,C);
  switch(L.sh){
    case 'round': {const s=cylZ(.42,.08,C.main,body,-.42,1.15,.32,14); bx(.12,.12,.06,METAL,-.42,1.15,.37,body); break;}
    case 'tower': bx(.8,1.3,.1,C.main,-.1,1.05,.55,body); bx(.18,.18,.06,0xd4b04a,-.1,1.1,.62,body); break;
    case 'kite': bx(.62,1.0,.08,C.main,-.4,1.05,.38,body); bx(.06,.8,.02,0xf0f0f0,-.4,1.1,.43,body); bx(.4,.06,.02,0xf0f0f0,-.4,1.25,.43,body); break;
    case 'riot': bx(.95,1.45,.1,0x8d949c,-.05,1.0,.56,body); bx(.5,.12,.02,0x2a2f35,-.05,1.45,.62,body); break;
    case 'energy': {const m=new THREE.Mesh(BG(1.3,1.8,.06),new THREE.MeshBasicMaterial({color:0x55ddff,transparent:true,opacity:.35,depthWrite:false})); m.position.set(0,1.1,.7); body.add(m); bx(.2,.2,.2,MG(0x55ddff),.3,1.0,.35,body); break;}
  }
  if(L.mortar){const mt=grp(body,0,0,.95); bx(.55,.06,.55,0x333333,0,.03,0,mt); const tube=grp(mt); tube.rotation.x=Math.PI/4; cylY(.12,1.15,0x3d4a2a,tube,0,.57,0); tube.add(tip); tip.position.set(0,1.15,0);}
  return {g,body,legs,arms,legMode:2,gun,tip};
}
function addWeapon(w,gun,tip,body,C){
  switch(w){
    case 'club': {const c=bx(.14,.14,.85,WOOD,0,.1,.25,gun); c.rotation.x=-.5; tip.position.set(0,.3,.6); break;}
    case 'spear': bx(.05,.05,2.4,WOOD,0,0,.4,gun); {const k=mesh(KG(.08,.3,6),METAL,0,0,1.75,gun); k.rotation.x=Math.PI/2;} tip.position.set(0,0,1.8); break;
    case 'axe': bx(.06,.06,1.0,WOOD,0,.1,.3,gun); bx(.04,.35,.3,0xb7bcc2,0,.18,.75,gun); tip.position.set(0,.2,.8); break;
    case 'katana': {const b=bx(.04,.07,1.05,0xe8ecf0,0,.15,.5,gun); bx(.12,.12,.06,0xd4b04a,0,.12,0,gun); b.rotation.x=-.3; tip.position.set(0,.4,.9); break;}
    case 'pike': bx(.05,.05,4,WOOD,0,.2,.9,gun); {const k=mesh(KG(.08,.35,6),METAL,0,.2,2.95,gun); k.rotation.x=Math.PI/2;} tip.position.set(0,.2,3); break;
    case 'saber': {const b=bx(.05,.07,.95,0xe0e4e8,0,.15,.45,gun); b.rotation.x=-.4; tip.position.set(0,.35,.8); break;}
    case 'blade': {const b=bx(.08,.12,1.2,MG(0x33e0ff),0,.1,.55,gun); b.rotation.x=-.3; tip.position.set(0,.3,1); break;}
    case 'lance': gun.position.set(.3,1.3,.2); bx(.07,.07,3.2,0xd8d0c0,0,0,.9,gun); bx(.04,.3,.2,C.main,0,.1,1.6,gun); tip.position.set(0,0,2.5); break;
    case 'sling': bx(.05,.05,.4,0x6b4a2e,0,.1,.1,gun); tip.position.set(0,.2,.2); break;
    case 'bow': case 'longbow': {const s=w==='bow'?.55:.75; const t=new THREE.Mesh(new THREE.TorusGeometry(s,.03,4,12,Math.PI),M(WOOD)); t.rotation.set(0,Math.PI/2,Math.PI/2); t.position.set(0,0,.3); gun.add(t); bx(.01,s*2,.01,0xeeeeee,0,0,.3,gun); tip.position.set(0,0,.5); break;}
    case 'crossbow': bx(.1,.12,.8,WOOD,0,0,.25,gun); bx(.8,.06,.06,0x5a3d22,0,.04,.55,gun); tip.position.set(0,0,.7); break;
    case 'sword': {const b=bx(.07,.09,.95,0xd6dce2,0,.15,.45,gun); bx(.3,.06,.06,0x6b5a2a,0,.12,0,gun); b.rotation.x=-.25; tip.position.set(0,.3,.8); break;}
    case 'staff': bx(.06,1.7,.06,WOOD,0,.3,.1,gun); bx(.16,.16,.16,MG(0x66ff88),0,1.15,.1,gun); tip.position.set(0,1.1,.1); break;
    case 'musket': bx(.08,.1,1.4,0x5a3d22,0,0,.45,gun); cylZ(.03,1.0,0x333333,gun,0,.05,.65); tip.position.set(0,.05,1.15); break;
    case 'rifle': bx(.1,.14,.95,0x222222,0,0,.3,gun); tip.position.set(0,0,.8); break;
    case 'mg': bx(.16,.2,1.15,0x1a1a1a,0,0,.35,gun); bx(.22,.22,.26,0x4b4b2a,0,-.18,.1,gun); tip.position.set(0,0,.95); break;
    case 'hmg': bx(.18,.22,1.3,0x1a1a1a,0,0,.4,gun); cylZ(.07,.8,0x333333,gun,0,0,.9); bx(.3,.4,.3,0x4b4b2a,0,-.2,.05,gun); tip.position.set(0,0,1.3); break;
    case 'sniper': bx(.08,.1,1.55,0x2a2a22,0,0,.5,gun); bx(.07,.08,.42,0x111111,0,.11,.35,gun); tip.position.set(0,0,1.3); break;
    case 'rocket': gun.position.set(.3,1.62,.05); cylZ(.13,1.5,0x4f5a33,gun,0,0,.1); tip.position.set(0,0,.9); break;
    case 'grenade': bx(.16,.2,.7,0x2b2b2b,0,0,.2,gun); cylZ(.1,.3,0x333333,gun,0,0,.6); tip.position.set(0,0,.75); break;
    case 'flame': bx(.1,.12,.9,0x333333,0,0,.3,gun); tip.position.set(0,0,.8); break;
    case 'pistol': bx(.08,.12,.35,0x222222,0,0,.12,gun); tip.position.set(0,0,.3); break;
    case 'knife': bx(.04,.06,.42,0xcfcfcf,0,0,.16,gun); tip.position.set(0,0,.3); break;
    case 'laser': bx(.12,.16,.9,0xe8edf2,0,0,.3,gun); bx(.04,.04,.7,MG(0x33e0ff),.07,0,.3,gun); tip.position.set(0,0,.8); break;
    case 'plasma': bx(.2,.24,.85,0x3a3550,0,0,.28,gun); cylZ(.1,.4,MG(0xc050ff),gun,0,0,.7); tip.position.set(0,0,.9); break;
    case 'rail': bx(.1,.12,1.7,0xcfd6de,0,0,.55,gun); for(let i=0;i<4;i++) cylZ(.09,.08,MG(0x4aa8ff),gun,0,0,.3+i*.3); tip.position.set(0,0,1.4); break;
    default: tip.position.set(0,0,.2);
  }
}
/* ================= ANIMALS & MACHINES ================= */
function buildHorse(p,C,z,col){
  const h=grp(p,0,0,z||0), legs=[], hc=col||0x6b4a2e, hd=col?0xe2ded6:0x5e4027;
  bx(.9,.9,2.1,hc,0,1.35,0,h);
  const nk=bx(.45,.9,.5,hc,0,1.85,.95,h); nk.rotation.x=-.5;
  bx(.4,.42,.8,hd,0,2.25,1.35,h); bx(.1,.6,.2,0x2a1e14,0,1.5,-1.1,h);
  bx(.95,.14,.8,C.main,0,1.83,-.05,h);
  for(const [x,zz] of [[.3,.75],[-.3,.75],[.3,-.75],[-.3,-.75]]){const lg=grp(h,x,1.0,zz); bx(.2,1.0,.2,hd,0,-.5,0,lg); legs.push(lg);}
  return {h,legs};
}
function buildRider(d,C){
  const g=new THREE.Group(), body=grp(g), hr=buildHorse(body,C,0,(d.look||{}).horse);
  const rider=buildInf(d,C); rider.g.position.y=1.0; body.add(rider.g);
  rider.legs[0].rotation.z=.5; rider.legs[1].rotation.z=-.5;
  return {g,body,legs:hr.legs,legMode:4,gun:rider.gun,tip:rider.tip};
}
function buildChariot(d,C){
  const g=new THREE.Group(), body=grp(g);
  bx(1.4,.25,1.3,WOOD,0,.85,0,body); bx(1.4,.6,.1,C.uni,0,1.25,.6,body); bx(.1,.6,1.3,C.uni,.7,1.25,0,body); bx(.1,.6,1.3,C.uni,-.7,1.25,0,body);
  cylX(.7,.15,0x4a3520,body,.85,.7,0,12); cylX(.7,.15,0x4a3520,body,-.85,.7,0,12);
  bx(.08,.08,1.6,WOOD,0,.95,1.3,body);
  const hr=buildHorse(body,C,2.6);
  const a=buildInf({look:{h:'hood',g:'bow'}},C); a.g.position.set(0,.95,-.1); body.add(a.g);
  return {g,body,legs:hr.legs,legMode:4,gun:a.gun,tip:a.tip};
}
function buildCatapult(d,C){
  const g=new THREE.Group(), body=grp(g);
  for(const s of [-1,1]){bx(.2,.3,2.6,WOOD,s*.65,.5,0,body); cylX(.42,.15,0x4a3520,body,s*.85,.42,.9); cylX(.42,.15,0x4a3520,body,s*.85,.42,-.9); bx(.18,1.2,.18,WOOD,s*.5,1.2,.2,body);}
  bx(1.3,.15,.2,WOOD,0,.55,.9,body); bx(1.3,.2,.2,C.uni,0,1.75,.2,body);
  const arm=grp(body,0,.9,-.6); arm.rotation.x=-1.1;
  bx(.14,.14,2.6,WOOD,0,0,1.2,arm); bx(.5,.18,.5,0x4a3520,0,.12,2.4,arm);
  const tip=new THREE.Object3D(); tip.position.set(0,.4,2.4); arm.add(tip);
  return {g,body,legs:null,gun:arm,tip,arm,armRest:-1.1};
}
function buildTrebuchet(d,C){
  const g=new THREE.Group(), body=grp(g);
  for(const s of [-1,1]){bx(.25,.3,4,WOOD,s*.9,.3,0,body); const u=bx(.25,4.2,.25,WOOD,s*.75,2.3,0,body); bx(.25,3,.25,WOOD,s*.75,1.6,1.2,body).rotation.x=-.45; cylX(.45,.15,0x4a3520,body,s*1.1,.45,1.5); cylX(.45,.15,0x4a3520,body,s*1.1,.45,-1.5);}
  bx(1.9,.25,.25,WOOD,0,4.3,0,body); bx(1.9,.4,.1,C.uni,0,3.6,0,body);
  const arm=grp(body,0,4.3,0); arm.rotation.x=-.9;
  bx(.2,.2,6.4,WOOD,0,0,1.2,arm); bx(1.0,1.0,1.0,0x555555,0,-.4,-1.8,arm);
  const tip=new THREE.Object3D(); tip.position.set(0,0,4.3); arm.add(tip);
  return {g,body,legs:null,gun:arm,tip,arm,armRest:-.9};
}
function buildCannon(d,C){
  const g=new THREE.Group(), body=grp(g);
  bx(.5,.35,1.6,WOOD,0,.55,-.3,body); cylX(.6,.12,0x4a3520,body,.55,.6,0,14); cylX(.6,.12,0x4a3520,body,-.55,.6,0,14);
  bx(.52,.1,.4,C.uni,0,.8,-.6,body);
  const v=d.v, glow=v==='ion'?0x55ddff:v==='star'?0xffe066:0;
  const br=grp(body,0,.95,.2); br.rotation.x=v==='howitzer'||v==='ion'||v==='star'?-.45:v==='flak'?-.7:-.08;
  const bl=v==='howitzer'?3.2:v==='bombard'?1.6:v==='flak'?2.4:v==='ion'||v==='star'?2.6:2, rr=v==='bombard'?.42:v==='flak'?.12:.2;
  const bc=glow?0x30384a:0x2b2b2b;
  cylZ(rr,bl,bc,br,0,0,bl/2-.4,12); cylZ(rr+.06,.3,bc,br,0,0,-.3,12);
  if(v==='flak') cylZ(rr,bl,bc,br,.3,0,bl/2-.4,12);
  if(glow){ for(let i=0;i<4;i++) cylZ(rr+.08,.12,MG(glow),br,0,0,.2+i*.5,12); }
  const tip=new THREE.Object3D(); tip.position.set(0,0,bl-.3); br.add(tip);
  const crew=buildInf({look:{h:v==='bombard'?'kettle':v==='ion'||v==='star'?'visor':v==='bombard'?'kettle':'brodie',g:'none'}},C); crew.g.position.set(.9,0,-1); body.add(crew.g);
  if(v==='howitzer'||v==='star'||v==='ion'){ bx(1.6,.15,2.4,C.veh,0,.35,-.3,body); }
  return {g,body,legs:null,gun:br,tip};
}
function buildBallista(d,C){
  const g=new THREE.Group(), body=grp(g);
  bx(.3,.3,2.4,WOOD,0,.6,0,body); for(const s of [-1,1]) cylX(.45,.12,0x4a3520,body,s*.6,.45,-.6);
  const top=grp(body,0,1.1,.1); bx(2.2,.15,.15,WOOD,0,0,.6,top); bx(.2,.2,2.2,WOOD,0,0,0,top); bx(1.8,.03,.03,0xeeeeee,0,0,-.2,top); bx(.08,.08,1.6,0x6b4a2e,0,.12,.2,top);
  bx(.3,.6,.3,C.uni,0,.95,-.5,body);
  const tip=new THREE.Object3D(); tip.position.set(0,.15,1.1); top.add(tip);
  return {g,body,legs:null,tip,turret:top};
}
function buildSaucer(d,C){
  const g=new THREE.Group(), body=grp(g);
  const disc=mesh(SG(1),0x8a929c,0,0,0,body); disc.scale.set(2.6,.45,2.6);
  const dome=mesh(SG(.9),new THREE.MeshLambertMaterial({color:0x7cf0c0,emissive:0x2a8060,transparent:true,opacity:.85}),0,.4,0,body); dome.scale.set(1,.8,1);
  const ring=grp(body); for(let i=0;i<10;i++){const a=i/10*6.283; bx(.25,.15,.25,MG(i%2?C.main:0xffe066),Math.cos(a)*2.3,-.05,Math.sin(a)*2.3,ring);}
  bx(.6,.25,.6,MG(0x88ffcc),0,-.45,0,body);
  const tip=new THREE.Object3D(); tip.position.set(0,-.6,0); body.add(tip);
  return {g,body,legs:null,tip,rotors:[ring]};
}
function buildTank(d,C){
  const v=d.v||'mbt', g=new THREE.Group(), body=grp(g); let tip=new THREE.Object3D(), tur, hover=false, tips=[tip];
  if(v==='hover'){
    hover=true;
    const b=bx(2.8,.8,4.6,C.veh,0,1.0,0,body); bx(2.82,.1,4.62,C.main,0,1.2,0,body);
    for(const [x,z] of [[1.2,1.8],[-1.2,1.8],[1.2,-1.8],[-1.2,-1.8]]) cylY(.5,.15,MG(0x55ddff),body,x,.55,z,12);
    tur=grp(body,0,1.65,-.2); bx(1.8,.6,2.2,C.veh,0,0,0,tur); bx(1.82,.08,2.22,C.main,0,.2,0,tur);
    cylZ(.22,2.6,0x2a2a35,tur,0,0,2.2); cylZ(.26,.4,MG(0xc050ff),tur,0,0,3.4); tip.position.set(0,0,3.7); tur.add(tip);
  } else if(v==='ww'){
    bx(.7,1.0,4.8,0x2b2b2b,1.4,.5,0,body); bx(.7,1.0,4.8,0x2b2b2b,-1.4,.5,0,body);
    bx(2.2,1.2,4.4,C.veh,0,1.1,0,body); bx(2.22,.12,1,C.main,0,1.7,1.2,body);
    tur=grp(body,0,2.0,.2); bx(1.6,.9,1.8,C.veh,0,0,0,tur); bx(1.62,.12,1.82,C.main,0,.3,0,tur);
    cylZ(.13,2.0,0x333333,tur,0,0,1.8); tip.position.set(0,0,2.9); tur.add(tip);
  } else {
    bx(.85,.95,5,0x2b2b2b,1.55,.48,0,body); bx(.85,.95,5,0x2b2b2b,-1.55,.48,0,body);
    bx(2.4,1.0,4.6,C.veh,0,1.0,0,body); bx(2.42,.14,1.2,C.main,0,1.5,1.6,body);
    tur=grp(body,0,1.85,-.2); bx(2.0,.75,2.4,C.veh,0,0,0,tur); bx(2.02,.12,2.42,C.main,0,.2,0,tur); bx(.6,.25,.6,C.dark,.5,.5,-.4,tur);
    if(v==='super'){cylZ(.16,3.6,0x333333,tur,.4,.05,2.7); cylZ(.16,3.6,0x333333,tur,-.4,.05,2.7); tip.position.set(.4,.05,4.5); const t2=new THREE.Object3D(); t2.position.set(-.4,.05,4.5); tur.add(t2); tips.push(t2);}
    else {cylZ(.14,3.4,0x333333,tur,0,.05,2.6); tip.position.set(0,.05,4.3);}
    tur.add(tip);
  }
  return {g,body,legs:null,tip,tips,turret:tur,hover};
}
function buildJeep(d,C){
  const g=new THREE.Group(), body=grp(g);
  const v=d.v;
  if(v==='armored'||v==='apc'||v==='mlrs'){
    const L=v==='apc'?4.6:4.2, H=v==='apc'?1.5:1.1;
    bx(2.3,H,L,C.veh,0,.55+H/2,0,body); bx(2.32,.14,L+.02,C.main,0,.6+H,0,body); bx(1.6,.3,.1,0x334455,0,.3+H,L/2+.01,body);
    for(const sx of [-1,1]) for(const sz of (v==='armored'?[-1,1]:[-1.3,0,1.3])) cylX(.5,.4,0x1e1e1e,body,sx*1.2,.5,sz*(v==='armored'?1.3:1.2),12);
    if(v==='mlrs'){ const lr=grp(body,0,.6+H+.1,-.6); lr.rotation.x=-.5; bx(2,.9,2.6,0x4a5040,0,.45,0,lr); for(let i=0;i<3;i++) for(let j=0;j<2;j++) cylZ(.18,.1,0x111111,lr,-.6+i*.6,.25+j*.45,1.31);
      const tip=new THREE.Object3D(); tip.position.set(0,.8,1.4); lr.add(tip); return {g,body,legs:null,tip}; }
    const tur=grp(body,0,.6+H+.1,.2); bx(1.1,.5,1.3,C.veh,0,.25,0,tur); cylZ(.09,1.4,0x222222,tur,0,.3,1.2);
    const tip=new THREE.Object3D(); tip.position.set(0,.3,1.9); tur.add(tip); return {g,body,legs:null,tip,turret:tur};
  }
  bx(2.0,.7,3.6,C.veh,0,.85,0,body); bx(2.02,.12,3.62,C.main,0,1.05,0,body); bx(1.9,.6,.08,0x88aacc,0,1.45,.65,body);
  for(const sx of [-1,1]) for(const sz of [-1,1]) cylX(.45,.35,0x1e1e1e,body,sx*1.02,.45,sz*1.2,12);
  const tur=grp(body,0,1.25,-.7); cylY(.08,.6,0x333333,tur,0,.3,0); bx(.14,.16,1.2,0x1a1a1a,0,.62,.45,tur);
  bx(.6,.6,.35,C.uni,0,.55,-.45,tur); bx(.32,.32,.32,SKIN_TONE,0,1.02,-.45,tur); bx(.42,.18,.44,C.main,0,1.2,-.45,tur);
  const tip=new THREE.Object3D(); tip.position.set(0,.62,1.1); tur.add(tip);
  return {g,body,legs:null,tip,turret:tur};
}
function buildHeli(d,C){
  const g=new THREE.Group(), body=grp(g);
  bx(1.7,1.6,3.8,C.veh,0,0,0,body); bx(1.72,.25,2.2,C.main,0,-.35,0,body); bx(1.4,1.0,1.2,0x7fa7c9,0,.15,2.1,body);
  bx(.4,.45,4.2,C.veh,0,.3,-3.9,body); bx(.1,1.2,.8,C.veh,0,.8,-5.8,body);
  const tr=bx(.05,1.6,.16,DARKG,.25,.8,-5.8,body);
  for(const s of [-1,1]){bx(.12,.12,3.6,0x333333,s*.85,-1.15,0,body); bx(.08,.5,.08,0x333333,s*.8,-.9,.9,body); bx(.08,.5,.08,0x333333,s*.8,-.9,-.9,body); cylZ(.2,1.2,0x333333,body,s*1.1,-.4,.4);}
  if(d.v==='gunship'){for(const s of [-1,1]){bx(1.2,.12,.6,C.veh,s*1.4,-.2,0,body); cylZ(.18,1.0,0x333333,body,s*2,-.4,.3); cylZ(.18,1.0,0x333333,body,s*2,-.75,.3);}}
  const rotor=grp(body,0,1.05,0); bx(10,.06,.4,DARKG,0,0,0,rotor); bx(.4,.06,10,DARKG,0,0,0,rotor); cylY(.25,.3,0x333333,rotor,0,-.1,0);
  const tip=new THREE.Object3D(); tip.position.set(1.1,-.4,1.1); body.add(tip);
  const tip2=new THREE.Object3D(); tip2.position.set(-1.1,-.4,1.1); body.add(tip2);
  return {g,body,legs:null,tip,tips:[tip,tip2],rotors:[rotor],trotor:tr};
}
function buildZeppelin(d,C){
  const g=new THREE.Group(), body=grp(g);
  const e=mesh(SG(1),C.veh,0,0,0,body); e.scale.set(2.3,2.3,7);
  const band=mesh(CG(2.33,.6,20),C.main,0,0,0,body); band.rotation.x=Math.PI/2;
  for(const [x,y] of [[0,2],[0,-2],[2,0],[-2,0]]) bx(x?1.6:.12,y?1.6:.12,1.6,C.main,x*.9,y*.9,-6,body);
  bx(1,0.8,2.6,0x5a4a3a,0,-2.6,0,body);
  const tip=new THREE.Object3D(); tip.position.set(0,-3.1,0); body.add(tip);
  const prop=grp(body,0,0,-7.2); bx(.1,2,.1,DARKG,0,0,0,prop);
  return {g,body,legs:null,tip,rotors:[],props:[prop]};
}
function buildDrone(d,C){
  const g=new THREE.Group(), body=grp(g), rotors=[];
  bx(.8,.3,.9,0x2c3038,0,0,0,body); bx(.82,.08,.92,C.main,0,.16,0,body); bx(.2,.12,.08,MG(0xff3344),0,0,.46,body);
  for(const [x,z] of [[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]){bx(.08,.06,.9,0x2c3038,x/2,0,z/2,body).rotation.y=Math.atan2(x,z); const r=grp(body,x,.12,z); bx(.8,.02,.08,0x111111,0,0,0,r); rotors.push(r);}
  const tip=new THREE.Object3D(); tip.position.set(0,-.1,.5); body.add(tip);
  return {g,body,legs:null,tip,rotors};
}
function buildMech(d,C){
  const g=new THREE.Group(), body=grp(g), legs=[];
  if(d.v==='alien') C={...C,veh:0x5a6e5a};
  if(d.v==='cmd'){ C={...C,veh:0x8a8f99}; bx(.1,1.6,.1,0x333333,0,5.2,-.3,body); bx(.3,.3,.3,MG(0xffd34a),0,6.1,-.3,body); }
  bx(1.4,.6,1,0x3a3f48,0,2.6,0,body);
  for(const s of [-1,1]){const p=grp(body,.6*s,2.5,0); bx(.5,1.3,.6,C.veh,0,-.6,0,p); bx(.45,1.3,.5,0x3a3f48,0,-1.8,.1,p); bx(.7,.2,1.0,0x2a2e35,0,-2.45,.2,p); legs.push(p);}
  const tor=grp(body,0,3.6,0);
  bx(1.9,1.4,1.5,C.veh,0,0,0,tor); bx(1.92,.2,1.52,C.main,0,.5,0,tor); bx(1.0,.35,.08,MG(0x33e0ff),0,.15,.76,tor);
  const tips=[];
  for(const s of [-1,1]){bx(.5,.5,.8,0x3a3f48,s*1.2,.2,0,tor); bx(.35,.35,1.8,0x2a2e35,s*1.25,-.1,.8,tor); cylZ(.1,.4,MG(0x33e0ff),tor,s*1.25,-.1,1.8); const t=new THREE.Object3D(); t.position.set(s*1.25,-.1,2); tor.add(t); tips.push(t);}
  bx(.3,.8,.3,0x3a3f48,.5,1.0,-.4,tor);
  return {g,body,legs,legMode:2,legAmp:.5,tip:tips[0],tips,turret:tor};
}
function buildElephant(d,C){
  const g=new THREE.Group(), body=grp(g), legs=[], G=0x7f7a76;
  bx(2.6,2.4,4.2,G,0,3.2,0,body);
  for(const [x,z] of [[.9,1.4],[-.9,1.4],[.9,-1.4],[-.9,-1.4]]){const p=grp(body,x,2.2,z); bx(.85,2.2,.85,G,0,-1.1,0,p); legs.push(p);}
  bx(1.7,1.7,1.4,G,0,3.9,2.6,body); bx(.15,1.4,1.2,0x726c68,1,3.9,2.4,body); bx(.15,1.4,1.2,0x726c68,-1,3.9,2.4,body);
  const t1=bx(.45,1.2,.45,G,0,3.0,3.3,body); t1.rotation.x=.3; const t2=bx(.35,1.0,.35,G,0,2.1,3.6,body);
  for(const s of [-1,1]){const t=bx(.15,.15,1.2,0xf2ead8,s*.5,3.1,3.6,body); t.rotation.x=-.5;}
  bx(2.3,.2,2.4,C.main,0,4.45,-.2,body); bx(2,1.2,2,0x8b6a3e,0,5.15,-.2,body); bx(2.2,.15,2.2,C.main,0,5.85,-.2,body);
  bx(.06,2,.06,0x555555,.8,6.6,-1,body); bx(.03,.6,.9,C.main,.8,7.3,-1.45,body);
  const tip=new THREE.Object3D(); tip.position.set(0,1.0,3.8); body.add(tip);
  return {g,body,legs,legMode:4,legAmp:.35,tip};
}
function buildSiege(d,C){
  const g=new THREE.Group(), body=grp(g);
  for(const sx of [-1,1]) for(const sz of [-1,1]) cylX(.7,.3,0x4a3520,body,sx*2.1,.7,sz*1.5,12);
  bx(4,9,4,0x8b6a3e,0,5.2,0,body);
  for(let y=2;y<9;y+=2.2) bx(4.05,.2,4.05,0x5e4527,0,y+.6,0,body);
  bx(3,3,.1,C.main,0,6,2.05,body); bx(3,3,.1,C.main,0,6,-2.05,body);
  for(const [x,z] of [[1.6,1.6],[-1.6,1.6],[1.6,-1.6],[-1.6,-1.6],[0,1.6],[0,-1.6],[1.6,0],[-1.6,0]]) bx(.6,.7,.6,0x8b6a3e,x,10.05,z,body);
  bx(.08,3,.08,0x555555,0,11.5,0,body); bx(.04,.9,1.4,C.main,0,12.5,-.7,body);
  const tip=new THREE.Object3D(); tip.position.set(0,10.2,1.8); body.add(tip);
  return {g,body,legs:null,tip};
}
function legQuad(p,pos,w,h,c){const legs=[]; for(const [x,y,z] of pos){const lg=grp(p,x,y,z); bx(w,h,w,c,0,-h/2,0,lg); legs.push(lg);} return legs;}
function buildDino(d,C){
  const g=new THREE.Group(), body=grp(g), G=0x5d7a3a;
  const legs=[]; for(const s of [-1,1]){const p=grp(body,.7*s,2.6,-.3); bx(.6,1.4,.8,G,0,-.6,0,p); bx(.45,1.3,.5,G,0,-1.9,.2,p); bx(.6,.2,.9,0x3e5226,0,-2.5,.4,p); legs.push(p);}
  const tor=bx(1.8,1.8,3.4,G,0,3.2,0,body); tor.rotation.x=-.25;
  bx(1.86,.3,2,C.main,0,4.15,-.2,body);
  for(let i=0;i<4;i++){const t=bx(1.2-i*.25,1-i*.2,1.4,G,0,2.9-i*.25,-2.2-i*1.2,body); t.rotation.x=.12;}
  const head=grp(body,0,4.4,2.1); bx(1.2,1.1,1.6,G,0,0,.4,head); const jaw=bx(1,.35,1.4,0x4e6a30,0,-.6,.5,head); jaw.rotation.x=.25;
  bx(.15,.15,.15,0xffee66,.5,.25,.8,head); bx(.15,.15,.15,0xffee66,-.5,.25,.8,head); bx(.9,.12,.1,0xf2ead8,0,-.35,1.15,head);
  for(const s of [-1,1]){const a=bx(.2,.6,.2,G,.8*s,3.5,1.4,body); a.rotation.x=-.8;}
  const tip=new THREE.Object3D(); tip.position.set(0,-.4,1.3); head.add(tip);
  return {g,body,legs,legMode:2,legAmp:.5,tip};
}
function buildDragon(d,C){
  const g=new THREE.Group(), body=grp(g), G=0x8a2a1e;
  const b=mesh(SG(1),G,0,0,0,body); b.scale.set(1.2,1.1,2.6);
  bx(2.4,.3,1.6,C.main,0,.9,0,body);
  const neck=bx(.6,.6,2,G,0,.7,2.6,body); neck.rotation.x=-.5; const head=grp(body,0,1.5,3.6); bx(.9,.7,1.4,G,0,0,.3,head); bx(.15,.15,.15,0xffe066,.35,.2,.7,head); bx(.15,.15,.15,0xffe066,-.35,.2,.7,head);
  for(const s of [-1,1]){const h=bx(.1,.5,.1,0xf2ead8,.3*s,.5,-.2,head); h.rotation.x=-.6;}
  for(let i=0;i<5;i++) bx(.7-i*.12,.6-i*.1,1.1,G,0,-.1+i*.05,-2.6-i*1,body);
  const wings=[]; for(const s of [-1,1]){const w=grp(body,1*s,.5,.2); const m=bx(4.2,.08,2.4,0x5a1a14,2.1*s,0,0,w); wings.push(w);}
  for(const s of [-1,1]) bx(.3,1,.3,G,.6*s,-1.1,.6,body);
  const tip=new THREE.Object3D(); tip.position.set(0,-.2,1.1); head.add(tip);
  return {g,body,legs:null,tip,wings};
}
function buildTrain(d,C){
  const g=new THREE.Group(), body=grp(g);
  for(let i=-1;i<=1;i++){ const z=i*4.6; bx(3,1.8,4.2,C.veh,0,1.5,z,body); bx(3.02,.2,4.22,C.main,0,2.3,z,body); for(const s of [-1,1]) for(const zz of [-1.4,0,1.4]) cylX(.55,.3,0x1e1e1e,body,1.4*s,.55,z+zz,12); }
  bx(3.3,.15,14,0x2a2a2a,0,.12,0,body);
  cylY(.35,1.6,0x333333,body,0,3.2,5.5); bx(2,2,1.6,0x3a3f44,0,2.8,6.4,body);
  const tur=grp(body,0,2.8,0); bx(2,.9,2.4,C.veh,0,0,0,tur); bx(2.02,.12,2.42,C.main,0,.35,0,tur);
  const tips=[]; for(const x of [-.5,0,.5]){cylZ(.13,3,0x333333,tur,x,.1,2.4); const t=new THREE.Object3D(); t.position.set(x,.1,3.9); tur.add(t); tips.push(t);}
  for(const z of [-4.6,4.6]){const t2=grp(body,0,2.6,z); bx(1.2,.6,1.4,C.veh,0,0,0,t2); cylZ(.1,1.6,0x333333,t2,0,0,1.2);}
  return {g,body,legs:null,tip:tips[0],tips,turret:tur};
}
function buildPlane(d,C){
  const g=new THREE.Group(), body=grp(g);
  const f=mesh(CG(.9,10,12),C.veh,0,0,0,body); f.rotation.x=Math.PI/2; mesh(SG(.9),C.veh,0,0,5,body); bx(1.6,.5,1.2,0x7fa7c9,0,.4,4.2,body);
  bx(16,.25,2.4,C.veh,0,0,.5,body); bx(16.1,.27,.6,C.main,0,0,.5,body);
  bx(6,.2,1.4,C.veh,0,.4,-4.6,body); bx(.2,2.2,1.6,C.veh,0,1.3,-4.6,body);
  for(const x of [-5,-2.6,2.6,5]) cylZ(.35,1.6,0x333333,body,x,-.4,.8);
  const tip=new THREE.Object3D(); tip.position.set(0,-1,0); body.add(tip);
  return {g,body,legs:null,tip};
}
function buildSpider(d,C){
  const g=new THREE.Group(), body=grp(g), legs=[];
  const tor=grp(body,0,2,0); bx(2.2,1,2.6,C.veh,0,0,0,tor); bx(2.22,.15,2.62,C.main,0,.5,0,tor); bx(1,.3,.1,MG(0xff3344),0,.1,1.31,tor);
  const tips=[]; for(const s of [-1,1]){cylZ(.15,1.6,0x2a2e35,tor,.7*s,-.2,1.4); const t=new THREE.Object3D(); t.position.set(.7*s,-.2,2.2); tor.add(t); tips.push(t);}
  for(const s of [-1,1]) for(const z of [-.9,0,.9]){const p=grp(body,1.1*s,2,z); p.rotation.z=-.7*s; const up=bx(.2,.2,1.8,0x3a3f48,0,0,0,p); up.rotation.y=Math.PI/2; up.position.x=.9*s; const dn=bx(.18,2.2,.18,0x2a2e35,1.8*s,-1,0,p); dn.rotation.z=.7*s; legs.push(p);}
  return {g,body,legs,legMode:6,legAmp:.35,tip:tips[0],tips,turret:tor};
}
function buildQueen(d,C){
  const g=new THREE.Group(), body=grp(g), G=0x4f8a3a;
  const legs=[]; for(const s of [-1,1]) for(const z of [-1,1]){const p=grp(body,1.3*s,2.4,z*1.2); bx(.5,2.4,.5,0x3a6a2a,0,-1.2,0,p); legs.push(p);}
  const ab=mesh(SG(1),G,0,3,-2,body); ab.scale.set(1.6,1.3,2.4);
  const th=mesh(SG(1),G,0,3.8,.8,body); th.scale.set(1.3,1.4,1.4);
  const head=grp(body,0,5,2.1); const hm=mesh(SG(.8),0x6aaa50,0,0,0,head); hm.scale.set(1,1.3,1.4);
  bx(.2,.2,.1,0x111111,.35,.2,.95,head); bx(.2,.2,.1,0x111111,-.35,.2,.95,head);
  for(let i=0;i<5;i++){const c=bx(.25,1.6,.25,0x3a6a2a,(i-2)*.4,1,-.6,head); c.rotation.x=-.6;}
  for(const s of [-1,1]){const a=bx(.3,2.2,.3,0x3a6a2a,1.4*s,4,1.6,body); a.rotation.x=-1; a.rotation.z=.4*s;}
  bx(2.2,.25,1.6,C.main,0,4.9,.6,body);
  const tip=new THREE.Object3D(); tip.position.set(0,-.4,1.1); head.add(tip);
  return {g,body,legs,legMode:4,legAmp:.35,tip};
}
/* ---------- civilians & animals ---------- */
const SHIRTS=[0xd9534f,0x5bc0de,0xf0ad4e,0x8e44ad,0x2ecc71,0xecf0f1,0x34495e,0xe67e22,0xff69b4];
function buildCritter(type){
  if(type==='civ'){ const p=buildInf({look:{h:'civ',g:'none',civ:1,torso:SHIRTS[Math.floor(Math.random()*SHIRTS.length)],hair:[0x3a2a1a,0x1a1a1a,0xc9a050,0x8a4a20][Math.floor(Math.random()*4)]}},{main:0,dark:0,uni:0x3a5a8a,veh:0}); p.legs.forEach(l=>l.children[0].material=M(0x3a4a6a)); p.g.traverse(m=>{if(m.isMesh) m.castShadow=true;}); return p; }
  const g=new THREE.Group(), body=grp(g); let legs=[];
  switch(type){
    case 'cow': bx(.9,.9,1.9,0xf2f2f2,0,1.2,0,body); bx(.92,.5,.6,0x222222,.05,1.35,.2,body); bx(.5,.5,.7,0xf2f2f2,0,1.4,1.2,body); bx(.4,.25,.2,0xe8b4b4,0,1.25,1.55,body); bx(.6,.08,.08,0xe8e0c8,0,1.7,1.0,body);
      legs=legQuad(body,[[.3,.8,.7],[-.3,.8,.7],[.3,.8,-.7],[-.3,.8,-.7]],.18,.8,0xeeeeee); break;
    case 'sheep': mesh(SG(.55),0xf4f1e8,0,.8,0,body).scale.set(1,.9,1.3); bx(.3,.35,.45,0x2a2a2a,0,.95,.7,body);
      legs=legQuad(body,[[.2,.5,.35],[-.2,.5,.35],[.2,.5,-.35],[-.2,.5,-.35]],.1,.5,0x2a2a2a); break;
    case 'deer': bx(.5,.6,1.4,0x9a6a3a,0,1.2,0,body); const nk=bx(.25,.7,.3,0x9a6a3a,0,1.6,.65,body); nk.rotation.x=-.4; bx(.3,.3,.55,0x8a5a2a,0,1.95,.85,body);
      for(const s of [-1,1]){bx(.05,.5,.05,0x6a4a2a,.15*s,2.3,.75,body); bx(.3,.05,.05,0x6a4a2a,.25*s,2.45,.75,body);}
      legs=legQuad(body,[[.18,.9,.55],[-.18,.9,.55],[.18,.9,-.55],[-.18,.9,-.55]],.1,.9,0x7a5a3a); break;
    case 'camel': bx(.8,.8,2,0xc9a46a,0,1.9,0,body); mesh(SG(.5),0xc9a46a,0,2.4,0,body); const cn=bx(.3,1,.3,0xc9a46a,0,2.3,1.1,body); cn.rotation.x=-.5; bx(.35,.35,.6,0xb99460,0,2.75,1.45,body);
      legs=legQuad(body,[[.28,1.5,.75],[-.28,1.5,.75],[.28,1.5,-.75],[-.28,1.5,-.75]],.15,1.5,0xb99460); break;
    case 'dog': bx(.35,.35,.8,0x8a5a2a,0,.55,0,body); bx(.3,.3,.4,0x7a4a1a,0,.75,.5,body); bx(.06,.06,.4,0x8a5a2a,0,.7,-.5,body).rotation.x=-.6;
      legs=legQuad(body,[[.12,.4,.28],[-.12,.4,.28],[.12,.4,-.28],[-.12,.4,-.28]],.08,.4,0x7a4a1a); break;
    case 'chicken': mesh(SG(.22),0xfafafa,0,.38,0,body).scale.set(1,1,1.3); bx(.12,.15,.12,0xfafafa,0,.6,.18,body); bx(.06,.06,.1,0xf0a020,0,.6,.28,body); bx(.04,.1,.08,0xdd2222,0,.72,.18,body);
      legs=legQuad(body,[[.07,.2,0],[-.07,.2,0]],.04,.2,0xf0a020); break;
  }
  g.traverse(m=>{if(m.isMesh) m.castShadow=true;});
  return {g,body,legs};
}
function buildUnitModel(d,team,skinId){
  const C=teamColors(team,skinId); let p;
  switch(d.model){
    case 'rider': p=buildRider(d,C); break; case 'chariot': p=buildChariot(d,C); break; case 'catapult': p=buildCatapult(d,C); break;
    case 'trebuchet': p=buildTrebuchet(d,C); break; case 'cannon': p=buildCannon(d,C); break; case 'tank': p=buildTank(d,C); break;
    case 'jeep': p=buildJeep(d,C); break; case 'heli': p=buildHeli(d,C); break; case 'zeppelin': p=buildZeppelin(d,C); break;
    case 'drone': p=buildDrone(d,C); break; case 'mech': p=buildMech(d,C); break; case 'elephant': p=buildElephant(d,C); break;
    case 'siege': p=buildSiege(d,C); break; case 'ballista': p=buildBallista(d,C); break; case 'saucer': p=buildSaucer(d,C); break; case 'dino': p=buildDino(d,C); break; case 'dragon': p=buildDragon(d,C); break; case 'train': p=buildTrain(d,C); break; case 'plane': p=buildPlane(d,C); break; case 'spider': p=buildSpider(d,C); break; case 'queen': p=buildQueen(d,C); break; default: p=buildInf(d,C);
  }
  if(d.scale&&d.scale!==1) p.body.scale.setScalar(d.scale);
  if(d.commander){ const r=new THREE.Mesh(new THREE.RingGeometry(1.1,1.35,32),new THREE.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide})); r.rotation.x=-Math.PI/2; r.position.y=.08; p.g.add(r); p.cmdRing=r; }
  if(!p.tips) p.tips=[p.tip];
  p.g.traverse(m=>{if(m.isMesh) m.castShadow=true;});
  return p;
}

/* ================= OBSTACLES ================= */
const OBS={
  wall:{n:'קיר',ic:'🧱',w:7,d:1,h:2.6,hp:500,col:0x9a948a},
  ruinwall:{n:'קיר הרוס',ic:'🏚️',w:6,d:1,h:2.2,hp:400,col:0xa39a84},
  fence:{n:'גדר עץ',ic:'🪵',w:5,d:.3,h:1,hp:80,col:0x8a6a42,low:1},
  sandbag:{n:'שקי חול',ic:'🟫',w:4,d:1.2,h:1.1,hp:300,col:0xb59a6a,low:1},
  crate:{n:'ארגזים',ic:'📦',w:2,d:2,h:1.2,hp:150,col:0x8b6a3e,low:1},
  barrel:{n:'חבית נפץ',ic:'🛢️',w:1,d:1,h:1.3,hp:30,col:0xc23b22,low:1,explode:1},
  bunker:{n:'בונקר',ic:'🛖',w:6,d:4,h:2.2,hp:2500,col:0x8e8e86},
  house:{n:'בית',ic:'🏡',w:6,d:6,h:4,hp:1200,col:0xe0d4bc},
  building:{n:'בניין',ic:'🏢',w:10,d:10,h:8,hp:3000,col:0xc9c1b0},
  tower:{n:'מגדל עתידי',ic:'🌆',w:6,d:6,h:16,hp:5000,col:0x2a3240},
  pillar:{n:'עמוד אבן',ic:'🏛️',w:1.4,d:1.4,h:5,hp:600,col:0xd6cdb4},
  rock:{n:'סלע',ic:'🪨',w:3,d:3,h:2,hp:900,col:0x7d7b76},
  tree:{n:'עץ',ic:'🌳',w:.9,d:.9,h:6,hp:120,col:0x3c7a34},
  pine:{n:'אורן',ic:'🌲',w:.9,d:.9,h:6,hp:120,col:0x2e6a30},
  snowpine:{n:'אורן מושלג',ic:'🎄',w:.9,d:.9,h:6,hp:120,col:0x2e5a3a},
  palm:{n:'דקל',ic:'🌴',w:.7,d:.7,h:6,hp:100,col:0x3f8a3a},
  cactus:{n:'קקטוס',ic:'🌵',w:.8,d:.8,h:2.5,hp:60,col:0x4b8a3f},
  water:{n:'מים',ic:'🌊',w:8,d:8,h:.12,hp:1e9,col:0x3b7fb0,low:1,noCover:1,water:1},
  bridge:{n:'גשר',ic:'🌉',w:8,d:8,h:.2,hp:1e9,col:0x7a5a38,walk:1,low:1,noCover:1},
  castletower:{n:'מגדל טירה',ic:'🏰',w:5,d:5,h:9,hp:3500,col:0x9d968a},
  skyscraper:{n:'גורד שחקים',ic:'🏙️',w:9,d:9,h:24,hp:6000,col:0x4a6f8f},
  factory:{n:'מפעל',ic:'🏭',w:12,d:8,h:6,hp:3500,col:0x8a7d6e},
  temple:{n:'מקדש עתיק',ic:'⛩️',w:9,d:6,h:5.5,hp:2500,col:0xe2d8bd},
  tent:{n:'אוהל',ic:'⛺',w:4,d:4,h:2.5,hp:150,col:0x6b7a45},
  hangar:{n:'האנגר',ic:'🛩️',w:12,d:10,h:5,hp:3000,col:0x8c939a},
  silo:{n:'ממגורה',ic:'🛢',w:3,d:3,h:7,hp:1500,col:0xc8c2b4},
  pyramid:{n:'פירמידה',ic:'🔺',w:14,d:14,h:9,hp:9000,col:0xd8bf88},
  igloo:{n:'איגלו',ic:'⛄',w:4,d:4,h:2.2,hp:600,col:0xf2f6fa},
  hut:{n:'בקתה',ic:'🛖',w:4,d:4,h:3.2,hp:400,col:0x9a7a4e},
  dome:{n:'כיפת זכוכית',ic:'🔮',w:7,d:7,h:4,hp:2500,col:0x9fd8ea},
  crystal:{n:'קריסטל',ic:'💎',w:2,d:2,h:3.5,hp:800,col:0xb070ff}
};
const winTex=(()=>{const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  x.fillStyle='#cfc6b3'; x.fillRect(0,0,64,64); x.fillStyle='#3f4e60'; x.fillRect(16,14,32,32); x.fillStyle='#b3a994'; x.fillRect(14,48,36,4);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3.3,2.6); return t;})();
const litTex=(()=>{const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  x.fillStyle='#000'; x.fillRect(0,0,64,64); x.fillStyle='#ffd27a'; x.fillRect(16,14,32,32);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(3.3,2.6); return t;})();
const bSide=new THREE.MeshLambertMaterial({map:winTex,emissiveMap:litTex,emissive:0xffffff,emissiveIntensity:0});
const towerMat=new THREE.MeshLambertMaterial({color:0x2a3240,emissive:0x22ccff,emissiveIntensity:.15});
const rockG=new THREE.DodecahedronGeometry(1.4,0), rockM=new THREE.MeshLambertMaterial({color:0x7d7b76,flatShading:true});
const skyTex=(()=>{const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'); x.fillStyle='#3d5a74'; x.fillRect(0,0,64,64); x.fillStyle='#8fb6d6'; x.fillRect(4,4,26,24); x.fillRect(34,4,26,24); x.fillRect(4,34,26,24); x.fillRect(34,34,26,24);
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(4,10); return t;})();
const skyMat=new THREE.MeshLambertMaterial({map:skyTex,emissiveMap:litTex,emissive:0xffffff,emissiveIntensity:0});
const domeMat=new THREE.MeshLambertMaterial({color:0x9fd8ea,transparent:true,opacity:.6,emissive:0x2a6080,emissiveIntensity:.3});
const waterM=new THREE.MeshLambertMaterial({color:0x3b7fb0,transparent:true,opacity:.85});
function buildObsMesh(type,o){
  const d=OBS[type], g=new THREE.Group();
  switch(type){
    case 'wall': bx(d.w,d.h,d.d,d.col,0,d.h/2,0,g); bx(d.w+.1,.15,d.d+.12,0x7d776d,0,d.h,0,g); break;
    case 'ruinwall': for(let i=0;i<6;i++){const h=.6+Math.random()*1.8; bx(1,h,d.d,d.col,-2.5+i,h/2,0,g);} break;
    case 'fence': for(let i=0;i<5;i++) bx(.12,1,.12,d.col,-2+i,.5,0,g); bx(5,.12,.08,d.col,0,.75,0,g); bx(5,.12,.08,d.col,0,.4,0,g); break;
    case 'sandbag': for(let row=0;row<2;row++) for(let i=0;i<4;i++) bx(.95,.52,1.15,row?0xbda372:0xa98e5f,-1.5+i+(row?.15:0),.27+row*.52,0,g); break;
    case 'crate': bx(2,1.2,2,d.col,0,.6,0,g); bx(2.05,.12,2.05,0x5e4527,0,1.15,0,g); bx(2.05,.12,2.05,0x5e4527,0,.06,0,g); break;
    case 'barrel': cylY(.5,1.3,d.col,g,0,.65,0); cylY(.52,.14,0xeeeeee,g,0,.95,0); cylY(.52,.14,0xeeeeee,g,0,.35,0); break;
    case 'bunker': bx(6,2.2,4,d.col,0,1.1,0,g); bx(4,.25,.1,0x222222,0,1.5,2.01,g); bx(6.3,.3,4.3,0x777770,0,2.25,0,g); break;
    case 'house': bx(6,3,6,d.col,0,1.5,0,g); {const r=mesh(KG(4.6,2.2,4),0x9a4a32,0,4.1,0,g); r.rotation.y=Math.PI/4;} bx(1.2,2,.1,0x5a3d22,0,1,3.01,g); bx(1,1,.1,0x6f8faa,2,1.8,3.01,g); bx(1,1,.1,0x6f8faa,-2,1.8,3.01,g); break;
    case 'building': {const m=new THREE.Mesh(BG(d.w,d.h,d.d),[bSide,bSide,M(0x8c8476),M(0x8c8476),bSide,bSide]); m.position.y=d.h/2; g.add(m); bx(d.w+.4,.4,d.d+.4,0x6b5f52,0,d.h+.2,0,g); bx(1.6,1.2,1.6,0x777777,2,d.h+.8,-2,g); break;}
    case 'tower': {const m=new THREE.Mesh(BG(d.w,d.h,d.d),towerMat); m.position.y=d.h/2; g.add(m); for(let y=2;y<d.h;y+=3) bx(d.w+.1,.2,d.d+.1,MG(0x22ccff),0,y,0,g); bx(.2,3,.2,0x888888,0,d.h+1.5,0,g); bx(.4,.4,.4,MG(0xff3355),0,d.h+3,0,g); break;}
    case 'pillar': cylY(.7,d.h,d.col,g,0,d.h/2,0,12); bx(1.6,.4,1.6,d.col,0,.2,0,g); bx(1.6,.4,1.6,d.col,0,d.h-.2,0,g); break;
    case 'rock': {const m=new THREE.Mesh(rockG,rockM); m.scale.set(.95+Math.random()*.25,.7+Math.random()*.25,.95+Math.random()*.25); m.rotation.set(Math.random(),Math.random()*6,Math.random()); m.position.y=.7; g.add(m); break;}
    case 'tree': cylY(.28,2.6,0x5a3d22,g,0,1.3,0); {const a=new THREE.Mesh(new THREE.DodecahedronGeometry(1.9,0),M(0x3c7a34)); a.position.y=3.6; g.add(a); const b=new THREE.Mesh(new THREE.DodecahedronGeometry(1.3,0),M(0x4a8a3c)); b.position.set(.6,4.6,.3); g.add(b);} g.rotation.y=Math.random()*6; g.scale.setScalar(.85+Math.random()*.35); break;
    case 'pine': case 'snowpine': {cylY(.25,2.2,0x5a3d22,g,0,1.1,0); const c1=type==='pine'?0x2e6a30:0x2e5a3a; mesh(KG(1.9,3.4),c1,0,3.3,0,g); mesh(KG(1.35,2.6),c1,0,4.8,0,g);
      if(type==='snowpine'){mesh(KG(1.5,1.2),0xf4f7fa,0,4.5,0,g); mesh(KG(.9,1),0xf4f7fa,0,5.9,0,g);} g.rotation.y=Math.random()*6; g.scale.setScalar(.85+Math.random()*.35); break;}
    case 'palm': {for(let i=0;i<6;i++){const s=bx(.36,1,.36,0x8a6a42,Math.sin(i*.3)*.15*i,.5+i*.95,0,g); s.rotation.z=.04*i;} for(let i=0;i<6;i++){const l=bx(.5,.08,2.6,0x3f8a3a,.8,5.8,0,g); l.position.set(Math.sin(i)*1+.8,5.6,Math.cos(i)*1); l.rotation.set(.35,i*1.05,0);} break;}
    case 'cactus': cylY(.35,2.4,d.col,g,0,1.2,0); cylY(.2,.9,d.col,g,.5,1.5,0); cylY(.2,.7,d.col,g,-.5,1.8,0); break;
    case 'castletower': cylY(2.5,d.h,d.col,g,0,d.h/2,0,12); for(let i=0;i<8;i++){const a=i/8*6.283; bx(.8,.9,.8,d.col,Math.cos(a)*2.3,d.h+.45,Math.sin(a)*2.3,g);} bx(.4,1.2,.1,0x222222,0,d.h*.6,2.5,g); bx(.05,2.2,.05,0x555555,0,d.h+1.6,0,g); break;
    case 'skyscraper': {const m=new THREE.Mesh(BG(d.w,d.h,d.d),[skyMat,skyMat,M(0x6b7580),M(0x6b7580),skyMat,skyMat]); m.position.y=d.h/2; g.add(m); for(let y=3;y<d.h;y+=3) bx(d.w+.08,.25,d.d+.08,0x8a96a3,0,y,0,g); bx(2,2,2,0x6b7580,0,d.h+1,0,g); break;}
    case 'factory': bx(d.w,d.h,d.d,d.col,0,d.h/2,0,g); for(let i=0;i<4;i++){const t=bx(3,1.2,d.d,0x6f6458,-4.5+i*3,d.h+.4,0,g); t.rotation.z=.35;} cylY(.7,6,0x7a5040,g,4,d.h+3,2.5); cylY(.8,.4,0x333333,g,4,d.h+6,2.5); bx(3,2.5,.1,0x4a4a4a,-2,1.25,d.d/2+.01,g); break;
    case 'temple': bx(d.w,.6,d.d,d.col,0,.3,0,g); for(let i=0;i<5;i++) for(const z of [-2.4,2.4]) cylY(.35,4,d.col,g,-3.6+i*1.8,2.6,z,10); bx(d.w,.5,d.d,d.col,0,4.8,0,g); {const r=mesh(KG(6,1.4,4),d.col,0,5.7,0,g); r.rotation.y=Math.PI/4; r.scale.z=.65;} break;
    case 'tent': {const t=mesh(KG(2.8,2.5,4),d.col,0,1.25,0,g); t.rotation.y=Math.PI/4; bx(.8,1.2,.05,0x2a2a1a,0,.6,1.45,g); break;}
    case 'hangar': {const h=mesh(CG(5,d.d,16),d.col,0,0,0,g); h.rotation.x=Math.PI/2; h.scale.set(1.2,1,1); bx(d.w,.1,d.d,0x555555,0,.05,0,g); bx(6,4,.1,0x3a3f44,0,2,d.d/2+.01,g); break;}
    case 'silo': cylY(1.5,d.h,d.col,g,0,d.h/2,0,14); {const t=mesh(SG(1.5),0xb0aa9c,0,d.h,0,g); t.scale.y=.6;} bx(.2,d.h,.2,0x666666,1.6,d.h/2,0,g); break;
    case 'pyramid': {const p=mesh(KG(9.9,d.h,4),d.col,0,d.h/2,0,g); p.rotation.y=Math.PI/4; break;}
    case 'igloo': {const i=mesh(SG(2),d.col,0,0,0,g); i.scale.set(1,1.1,1); bx(1,1,1.2,0xe6edf3,0,.5,2,g); break;}
    case 'hut': cylY(1.8,2.2,d.col,g,0,1.1,0,10); mesh(KG(2.4,1.8,10),0xc9a85a,0,3.1,0,g); bx(.8,1.4,.1,0x3a2a1a,0,.7,1.8,g); break;
    case 'dome': {const m=new THREE.Mesh(SG(3.5),domeMat); m.scale.y=1.15; g.add(m); cylY(3.6,.4,0x9aa3ad,g,0,.2,0,20); break;}
    case 'crystal': for(let i=0;i<4;i++){const c=new THREE.Mesh(new THREE.OctahedronGeometry(.6+i*.15,0),MG(0xb070ff)); c.scale.y=2.4; c.position.set(Math.cos(i*1.6)*.5,1.6,Math.sin(i*1.6)*.5); c.rotation.z=(i-1.5)*.3; g.add(c);} break;
    case 'water': {const m=new THREE.Mesh(BG(o.w,.12,o.d),waterM); m.position.y=.04; m.receiveShadow=true; g.add(m); break;}
    case 'bridge': {bx(o.w,.25,o.d,0x7a5a38,0,.14,0,g); for(const s of [-1,1]) bx(o.w,.6,.15,0x5e4527,0,.5,s*(o.d/2-.1),g); break;}
  }
  g.traverse(m=>{if(m.isMesh){m.castShadow=type!=='water'&&type!=='bridge'; m.receiveShadow=true;}});
  return g;
}
