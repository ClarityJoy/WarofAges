'use strict';
/* ================= ENGINE ================= */
const R=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let HALF=80;
const S={mode:'menu',phase:'setup',paused:false,speed:1,teams:['blue','red'],player:'blue',money:{},bots:{},income:0,incomeT:0,
  skins:{blue:'default',red:'default',green:'default',yellow:'default'},level:null,mapId:0,tod:12,todSpeed:0,ff:false,bars:true,
  t:0,shadows:true,winner:null,tutorial:null,pool:null,placed:{},gore:true,life:true,hurtCiv:0,events:[]};

/* ---------- renderer / scene ---------- */
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xa9c7dc); scene.fog=new THREE.Fog(0xa9c7dc,170,420);
const camera=new THREE.PerspectiveCamera(50,1,.5,1200);
const hemi=new THREE.HemisphereLight(0xdfefff,0x5a5236,.78); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d6,.85); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:10,far:400}); sun.shadow.bias=-.0008; scene.add(sun); scene.add(sun.target);
const moon=new THREE.DirectionalLight(0x8fa8ff,0); moon.position.set(60,100,-40); scene.add(moon);
const boomLight=new THREE.PointLight(0xffa050,0,50,2); scene.add(boomLight);
const stars=(()=>{const n=900,p=new Float32Array(n*3); for(let i=0;i<n;i++){const a=Math.random()*6.283,e=Math.random()*1.4+.08,r=600; p[i*3]=Math.cos(a)*Math.cos(e)*r; p[i*3+1]=Math.sin(e)*r; p[i*3+2]=Math.sin(a)*Math.cos(e)*r;}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const s=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false})); scene.add(s); return s;})();

/* ---------- ground & theme ---------- */
const ground=new THREE.Mesh(new THREE.PlaneGeometry(HALF*2,HALF*2),new THREE.MeshLambertMaterial({color:0xffffff})); ground.visible=false;
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
const outer=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshLambertMaterial({color:0x5d6b3b}));
outer.rotation.x=-Math.PI/2; outer.position.y=-6; outer.visible=false; scene.add(outer);
const mountains=new THREE.Group(); scene.add(mountains);
const gtexCache={};
function groundTex(th){
  if(gtexCache[th.id]) return gtexCache[th.id];
  const c=document.createElement('canvas'); c.width=c.height=1024; const x=c.getContext('2d'); const W=1024, P=v=>(v+80)/160*W;
  x.fillStyle=th.ground[0]; x.fillRect(0,0,W,W);
  for(let i=0;i<5200;i++){x.fillStyle=th.ground[1+(i%3)]; x.beginPath(); x.arc(Math.random()*W,Math.random()*W,4+Math.random()*28,0,7); x.fill();}
  if(th.roads){x.fillStyle='rgba(45,45,48,.85)'; for(const v of [-37.5,-22.5,-7.5,7.5,22.5,37.5]) x.fillRect(P(v)-18,P(-50),36,P(50)-P(-50)); for(const v of [-47.5,-28.5,-9.5,9.5,28.5,47.5]) x.fillRect(P(-45),P(v)-14,P(45)-P(-45),28);
    x.strokeStyle='rgba(240,220,120,.6)'; x.setLineDash([14,14]); x.lineWidth=2; for(const v of [-37.5,-22.5,-7.5,7.5,22.5,37.5]){x.beginPath(); x.moveTo(P(v),P(-50)); x.lineTo(P(v),P(50)); x.stroke();} x.setLineDash([]);}
  if(th.neon){ x.strokeStyle='rgba(40,220,255,.35)'; x.lineWidth=2; for(let i=0;i<=16;i++){const p=i*64; x.beginPath(); x.moveTo(p,0); x.lineTo(p,W); x.stroke(); x.beginPath(); x.moveTo(0,p); x.lineTo(W,p); x.stroke();} }
  // turn colour spots into a neutral-brightness detail map: vertex colours carry the real colour
  const id=x.getImageData(0,0,W,W), dd=id.data; let avg=0; for(let i=0;i<dd.length;i+=4) avg+=dd[i]+dd[i+1]+dd[i+2]; avg/=dd.length/4*3;
  for(let i=0;i<dd.length;i+=4){ const l=(dd[i]+dd[i+1]+dd[i+2])/3, k=th.roads||th.neon?1:0; const g=clamp(200+(l-avg)*1.6,140,255); dd[i]=k?dd[i]:g; dd[i+1]=k?dd[i+1]:g; dd[i+2]=k?dd[i+2]:g; }
  if(!th.roads&&!th.neon) x.putImageData(id,0,0);
  const t=new THREE.CanvasTexture(c); t.anisotropy=4; gtexCache[th.id]=t; return t;
}
let curTheme=THEMES[0];
function setTheme(th){
  curTheme=th; ground.material.map=groundTex(th); ground.material.needsUpdate=true; outer.material.color.setHex(th.outer);
  while(mountains.children.length){const m=mountains.children.pop(); m.geometry.dispose();} mountains.visible=false;
  const mm=M(th.mount); const rr=mulberry32(th.id.length*99+7);
  for(let i=0;i<28;i++){const a=i/28*Math.PI*2+(rr()-.5)*.2, d=(230+rr()*100)*Math.max(1,HALF/80*.9), h=30+rr()*55;
    const m=new THREE.Mesh(new THREE.ConeGeometry(40+rr()*40,h,6),mm); m.position.set(Math.cos(a)*d,h/2-2,Math.sin(a)*d); mountains.add(m);}
  towerMat.emissiveIntensity=th.neon?.35:.15;
  snow.visible=th.id==='snow'||th.id==='mars'; snow.material.color.setHex(th.id==='mars'?0xc9764a:0xffffff); snow.material.size=th.id==='mars'?.25:.35;
}
/* ---------- map size ---------- */
function setMapSize(h){
  NAV.dirty=true;
  HALF=h; const k=h/80;
  ground.scale.set(k,k,1);
  const sc=sun.shadow.camera; sc.left=-(h+15); sc.right=h+15; sc.top=h+15; sc.bottom=-(h+15); sc.far=400*k+100; sc.updateProjectionMatrix();
  const ms=h>100?4096:2048; if(sun.shadow.mapSize.x!==ms){ sun.shadow.mapSize.set(ms,ms); if(sun.shadow.map){sun.shadow.map.dispose(); sun.shadow.map=null;} }
  scene.fog.near=170*k; scene.fog.far=420*k; camera.far=1200*k+200; camera.updateProjectionMatrix();
  Object.assign(ZONES.blue,{x0:-h+2,x1:-h+30,z0:-h+2,z1:h-2}); Object.assign(ZONES.red,{x0:h-30,x1:h-2,z0:-h+2,z1:h-2});
  Object.assign(ZONES.green,{x0:-h+36,x1:h-36,z0:-h+2,z1:-h+26}); Object.assign(ZONES.yellow,{x0:-h+36,x1:h-36,z0:h-26,z1:h-2});

  const p=snow.geometry.attributes.position.array; for(let i=0;i<p.length;i+=3){p[i]=R(-h-10,h+10); p[i+2]=R(-h-10,h+10);} snow.geometry.attributes.position.needsUpdate=true;
}
/* zone overlays */
const zoneMeshes={};
for(const t of TEAM_IDS){const z=ZONES[t]; const m=new THREE.Mesh(new THREE.PlaneGeometry(z.x1-z.x0,z.z1-z.z0),new THREE.MeshBasicMaterial({color:TEAMS[t].bar,transparent:true,opacity:.13,depthWrite:false}));
  m.rotation.x=-Math.PI/2; m.position.set((z.x0+z.x1)/2,.03,(z.z0+z.z1)/2); m.visible=false; scene.add(m); zoneMeshes[t]=m;}
function showZones(list){for(const t of TEAM_IDS) zoneMeshes[t].visible=list.includes(t);}
function inZone(team,x,z){const Z=ZONES[team]; return x>=Z.x0&&x<=Z.x1&&z>=Z.z0&&z<=Z.z1;}

/* snow weather */
const snow=(()=>{const n=1500,p=new Float32Array(n*3); for(let i=0;i<n;i++){p[i*3]=R(-90,90); p[i*3+1]=R(0,60); p[i*3+2]=R(-90,90);}
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(p,3));
  const s=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:.35,transparent:true,opacity:.85,depthWrite:false})); s.visible=false; scene.add(s); return s;})();
function updateSnow(dt){ if(!snow.visible) return; const p=snow.geometry.attributes.position.array; for(let i=0;i<p.length;i+=3){p[i+1]-=dt*(curTheme.mars?1.5:4); p[i]+=Math.sin(S.t+i)*dt*.6+(curTheme.mars?dt*3:0); if(p[i+1]<0) p[i+1]=60+TER.maxH;} snow.geometry.attributes.position.needsUpdate=true; }

/* ---------- day / night ---------- */
const cSky=new THREE.Color(), cTmp=new THREE.Color();
const C_DAY=new THREE.Color(0xa9c7dc), C_NIGHT=new THREE.Color(0x0a1024), C_SET=new THREE.Color(0xf09a6a), C_SUN=new THREE.Color(0xfff1d6), C_SUNSET=new THREE.Color(0xffa060);
function applyTOD(){
  const h=((S.tod%24)+24)%24, a=(h-6)/12*Math.PI, el=Math.sin(a);
  const day=clamp(el*2.2+.2,0,1), set=clamp(1-Math.abs(el)*3.2,0,1)*(el>-.3?1:0);
  cSky.copy(C_NIGHT).lerp(C_DAY,day); cTmp.copy(C_SET); cSky.lerp(cTmp,set*.55);
  if(curTheme.neon) cSky.lerp(new THREE.Color(0x1a1030),.35);
  scene.background.copy(cSky); scene.fog.color.copy(cSky);
  const k=HALF/80, sx=Math.cos(a)*130*k, sy=Math.max(.08,el)*150*k;
  sun.position.set(sx,sy,45*k); sun.target.position.set(0,0,0);
  sun.intensity=.9*clamp(el*3,0,1); sun.color.copy(C_SUN).lerp(C_SUNSET,set);
  hemi.intensity=.2+.6*day; moon.intensity=.32*(1-day);
  stars.material.opacity=clamp(1-day*1.6,0,1);
  bSide.emissiveIntensity=(1-day)*.9; skyMat.emissiveIntensity=(1-day)*.8;
  S.night=1-day;
  if(typeof updateSky==='function') updateSky();
}
function refreshTerrain(){ if(curMap) buildTerrainMesh(curMap); NAV.dirty=true; }
let curMap=null;

/* ---------- particles ---------- */
const PV=`attribute float size;attribute vec4 col;varying vec4 vC;uniform float scale;
void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*scale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
const PF=`varying vec4 vC;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(.5,.08,d));}`;
const pUniform={scale:{value:600}};
class Particles{
  constructor(max,additive){
    this.max=max; this.i=0;
    this.pos=new Float32Array(max*3); this.col=new Float32Array(max*4); this.size=new Float32Array(max);
    this.vel=new Float32Array(max*3); this.life=new Float32Array(max); this.ml=new Float32Array(max);
    this.s0=new Float32Array(max); this.s1=new Float32Array(max); this.c=new Float32Array(max*4); this.gd=new Float32Array(max*2);
    const geo=new THREE.BufferGeometry();
    this.pa=new THREE.BufferAttribute(this.pos,3); this.ca=new THREE.BufferAttribute(this.col,4); this.sa=new THREE.BufferAttribute(this.size,1);
    [this.pa,this.ca,this.sa].forEach(a=>a.setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('position',this.pa); geo.setAttribute('col',this.ca); geo.setAttribute('size',this.sa);
    this.pts=new THREE.Points(geo,new THREE.ShaderMaterial({uniforms:pUniform,vertexShader:PV,fragmentShader:PF,transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending}));
    this.pts.frustumCulled=false; this.pts.renderOrder=2; scene.add(this.pts);
  }
  emit(x,y,z,vx,vy,vz,life,s0,s1,r,g,b,a,grav,drag){
    const i=this.i; this.i=(i+1)%this.max;
    this.pos[i*3]=x; this.pos[i*3+1]=y; this.pos[i*3+2]=z; this.vel[i*3]=vx; this.vel[i*3+1]=vy; this.vel[i*3+2]=vz;
    this.life[i]=life; this.ml[i]=life; this.s0[i]=s0; this.s1[i]=s1;
    this.c[i*4]=r; this.c[i*4+1]=g; this.c[i*4+2]=b; this.c[i*4+3]=a; this.gd[i*2]=grav||0; this.gd[i*2+1]=drag||0;
  }
  update(dt){
    const P=this.pos,V=this.vel,C=this.col,Sz=this.size;
    for(let i=0;i<this.max;i++){
      if(this.life[i]<=0){Sz[i]=0; continue;}
      this.life[i]-=dt; const k=1-Math.max(0,this.life[i])/this.ml[i], dr=1-this.gd[i*2+1]*dt;
      V[i*3]*=dr; V[i*3+2]*=dr; V[i*3+1]=V[i*3+1]*dr-this.gd[i*2]*dt; if(this.wind&&this.gd[i*2]<=0) V[i*3]+=this.wind*dt;
      P[i*3]+=V[i*3]*dt; P[i*3+1]+=V[i*3+1]*dt; P[i*3+2]+=V[i*3+2]*dt;
      if(P[i*3+1]<TER.maxH){ const fl=gh(P[i*3],P[i*3+2])+.05; if(P[i*3+1]<fl){P[i*3+1]=fl; V[i*3+1]*=-.3;} }
      Sz[i]=this.life[i]<=0?0:this.s0[i]+(this.s1[i]-this.s0[i])*k;
      C[i*4]=this.c[i*4]*(1-k*.5); C[i*4+1]=this.c[i*4+1]*(1-k*.75); C[i*4+2]=this.c[i*4+2]*(1-k*.8); C[i*4+3]=this.c[i*4+3]*(1-k);
    }
    this.pa.needsUpdate=true; this.ca.needsUpdate=true; this.sa.needsUpdate=true;
  }
  clear(){this.life.fill(0);}
}
const ADD=new Particles(10000,true), SMK=new Particles(7000,false); SMK.wind=.7;

/* tracers / beams */
const TRMAX=3000, trPos=new Float32Array(TRMAX*6), trCol=new Float32Array(TRMAX*6), trGeo=new THREE.BufferGeometry();
const trPA=new THREE.BufferAttribute(trPos,3).setUsage(THREE.DynamicDrawUsage), trCA=new THREE.BufferAttribute(trCol,3).setUsage(THREE.DynamicDrawUsage);
trGeo.setAttribute('position',trPA); trGeo.setAttribute('color',trCA);
const trLines=new THREE.LineSegments(trGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
trLines.frustumCulled=false; scene.add(trLines);
let tracers=[];
function tracer(ax,ay,az,bx_,by,bz,r,g,b,life,beam){ if(tracers.length<TRMAX) tracers.push({ax,ay,az,bx:bx_,by,bz,r,g,b,life:life||.08,ml:life||.08,beam}); }
function updateTracers(dt){
  let n=0;
  for(const t of tracers){
    t.life-=dt; if(t.life<=0) continue;
    const k=1-t.life/t.ml, j=n*6; let k0,k1,f=1;
    if(t.beam){k0=0;k1=1;f=1-k;} else {k1=k; k0=Math.max(0,k-.45);}
    trPos[j]=t.ax+(t.bx-t.ax)*k0; trPos[j+1]=t.ay+(t.by-t.ay)*k0; trPos[j+2]=t.az+(t.bz-t.az)*k0;
    trPos[j+3]=t.ax+(t.bx-t.ax)*k1; trPos[j+4]=t.ay+(t.by-t.ay)*k1; trPos[j+5]=t.az+(t.bz-t.az)*k1;
    const tail=t.beam?f:.15;
    trCol[j]=t.r*tail; trCol[j+1]=t.g*tail; trCol[j+2]=t.b*tail; trCol[j+3]=t.r*f; trCol[j+4]=t.g*f; trCol[j+5]=t.b*f; n++;
  }
  tracers=tracers.filter(t=>t.life>0);
  trGeo.setDrawRange(0,n*2); trPA.needsUpdate=true; trCA.needsUpdate=true;
}
/* flashes, decals */
const sphereG=new THREE.SphereGeometry(1,14,10), circleG=new THREE.CircleGeometry(1,20);
let flashes=[], decals=[], rings=[], fires=[], burningObs=[];
const ringG=new THREE.RingGeometry(.82,1,48);
function shockRing(x,y,z,r,col){ const m=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:col||0xffe2b0,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  layDecal(m,x,z,.2); scene.add(m); rings.push({m,t:0,max:.5,r}); }
function groundFire(x,z,r,life){ if(fires.length>45) fires.shift(); fires.push({x,z,r,life,t:0,y:gh(x,z)}); }
function updateFX(dt){
  for(const g of rings){ g.t+=dt; const k=g.t/g.max; g.m.scale.setScalar(.5+g.r*2.4*k); g.m.material.opacity=.85*(1-k); }
  rings=rings.filter(g=>{if(g.t>=g.max){scene.remove(g.m); g.m.material.dispose(); return false;} return true;});
  for(const f of fires){ f.t+=dt; const k=Math.max(0,1-f.t/f.life), n=f.r*f.r*k*dt*14;
    for(let i=0;i<n||Math.random()<n;i++){ const a=Math.random()*6.283, rr=Math.sqrt(Math.random())*f.r; ADD.emit(f.x+Math.cos(a)*rr,f.y+.15,f.z+Math.sin(a)*rr,R(-.3,.3),R(1.5,3.5),R(-.3,.3),R(.35,.8),R(.6,1.2)*(.5+k*.5),.15,1,R(.4,.65),.12,.9,-1.2,1); if(i>40) break; }
    if(Math.random()<dt*f.r*3) SMK.emit(f.x+R(-f.r,f.r)*.5,f.y+1,f.z+R(-f.r,f.r)*.5,R(-.4,.4),R(1.5,3),R(-.4,.4),R(2,3.5),1,3.5,.16,.15,.14,.5*k,-.3,.5);
    if(Math.random()<dt*2) for(const u of units) if(u.alive&&!u.def.fly&&Math.hypot(u.x-f.x,u.z-f.z)<f.r){ u.burn=Math.max(u.burn,1.2); }
    if(Math.random()<dt*2) for(const c of critters) if(!c.dead&&Math.hypot(c.x-f.x,c.z-f.z)<f.r) hurtCritter(c,8);
    if(Math.random()<dt*.4) for(const o of obstacles) if(!o.dead&&TREES[o.type]&&!o.burning&&Math.hypot(o.x-f.x,o.z-f.z)<f.r+1.5) igniteObs(o); }
  fires=fires.filter(f=>f.t<f.life);
  for(const o of burningObs){ o.burning-=dt; const h=o.h*.7;
    for(let i=0;i<2;i++) ADD.emit(o.x+R(-1,1),o.y+R(1,h),o.z+R(-1,1),R(-.3,.3),R(2,4),R(-.3,.3),R(.4,.8),R(.8,1.6),.2,1,R(.4,.6),.1,.9,-1,1);
    if(Math.random()<dt*6) SMK.emit(o.x,o.y+h+1,o.z,R(-.4,.4),R(2,3),R(-.4,.4),R(2.5,4),1.5,4,.15,.14,.13,.5,-.3,.4);
    if(o.burning>2&&Math.random()<dt*.25) for(const q of obstacles) if(!q.dead&&!q.burning&&TREES[q.type]&&Math.hypot(q.x-o.x,q.z-o.z)<4.5){ igniteObs(q); break; }
    hurtObs(o,o.def.hp*dt/7); }
  burningObs=burningObs.filter(o=>!o.dead&&o.burning>0);
}
function igniteObs(o){ if(o.dead||o.burning) return; o.burning=7; burningObs.push(o); }
function flash(x,y,z,r,col){
  const m=new THREE.Mesh(sphereG,new THREE.MeshBasicMaterial({color:col||0xffb050,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,y,z); m.scale.setScalar(r*.3); scene.add(m); flashes.push({m,t:0,max:.38,r});
}
const _zA=new THREE.Vector3(0,0,1);
function layDecal(m,x,z,lift){ m.quaternion.setFromUnitVectors(_zA,gNormal(x,z)); m.position.set(x,gh(x,z)+(lift||.06)+Math.random()*.02,z); }
function decal(x,z,r){
  const m=new THREE.Mesh(circleG,new THREE.MeshBasicMaterial({color:0x14110d,transparent:true,opacity:.42,depthWrite:false}));
  layDecal(m,x,z); m.scale.setScalar(r*R(.55,.8)); scene.add(m); decals.push(m);
  if(decals.length>120){const o=decals.shift(); scene.remove(o); o.material.dispose();}
}
/* physics debris chunks */
let chunks=[]; const chunkG=new THREE.BoxGeometry(1,1,1);
function spawnChunks(x,y,z,hx,hz,h,col,n){
  for(let i=0;i<n;i++){ if(chunks.length>350){const o=chunks.shift(); scene.remove(o.m);}
    const s=R(.25,.8)*Math.min(1.5,.4+h*.25), m=new THREE.Mesh(chunkG,M(col)); m.scale.set(s,s*R(.6,1.2),s); m.castShadow=true;
    m.position.set(x+R(-hx,hx),y+R(0,h),z+R(-hz,hz)); scene.add(m);
    chunks.push({m,vx:R(-6,6),vy:R(3,11),vz:R(-6,6),ax:R(-8,8),ay:R(-8,8),az:R(-8,8),s,fl:s*.4,life:R(18,28),sleep:false,trail:i<4?R(.5,1.3):0});}
}
/* any object already in the scene becomes a physics body (limbs, turrets, rotor blades, helmets) */
function addDebris(obj,vx,vy,vz,life,fl){
  if(chunks.length>350){const o=chunks.shift(); scene.remove(o.m);}
  obj.traverse(m=>{m.matrixAutoUpdate=true;});
  chunks.push({m:obj,vx,vy,vz,ax:R(-9,9),ay:R(-9,9),az:R(-9,9),s:1,fl:fl==null?.15:fl,life:life||40,sleep:false,keep:true,bleed:0});
}
function detach(obj){ obj.updateWorldMatrix(true,false); scene.attach(obj); return obj; }
function updateChunks(dt){
  for(const c of chunks){
    c.life-=dt;
    if(!c.sleep){ c.vy-=22*dt; c.m.position.x+=c.vx*dt; c.m.position.y+=c.vy*dt; c.m.position.z+=c.vz*dt;
      c.m.rotation.x+=c.ax*dt; c.m.rotation.y+=c.ay*dt; c.m.rotation.z+=c.az*dt;
      if(c.trail>0){ c.trail-=dt; const p=c.m.position; SMK.emit(p.x,p.y,p.z,R(-.2,.2),R(0,.4),R(-.2,.2),R(.5,1),.35,1.1,.2,.19,.18,.6,-.2,.8); if(c.fire) ADD.emit(p.x,p.y,p.z,0,.5,0,.2,.8,.2,1,.55,.15,1,0,0); }
      if(c.bleed>0&&S.gore){ c.bleed-=dt; if(Math.random()<.5) SMK.emit(c.m.position.x,c.m.position.y,c.m.position.z,R(-.3,.3),0,R(-.3,.3),.6,.12,.2,c.bc>>16&255?((c.bc>>16)&255)/255:.45,((c.bc>>8)&255)/255,(c.bc&255)/255,.9,15,0); }
      const fl=c.fl+gh(c.m.position.x,c.m.position.z); if(c.m.position.y<fl){c.m.position.y=fl; c.vy*=-.3; c.vx*=.55; c.vz*=.55; c.ax*=.5; c.ay*=.5; c.az*=.5;
        if(Math.abs(c.vy)<.6&&Math.abs(c.vx)+Math.abs(c.vz)<.4) c.sleep=true;} }
    if(c.life<2&&!c.keep) c.m.scale.multiplyScalar(1-dt*1.5); else if(c.life<2) c.m.visible=false;
  }
  chunks=chunks.filter(c=>{if(c.life<=0){scene.remove(c.m); return false;} return true;});
}

/* ---------- sound ---------- */
let AC=null,NB=null,master=null,muted=false; const lastS={};
function initAudio(){
  if(AC){ if(AC.state==='suspended') AC.resume(); return; }
  try{ AC=new (window.AudioContext||window.webkitAudioContext)(); NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    const ch=NB.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
    master=AC.createGain(); master.gain.value=.5*VOL.master*VOL.sfx; const comp=AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
    // battlefield echo: a convolution reverb made from decaying noise
    const len=AC.sampleRate*2.4, ir=AC.createBuffer(2,len,AC.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2);}
    const conv=AC.createConvolver(); conv.buffer=ir; revSend=AC.createGain(); revSend.gain.value=.5; revSend.connect(conv); conv.connect(master);
  }catch(e){AC=null;}
}
let revSend=null;
const VOL={master:1,sfx:1};
function applyVolumes(){ if(master) master.gain.setValueAtTime(.5*VOL.master*VOL.sfx,AC.currentTime); Music.setVol(); }
const GAP={shot:.03,mg:.03,pistol:.04,musket:.08,snipe:.09,boom:.05,cannon:.08,rocket:.08,flame:.16,place:.05,whistle:.3,hit:.07,heal:.4,laser:.05,arrow:.05,rail:.12,coin:.05,win:1,thud:.1};
function sfxVol(x,z){ let vol=1; if(x!==undefined){const d=Math.hypot(x-cam.tx,z-cam.tz); vol=Math.max(.05,1-d/(110+cam.r*.6));} vol*=clamp(1.5-cam.r/220,.35,1.2); if(S.mode==='menu') vol*=.35; return vol; }
function sfx(type,x,z,mag){
  if(!AC||muted||(S.speed>2.5&&(type==='shot'||type==='mg'||type==='arrow'||type==='laser'||type==='pistol'))) return;
  const now=AC.currentTime; if(lastS[type]&&now-lastS[type]<GAP[type]) return; lastS[type]=now;
  const vol=sfxVol(x,z);
  const out=(g,wet)=>{g.connect(master); if(wet&&revSend){const w=AC.createGain(); w.gain.value=wet; g.connect(w); w.connect(revSend);}};
  const tone=(f0,f1,a,t,ty,wet,d0)=>{const st=now+(d0||0),o=AC.createOscillator(),og=AC.createGain(); o.type=ty||'sine'; o.frequency.setValueAtTime(f0,st); o.frequency.exponentialRampToValueAtTime(f1,st+t); og.gain.setValueAtTime(a*vol,st); og.gain.exponentialRampToValueAtTime(.0008,st+t); o.connect(og); out(og,wet); o.start(st); o.stop(st+t+.02);};
  const nz=(ft,f,a,t,q,wet,d0)=>{const st=now+(d0||0),src=AC.createBufferSource(); src.buffer=NB; const fl=AC.createBiquadFilter(); fl.type=ft; fl.frequency.value=f; if(q) fl.Q.value=q; const g=AC.createGain(); src.connect(fl); fl.connect(g); out(g,wet); g.gain.setValueAtTime(a*vol,st); g.gain.exponentialRampToValueAtTime(.0008,st+t); src.start(st,Math.random()*.5); src.stop(st+t+.02);};
  switch(type){
    case 'shot': nz('bandpass',R(1300,1900),.26,.07,.7,.25); nz('lowpass',450,.3,.12,0,.2); tone(150,55,.22,.08); break;
    case 'mg': nz('bandpass',R(1200,1700),.2,.05,.7,.2); tone(130,55,.18,.05); break;
    case 'pistol': nz('bandpass',2500,.18,.05,.8,.2); tone(220,90,.1,.05); break;
    case 'musket': nz('lowpass',900,.55,.35,0,.6); tone(95,38,.35,.25); nz('highpass',3000,.1,.15,0,.3,.02); break;
    case 'snipe': nz('lowpass',3500,.55,.4,0,.8); tone(700,90,.18,.12,'square',.3); tone(60,30,.3,.25); break;
    case 'boom': { const m=Math.min(1.6,mag||1); nz('lowpass',700,.85*m,1.3,0,.7); tone(75,24,.75*m,.8,'sine',.3); nz('highpass',2500,.12*m,.5,0,.4,.12); nz('lowpass',200,.4*m,1.8,0,.9,.05); break; }
    case 'cannon': nz('lowpass',1400,.65,.55,0,.6); tone(120,35,.45,.35,'sine',.3); break;
    case 'rocket': nz('bandpass',700,.32,.5,.5,.3); tone(300,900,.05,.4,'sawtooth'); break;
    case 'flame': nz('lowpass',600,.16,.3,0,.15); nz('bandpass',180,.12,.3,.5); break;
    case 'hit': nz('highpass',2600,.12,.06); break;
    case 'thud': nz('lowpass',300,.25,.2); tone(90,45,.2,.15); break;
    case 'arrow': nz('highpass',3500,.08,.14); tone(1200,700,.02,.1,'triangle'); break;
    case 'place': nz('highpass',3000,.07,.05); break;
    case 'laser': tone(R(1600,2000),250,.07,.14,'square',.25); tone(R(800,1000),150,.04,.12,'sawtooth'); break;
    case 'rail': tone(150,2600,.13,.25,'sawtooth',.4); nz('highpass',2000,.22,.35,0,.5); break;
    case 'heal': tone(660,990,.06,.25,'triangle',.3); tone(990,1320,.04,.25,'triangle',.3,.08); break;
    case 'whistle': tone(1500,450,.08,.6,'sine',.3); break;
    case 'coin': tone(900,1500,.08,.12,'triangle'); break;
    case 'win': tone(523,1046,.12,.6,'triangle',.4); break;
  }
}
/* ---------- synthesized voices: screams, battle cries, death groans, animals ---------- */
const VLAST={};
const VOICES={
  scream:()=>({f:[R(300,380),R(380,460),R(260,320)],dur:R(.3,.45),form:[[700,1],[1100,.5]],br:.15,vib:4,vd:.02,vol:.07,gap:1.2}),
  death:()=>({f:[R(150,200),R(120,160),R(70,95)],dur:R(.35,.55),form:[[500,1],[900,.5],[2400,.2]],br:.25,vib:5,vd:.03,vol:.28,gap:.1}),
  cry:()=>({f:[R(150,220),R(220,300),R(170,230)],dur:R(.5,.8),form:[[600,1],[1000,.8],[2500,.3]],br:.18,vib:6,vd:.05,vol:.2,gap:0}),
  alien:()=>({f:[R(500,600),R(700,800),R(350,420)],dur:.35,form:[[900,1],[1800,.4]],br:.2,vib:12,vd:.06,vol:.06,gap:.8}),
  roar:()=>({f:[R(60,75),R(80,95),R(45,55)],dur:R(1,1.3),form:[[250,1],[550,.5]],br:.9,vib:6,vd:.04,vol:.3,gap:2}),
  moo:()=>({f:[105,125,95],dur:1.1,form:[[400,1],[800,.4]],br:.05,vib:3,vd:.02,vol:.25,gap:.6}),
  baa:()=>({f:[300,330,280],dur:.6,form:[[700,1],[1600,.5]],br:.1,vib:28,vd:.12,vol:.2,gap:.5}),
  cluck:()=>({f:[700,900,520],dur:.11,form:[[1500,1]],br:.3,vib:0,vd:0,vol:.16,rep:3,gap:.4}),
  bark:()=>({f:[350,430,260],dur:.14,form:[[900,1],[1800,.5]],br:.6,vib:0,vd:0,vol:.2,rep:2,gap:.5})
};
function voice(kind,x,z,delay){
  if(!AC||muted||!VOICES[kind]) return; const v=VOICES[kind](), now=AC.currentTime;
  if(!delay&&VLAST[kind]&&now-VLAST[kind]<v.gap) return; VLAST[kind]=now;
  const vol=sfxVol(x,z)*v.vol; if(vol<.012) return;
  for(let r=0;r<(v.rep||1);r++){
    const t=now+(delay||0)+r*.17, d=v.dur;
    const o=AC.createOscillator(); o.type='sawtooth';
    o.frequency.setValueAtTime(v.f[0],t); o.frequency.linearRampToValueAtTime(v.f[1],t+d*.3); o.frequency.linearRampToValueAtTime(v.f[2],t+d);
    if(v.vib){ const l=AC.createOscillator(), lg=AC.createGain(); l.frequency.value=v.vib; lg.gain.value=v.f[0]*v.vd; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+d+.05); }
    const env=AC.createGain(); env.gain.setValueAtTime(.0001,t); env.gain.linearRampToValueAtTime(vol,t+.04); env.gain.setValueAtTime(vol,t+d*.7); env.gain.exponentialRampToValueAtTime(.0005,t+d);
    for(const [ff,w] of v.form){ const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=ff; bp.Q.value=7; const g=AC.createGain(); g.gain.value=w*2.2; o.connect(bp); bp.connect(g); g.connect(env); }
    if(v.br){ const src=AC.createBufferSource(); src.buffer=NB; const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1800; bp.Q.value=1; const g=AC.createGain(); g.gain.value=v.br; src.connect(bp); bp.connect(g); g.connect(env); src.start(t,Math.random()*.4); src.stop(t+d+.05); }
    env.connect(master); if(revSend){const w=AC.createGain(); w.gain.value=.35; env.connect(w); w.connect(revSend);}
    o.start(t); o.stop(t+d+.05);
  }
}
function crowdRoar(x,z,delay,size){
  if(!AC||muted) return; const t=AC.currentTime+(delay||0), vol=sfxVol(x,z)*.32*(size||1);
  for(const [f,q,a] of [[420,.8,1],[850,1.2,.7],[1500,1.5,.35]]){
    const src=AC.createBufferSource(); src.buffer=NB; const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=f; bp.Q.value=q;
    const g=AC.createGain(); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol*a,t+.35); g.gain.setValueAtTime(vol*a,t+.9); g.gain.exponentialRampToValueAtTime(.0005,t+2.2);
    const l=AC.createOscillator(), lg=AC.createGain(); l.frequency.value=R(5,8); lg.gain.value=vol*a*.25; l.connect(lg); lg.connect(g.gain); l.start(t); l.stop(t+2.3);
    src.connect(bp); bp.connect(g); g.connect(master); if(revSend){const w=AC.createGain(); w.gain.value=.5; g.connect(w); w.connect(revSend);} src.start(t,Math.random()*.3); src.stop(t+2.3);
  }
}
function eraSignal(era){ // horn, fanfare, bugle, radio, synth – the order to attack
  if(!AC||muted) return; const t0=AC.currentTime+.05;
  const note=(f,t,d,type,a,lp)=>{const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f,t0+t); let last=o; if(lp){const fl=AC.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=lp; o.connect(fl); last=fl;}
    last.connect(g); g.gain.setValueAtTime(.0001,t0+t); g.gain.linearRampToValueAtTime(a,t0+t+.06); g.gain.setValueAtTime(a,t0+t+d*.7); g.gain.exponentialRampToValueAtTime(.0005,t0+t+d); g.connect(master); if(revSend){const w=AC.createGain(); w.gain.value=.6; g.connect(w); w.connect(revSend);} o.start(t0+t); o.stop(t0+t+d+.05);};
  if(era===0){ note(98,0,1.6,'sawtooth',.12,600); note(147,.2,1.4,'sawtooth',.06,700); }                 // war horn
  else if(era===1){ [[392,0,.2],[392,.22,.2],[523,.44,.7]].forEach(([f,t,d])=>note(f,t,d,'square',.05,2200)); } // trumpets
  else if(era===2){ [[392,0,.15],[523,.17,.15],[659,.34,.15],[784,.51,.6]].forEach(([f,t,d])=>note(f,t,d,'triangle',.09)); } // bugle
  else if(era===3){ note(1200,0,.08,'square',.03); note(1200,.15,.08,'square',.03); note(880,.35,.4,'sine',.05); } // radio
  else { note(220,0,.6,'sawtooth',.05,3000); note(440,.1,.6,'sawtooth',.04,3000); note(880,.2,.8,'sine',.04); }     // synth
}
function battleCry(){
  for(const team of S.teams){ const l=units.filter(u=>u.alive&&u.team===team&&u.def.organic); if(!l.length) continue;
    const cx=l.reduce((a,u)=>a+u.x,0)/l.length, cz=l.reduce((a,u)=>a+u.z,0)/l.length; crowdRoar(cx,cz,R(0,.25),Math.min(1.4,.5+l.length/40)); }
  eraSignal(Music.era);
  for(const u of units) if(u.alive&&(u.def.model==='dino'||u.def.model==='queen'||u.def.model==='dragon'||u.def.model==='elephant')) voice('roar',u.x,u.z,.4);
}

/* ---------- camera ---------- */
const cam={tx:0,tz:0,theta:Math.PI*.5,phi:.92,r:120};
let shake=0;
function updateCam(){
  const s=Math.sin(cam.phi);
  camera.position.set(cam.tx+cam.r*s*Math.sin(cam.theta),cam.r*Math.cos(cam.phi),cam.tz+cam.r*s*Math.cos(cam.theta));
  const gy=gh(cam.tx,cam.tz); camera.position.y+=gy; const cg=gh(camera.position.x,camera.position.z)+4; if(camera.position.y<cg) camera.position.y=cg;
  camera.lookAt(cam.tx,gy,cam.tz);
  if(shake>.01){camera.position.x+=R(-shake,shake); camera.position.y+=R(-shake,shake); camera.position.z+=R(-shake,shake);}
}
function panBy(dx,dy){
  const s=cam.r*.0017, cx=Math.cos(cam.theta), sx=Math.sin(cam.theta);
  cam.tx+=-cx*dx*s-sx*dy*s; cam.tz+=sx*dx*s-cx*dy*s;
  cam.tx=clamp(cam.tx,-HALF-20,HALF+20); cam.tz=clamp(cam.tz,-HALF-20,HALF+20);
}

/* ---------- world ---------- */
let units=[], corpses=[], obstacles=[], projs=[], pending=[];
const V1=new THREE.Vector3();
function addObstacle(type,x,z,rq,w,d){
  const def=OBS[type]; if(!def) return null; x=clamp(x,-HALF+.5,HALF-.5); z=clamp(z,-HALF+.5,HALF-.5);
  let W=w||def.w, D=d||def.d; const W_=W, D_=D; const rot=rq&&!(type==='water'||type==='bridge');
  if(rq){const q=W; W=D; D=q;}
  const o={type,def,x,z,hx:W/2,hz:D/2,w:W,d:D,h:def.h,hp:def.hp,low:!!def.low,walk:!!def.walk,noCover:!!def.noCover,rq,dead:false};
  o.mesh=buildObsMesh(type,o); if(rot) o.mesh.rotation.y=Math.PI/2;
  if(type==='water'){ let W=TER.waters.find(q=>Math.abs(q.x-x)<.01&&Math.abs(q.z-z)<.01); if(!W){ W=carveWater(x,z,W_,D_); refreshTerrain(); } o.y=W.level-.6; o.mesh.visible=false; }
  else if(type==='bridge'){ let b=TER.bridges.find(q=>Math.abs(q.x-x)<.01&&Math.abs(q.z-z)<.01); if(!b){ b=addBridgeSpan(x,z,W_,D_); refreshTerrain(); } o.y=b.y-.27; }
  else { let m=gh(x,z); for(const [cx,cz] of [[-1,-1],[1,-1],[-1,1],[1,1]]) m=Math.min(m,gh(x+cx*o.hx,z+cz*o.hz)); o.y=m-(TREES[type]?.15:.25); }
  o.mesh.position.set(x,o.y,z); scene.add(o.mesh); obstacles.push(o); NAV.dirty=true; return o;
}
const TREES={tree:1,pine:1,snowpine:1,palm:1,cactus:1};
let fallers=[];
function destroyObs(o){
  if(o.dead) return; o.dead=true; NAV.dirty=true;
  if(TREES[o.type]){ // trees break at the trunk and fall over
    const a=o.hitA!=null?o.hitA:Math.random()*6.283; fallers.push({m:o.mesh,ax:Math.cos(a),az:-Math.sin(a),ang:0,v:0,t:0});
    spawnChunks(o.x,o.y,o.z,.3,.3,1.5,0x5a3d22,4); sfx('hit',o.x,o.z); return;
  }
  scene.remove(o.mesh);
  const area=o.hx*o.hz, n=Math.min(40,8+area*3);
  for(let i=0;i<n;i++) SMK.emit(o.x+R(-o.hx,o.hx),o.y+R(.3,o.h),o.z+R(-o.hz,o.hz),R(-1,1),R(.5,2),R(-1,1),R(1.5,3),2,5,.55,.52,.48,.5,-.3,.6);
  spawnChunks(o.x,o.y,o.z,o.hx,o.hz,o.h,o.def.col,Math.round(clamp(4+area*.8,4,16)));
  if(o.def.explode) pending.push({t:R(.08,.22),fn:()=>explosion(o.x,o.y+.7,o.z,6.5,130,null,null,'blast')});
}
function hurtObs(o,amt,fx,fz){
  if(o.dead||o.def.hp>1e8) return; o.hp-=amt;
  if(fx!=null) o.hitA=Math.atan2(o.z-fz,o.x-fx);
  if(o.hp<=0){ destroyObs(o); return; }
  // damage stages: big things lose their top and shed debris
  const st=o.hp<o.def.hp*.33?2:o.hp<o.def.hp*.66?1:0;
  if(st>(o.stage||0)&&!TREES[o.type]&&o.h>1.5){ o.stage=st; o.h*=.78; o.mesh.scale.y*=.78;
    spawnChunks(o.x,o.y+o.h,o.z,o.hx,o.hz,.6,o.def.col,Math.round(clamp(3+o.hx*o.hz*.3,3,10)));
    for(let i=0;i<10;i++) SMK.emit(o.x+R(-o.hx,o.hx),o.y+o.h,o.z+R(-o.hz,o.hz),R(-1,1),R(.5,2),R(-1,1),R(1.5,3),1.5,4,.55,.52,.48,.5,-.3,.6); }
}
function updateFallers(dt){
  for(const f of fallers){ f.t+=dt; if(f.ang<Math.PI/2){ f.v+=dt*3.2; f.ang=Math.min(Math.PI/2,f.ang+f.v*dt); f.m.rotation.x=f.az*f.ang; f.m.rotation.z=-f.ax*f.ang;
      if(f.ang>=Math.PI/2){ const x=f.m.position.x+f.ax*3.5, z=f.m.position.z+f.az*3.5; const fy=gh(x,z); for(let i=0;i<12;i++) SMK.emit(x,fy+.4,z,R(-2,2),R(.5,1.5),R(-2,2),1.2,.8,2.2,.55,.5,.42,.6,0,1.5); shake=Math.min(1,shake+.1);} }
    if(f.t>30){ f.m.position.y-=dt*.5; } }
  fallers=fallers.filter(f=>{if(f.t>34){scene.remove(f.m); return false;} return true;});
}
function clearObstacles(){ for(const o of obstacles) scene.remove(o.mesh); obstacles=[]; }
function segBox(x1,z1,x2,z2,o,pad){
  let tmin=0,tmax=1; const dx=x2-x1,dz=z2-z1;
  const a0=o.x-o.hx-pad,a1=o.x+o.hx+pad,b0=o.z-o.hz-pad,b1=o.z+o.hz+pad;
  if(Math.abs(dx)<1e-9){if(x1<a0||x1>a1) return -1;} else {let t1=(a0-x1)/dx,t2=(a1-x1)/dx; if(t1>t2){const q=t1;t1=t2;t2=q;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; if(tmin>tmax) return -1;}
  if(Math.abs(dz)<1e-9){if(z1<b0||z1>b1) return -1;} else {let t1=(b0-z1)/dz,t2=(b1-z1)/dz; if(t1>t2){const q=t1;t1=t2;t2=q;} if(t1>tmin)tmin=t1; if(t2<tmax)tmax=t2; if(tmin>tmax) return -1;}
  return tmin;
}
function los(ax,az,bx_,bz,ay,by){ for(const o of obstacles){ if(o.dead||o.low) continue; if(segBox(ax,az,bx_,bz,o,0)>=0) return false; } if(ay!=null&&!terrainLos(ax,ay,az,bx_,by,bz)) return false; return true; }
function pushOut(u){
  for(const o of obstacles){
    if(o.dead||o.walk) continue; const hx=o.hx+u.rad, hz=o.hz+u.rad, dx=u.x-o.x, dz=u.z-o.z;
    if(Math.abs(dx)<hx&&Math.abs(dz)<hz){
      if(!o.def.water&&u.def.mass>=40&&o.def.hp<5000){hurtObs(o,200); continue;}   // giants crush small things
      const px=hx-Math.abs(dx), pz=hz-Math.abs(dz); if(px<pz) u.x+=(dx<0?-1:1)*px; else u.z+=(dz<0?-1:1)*pz;
    }
  }
  // stand on bridges: ok. keep in bounds
  u.x=clamp(u.x,-HALF+1,HALF-1); u.z=clamp(u.z,-HALF+1,HALF-1);
}

/* ---------- units ---------- */
let uid=0;
const barGeo=new THREE.PlaneGeometry(1,.14), barBg=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:.7,depthWrite:false});
const stats={};
const pipGeo=new THREE.PlaneGeometry(.16,.16), pipMat=new THREE.MeshBasicMaterial({color:0xffd34a,depthWrite:false,side:THREE.DoubleSide});
function addUnit(type,team,x,z,rot){
  const d=DEFS[type]; if(!d) return null;
  const p=buildUnitModel(d,team,S.skins[team]);
  const u=Object.assign({id:++uid,type,def:d,team,x:clamp(x,-HALF+1,HALF-1),z:clamp(z,-HALF+1,HALF-1),y:gh(clamp(x,-HALF+1,HALF-1),clamp(z,-HALF+1,HALF-1))+(d.fly||0),
    rot:rot!=null?rot:defaultRot(team),hp:d.hp,alive:true,cd:Math.random()*d.rate,rt:Math.random()*.3,
    target:null,buff:1,phase:Math.random()*6,stuck:0,detour:0,dsign:1,burn:0,burnSrc:null,kills:0,deadT:0,rad:d.rad,
    moving:false,mvAng:0,losT:0,rank:0,mhp:d.hp,downed:0,losOk:true,losFor:null,swing:0,anim:0,kvx:0,kvz:0,dvx:0,dvy:0,dvz:0,run:0,tipI:0,removed:false},p);
  u.g.position.set(u.x,u.y,u.z); u.g.rotation.y=u.rot; scene.add(u.g);
  const bw=d.model?Math.min(6,2.4*(d.scale||1)):1.1, bar=new THREE.Group();
  const bg=new THREE.Mesh(barGeo,barBg); bg.scale.set(bw+.08,1.5,1);
  const fg=new THREE.Mesh(barGeo,new THREE.MeshBasicMaterial({color:TEAMS[team].bar,depthWrite:false})); fg.scale.x=bw; fg.position.z=.01;
  bar.add(bg,fg); bar.visible=false; bar.renderOrder=3; scene.add(bar);
  u.bar=bar; u.fg=fg; u.bw=bw;
  u.pips=[]; for(let i=0;i<3;i++){const p=new THREE.Mesh(pipGeo,pipMat); p.position.set((i-1)*.26,.24,.02); p.rotation.z=Math.PI/4; p.visible=false; bar.add(p); u.pips.push(p);}
  if(!d.fly) pushOut(u);
  S.placed[team]=(S.placed[team]||0)+d.cost;
  units.push(u); return u;
}
function defaultRot(team){return team==='blue'?Math.PI/2:team==='red'?-Math.PI/2:team==='green'?0:Math.PI;}
function removeUnit(u){ scene.remove(u.g); scene.remove(u.bar); u.fg.material.dispose(); u.removed=true; }
function clearUnits(){
  for(const u of units) removeUnit(u); for(const u of corpses) removeUnit(u); units=[]; corpses=[];
  for(const p of projs) scene.remove(p.mesh); projs=[]; pending=[]; tracers=[];
  for(const c of chunks) scene.remove(c.m); chunks=[]; for(const f of fallers) scene.remove(f.m); fallers=[]; for(const g of rings) scene.remove(g.m); rings=[]; fires=[]; burningObs=[]; clearCritters();
  for(const d of decals){scene.remove(d); d.material.dispose();} decals=[];
  ADD.clear(); SMK.clear();
  for(const t of TEAM_IDS) stats[t]={lost:0,lostCost:0};
}
const aimY=t=>t.y+t.def.hy;
const isVehDef=d=>!!d.model&&d.model!=='rider';

function armorMul(d,kind){
  if(!d.armor) return 1;
  if(LIGHT[kind]) return d.armor;
  if(kind==='laser') return Math.sqrt(d.armor);
  if(HEAVY[kind]) return 1.4;
  return .85;
}
function hurt(u,amt,src,kind){
  if(!u.alive) return; const d=u.def; u.lastKind=kind;
  if(d.shield&&src&&(LIGHT[kind]||kind==='laser')){
    const fx=Math.sin(u.rot),fz=Math.cos(u.rot),dx=src.x-u.x,dz=src.z-u.z,l=Math.hypot(dx,dz)||1;
    if((fx*dx+fz*dz)/l>.35){amt*=1-d.shield; if(Math.random()<.3) ADD.emit(u.x+fx*.6,u.y+1.1,u.z+fz*.6,R(-2,2),R(1,3),R(-2,2),.15,.25,.1,.6,.9,1,1,10,0);}
  }
  if(src&&src.def&&src.def.antiCav&&d.mounted) amt*=src.def.antiCav;
  if(src&&src.def&&src.def.antiAir) amt*=d.fly?src.def.antiAir:.5;
  amt*=armorMul(d,kind);
  if(d.armor&&d.armor<.6&&LIGHT[kind]&&Math.random()<.25) ADD.emit(u.x+R(-1,1),aimY(u),u.z+R(-1,1),R(-3,3),R(1,4),R(-3,3),.12,.2,.05,1,.85,.5,1,15,0);
  if(u.downed>0){ kill(u,src); return; }
  u.hp-=amt;
  if(u.def.organic&&S.gore&&amt>1.5){ const dx=src&&src.x!=null?u.x-src.x:0, dz=src&&src.x!=null?u.z-src.z:0, l=Math.hypot(dx,dz)||1;
    bleed(u.x,aimY(u),u.z,Math.min(10,1+amt/12|0),u.def.bloodC,dx/l,dz/l);
    if(amt>u.mhp*.12&&Math.random()<.3) bloodDecal(u.x+R(-.6,.6),u.z+R(-.6,.6),.35,u.def.bloodC);
    if(u.hp>0&&u.arms&&(HEAVY[kind]||kind==='blast'||kind==='grenade'||kind==='mortar'||kind==='stomp'||(kind==='melee'&&amt>=30))&&amt>=u.mhp*.25&&Math.random()<.35) loseLimb(u,{x:dx/l*4,z:dz/l*4}); }
  if(u.hp<=0){
    if(-u.hp<u.mhp*.6&&canDown(u)){ u.hp=0; u.downed=5; u.target=null; u.downSrc=src; u.burn=0; u.medic=null; u.mt=0; return; }
    kill(u,src);
  }
}
/* ---------- blood & limbs ---------- */
const bloodMats={};
function bloodDecal(x,z,r,c){ if(!S.gore) return; const k=c||0x6a0a0a; const mat=bloodMats[k]||(bloodMats[k]=new THREE.MeshBasicMaterial({color:k,transparent:true,opacity:.6,depthWrite:false}));
  const m=new THREE.Mesh(circleG,mat); layDecal(m,x,z,.07); m.scale.set(r*R(.7,1.2),r*R(.7,1.2),1); scene.add(m); decals.push(m);
  if(decals.length>220){const o=decals.shift(); scene.remove(o); if(!Object.values(bloodMats).includes(o.material)) o.material.dispose();} }
function bleed(x,y,z,n,c,dx,dz){
  if(!S.gore) return; const r=((c>>16)&255)/255, g=((c>>8)&255)/255, b=(c&255)/255;
  for(let i=0;i<n;i++) SMK.emit(x,y,z,(dx||0)*R(1,4)+R(-1.5,1.5),R(.5,3.5),(dz||0)*R(1,4)+R(-1.5,1.5),R(.4,.8),R(.1,.22),R(.05,.12),r,g,b,.95,18,.5);
}
function loseLimb(u,imp){
  if(!S.gore||!u.arms||u.def.model) return false;
  const opts=[]; u.arms.forEach((a,i)=>{if(a.parent===u.body||a.parent&&a.parent.parent===u.body) opts.push(['arm',i,a]);}); if(u.legs) u.legs.forEach((l,i)=>opts.push(['leg',i,l]));
  if(!opts.length) return false;
  const [kind,i,limb]=opts[Math.floor(Math.random()*opts.length)];
  limb.getWorldPosition(V1); const px=V1.x,py=V1.y,pz=V1.z;
  detach(limb); const ix=imp?imp.x:R(-3,3), iz=imp?imp.z:R(-3,3);
  addDebris(limb,ix*.8+R(-2,2),R(3,7),iz*.8+R(-2,2),45,.12);
  chunks[chunks.length-1].bleed=1.5; chunks[chunks.length-1].bc=u.def.bloodC;
  bleed(px,py,pz,14,u.def.bloodC,ix*.2,iz*.2); bloodDecal(u.x,u.z,.7,u.def.bloodC);
  if(kind==='arm'){ u.weak=(u.weak||1)*.6; if(i===0&&u.gun){ u.gun.visible=u.def.atk==='melee'; } }
  else { u.slow=.4; u.legs=null; u.body.position.y=-.35; }
  return true;
}
function canDown(u){
  const d=u.def; if(d.model||d.fly||d.boss||u.revived) return false;
  for(const o of units) if(o.alive&&!(o.downed>0)&&o!==u&&o.team===u.team&&o.def.atk==='heal') return true;
  return false;
}
function revive(u,m){
  u.downed=0; u.hp=u.mhp*.35; u.body.rotation.x=0; u.revived=true;
  for(let i=0;i<14;i++) ADD.emit(u.x+R(-.5,.5),u.y+R(.3,2),u.z+R(-.5,.5),R(-.5,.5),R(1.5,3),R(-.5,.5),.9,.45,.15,.3,1,.4,1,0,0);
  if(m) m.kills=m.kills; sfx('heal',u.x,u.z); S.revives=(S.revives||0)+1;
}
function updateDowned(u,dt){
  u.downed-=dt;
  if(u.downed<=0){ u.downed=0; kill(u,u.downSrc); return; }
  u.mt-=dt;
  if(u.mt<=0||!u.medic||!u.medic.alive||u.medic.downed>0){ u.mt=.3; let best=null,bs=1e9;
    for(const o of units) if(o.alive&&!(o.downed>0)&&o.team===u.team&&o.def.atk==='heal'&&o!==u){const s=Math.hypot(o.x-u.x,o.z-u.z); if(s<bs){bs=s;best=o;}}
    u.medic=best; }
  const m=u.medic;
  if(m){ const dx=m.x-u.x, dz=m.z-u.z, dd=Math.hypot(dx,dz)||.01;
    if(dd<m.def.rng+u.rad+m.rad+1){ revive(u,m); return; }
    const sp=u.def.spd*.65*dt*(u.slow||1); u.x+=dx/dd*sp; u.z+=dz/dd*sp; pushOut(u); u.moving=true; u.mvAng=Math.atan2(dx,dz); u.rot=turnTo(u.rot,u.mvAng,8*dt);
    u.phase+=dt*u.def.spd*2; const s=Math.sin(u.phase)*.5; if(u.legs&&u.legs.length>1){u.legs[0].rotation.x=s; u.legs[1].rotation.x=-s;}
  } else u.moving=false;
  u.body.rotation.x=-.5; u.y=gh(u.x,u.z);
  if(Math.random()<dt*3) SMK.emit(u.x,u.y+.3,u.z,0,.3,0,.6,.2,.5,.55,.1,.1,.6,0,1);
}
function kill(u,src){
  u.alive=false; u.hp=0; u.bar.visible=false; u.target=null; u.burn=0; u.deadT=0;
  u.downed=0; if(u.body) u.body.rotation.x=0;
  if(src&&src.team!==u.team&&src.kills!=null){ src.kills++; promote(src); }
  const st=stats[u.team]; if(st){st.lost++; st.lostCost+=u.def.cost;}
  const d=u.def;
  // face away from the hit so the body falls backwards from it
  const recentImp=u.impT!=null&&S.t-u.impT<.05;
  if(recentImp){ u.rot=Math.atan2(-u.impX,-u.impZ); u.dvx=u.impX; u.dvz=u.impZ; u.dvy=Math.min(9,u.impY*1.2/Math.sqrt(d.mass)); }
  else if(src&&src.x!=null) u.rot=Math.atan2(src.x-u.x,src.z-u.z);
  u.spinD=R(-1,1);
  if(d.organic){ if(d.model==='dino'||d.model==='dragon'||d.model==='elephant'||d.model==='queen') voice('roar',u.x,u.z); else sfx('thud',u.x,u.z); }
  if(d.organic&&S.gore){ bloodDecal(u.x,u.z,d.model?2.2:1,d.bloodC); bleed(u.x,aimY(u),u.z,10,d.bloodC);
    if(u.arms){ const blast=recentImp||HEAVY[u.lastKind]; const n=blast?(Math.random()<.7?1+(Math.random()<.4?1:0):0):(u.lastKind==='melee'&&Math.random()<.3?1:0);
      for(let i=0;i<n;i++) loseLimb(u,recentImp?{x:u.impX,z:u.impZ}:null); } }
  if(u.turret&&(d.die==='wreck')&&Math.random()<.75){ const t=detach(u.turret); u.turret=null; t.traverse(m=>{if(m.isMesh) m.material=CHAR;}); pending.push({t:0,fn:()=>{const c=chunks[chunks.length-1]; if(c&&c.m===t){c.trail=2.5; c.fire=1;}}}); addDebris(t,R(-3,3)+(u.impX||0)*.3,R(7,13)*Math.min(1.5,25/Math.sqrt(d.mass)),R(-3,3)+(u.impZ||0)*.3,60,.4); }
  if(u.rotors&&d.die==='crash'){ for(const r of u.rotors){ if(d.model==='saucer') continue; const t=detach(r); addDebris(t,R(-6,6),R(4,8),R(-6,6),40,.1);} u.rotors=null; }
  if(d.die==='wreck'||d.die==='mech') groundFire(u.x,u.z,Math.min(3,d.rad*.7),R(12,20));
  if(d.die==='wreck'){ charUnit(u); u.dvy=Math.max(u.dvy,clamp(14/Math.sqrt(d.mass),1.5,6)); u.tilt=R(-.25,.25); explosion(u.x,1,u.z,Math.min(6,2.5+d.rad),25,null,null,'blast'); }
  if(d.die==='mech'){ charUnit(u); }
  if(d.die==='crash'){ u.falling=true; u.dvy=0; }
  if(d.boss) explosion(u.x,2,u.z,10,0,null,null,'blast');
}
const RANKS=[0,2,5,10];
function promote(u){
  if(!u.alive) return; let r=0; for(let i=1;i<RANKS.length;i++) if(u.kills>=RANKS[i]) r=i;
  if(r>u.rank){ u.rank=r; const old=u.mhp; u.mhp=u.def.hp*(1+.1*r); u.hp=Math.min(u.mhp,u.hp+(u.mhp-old)+u.def.hp*.1);
    for(let i=0;i<16;i++) ADD.emit(u.x,aimY(u)+.5,u.z,R(-2,2),R(2,4),R(-2,2),.8,.4,.1,1,.85,.2,1,4,1);
    if(u.pips) u.pips.forEach((p,i)=>p.visible=i<r); sfx('coin',u.x,u.z); }
}
function charUnit(u){ u.g.traverse(m=>{if(m.isMesh&&m.material!==barBg) m.material=CHAR;}); }

function explosion(x,y,z,r,dmg,team,src,kind,col){
  { const g0=gh(x,z)+.3; if(y<g0) y=g0; }
  for(const u of units){
    if(!u.alive) continue; if(team&&u.team===team&&!S.ff) continue;
    const dx=u.x-x,dz=u.z-z,dy=aimY(u)-y, dd=Math.sqrt(dx*dx+dz*dz+dy*dy*.5)-u.rad*.5;
    if(dd<r){
      const f=1-Math.max(0,dd)/r, hl=Math.hypot(dx,dz)||1, imp=Math.min(16,(12+dmg*.15)*f);
      if(!u.def.fly){ const k=imp/Math.sqrt(u.def.mass); u.kvx+=dx/hl*k*.6; u.kvz+=dz/hl*k*.6; }
      u.impX=dx/hl*imp*.7; u.impZ=dz/hl*imp*.7; u.impY=imp; u.impT=S.t;
      if(dmg>0) hurt(u,dmg*(1-.65*Math.max(0,dd)/r),src,kind);
    }
  }
  if(dmg>0) for(const o of obstacles){
    if(o.dead) continue; const dx=Math.max(0,Math.abs(o.x-x)-o.hx), dz=Math.max(0,Math.abs(o.z-z)-o.hz), dd=Math.hypot(dx,dz);
    if(dd<r&&y<o.y+o.h+r) hurtObs(o,dmg*(1-.5*dd/r)*1.2,x,z);
  }
  for(const c of critters){ if(c.dead) continue; const dx=c.x-x,dz=c.z-z,dd=Math.hypot(dx,dz); if(dd<r+c.rad){ const f=1-dd/(r+c.rad); c.kvx=(c.kvx||0)+dx/(dd||1)*f*12; c.kvz=(c.kvz||0)+dz/(dd||1)*f*12; c.impY=f*9; if(dmg>0) hurtCritter(c,Math.max(20,dmg)*f,true); } }
  noise(x,z,r*5+20);
  for(const c of chunks){if(!c.m.parent) continue; const dx=c.m.position.x-x,dz=c.m.position.z-z,dd=Math.hypot(dx,dz); if(dd<r*1.5){c.sleep=false; c.vx+=dx/(dd||1)*6; c.vz+=dz/(dd||1)*6; c.vy+=6*(1-dd/(r*1.5));}}
  boomFx(x,y,z,r,col);
  const cd=Math.hypot(x-cam.tx,z-cam.tz); shake=Math.min(1.6,shake+r*.08*Math.max(.15,1-cd/120)*clamp(140/cam.r,.4,1.5));
  sfx('boom',x,z,r/4);
}
function boomFx(x,y,z,r,col){
  const pl=col==='plasma';
  flash(x,y,z,r,pl?0xc070ff:0xffb050);
  boomLight.position.set(x,y+2,z); boomLight.color.setHex(pl?0xb070ff:0xffa050); boomLight.intensity=Math.max(boomLight.intensity,Math.min(5,r*.8));
  shockRing(x,y,z,r,pl?0xd0a0ff:null);
  for(let i=0;i<5+r;i++) ADD.emit(x,y+.4,z,R(-1,1)*r,R(0,r),R(-1,1)*r,.12,r*.9,r*.3,1,1,.9,1,0,3);  // white-hot core
  for(let i=0;i<6+r*5;i++){const a=Math.random()*6.283, sp=R(4,10)*Math.sqrt(r); ADD.emit(x,y+.3,z,Math.cos(a)*sp,R(4,12),Math.sin(a)*sp,R(1,2.4),.22,.08,1,R(.5,.8),.2,1,14,.3);} // embers
  if(r>=5&&!pl){ for(let i=0;i<10+r*2;i++){const k=Math.random(); SMK.emit(x+R(-.6,.6),y+k*r*1.2,z+R(-.6,.6),R(-.4,.4),R(3,6)*(1-k*.4),R(-.4,.4),R(3,5),r*.4,r*1.6,.18,.16,.15,.55,-.4,.5);}
    for(let i=0;i<12;i++){const a=i/12*6.283; SMK.emit(x,y+r*1.3,z,Math.cos(a)*3,R(1.5,2.5),Math.sin(a)*3,R(3,5),r*.6,r*1.8,.2,.18,.17,.5,-.3,.6);} }
  if(!pl&&y<gh(x,z)+2&&r>=2.5&&Math.random()<.55) groundFire(x,z,Math.min(4,r*.45),R(4,9));
  if(!pl&&r>=3.5) for(const o of obstacles) if(!o.dead&&TREES[o.type]&&Math.hypot(o.x-x,o.z-z)<r) { if(Math.random()<.5) igniteObs(o); }
  const nf=10+r*7;
  for(let i=0;i<nf;i++){const a=Math.random()*6.283,s=R(.3,1)*r*2.6; if(pl) ADD.emit(x,y+.3,z,Math.cos(a)*s,R(1,r*2),Math.sin(a)*s,R(.3,.7),R(1,1.8)*Math.sqrt(r)*.7,R(.4,1),.75,.35,1,1,4,2.5);
    else ADD.emit(x,y+.3,z,Math.cos(a)*s,R(1,r*2.2),Math.sin(a)*s,R(.3,.7),R(1,1.8)*Math.sqrt(r)*.7,R(.4,1),1,R(.45,.75),.18,1,4,2.5);}
  for(let i=0;i<6+r*4;i++) SMK.emit(x+R(-r*.4,r*.4),y+R(0,1),z+R(-r*.4,r*.4),R(-1.5,1.5),R(1.5,4),R(-1.5,1.5),R(1.6,3.2),r*.5,r*1.4,.2,.19,.18,.62,-.4,.8);
  for(let i=0;i<4+r*3;i++) SMK.emit(x,y+.3,z,R(-6,6),R(4,11),R(-6,6),R(.8,1.5),.25,.2,.32,.26,.18,1,22,.2);
  if(y<gh(x,z)+2) decal(x,z,r);
}

/* ---------- targeting ---------- */
function dm(u){ return u.buff*(1+.15*(u.rank||0))*(u.weak||1); }
function findTarget(u){
  const d=u.def, C=coord(u); let best=null,bs=1e9;
  for(const o of units){
    if(!o.alive||o.team===u.team) continue; if(o.def.fly&&!d.air) continue;
    let s=Math.hypot(o.x-u.x,o.z-u.z);
    if(d.anti&&o.def.armor&&o.def.armor<.6) s*=.45;
    if((d.atk==='bullet'||d.atk==='arrow')&&o.def.armor&&o.def.armor<.6) s*=1.6;
    if(d.antiCav&&o.def.mounted) s*=.5;
    if((d.atk==='melee')&&isVehDef(o.def)) s*=2;
    if(d.atk==='bomb') s=Math.hypot(o.x-u.x,o.z-u.z);
    if(o.downed>0) continue;
    if(d.antiAir&&o.def.fly) s*=.3;
    if(d.assassin&&(o.def.role==='arty'||o.def.role==='support')) s*=.35;
    if(u.target===o) s*=.85;
    if(C&&C.focus===o) s*=.55;
    if(s<bs){bs=s; best=o;}
  }
  return best;
}
function findPatient(u){
  let best=null,bs=45;
  for(const o of units){ if(!o.alive||o.team!==u.team||o===u||isVehDef(o.def)||(o.hp>=o.mhp&&!(o.downed>0))) continue;
    const s=Math.hypot(o.x-u.x,o.z-u.z)*(o.downed>0?.15:o.hp/o.mhp+.3); if(s<bs){bs=s;best=o;} }
  return best;
}
function nearestAlly(u){
  let best=null,bs=1e9;
  for(const o of units){ if(!o.alive||o.downed>0||o.team!==u.team||o===u||o.def.atk==='heal'||o.def.fly) continue; const s=Math.hypot(o.x-u.x,o.z-u.z); if(s<bs){bs=s;best=o;} }
  return best;
}
function auraBuff(u){
  for(const o of units){ if(o.alive&&o!==u&&o.team===u.team&&o.def.aura&&Math.hypot(o.x-u.x,o.z-u.z)<o.def.aura) return 1.35; }
  return 1;
}
function angDiff(a,b){let d=b-a; while(d>Math.PI)d-=6.2832; while(d<-Math.PI)d+=6.2832; return d;}
function turnTo(a,b,m){const d=angDiff(a,b); return a+clamp(d,-m,m);}
function aligned(u,face){
  if(u.turret) return Math.abs(angDiff(u.rot+u.turret.rotation.y,face))<.25;
  return Math.abs(angDiff(u.rot,face))<(u.def.fly?.5:.45);
}

/* ---------- simple path finding: bridges and going around big obstacles ---------- */
function findWaypoint(u,t){
  let first=null,ft=2;
  for(const o of obstacles){
    if(o.dead||o.walk) continue; if(!o.def.water&&(o.low||o.hx*o.hz<3)) continue;
    const tt=segBox(u.x,u.z,t.x,t.z,o,u.rad+.2); if(tt>=0&&tt<ft){ft=tt; first=o;}
  }
  if(!first) return null;
  if(first.def.water){
    let best=null,bs=1e9;
    for(const b of obstacles){ if(b.dead||!b.walk) continue; const c=Math.hypot(b.x-u.x,b.z-u.z)+Math.hypot(t.x-b.x,t.z-b.z); if(c<bs){bs=c; best=b;} }
    if(best&&!(Math.abs(u.x-best.x)<best.hx&&Math.abs(u.z-best.z)<best.hz)){
      // walk to the bridge end on our side, then across
      const ax=Math.abs(best.hx)>Math.abs(best.hz);
      return ax?{x:best.x+(u.x<best.x?-1:1)*(best.hx-.5)*.2,z:best.z}:{x:best.x,z:best.z+(u.z<best.z?-1:1)*(best.hz-.5)*.2};
    }
  }
  const pad=u.rad+1; let best=null,bs=1e9;
  for(const sx of [-1,1]) for(const sz of [-1,1]){
    const c={x:first.x+sx*(first.hx+pad),z:first.z+sz*(first.hz+pad)};
    if(Math.abs(c.x)>HALF-1||Math.abs(c.z)>HALF-1) continue;
    if(segBox(u.x,u.z,c.x,c.z,first,u.rad*.5)>=0) continue;
    const cost=Math.hypot(c.x-u.x,c.z-u.z)+Math.hypot(t.x-c.x,t.z-c.z); if(cost<bs){bs=cost; best=c;}
  }
  return best;
}

/* ---------- attacks ---------- */
const NEEDLOS={bullet:1,laser:1,rail:1,rocket:1,shell:1,plasma:1,flame:1};
function tipPos(u){ const t=u.tips[u.tipI%u.tips.length]; u.tipI++; t.getWorldPosition(V1); return V1; }
function accBonus(u){ const b=S.bots[u.team]; return b?DIFF[b.diff].acc:0; }
function act(u,t,dist){
  const d=u.def; u.anim=1;
  switch(d.atk){
    case 'bullet': case 'laser': shootHitscan(u,t,dist); break;
    case 'rail': shootRail(u,t); break;
    case 'rocket': case 'shell': case 'plasma': case 'fireball': fireProj(u,t,d.atk); if(d.v==='super'||d.v==='gunship') pending.push({t:.15,fn:()=>{if(u.alive&&t.alive) fireProj(u,t,d.atk);}}); break;
    case 'grenade': case 'mortar': case 'boulder': case 'cannonball': case 'ionball': { lob(u,t,d.atk,dist); for(let i=1;i<(d.volley||1);i++) pending.push({t:i*.15,fn:()=>{if(u.alive&&t.alive) lob(u,t,d.atk,dist);}}); break; }
    case 'arrow': case 'stone': { const n=d.volley||1; for(let i=0;i<n;i++) shootArrow(u,t,d.atk,i>0); break; }
    case 'bomb': dropBomb(u,t); break;
    case 'flame': flameTick(u); break;
    case 'melee': { let m=dm(u)*R(.8,1.2); if(d.charge&&u.run>5){m*=2; u.run=0; SMK.emit(t.x,t.y+1,t.z,0,2,0,.6,.6,1.6,.6,.55,.45,.7,0,1);} hurt(t,d.dmg*m,u,'melee'); u.swing=.25; SMK.emit(t.x,t.y+1,t.z,R(-1,1),R(1,2),R(-1,1),.4,.3,.9,.6,.55,.45,.6,0,1); sfx('hit',u.x,u.z); break; }
    case 'stomp': { const fx=Math.sin(u.rot),fz=Math.cos(u.rot), sx=u.x+fx*u.rad, sz=u.z+fz*u.rad;
      for(const o of units){ if(!o.alive||o.team===u.team||o.def.fly) continue; const dd=Math.hypot(o.x-sx,o.z-sz); if(dd<d.splash+o.rad){ const hl=dd||1; o.kvx+=(o.x-sx)/hl*8/Math.sqrt(o.def.mass); o.kvz+=(o.z-sz)/hl*8/Math.sqrt(o.def.mass); o.impX=(o.x-sx)/hl*6; o.impZ=(o.z-sz)/hl*6; o.impY=8; o.impT=S.t; hurt(o,d.dmg*dm(u)*(1-.5*dd/(d.splash+o.rad)),u,'stomp'); } }
      for(let i=0;i<24;i++){const a=i/24*6.283; SMK.emit(sx,u.y+.3,sz,Math.cos(a)*8,R(.5,2),Math.sin(a)*8,.8,.8,2.2,.55,.5,.42,.7,0,2.5);}
      for(const c of critters){ if(!c.dead&&Math.hypot(c.x-sx,c.z-sz)<d.splash+c.rad) hurtCritter(c,d.dmg,true); } noise(u.x,u.z,40);
      shake=Math.min(1.5,shake+.4); sfx('boom',u.x,u.z,.6); break; }
    case 'heal': if(t.downed>0){ revive(t,u); break; } t.hp=Math.min(t.mhp,t.hp+d.heal); for(let i=0;i<5;i++) ADD.emit(t.x+R(-.4,.4),t.y+R(.8,1.8),t.z+R(-.4,.4),0,R(1,2),0,.7,.35,.15,.3,1,.4,1,0,0); sfx('heal',u.x,u.z); break;
  }
}
function muzzle(x,y,z,s,r,g,b){ s=s||.7; ADD.emit(x,y,z,0,0,0,.06,s*1.3,s*.4,r||1,g||.9,b||.55,1,0,0); ADD.emit(x,y,z,0,0,0,.035,s*.6,s*.2,1,1,.95,1,0,0); }
function shotFx(u,p,ex,ey,ez,hit,t,las){
  const dx=ex-p.x, dy=ey-p.y, dz=ez-p.z, L=Math.hypot(dx,dy,dz)||1, nx=dx/L, ny=dy/L, nz=dz/L;
  for(let i=0;i<3;i++) ADD.emit(p.x,p.y,p.z,nx*R(8,16)+R(-1.5,1.5),ny*R(8,16)+R(-1,1.5),nz*R(8,16)+R(-1.5,1.5),R(.05,.1),.25,.05,1,.8,.4,1,0,4);
  ADD.emit(p.x,p.y,p.z,dx/.09,dy/.09,dz/.09,.09,las?.7:.45,las?.4:.3,1,las?.95:.85,las?1:.5,1,0,0);  // glowing bullet head
  if(!las){ SMK.emit(p.x,p.y,p.z,nx*1.5,R(.2,.6),nz*1.5,R(.4,.8),.15,.6,.85,.85,.85,.35,-.2,1.5);
    if(Math.random()<.6) ADD.emit(p.x,p.y-.05,p.z,-nz*R(1.5,3)+R(-.5,.5),R(2,3.5),nx*R(1.5,3)+R(-.5,.5),R(.6,1),.09,.08,.95,.75,.3,1,18,0); } // brass casing
  if(hit&&t&&(t.def.armor&&t.def.armor<.7||t.def.model&&!t.def.organic)){ for(let i=0;i<6;i++) ADD.emit(ex,ey,ez,R(-4,4)-nx*3,R(1,5),R(-4,4)-nz*3,R(.15,.35),.18,.05,1,.85,.45,1,15,.5); }
  else if(!hit&&ey<gh(ex,ez)+.6){ const gy=gh(ex,ez); SMK.emit(ex,gy+.15,ez,R(-.5,.5),R(1,2.5),R(-.5,.5),R(.5,.9),.25,.8,.55,.48,.38,.7,6,1); ADD.emit(ex,gy+.15,ez,R(-2,2),R(1,3),R(-2,2),.15,.15,.05,1,.8,.5,1,15,0); }
  if(las&&hit){ for(let i=0;i<5;i++) ADD.emit(ex,ey,ez,R(-2,2),R(-1,2),R(-2,2),.3,.4,.1,.5,.9,1,1,0,1); }
}
function coverBetween(u,t){
  if(t.def.fly||u.def.fly) return null;
  for(const o of obstacles){ if(o.dead||!o.low||o.noCover) continue; const tt=segBox(u.x,u.z,t.x,t.z,o,.1); if(tt>.5) return {o,tt}; }
  return null;
}
function shootHitscan(u,t,dist){
  const d=u.def, p=tipPos(u), ay=aimY(t), las=d.atk==='laser';
  let acc=(d.acc||.8)*(1-.35*Math.min(1,dist/d.rng))*(coord(u)?1:.93)+accBonus(u); if(t.moving) acc*=.9; if(S.night>.6&&!las) acc*=.9;
  const cv=coverBetween(u,t); if(cv) acc*=.45;
  let ex,ey,ez;
  if(Math.random()<acc){
    hurt(t,d.dmg*dm(u)*R(.8,1.2),u,d.atk); ex=t.x+R(-.2,.2); ey=ay+R(-.3,.3); ez=t.z+R(-.2,.2);
    if(d.splash) explosion(ex,ey,ez,d.splash,d.dmg*.5,u.team,u,'laser');
    else if(Math.random()<.4) (las?ADD:SMK).emit(ex,ey,ez,R(-1,1),R(.5,1.5),R(-1,1),.3,.2,.6,las?.3:.5,las?.9:.45,las?1:.4,.5,0,1);
  } else if(cv&&Math.random()<.6){
    ex=u.x+(t.x-u.x)*cv.tt; ez=u.z+(t.z-u.z)*cv.tt; ey=R(.3,cv.o.h); hurtObs(cv.o,d.dmg*.3);
    SMK.emit(ex,ey,ez,R(-1,1),R(1,2.5),R(-1,1),.5,.3,.9,.6,.5,.38,.7,3,1);
  } else { ex=t.x+R(-2.2,2.2); ey=Math.max(0,ay+R(-1.2,1.2)); ez=t.z+R(-2.2,2.2); strayHit(ex,ez,d.dmg*.8,d.atk); }
  noise(u.x,u.z,24);
  const hitOK=Math.hypot(ex-t.x,ez-t.z)<.6; shotFx(u,p,ex,ey,ez,hitOK,t,las);
  if(las){ const c=TEAMS[u.team]; const r=((c.bar>>16)&255)/255,g=((c.bar>>8)&255)/255,b=(c.bar&255)/255;
    tracer(p.x,p.y,p.z,ex,ey,ez,.5+r*.5,.5+g*.5,.5+b*.5,.14,true); muzzle(p.x,p.y,p.z,.8,.5+r*.5,.5+g*.5,.5+b*.5); sfx('laser',u.x,u.z); return; }
  const sn=d.dmg>=50;
  tracer(p.x,p.y,p.z,ex,ey,ez,1,sn?.95:.8,sn?.8:.35,sn?.12:.08);
  muzzle(p.x,p.y,p.z,sn?1:.7);
  if(d.smoke) for(let i=0;i<6;i++) SMK.emit(p.x,p.y,p.z,R(-.5,.5)+Math.sin(u.rot)*2,R(.2,1),R(-.5,.5)+Math.cos(u.rot)*2,R(1.2,2),.6,2,.92,.92,.92,.7,-.2,1);
  sfx(d.smoke?'musket':sn?'snipe':d.rate<=.2?'mg':d.look&&d.look.g==='pistol'?'pistol':'shot',u.x,u.z);
}
function shootRail(u,t){
  const d=u.def, p=tipPos(u), dx=t.x-u.x, dz=t.z-u.z, L=Math.hypot(dx,dz)||1, nx=dx/L, nz=dz/L, ey=aimY(t);
  const ex=u.x+nx*d.rng, ez=u.z+nz*d.rng; let hits=0;
  const list=units.filter(o=>o.alive&&o.team!==u.team).map(o=>{const rx=o.x-u.x,rz=o.z-u.z,along=rx*nx+rz*nz,perp=Math.abs(rx*nz-rz*nx); return {o,along,perp};})
    .filter(h=>h.along>0&&h.along<d.rng&&h.perp<o_rad(h.o)+.6).sort((a,b)=>a.along-b.along);
  for(const h of list){ if(hits>=d.pierce) break; hurt(h.o,d.dmg*dm(u)*(hits?0.8:1),u,'rail'); hits++; }
  tracer(p.x,p.y,p.z,ex,ey,ez,.5,.8,1,.35,true); tracer(p.x,p.y+.05,p.z,ex,ey+.05,ez,.4,.6,1,.3,true);
  for(let i=0;i<20;i++){const k=Math.random(); ADD.emit(p.x+(ex-p.x)*k,p.y+(ey-p.y)*k,p.z+(ez-p.z)*k,R(-.5,.5),R(-.5,.5),R(-.5,.5),.4,.4,.1,.4,.7,1,1,0,1);}
  sfx('rail',u.x,u.z);
}
function o_rad(o){return o.rad;}
const PGEO={rocket:new THREE.BoxGeometry(.18,.18,.8),shell:new THREE.SphereGeometry(.22,6,4),plasma:new THREE.SphereGeometry(.32,8,6),grenade:new THREE.SphereGeometry(.18,6,4),mortar:new THREE.SphereGeometry(.22,6,4),
  boulder:new THREE.DodecahedronGeometry(.5,0),cannonball:new THREE.SphereGeometry(.24,8,6),arrow:new THREE.BoxGeometry(.05,.05,.9),stone:new THREE.SphereGeometry(.12,5,4),bomb:new THREE.BoxGeometry(.35,.35,.8),ionball:new THREE.SphereGeometry(.45,10,8),fireball:new THREE.SphereGeometry(.6,10,8)};
const PMAT={rocket:M(0x3a3a2a),shell:new THREE.MeshBasicMaterial({color:0xffe9a0}),plasma:new THREE.MeshBasicMaterial({color:0xd27cff}),grenade:M(0x2b3320),mortar:M(0x22261c),
  boulder:M(0x7d7b76),cannonball:M(0x1a1a1a),arrow:M(0x6b4a2e),stone:M(0x888888),bomb:M(0x2a2a2a),ionball:new THREE.MeshBasicMaterial({color:0x8ae8ff}),fireball:new THREE.MeshBasicMaterial({color:0xff8a2a})};
function spawnProj(p){ p.mesh=new THREE.Mesh(PGEO[p.kind],PMAT[p.kind]); p.mesh.position.set(p.x,p.y,p.z); scene.add(p.mesh); projs.push(p); }
function fireProj(u,t,kind){
  const d=u.def, p=tipPos(u);
  let dx=t.x-p.x, dy=aimY(t)-p.y, dz=t.z-p.z; const L=Math.hypot(dx,dy,dz)||1, sp=kind==='shell'?95:kind==='plasma'?60:kind==='fireball'?35:42, s=.035*(1-accBonus(u)*3);
  dx=dx/L+R(-s,s); dy=dy/L+R(-s,s)*.6; dz=dz/L+R(-s,s); const n=Math.hypot(dx,dy,dz);
  spawnProj({kind,x:p.x,y:p.y,z:p.z,vx:dx/n*sp,vy:dy/n*sp,vz:dz/n*sp,g:0,life:L/sp+.6,team:u.team,src:u,dmg:d.dmg*dm(u),splash:d.splash||1.5});
  if(kind!=='plasma'&&kind!=='fireball') for(let i=0;i<(kind==='shell'?10:5);i++) SMK.emit(p.x,p.y,p.z,R(-1,1)+dx*3,R(0,1.5),R(-1,1)+dz*3,R(.6,1.2),.5,1.8,.75,.72,.68,.5,-.2,1.5);
  if(kind==='plasma') muzzle(p.x,p.y,p.z,1.6,.8,.4,1); else muzzle(p.x,p.y,p.z,kind==='shell'?2.2:1.2);
  sfx(kind==='shell'?'cannon':kind==='plasma'?'laser':'rocket',u.x,u.z);
}
function lob(u,t,kind,dist){
  const d=u.def, p=tipPos(u);
  const errK={mortar:.06,boulder:.07,cannonball:.035,grenade:.05,ionball:.04}[kind], err=dist*errK+.4-accBonus(u)*4, tx=t.x+R(-err,err), tz=t.z+R(-err,err);
  const hx=tx-p.x, hz=tz-p.z, hd=Math.hypot(hx,hz)||.1;
  const T={mortar:1.4+hd/30,boulder:1.2+hd/32,cannonball:.35+hd/45,grenade:.35+hd/18,ionball:1.6+hd/35}[kind], G=kind==='cannonball'?16:22;
  spawnProj({kind,x:p.x,y:p.y,z:p.z,vx:hx/T,vy:(gh(tx,tz)-p.y+.5*G*T*T)/T,vz:hz/T,g:G,life:T+1.5,team:u.team,src:u,dmg:d.dmg*dm(u),splash:d.splash});
  if(kind==='ionball') muzzle(p.x,p.y,p.z,2,.4,.8,1); else {muzzle(p.x,p.y,p.z,1); SMK.emit(p.x,p.y,p.z,0,1.5,0,1,.5,1.5,.7,.7,.7,.5,0,1);}
  sfx(kind==='ionball'?'rail':kind==='grenade'?'hit':kind==='boulder'?'arrow':'cannon',u.x,u.z);
}
function shootArrow(u,t,kind,extra){
  const d=u.def, p=tipPos(u), ay=aimY(t);
  const dist=Math.hypot(t.x-p.x,t.z-p.z), acc=(d.acc||.7)*(coord(u)?1:.93)+accBonus(u), err=(1-acc)*dist*.12+(extra?R(1,3):0);
  const tx=t.x+R(-err,err)+(t.moving?Math.sin(t.mvAng)*t.def.spd*.4:0), tz=t.z+R(-err,err)+(t.moving?Math.cos(t.mvAng)*t.def.spd*.4:0);
  const hx=tx-p.x, hz=tz-p.z, hd=Math.hypot(hx,hz)||.1, T=Math.max(.25,hd/(kind==='stone'?24:30)), G=16;
  spawnProj({kind,x:p.x,y:p.y,z:p.z,vx:hx/T,vy:(ay-p.y+.5*G*T*T)/T,vz:hz/T,g:G,life:T+1,team:u.team,src:u,dmg:d.dmg*dm(u),direct:1});
  sfx('arrow',u.x,u.z);
}
function dropBomb(u,t){
  const d=u.def;
  spawnProj({kind:'bomb',x:u.x+R(-1,1),y:u.y-3,z:u.z+R(-1,1),vx:(t.x-u.x)*.4,vy:0,vz:(t.z-u.z)*.4,g:22,life:5,team:u.team,src:u,dmg:d.dmg*dm(u),splash:d.splash});
}
function flameTick(u){
  const d=u.def, fx=Math.sin(u.rot), fz=Math.cos(u.rot);
  for(const o of units){
    if(!o.alive||o.team===u.team||o.def.fly) continue;
    const dx=o.x-u.x,dz=o.z-u.z,dist=Math.hypot(dx,dz)||.01;
    if(dist>d.rng+o.rad) continue; if((dx*fx+dz*fz)/dist<.82) continue;
    hurt(o,d.dmg*dm(u),u,'flame'); o.burn=Math.max(o.burn,1.6); o.burnSrc=u;
  }
  for(const o of obstacles){ if(!o.dead&&(o.type==='tree'||o.type==='pine'||o.type==='fence'||o.type==='palm')&&Math.hypot(o.x-u.x,o.z-u.z)<d.rng){ hurtObs(o,1.5,u.x,u.z); if(TREES[o.type]&&Math.random()<.05) igniteObs(o); } }
  for(const c of critters){ if(c.dead) continue; const dx=c.x-u.x,dz=c.z-u.z,dist=Math.hypot(dx,dz)||.01; if(dist<d.rng&&(dx*fx+dz*fz)/dist>.82) hurtCritter(c,d.dmg); }
  noise(u.x,u.z,18);
  const p=tipPos(u);
  for(let i=0;i<4;i++){const sp=R(11,16); ADD.emit(p.x,p.y,p.z,fx*sp+R(-2,2),R(-.5,1.5),fz*sp+R(-2,2),R(.4,.6),.5,2.4,1,R(.45,.65),.12,.9,-1.5,2.2);}
  if(Math.random()<.3) SMK.emit(p.x+fx*6,1.5,p.z+fz*6,fx*2,2,fz*2,1.2,1,2.5,.25,.22,.2,.4,-.3,1);
  sfx('flame',u.x,u.z);
}
function updateProjs(dt){
  for(const p of projs){
    if(p.done) continue;
    p.vy-=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; p.life-=dt;
    p.mesh.position.set(p.x,p.y,p.z); V1.set(p.x+p.vx,p.y+p.vy,p.z+p.vz); p.mesh.lookAt(V1);
    if(p.kind==='rocket'){ SMK.emit(p.x,p.y,p.z,R(-.3,.3),R(0,.5),R(-.3,.3),R(.9,1.6),.4,1.6,.85,.83,.8,.6,-.3,1); ADD.emit(p.x,p.y,p.z,-p.vx*.05,-p.vy*.05,-p.vz*.05,.1,.9,.2,1,.6,.2,1,0,0); ADD.emit(p.x,p.y,p.z,R(-1,1),R(-1,1),R(-1,1),.25,.15,.05,1,.7,.3,1,6,0); }
    else if(p.kind==='ionball'){ ADD.emit(p.x,p.y,p.z,R(-.5,.5),R(-.5,.5),R(-.5,.5),.3,1.4,.3,.4,.8,1,1,0,0); }
    else if(p.kind==='fireball'){ for(let i=0;i<3;i++) ADD.emit(p.x,p.y,p.z,R(-1,1),R(0,1.5),R(-1,1),.5,1.4,.3,1,.55,.15,1,-1,1); }
    else if(p.kind==='plasma') ADD.emit(p.x,p.y,p.z,0,0,0,.15,.9,.2,.7,.35,1,1,0,0);
    else if((p.kind==='mortar'||p.kind==='boulder'||p.kind==='cannonball')&&Math.random()<.5) SMK.emit(p.x,p.y,p.z,0,0,0,.6,.3,.6,.8,.8,.8,.3,0,1);
    const pg=gh(p.x,p.z); let hit=p.y<=pg+.05||p.life<=0, direct=null; if(p.y<pg) p.y=pg;
    if(!hit) for(const o of obstacles){ if(!o.dead&&!o.walk&&p.y<o.y+o.h&&p.y>o.y-.5&&Math.abs(p.x-o.x)<o.hx&&Math.abs(p.z-o.z)<o.hz){hit=true; if(p.direct) hurtObs(o,p.dmg*.3); break;} }
    if(!hit&&p.kind!=='bomb'&&p.kind!=='mortar'&&p.kind!=='boulder'&&p.kind!=='ionball'){
      for(const u of units){ if(!u.alive||u.downed>0||u.team===p.team) continue; const dy=aimY(u)-p.y, hr=u.def.fly?u.rad+.5:(u.def.model?u.def.hy+.6:1.1);
        if(Math.abs(u.x-p.x)<u.rad+.5&&Math.abs(u.z-p.z)<u.rad+.5&&Math.abs(dy)<hr){hit=true; direct=u; break;} }
    }
    if(hit){
      p.done=true; scene.remove(p.mesh);
      if(p.direct){ if(direct) hurt(direct,p.dmg*R(.85,1.15),p.src,p.kind); else if(!strayHit(p.x,p.z,p.dmg,p.kind)) SMK.emit(p.x,.2,p.z,0,1,0,.4,.2,.6,.6,.55,.45,.6,0,1); continue; }
      if(direct) hurt(direct,p.dmg*.5,p.src,p.kind);
      explosion(p.x,Math.max(.3,p.y),p.z,p.splash,p.dmg,p.team,p.src,p.kind,(p.kind==='plasma'||p.kind==='ionball')?'plasma':null);
      if(p.kind==='fireball') groundFire(p.x,p.z,2.5,R(6,10));
      if(p.kind==='fireball') for(const u of units) if(u.alive&&u.team!==p.team&&Math.hypot(u.x-p.x,u.z-p.z)<p.splash+u.rad){u.burn=Math.max(u.burn,3); u.burnSrc=p.src;}
    }
  }
  projs=projs.filter(p=>!p.done);
}

/* ---------- unit update ---------- */
function updateUnit(u,dt,battle){
  const d=u.def;
  if(u.downed>0){ updateDowned(u,dt); return; }
  if(u.burn>0){ u.burn-=dt; hurt(u,7*dt,u.burnSrc,'fire'); if(Math.random()<dt*25) ADD.emit(u.x+R(-.3,.3),u.y+R(.5,1.8),u.z+R(-.3,.3),0,R(1,2.5),0,.4,.5,.1,1,.5,.1,.9,-1,0); if(!u.alive) return; }
  u.cd-=dt;
  // knockback physics
  if(Math.abs(u.kvx)+Math.abs(u.kvz)>.02){ u.x+=u.kvx*dt; u.z+=u.kvz*dt; const f=Math.exp(-5*dt); u.kvx*=f; u.kvz*=f; if(!d.fly) pushOut(u); }
  let mvx=0,mvz=0,face=null,inRange=false;
  const br=battle&&u.breach?breachStep(u,dt):null;
  if(br){ [mvx,mvz,face,inRange]=br; u.target=null; }
  else if(battle){
    u.rt-=dt;
    const C=coord(u);
    if(u.rt<=0){ u.rt=C?.25+Math.random()*.3:.5+Math.random()*.6; u.target=d.atk==='command'?null:d.atk==='heal'?findPatient(u):findTarget(u); u.buff=auraBuff(u); u.wp=null; u.blocked=false; if(!d.fly&&u.target){ if(d.atk==='heal') u.wp=findWaypoint(u,u.target); else u.blocked=pathBlocked(u,u.target); } }
    const t=u.target;
    if(t&&(!t.alive||(d.atk==='heal'&&t.hp>=t.mhp&&!(t.downed>0))||(d.atk!=='heal'&&t.downed>0))){ u.target=null; u.rt=0; }
    else if(t){
      const dx=t.x-u.x, dz=t.z-u.z, dist=Math.hypot(dx,dz)||.001, nx=dx/dist, nz=dz/dist;
      const dy=t.y-u.y, rd=d.atk==='bomb'?dist:Math.sqrt(dist*dist+dy*dy), reach=d.rng+t.rad;
      face=Math.atan2(nx,nz);
      let see=true;
      if(NEEDLOS[d.atk]&&!d.fly&&!t.def.fly){ u.losT-=dt; if(u.losT<=0||u.losFor!==t){u.losOk=los(u.x,u.z,t.x,t.z,aimY(u)+.3,aimY(t)); u.losT=.2+Math.random()*.1; u.losFor=t;} see=u.losOk; }
      const tooClose=(d.kite&&dist<d.kite)||(d.minRng&&dist<d.minRng);
      if(tooClose){mvx=-nx; mvz=-nz;}
      else if(rd>reach||!see){
        let fd=null;
        if(!d.fly&&d.atk!=='heal'&&(u.blocked||!see||u.stuckN>1)) fd=flowDir(u);
        if(fd){ mvx=fd.x; mvz=fd.z; }
        else if(u.wp){ const wx=u.wp.x-u.x, wz=u.wp.z-u.z, wl=Math.hypot(wx,wz); if(wl<1.5){u.wp=null; u.rt=Math.min(u.rt,.05); mvx=nx; mvz=nz;} else {mvx=wx/wl; mvz=wz/wl;} }
        else {mvx=nx; mvz=nz;}
      }
      inRange=rd<=reach&&see&&!(d.minRng&&dist<d.minRng);
      if(inRange&&u.cd<=0&&(aligned(u,face)||d.atk==='bomb'||d.atk==='heal'||(d.circle&&Math.abs(angDiff(u.rot,face))<1))){ act(u,t,rd); u.cd=d.rate*R(.85,1.15); }
    } else if(d.atk==='heal'){
      const a=nearestAlly(u); if(a){const dx=a.x-u.x,dz=a.z-u.z,dist=Math.hypot(dx,dz); if(dist>5){mvx=dx/dist; mvz=dz/dist;}}
    }
  }
  if(battle&&!d.fly) [mvx,mvz]=commandMove(u,mvx,mvz,inRange);
  if(d.circle){ const want=face!==null?face:Math.atan2(-u.x,-u.z); u.rot=turnTo(u.rot,want,.9*dt); mvx=Math.sin(u.rot); mvz=Math.cos(u.rot); face=null; }
  if(mvx||mvz){
    if(u.detour>0&&!d.circle&&!(u.blocked||u.stuckN>1)){ u.detour-=dt; const px=-mvz*u.dsign, pz=mvx*u.dsign; mvx=mvx*.25+px; mvz=mvz*.25+pz; const l=Math.hypot(mvx,mvz); mvx/=l; mvz/=l; }
    let slopeF=1; if(!d.fly){ const ahead=gh(u.x+mvx*1.5,u.z+mvz*1.5)-gh(u.x,u.z); slopeF=clamp(1-ahead/1.5*.9,.4,1.25); }
    const sp=d.spd*dt*(u.slow||1)*slopeF*(u.holdBack?.45:1), ox=u.x, oz=u.z;
    u.x+=mvx*sp; u.z+=mvz*sp; if(!d.fly) pushOut(u); else {u.x=clamp(u.x,-HALF+1,HALF-1); u.z=clamp(u.z,-HALF+1,HALF-1);}
    const moved=Math.hypot(u.x-ox,u.z-oz); u.run+=moved;
    if(moved<sp*.35){ u.stuck+=dt; if(u.stuck>.45){ u.stuck=0; u.stuckN=(u.stuckN||0)+1; if(u.detour<=0) u.dsign=Math.random()<.5?1:-1; u.detour=2.2; } }
    else { u.stuck=Math.max(0,u.stuck-dt); if(moved>sp*.8&&u.stuckN) u.stuckN=Math.max(0,u.stuckN-dt*.5); }
    u.moving=true; u.mvAng=Math.atan2(mvx,mvz);
  } else { u.moving=false; if(!inRange) u.run=0; }
  // facing & animation
  const veh=isVehDef(d)&&d.model!=='mech';
  if(u.turret){
    if(u.moving) u.rot=turnTo(u.rot,u.mvAng,(d.model==='mech'?3:2.2)*dt);
    const want=face!==null?angDiff(u.rot,face):0; u.turret.rotation.y=turnTo(u.turret.rotation.y,want,(d.model==='jeep'?6:d.model==='mech'?3:2.2)*dt);
  } else if(d.fly){
    if(!d.circle){ const want=face!==null?face:(u.moving?u.mvAng:u.rot); u.rot=turnTo(u.rot,want,2.4*dt); }
    u.phase+=dt*1.6; u.y=gh(u.x,u.z)+d.fly+Math.sin(u.phase)*.4;
    u.body.rotation.x=u.moving&&!inRange?.15:0;
  } else {
    const tr=veh||d.model==='elephant'||d.model==='rider'?clamp(6/Math.sqrt(d.mass),.5,4):9;
    const want=(face!==null&&(inRange||!u.moving))?face:(u.moving?u.mvAng:u.rot); u.rot=turnTo(u.rot,want,tr*dt);
  }
  if(!d.fly){ u.y=gh(u.x,u.z);
    if(isVehDef(d)&&d.die==='wreck'&&u.body){ const L=Math.max(1,u.rad), sx=Math.sin(u.rot)*L, sz=Math.cos(u.rot)*L, cx=Math.cos(u.rot)*L*.8, cz=-Math.sin(u.rot)*L*.8;
      u.body.rotation.x=-Math.atan2(gh(u.x+sx,u.z+sz)-gh(u.x-sx,u.z-sz),2*L); u.body.rotation.z=Math.atan2(gh(u.x+cx,u.z+cz)-gh(u.x-cx,u.z-cz),1.6*L); } }
  if(u.legs){
    const amp=u.legAmp||.6;
    if(u.moving){ u.phase+=dt*d.spd*2.6/(d.scale||1)/(u.legMode===4?1.6:1); const s=Math.sin(u.phase)*amp;
      if(u.legMode===4){u.legs[0].rotation.x=s; u.legs[1].rotation.x=-s; u.legs[2].rotation.x=-s; u.legs[3].rotation.x=s;}
      else if(u.legMode===6){u.legs.forEach((l,i)=>l.rotation.x=(i%2?s:-s));}
      else {u.legs[0].rotation.x=s; u.legs[1].rotation.x=-s;} }
    else for(const l of u.legs) l.rotation.x*=.85;
  }
  if(!u.legs&&u.slow&&u.moving){ u.phase+=dt*6; u.body.rotation.z=Math.sin(u.phase)*.25; }
  if(u.wings){ u.phase2=(u.phase2||0)+dt*5; const w=Math.sin(u.phase2)*.5; u.wings[0].rotation.z=w; u.wings[1].rotation.z=-w; }
  if(d.spawn&&battle){ u.spawnT=(u.spawnT==null?6:u.spawnT)-dt; if(u.spawnT<=0){ u.spawnT=9; for(let i=0;i<3;i++){const a=Math.random()*6.283; const m=addUnit(d.spawn,u.team,u.x+Math.cos(a)*(u.rad+2),u.z+Math.sin(a)*(u.rad+2)); if(m){ S.placed[u.team]-=m.def.cost; for(let k=0;k<10;k++) ADD.emit(m.x,m.y+1,m.z,R(-2,2),R(1,3),R(-2,2),.6,.6,.1,.4,1,.4,1,0,1);}} } }
  if(u.swing>0){ u.swing-=dt; u.gun.rotation.x=-Math.sin(u.swing/.25*Math.PI)*1.2; }
  if(u.arm){ u.anim=Math.max(0,u.anim-dt*1.5); u.arm.rotation.x=u.armRest+Math.sin(Math.min(1,u.anim)*Math.PI)*1.8; }
}
function updateDead(u,dt){
  u.deadT+=dt; const d=u.def;
  // ragdoll flight
  const G=gh(u.x,u.z);
  if(u.dvy!==0||u.y>G+.01&&!d.fly||Math.abs(u.dvx)+Math.abs(u.dvz)>.05){
    if(!(d.die==='crash'&&u.falling)){
      u.dvy-=22*dt; u.y+=u.dvy*dt; u.x+=u.dvx*dt; u.z+=u.dvz*dt;
      const G2=gh(u.x,u.z); if(u.y<=G2){u.y=G2; u.dvy=Math.abs(u.dvy)>3?-u.dvy*.25:0; u.dvx*=.5; u.dvz*=.5;}
      else if(d.die==='fall') u.body.rotation.z+=u.spinD*dt*6;
      u.x=clamp(u.x,-HALF+.5,HALF-.5); u.z=clamp(u.z,-HALF+.5,HALF-.5);
    }
  }
  switch(d.die){
    case 'fall': u.body.rotation.x=-Math.min(1,u.deadT/.45)*Math.PI/2; if(u.deadT>3&&u.y<=gh(u.x,u.z)+.02) toCorpse(u); break;
    case 'side': u.body.rotation.z=Math.min(1,u.deadT/.8)*Math.PI/2*(u.spinD<0?-1:1)*.95; if(u.deadT>3&&u.y<=gh(u.x,u.z)+.02) toCorpse(u); break;
    case 'mech': u.body.rotation.z=Math.min(1,u.deadT/1.2)*Math.PI/2*.9; if(u.deadT>1&&u.deadT<1.1) explosion(u.x,1,u.z,3+d.rad,0,null,null,'blast'); wreckSmoke(u,dt); if(u.deadT>12) toCorpse(u); break;
    case 'wreck': if(u.tilt) u.body.rotation.z=u.tilt*Math.min(1,u.deadT*2); wreckSmoke(u,dt); if(u.deadT>12) toCorpse(u); break;
    case 'crash':
      if(u.falling){ u.dvy-=18*dt; u.y+=u.dvy*dt; u.rot+=dt*3; if(Math.random()<.6) SMK.emit(u.x,u.y,u.z,0,1,0,1.2,.8,2.5,.15,.15,.15,.6,-.5,1);
        const gy=gh(u.x,u.z)+(d.model==='zeppelin'?2:d.model==='drone'?.3:d.model?1.2*(d.scale||1):.1); if(u.y<=gy){ u.y=gy; u.falling=false; u.dvy=0; charUnit(u); explosion(u.x,u.y,u.z,Math.min(8,3+d.rad),60,null,null,'blast'); if(u.rotors) u.rotors.forEach(r=>r.visible=false); u.body.rotation.z=.3; } }
      else { wreckSmoke(u,dt); if(u.deadT>14) toCorpse(u); }
      break;
  }
}
function wreckSmoke(u,dt){
  if(u.deadT<12&&Math.random()<dt*10) SMK.emit(u.x+R(-.8,.8),u.y+u.def.hy+.8,u.z+R(-.8,.8),R(-.3,.3),R(1.5,3),R(-.3,.3),R(2,3.5),1,3.5,.12,.12,.12,.55,-.3,.6);
  if(u.deadT<4&&Math.random()<dt*15) ADD.emit(u.x+R(-.8,.8),u.y+u.def.hy+.6,u.z+R(-.8,.8),0,R(1,3),0,.5,.8,.2,1,.5,.1,.9,-1,0);
}
const CORPSE_MAX=400;
function toCorpse(u){
  u.corpse=true; u.g.position.set(u.x,u.y,u.z); u.g.rotation.y=u.rot; u.g.updateMatrixWorld(true); u.g.traverse(m=>{m.matrixAutoUpdate=false;});
  corpses.push(u); u.movedOut=true;
  while(corpses.length>CORPSE_MAX){const o=corpses.shift(); removeUnit(o);}
}
function separation(){
  const grid=new Map(), CS=6;
  for(const u of units){ if(!u.alive) continue; const k=(Math.floor(u.x/CS)+50)*1000+Math.floor(u.z/CS)+50; let a=grid.get(k); if(!a){a=[];grid.set(k,a);} a.push(u); }
  for(const u of units){
    if(!u.alive) continue; const fl=!!u.def.fly, cx=Math.floor(u.x/CS)+50, cz=Math.floor(u.z/CS)+50;
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){
      const a=grid.get((cx+i)*1000+cz+j); if(!a) continue;
      for(const o of a){
        if(o===u||!!o.def.fly!==fl) continue;
        const dx=u.x-o.x, dz=u.z-o.z, md=(u.rad+o.rad)*(u.sepMul||1), d2=dx*dx+dz*dz;
        if(d2<md*md){ if(d2<1e-6){u.x+=R(-.05,.05); u.z+=R(-.05,.05); continue;}
          const dd=Math.sqrt(d2), w=o.def.mass/(o.def.mass+u.def.mass), push=(md-dd)*w*.8; u.x+=dx/dd*push; u.z+=dz/dd*push; }
      }
    }
    if(!fl) pushOut(u);
  }
}

/* ---------- bots ---------- */
function frontOf(team){
  const Z=ZONES[team];
  switch(team){case 'blue':return {fx:Z.x1,fz:0,nx:1,nz:0,tx:0,tz:1,w:(Z.z1-Z.z0)/2,cx:0,cz:(Z.z0+Z.z1)/2,depth:Z.x1-Z.x0,axis:'x'};
    case 'red':return {fx:Z.x0,fz:0,nx:-1,nz:0,tx:0,tz:1,w:(Z.z1-Z.z0)/2,depth:Z.x1-Z.x0};
    case 'green':return {fx:0,fz:Z.z1,nx:0,nz:1,tx:1,tz:0,w:(Z.x1-Z.x0)/2,depth:Z.z1-Z.z0};
    default:return {fx:0,fz:Z.z0,nx:0,nz:-1,tx:1,tz:0,w:(Z.x1-Z.x0)/2,depth:Z.z1-Z.z0};}
}
const ROLE_DEPTH={front:[1,5],ranged:[6,11],armor:[4,10],air:[8,16],arty:[14,22],support:[7,12]};
function zonePoint(team,role,lat){
  const F=frontOf(team), [a,b]=ROLE_DEPTH[role]||[3,10], dep=Math.min(F.depth-1,R(a,b));
  const l=lat!=null?lat:R(-F.w+3,F.w-3);
  let x=F.fx-F.nx*dep+F.tx*l, z=F.fz-F.nz*dep+F.tz*l;
  const Z=ZONES[team]; return {x:clamp(x,Z.x0+1,Z.x1-1),z:clamp(z,Z.z0+1,Z.z1-1)};
}
function analyzeEnemies(team){
  let tot=0,arm=0,air=0,inf=0;
  for(const u of units){ if(!u.alive||u.team===team) continue; const c=u.def.cost; tot+=c; if(u.def.fly) air+=c; else if(u.def.armor&&u.def.armor<.6) arm+=c; else if(!isVehDef(u.def)) inf+=c; }
  tot=tot||1; return {arm:arm/tot,air:air/tot,inf:inf/tot};
}
function placeGroup(type,team,x,z,n,rot){
  if(DEFS[type]&&DEFS[type].commander) return placeCommander(type,team,x,z,rot);
  const d=DEFS[type], sp=d.model?Math.max(5,d.rad*2.4):1.8, cols=Math.ceil(Math.sqrt(n)), rows=Math.ceil(n/cols), F=frontOf(team);
  const out=[]; let k=0;
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ if(k++>=n) break;
    const dep=(r-(rows-1)/2)*sp, lat=(c-(cols-1)/2)*sp;
    const u=addUnit(type,team,x-F.nx*dep+F.tx*lat+R(-.2,.2),z-F.nz*dep+F.tz*lat+R(-.2,.2),rot); if(u) out.push(u); }
  return out;
}
function botBuy(team,budget,diffKey,pool,maxUnits){
  const D=DIFF[diffKey], an=D.smart>0?analyzeEnemies(team):{arm:0,air:0,inf:0};
  const roles={front:.27,ranged:.34,arty:.1,armor:.15,air:.07,support:.07};
  if(D.smart){ if(an.arm>.3){roles.armor+=.1; roles.ranged+=.05;} if(an.air>.15) roles.ranged+=.1; if(an.inf>.6) roles.arty+=.06; }
  const maxEra=Math.max(...pool.map(d=>d.era||0));
  const score=d=>{let s=1+(((d.era||0)/Math.max(1,maxEra))*2); if(D.smart){ if(an.arm>.25&&(d.anti||HEAVY[d.atk])) s*=1+an.arm*3*D.smart; if(an.air>.12&&d.air) s*=1+an.air*4*D.smart; if(an.inf>.5&&d.splash) s*=1+an.inf*D.smart; } return s*(1-D.smart*.4+Math.random()*(.4+(1-D.smart)*.6));};
  let money=budget, n=0; const buys=[];
  const cheapest=Math.min(...pool.map(d=>d.cost));
  let guard=0;
  while(money>=cheapest&&n<maxUnits&&guard++<600){
    let tr=Math.random()*Object.values(roles).reduce((a,b)=>a+b,0), role='ranged';
    for(const k in roles){ if((tr-=roles[k])<0){role=k; break;} }
    let cand=pool.filter(d=>d.role===role&&d.cost<=money); if(!cand.length) cand=pool.filter(d=>d.cost<=money); if(!cand.length) break;
    if(cand.length>1&&Math.random()<.65){const c2=cand.filter(d=>d.cost<=Math.max(cheapest*3,money*.35)); if(c2.length) cand=c2;}
    let best=null,bs=-1; for(const d of cand){const s=score(d); if(s>bs){bs=s;best=d;}}
    const grp=best.model?1:Math.max(1,Math.min(Math.floor(money/best.cost),1+Math.floor(Math.random()*5),maxUnits-n));
    money-=grp*best.cost; n+=grp; buys.push({d:best,n:grp});
  }
  return {buys,left:money};
}
function botDeploy(team,budget,diffKey,pool,front,noReserve){
  const D=DIFF[diffKey]; let spend=budget*(noReserve?1:1-D.reserve);
  const cmds=pool.filter(d=>d.commander&&d.cost*3<=spend).sort((a,b)=>b.era-a.era);
  if(cmds.length&&!hasCommander(team)&&diffKey!=='easy'||cmds.length&&Math.random()<.4&&!hasCommander(team)){ const c=cmds[0]; const pt=zonePoint(team,'arty'); if(placeCommander(c.id,team,pt.x,pt.z).length) spend-=c.cost; }
  const {buys,left}=botBuy(team,spend,diffKey,pool.filter(d=>!d.commander),180);
  for(const b of buys){ const pt=front?zonePoint(team,'front'):zonePoint(team,b.d.role); placeGroup(b.d.id,team,pt.x,pt.z,b.n); }
  return left+(budget-spend);
}
function botsThink(dt){
  if(S.mode!=='sandbox') return;   // in bot battles nobody may add soldiers once the battle starts
  for(const team in S.bots){
    const b=S.bots[team]; if(!S.teams.includes(team)) continue;
    b.t=(b.t||R(6,10))-dt; if(b.t>0) continue; b.t=R(8,12)*(b.diff==='insane'?.7:1);
    if(!units.some(u=>u.alive&&u.team===team)) continue;
    const m=S.money[team]||0; if(m<20) continue;
    const spend=b.diff==='easy'?m*.6:m*.8;
    const {buys,left}=botBuy(team,spend,b.diff,(b.pool||S.pool).filter(d=>!d.commander),40);
    S.money[team]=m-spend+left;
    for(const bb of buys){ const pt=zonePoint(team,bb.d.role); placeGroup(bb.d.id,team,pt.x,pt.z,bb.n); }
  }
}

/* ---------- step ---------- */
function step(dt){
  S.t+=dt;
  const battle=S.phase==='battle';
  for(const p of pending) p.t-=dt;
  const due=pending.filter(p=>p.t<=0); pending=pending.filter(p=>p.t>0); for(const p of due) p.fn();
  for(const u of units){ if(u.alive) updateUnit(u,dt,battle); else updateDead(u,dt); }
  separation();
  updateProjs(dt);
  ADD.update(dt); SMK.update(dt); updateTracers(dt); updateChunks(dt); updateFallers(dt); updateFX(dt); updateCritters(dt);
  for(const f of flashes){f.t+=dt; const k=f.t/f.max; f.m.scale.setScalar(f.r*(.3+.8*k)); f.m.material.opacity=Math.max(0,1-k);}
  flashes=flashes.filter(f=>{if(f.t>=f.max){scene.remove(f.m); f.m.material.dispose(); return false;} return true;});
  boomLight.intensity*=Math.pow(.02,dt);
  navTick(dt);
  commandTick(dt);
  if(units.some(u=>u.removed||u.movedOut)) units=units.filter(u=>!u.removed&&!u.movedOut);
  if(battle){
    if(S.income>0){ S.incomeT+=dt; if(S.incomeT>=10){ S.incomeT=0; for(const t of S.teams) S.money[t]=(S.money[t]||0)+S.income; } }
    botsThink(dt);
  }
  if(S.todSpeed) { S.tod=(S.tod+dt*S.todSpeed)%24; }
}

/* ---------- background music (generated live, no audio files) ---------- */
const Music={on:true,vol:.5,mode:null,era:3,timer:null,next:0,step:0,bus:null,
  target(){return this.on?this.vol*.32*VOL.master:0;},
  ensure(){ if(!AC) return false; if(!this.bus){this.bus=AC.createGain(); this.bus.gain.value=this.target(); const c=AC.createDynamicsCompressor(); this.bus.connect(c); c.connect(AC.destination); if(revSend){const w=AC.createGain(); w.gain.value=.25; this.bus.connect(w); w.connect(revSend);} } return true; },
  play(mode){ if(!this.ensure()||this.mode===mode) return; if(mode==='battle'&&this.hold&&AC.currentTime<this.hold) return;
    const t=AC.currentTime, g=this.bus.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value,t); g.linearRampToValueAtTime(.0001,t+.4); g.linearRampToValueAtTime(this.target(),t+1.1);
    this.mode=mode; this.step=0; this.next=t+.45; if(!this.timer) this.timer=setInterval(()=>this.tick(),90); },
  setEra(e){ this.era=clamp(e|0,0,5); },
  setVol(){ if(this.bus&&AC){ const t=AC.currentTime; this.bus.gain.cancelScheduledValues(t); this.bus.gain.setValueAtTime(this.target(),t);} },
  bpm(){ if(this.mode==='menu') return 80; if(this.mode==='prep') return 92; return [100,108,114,128,134,120][this.era]; },
  tick(){ if(!AC||!this.mode||!this.on||this.mode==='end') return; const spb=60/this.bpm()/2;
    if(this.next<AC.currentTime) this.next=AC.currentTime+.05;
    while(this.next<AC.currentTime+.3){ this.note(this.step,this.next,spb); this.next+=spb; this.step++; } },
  f(m){return 440*Math.pow(2,(m-69)/12);},
  osc(type,freq,t,dur,gain,filt,vib,att){ const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.value=freq;
    if(vib){const l=AC.createOscillator(), lg=AC.createGain(); l.frequency.value=5; lg.gain.value=freq*vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t+dur+.05);}
    let last=o; if(filt){const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=filt; o.connect(f); last=f;}
    last.connect(g); g.connect(this.bus); g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(gain,t+(att||Math.min(.05,dur*.2))); g.gain.exponentialRampToValueAtTime(.0005,t+dur); o.start(t); o.stop(t+dur+.05); return o; },
  drum(kind,t,a){ a=a||1;
    if(kind==='k'||kind==='tom'||kind==='tomh'){ const o=AC.createOscillator(), g=AC.createGain(); const f0=kind==='k'?140:kind==='tom'?110:180, f1=kind==='k'?40:kind==='tom'?60:100, d=kind==='k'?.18:.3;
      o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+d*.8); g.gain.setValueAtTime(.9*a,t); g.gain.exponentialRampToValueAtTime(.001,t+d); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t+d+.02); return; }
    const src=AC.createBufferSource(); src.buffer=NB; const f=AC.createBiquadFilter(), g=AC.createGain(); f.type=kind==='h'?'highpass':'bandpass'; f.frequency.value=kind==='s'?1800:kind==='clap'?1200:7500;
    src.connect(f); f.connect(g); g.connect(this.bus); const A=(kind==='s'?.35:kind==='clap'?.3:.07)*a, d=kind==='s'?.13:kind==='clap'?.1:.035; g.gain.setValueAtTime(A,t); g.gain.exponentialRampToValueAtTime(.001,t+d); src.start(t,Math.random()*.5); src.stop(t+d+.02); },
  sting(win){ if(!this.ensure()) return; this.mode='end'; this.hold=AC.currentTime+5; const t=AC.currentTime+.1, g=this.bus.gain; g.cancelScheduledValues(t-.1); g.setValueAtTime(this.target(),t);
    const seq=win?[60,64,67,72,76,79]:[64,63,62,61,57,52];
    seq.forEach((m,i)=>{ this.osc('sawtooth',this.f(m),t+i*.16,win&&i===seq.length-1?1.8:.5,.07,2000,.01); this.osc('triangle',this.f(m-12),t+i*.16,.5,.06); });
    if(win){ this.drum('k',t); this.drum('s',t+.32); this.drum('k',t+.8); for(const m of [60,64,67]) this.osc('sawtooth',this.f(m),t+.96,2,.04,1600); }
    else { this.drum('tom',t+.9,1.2); this.osc('sine',this.f(36),t+.9,2.5,.15); } },
  note(s,t,spb){
    const bar=Math.floor(s/8)%8, b=s%8, md=this.mode, E=this.era;
    if(md==='menu'){
      const prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62],[50,53,57],[53,57,60],[52,56,59],[57,60,64]], ch=prog[bar];
      if(b===0) for(const m of ch){ this.osc('sawtooth',this.f(m),t,spb*8,.03,900); this.osc('sawtooth',this.f(m)*1.006,t,spb*8,.02,900); }
      if(b===0||b===4) this.osc('sine',this.f(ch[0]-24),t,spb*3.8,.16);
      if(b%2===0){ const mel=[ch[0]+12,ch[2]+12,ch[1]+12,ch[2]+12][(b>>1)%4]; this.osc('triangle',this.f(mel),t,spb*2.2,.05); }
      if(b===0&&bar%2===0) this.drum('k',t);
      return;
    }
    if(md==='prep'){ // tense build-up while you deploy
      const roots=[45,45,46,45,45,45,43,44], r=roots[bar];
      if(b===0){ this.osc('sawtooth',this.f(r-12),t,spb*8,.06,280+bar*30); this.osc('sawtooth',this.f(r-5),t,spb*8,.025,500,0,.6); }
      if(b===0||b===1) this.drum('k',t,b?.5:.8);
      this.drum('h',t,b%2?.5:.9);
      if(b===6&&bar%2) this.osc('triangle',this.f(r+24),t,spb*1.5,.04,0,.01);
      if(E<=1&&b===4) this.drum('tom',t,.6);
      if(E>=4&&b%2===0) this.osc('square',this.f(r+12+(b===4?7:0)),t,spb*.8,.025,1200);
      return;
    }
    // ---- battle, one style per era ----
    const prog=[[50,53,57],[46,50,53],[48,52,55],[45,49,52],[50,53,57],[46,50,53],[43,46,50],[45,49,52]], ch=prog[bar];
    if(E===0){ // ancient: war drums + horns
      if(b===0||b===3||b===4||b===6) this.drum('tom',t); if(b===2||b===7) this.drum('tomh',t,.8); if(b===4) this.drum('k',t,.8);
      if(b===0) this.osc('sawtooth',this.f(ch[0]-12),t,spb*7,.08,700,.006,.25);
      if(b===4&&bar%2) this.osc('sawtooth',this.f(ch[2]),t,spb*3.5,.05,1100,.01,.15);
      this.drum('h',t,.4);
    } else if(E===1){ // medieval: choir pad, drums, recorder melody
      if(b===0) for(const m of ch) this.osc('triangle',this.f(m+12),t,spb*8,.05,0,.012,.4);
      if(b===0||b===4) this.drum('k',t); if(b===2||b===6) this.drum('tom',t,.7); if(b===7) this.drum('tomh',t,.6);
      if(b%2===0){ const mel=[ch[0]+24,ch[1]+24,ch[2]+24,ch[1]+24][(b>>1)%4]+(bar%4===3&&b===6?2:0); this.osc('triangle',this.f(mel),t,spb*1.8,.06,0,.006); }
      this.osc('sawtooth',this.f(ch[0]-12),t,spb*.9,.05,400);
    } else if(E===2){ // world wars: snare march, tuba, brass
      this.drum('s',t,b===0||b===4?1:.35); if(b===7) this.drum('s',t+spb/2,.4);
      if(b===0||b===4) this.osc('square',this.f(ch[0]-24+(b===4?7:0)),t,spb*1.6,.12,380); if(b===0||b===4) this.drum('k',t,.7);
      if(b%2===0){ const mel=[ch[0]+12,ch[2]+12,ch[1]+12,ch[0]+12][(b>>1)%4]; this.osc('sawtooth',this.f(mel),t,spb*1.7,.045,1500); }
    } else if(E===3){ // modern: synth pads, driving bass, rock drums
      if(b===0) for(const m of ch){ this.osc('sawtooth',this.f(m+12),t,spb*8,.035,1400); this.osc('sawtooth',this.f(m+12)*1.006,t,spb*8,.02,900); }
      this.osc('square',this.f(ch[0]-12),t,spb*.9,.12,500);
      if(b%2===1){ const mel=[ch[0]+24,ch[1]+24,ch[2]+24,ch[1]+24][(b>>1)%4]; this.osc('triangle',this.f(mel),t,spb*1.6,.07); }
      if(b===0||b===4||b===6&&bar%2) this.drum('k',t); if(b===2||b===6) this.drum('s',t); this.drum('h',t);
      if(bar===7&&b>=4) this.drum('s',t+spb/2);
    } else { // future & space: arpeggiator, sub bass, four-on-the-floor
      const arp=[ch[0],ch[1],ch[2],ch[1]+12]; this.osc('sawtooth',this.f(arp[b%4]+24),t,spb*.45,.04,E===5?1800:3000); this.osc('sawtooth',this.f(arp[(b+2)%4]+24),t+spb/2,spb*.45,.03,E===5?1800:3000);
      if(b===0) this.osc('sine',this.f(ch[0]-24),t,spb*8,.2); if(b===0&&E===5) for(const m of ch) this.osc('triangle',this.f(m+12),t,spb*8,.03,0,.02,.6);
      if(b%2===0) this.drum('k',t); if(b===2||b===6) this.drum('clap',t); this.drum('h',t,b%2?1:.5);
      if(E===5&&b===5&&bar%2) this.osc('square',this.f(ch[2]+36),t,.25,.03,0);
    }
  }
};

/* ================= CIVILIANS & ANIMALS ================= */
let critters=[], critterBodies=[];
function addCritter(type,x,z){
  const D=CRIT[type]; if(!D) return null; const p=buildCritter(type);
  const c=Object.assign({type,D,x:clamp(x,-HALF+1,HALF-1),z:clamp(z,-HALF+1,HALF-1),y:0,rot:Math.random()*6.283,hp:D.hp,rad:D.rad,dead:false,t:Math.random()*3,panic:0,fdx:0,fdz:0,mv:false,phase:Math.random()*6,kvx:0,kvz:0,impY:0,dvy:0,deadT:0},p);
  c.def={mass:1}; pushOut(c); c.y=gh(c.x,c.z); c.g.position.set(c.x,c.y,c.z); scene.add(c.g); critters.push(c); return c;
}
function clearCritters(){ for(const c of critters) scene.remove(c.g); for(const c of critterBodies) scene.remove(c.g); critters=[]; critterBodies=[]; }
function spawnLife(theme){
  const list=THEME_LIFE[theme.id]||[]; if(!list.length) return;
  const n=Math.round(clamp(18*HALF/80,14,90));
  for(let i=0;i<n;i++){ const t=list[i%list.length]; const cx=R(-HALF*.55,HALF*.55), cz=R(-HALF*.8,HALF*.8); const g=t==='civ'?1:1+Math.floor(Math.random()*3);
    for(let j=0;j<g;j++) addCritter(t,cx+R(-4,4),cz+R(-4,4)); }
}
function noise(x,z,r){
  for(const c of critters){ if(c.dead) continue; const dx=c.x-x, dz=c.z-z, d2=dx*dx+dz*dz; if(d2<r*r){ const d=Math.sqrt(d2)||1; if(c.panic<1){ const a=Math.atan2(dx,dz)+R(-.6,.6); c.fdx=Math.sin(a); c.fdz=Math.cos(a); if(Math.random()<.5) critterVoice(c);} c.panic=Math.max(c.panic,R(4,7)); } }
}
function strayHit(x,z,dmg,kind){
  for(const c of critters){ if(!c.dead&&Math.abs(c.x-x)<c.rad+.5&&Math.abs(c.z-z)<c.rad+.5){ hurtCritter(c,dmg); return true; } }
  return false;
}
function critterVoice(c){ voice({civ:'scream',cow:'moo',sheep:'baa',chicken:'cluck',dog:'bark'}[c.type],c.x,c.z); }
function hurtCritter(c,amt,blast){
  if(c.dead) return; c.hp-=amt; S.hurtCiv++; if(Math.random()<.7) critterVoice(c);
  bleed(c.x,c.y+c.D.hy,c.z,Math.min(10,2+amt/10|0),0x7a0a0a);
  if(Math.random()<.4) bloodDecal(c.x,c.z,.4);
  noise(c.x,c.z,15);
  if(c.type==='civ'&&c.arms&&blast&&S.gore&&c.hp>0&&Math.random()<.3) critterLimb(c);
  if(c.hp<=0){ c.dead=true; c.deadT=0; c.dvy=blast?(c.impY||4):0; bloodDecal(c.x,c.z,c.type==='civ'?1:1.2); bleed(c.x,c.y+c.D.hy,c.z,10,0x7a0a0a);
    if(c.type==='civ'&&blast&&S.gore&&Math.random()<.5) critterLimb(c); }
}
function critterLimb(c){
  const opts=[...(c.arms||[]),...(c.legs||[])].filter(l=>l.parent); if(!opts.length) return;
  const l=opts[Math.floor(Math.random()*opts.length)]; detach(l); addDebris(l,R(-4,4),R(3,7),R(-4,4),45,.12);
  chunks[chunks.length-1].bleed=1.2; chunks[chunks.length-1].bc=0x7a0a0a;
  if(c.legs&&c.legs.includes(l)){ c.legs=null; c.lame=true; c.body.position.y=-.35; }
}
function updateCritters(dt){
  for(const c of critters){
    if(c.dead){ c.deadT+=dt;
      const G=gh(c.x,c.z); if(c.dvy!==0||c.y>G+.01){ c.dvy-=22*dt; c.y+=c.dvy*dt; c.x+=(c.kvx||0)*dt; c.z+=(c.kvz||0)*dt; const G2=gh(c.x,c.z); if(c.y<=G2){c.y=G2; c.dvy=0; c.kvx=c.kvz=0;} }
      if(c.type==='civ') c.body.rotation.x=-Math.min(1,c.deadT/.45)*Math.PI/2; else c.body.rotation.z=Math.min(1,c.deadT/.5)*Math.PI/2;
      c.g.position.set(c.x,c.y,c.z); c.g.rotation.y=c.rot;
      if(c.deadT>3&&c.y<=gh(c.x,c.z)+.02){ c.moved=true; critterBodies.push(c); while(critterBodies.length>150){const o=critterBodies.shift(); scene.remove(o.g);} }
      continue; }
    if(Math.abs(c.kvx)+Math.abs(c.kvz)>.05){ c.x+=c.kvx*dt; c.z+=c.kvz*dt; c.kvx*=Math.exp(-5*dt); c.kvz*=Math.exp(-5*dt); }
    let mx=0,mz=0,sp=c.D.spd;
    const hurtF=c.hp<c.D.hp*.5?.55:1, lame=c.lame?.3:1;
    if(c.panic>0){ c.panic-=dt; mx=c.fdx; mz=c.fdz; sp=c.D.run*hurtF*lame;
      if(Math.abs(c.x)>HALF-4||Math.abs(c.z)>HALF-4){ const a=Math.atan2(-c.x,-c.z)+R(-.8,.8); c.fdx=Math.sin(a); c.fdz=Math.cos(a); } }
    else { c.t-=dt; if(c.t<=0){ c.t=R(2,6); c.mv=Math.random()<.55; const a=Math.random()*6.283; c.fdx=Math.sin(a); c.fdz=Math.cos(a);} if(c.mv){mx=c.fdx; mz=c.fdz; sp*=hurtF*lame;} }
    for(const u of units){ if(!u.alive||u.def.fly) continue; const dx=c.x-u.x,dz=c.z-u.z; if(Math.abs(dx)<u.rad+c.rad+1&&Math.abs(dz)<u.rad+c.rad+1){ const d=Math.hypot(dx,dz)||.1; c.x+=dx/d*dt*3; c.z+=dz/d*dt*3; } }
    if(mx||mz){ const ox=c.x,oz=c.z; c.x+=mx*sp*dt; c.z+=mz*sp*dt; pushOut(c); if(Math.hypot(c.x-ox,c.z-oz)<sp*dt*.3){ const a=Math.random()*6.283; c.fdx=Math.sin(a); c.fdz=Math.cos(a);} c.rot=turnTo(c.rot,Math.atan2(mx,mz),6*dt);
      c.phase+=dt*sp*3.2; const s=Math.sin(c.phase)*.6;
      if(c.legs){ if(c.legs.length===4){c.legs[0].rotation.x=s; c.legs[1].rotation.x=-s; c.legs[2].rotation.x=-s; c.legs[3].rotation.x=s;} else {c.legs[0].rotation.x=s; c.legs[1].rotation.x=-s;} }
      if(c.lame) c.body.rotation.z=Math.sin(c.phase)*.3;
      if(c.arms&&c.panic>0){ c.arms[0].rotation.x=-2.6+Math.sin(c.phase*1.3)*.4; c.arms[1].rotation.x=-2.6-Math.sin(c.phase*1.3)*.4; } else if(c.arms){ c.arms[0].rotation.x=-s*.6; c.arms[1].rotation.x=s*.6; }
    } else if(c.legs) for(const l of c.legs) l.rotation.x*=.85;
    if(c.hp<c.D.hp*.5&&Math.random()<dt*2&&S.gore) SMK.emit(c.x,c.y+c.D.hy*.6,c.z,0,-.5,0,.6,.1,.15,.45,.05,.05,.9,10,0);
    c.y=gh(c.x,c.z); c.g.position.set(c.x,c.y,c.z); c.g.rotation.y=c.rot;
  }
  if(critters.some(c=>c.moved)) critters=critters.filter(c=>!c.moved);
}

/* ================= NAVIGATION: flow fields =================
   The map is a grid. For each army we run Dijkstra outward from every enemy soldier, so every cell knows
   how far it is from the nearest enemy when walking AROUND walls, buildings, trees and water (bridges count as ground).
   A soldier whose straight line is blocked steps to the neighbouring cell that is closest to an enemy.
   Two grids: one for soldiers, one with wider margins for tanks and other big units. */
const NAV={cs:2,n:0,blockS:null,blockL:null,dirty:true,fields:{},t:{},want:{}};
function navMark(o,pad,arr){
  const cs=NAV.cs,n=NAV.n, hx=o.hx+pad, hz=o.hz+pad;
  const x0=Math.max(0,Math.floor((o.x-hx+HALF)/cs)), x1=Math.min(n-1,Math.floor((o.x+hx+HALF)/cs));
  const z0=Math.max(0,Math.floor((o.z-hz+HALF)/cs)), z1=Math.min(n-1,Math.floor((o.z+hz+HALF)/cs));
  for(let iz=z0;iz<=z1;iz++) for(let ix=x0;ix<=x1;ix++){ const cx=-HALF+(ix+.5)*cs, cz=-HALF+(iz+.5)*cs; if(Math.abs(cx-o.x)<=hx&&Math.abs(cz-o.z)<=hz) arr[iz*n+ix]=1; }
}
function navRebuild(){
  const cs=Math.max(2,HALF/100), n=Math.ceil(2*HALF/cs); NAV.cs=cs; NAV.n=n;
  NAV.blockS=new Uint8Array(n*n); NAV.blockL=new Uint8Array(n*n);
  for(const o of obstacles){ if(o.dead||o.walk) continue; navMark(o,.55,NAV.blockS); navMark(o,2.4,NAV.blockL); }
  NAV.dirty=false; NAV.fields={}; NAV.t={};
}
const navCell=(x,z)=>{const n=NAV.n,cs=NAV.cs; const ix=clamp(Math.floor((x+HALF)/cs),0,n-1), iz=clamp(Math.floor((z+HALF)/cs),0,n-1); return iz*n+ix;};
function navCompute(team,large){
  const n=NAV.n, N=n*n, blk=large?NAV.blockL:NAV.blockS, dist=new Float32Array(N).fill(1e9);
  const hi=new Int32Array(N*2+16), hd=new Float32Array(N*2+16); let hs=0;
  const push=(i,d)=>{let k=hs++; while(k>0){const p=(k-1)>>1; if(hd[p]<=d) break; hi[k]=hi[p]; hd[k]=hd[p]; k=p;} hi[k]=i; hd[k]=d;};
  const pop=()=>{const ri=hi[0]; const li=hi[--hs], ld=hd[hs]; let k=0; for(;;){let c=2*k+1; if(c>=hs) break; if(c+1<hs&&hd[c+1]<hd[c]) c++; if(hd[c]>=ld) break; hi[k]=hi[c]; hd[k]=hd[c]; k=c;} hi[k]=li; hd[k]=ld; return ri;};
  let any=false;
  for(const u of units){ if(!u.alive||u.downed>0||u.team===team) continue; const i=navCell(u.x,u.z); if(dist[i]>0){dist[i]=0; push(i,0); any=true;} }
  if(!any) return null;
  const DX=[1,-1,0,0,1,1,-1,-1], DZ=[0,0,1,-1,1,-1,1,-1], DC=[1,1,1,1,1.4142,1.4142,1.4142,1.4142];
  while(hs>0){
    const d0=hd[0], i=pop(); if(d0>dist[i]) continue;
    const ix=i%n, iz=(i-ix)/n;
    for(let k=0;k<8;k++){
      const jx=ix+DX[k], jz=iz+DZ[k]; if(jx<0||jz<0||jx>=n||jz>=n) continue;
      const j=jz*n+jx; if(blk[j]) continue;
      if(k>=4&&(blk[iz*n+jx]||blk[jz*n+ix])) continue;   // no cutting corners
      const nd=d0+DC[k]; if(nd<dist[j]){dist[j]=nd; push(j,nd);}
    }
  }
  return dist;
}
function navTick(dt){
  if(S.phase!=='battle') return;
  if(NAV.dirty) navRebuild();
  let budget=2;
  for(const key in NAV.want){
    NAV.t[key]=(NAV.t[key]||0)-dt;
    if(NAV.t[key]<=0&&budget>0){ budget--; NAV.t[key]=1.2+Math.random()*.4; const team=key.slice(0,-1); NAV.fields[key]=navCompute(team,key.endsWith('L')); }
  }
}
function flowDir(u){
  if(NAV.dirty||!NAV.blockS) return null;
  const key=u.team+(u.rad>1.3?'L':'S'); NAV.want[key]=1;
  const f=NAV.fields[key]; if(!f) return null;
  const n=NAV.n, cs=NAV.cs, blk=u.rad>1.3?NAV.blockL:NAV.blockS;
  let i=navCell(u.x,u.z);
  // follow the downhill direction for up to 3 cells, then aim at that cell
  let cur=i, steps=0;
  for(;steps<3;steps++){
    const ix=cur%n, iz=(cur-ix)/n; let best=-1, bd=f[cur]<1e8&&!blk[cur]?f[cur]:1e9;
    for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){ if(!dx&&!dz) continue; const jx=ix+dx, jz=iz+dz; if(jx<0||jz<0||jx>=n||jz>=n) continue;
      const j=jz*n+jx; if(blk[j]) continue; if(dx&&dz&&(blk[iz*n+jx]||blk[jz*n+ix])) continue; if(f[j]<bd){bd=f[j]; best=j;} }
    if(best<0) break; cur=best;
  }
  if(cur===i) return null;
  const cx=cur%n, cz=(cur-cx)/n, tx=-HALF+(cx+.5)*cs, tz=-HALF+(cz+.5)*cs;
  const dx=tx-u.x, dz=tz-u.z, l=Math.hypot(dx,dz); if(l<.05) return null;
  return {x:dx/l,z:dz/l};
}
function pathBlocked(u,t){
  for(const o of obstacles){ if(o.dead||o.walk) continue; const tt=segBox(u.x,u.z,t.x,t.z,o,u.rad+.2); if(tt>=0&&tt<.98) return true; }
  return false;
}

/* ================= COMMAND: one commander per army coordinates the soldiers =================
   With a living commander: focus fire on one enemy, advance together, badly wounded pull back to a medic, faster reactions.
   Without one: slower reactions, slightly worse aim, soldiers drift apart. The commander himself is weak and stays at the back. */
const CMD={t:0,team:{},had:{}};
function hasCommander(team){ return units.some(u=>u.alive&&u.team===team&&u.def.commander); }
function coord(u){ const c=CMD.team[u.team]; return c&&c.cmd?c:null; }
function placeCommander(type,team,x,z,rot){
  if(hasCommander(team)){ S.events.push({type:'oneCmd',team}); return []; }
  const d=DEFS[type], c=addUnit(type,team,x,z,rot); if(!c) return [];
  const out=[c], F=frontOf(team);
  for(const s of [-1,1]){ const g=addUnit(d.escort,team,x-F.nx*1.5+F.tx*s*2.2,z-F.nz*1.5+F.tz*s*2.2,rot); if(g){ g.guard=c; S.placed[team]-=g.def.cost; out.push(g);} }
  CMD.t=0; return out;
}
function commandTick(dt){
  CMD.t-=dt; if(CMD.t>0) return; CMD.t=.5;
  for(const team of S.teams){
    let cmd=null, sx=0, sz=0, n=0;
    for(const u of units){ if(!u.alive||u.team!==team) continue; if(u.def.commander&&!(u.downed>0)) cmd=u; else if(!u.def.fly&&!u.guard){ sx+=u.x; sz+=u.z; n++; } }
    if(CMD.had[team]&&!cmd&&S.phase==='battle') S.events.push({type:'cmdDown',team});
    CMD.had[team]=!!cmd;
    if(!cmd){ CMD.team[team]={cmd:null}; continue; }
    const cx=n?sx/n:cmd.x, cz=n?sz/n:cmd.z;
    let focus=null, fd=1e9; for(const e of units){ if(!e.alive||e.team===team||e.downed>0) continue; const dd=Math.hypot(e.x-cx,e.z-cz); if(dd<fd){fd=dd; focus=e;} }
    let mx=null; for(const u of units) if(u.alive&&u.team===team&&u.def.atk==='heal') { mx=true; break; }
    const prev=CMD.team[team]||{}, P={cmd,cx,cz,focus,fd,medics:!!mx,plan:prev.plan||'attack',planT:prev.planT||0,noHold:prev.noHold||0,side:prev.side||(Math.random()<.5?1:-1),spread:!!prev.spread};
    P.planT+=.5;
    if(P.planT>=4||!prev.plan){ // think again every few seconds
      let own=0,en=0,arty=0,fast=0;
      for(const u of units){ if(!u.alive||u.downed>0) continue; const v=u.def.cost*(u.hp/u.mhp);
        if(u.team===team){ own+=v; if(!u.guard&&!u.def.commander&&!u.def.fly&&(u.def.atk==='melee'||u.def.spd>=6)) fast++; }
        else { en+=v; if(u.def.role==='arty'||(u.def.splash||0)>=3) arty+=v; } }
      const ratio=own/Math.max(1,en); let plan=P.plan;
      if(plan==='hold'&&P.planT>25){ plan='attack'; P.noHold=S.t+30; }   // never wait forever
      else if(ratio<.8&&plan!=='hold'&&!(P.noHold>S.t)) plan='hold';
      else if(ratio>1.25) plan='attack';
      else if(plan!=='hold'||ratio>1) plan=fast>=4?'flank':'attack';
      const spread=arty/Math.max(1,en)>.25;
      if(plan!==P.plan||spread!==P.spread){ if(plan!==P.plan) P.planT=0; S.events.push({type:'plan',team,plan,spread}); }
      else P.planT=P.planT>=4&&plan!=='hold'?0:P.planT;
      P.plan=plan; P.spread=spread;
    }
    P.breach=prev.breach||null; P.brT=(prev.brT||0)-.5;
    breachPlan(team,P);
    CMD.team[team]=P;
  }
}
/* ---------- breaching: the commander orders a wall blown up ----------
   When a wall stands between the army and the enemy, and the way round it is long (= a long walk under fire)
   or the enemy has shooters covering it, the commander picks the nearest soldier who can blow things up
   (grenades, rockets, shells, catapults, cannons...) and sends him to blast a hole. Without a commander nobody does it. */
const BLAST_ATK={grenade:1,rocket:1,shell:1,mortar:1,cannonball:1,boulder:1,ionball:1,plasma:1,fireball:1};
const BREACHABLE={wall:1,ruinwall:1};
const canBlast=u=>u.alive&&!(u.downed>0)&&!u.guard&&!u.def.commander&&!u.def.fly&&BLAST_ATK[u.def.atk]&&u.def.dmg>0;
function breachPlan(team,P){
  const B=P.breach;
  if(B){ // an order is already running
    if(B.o.dead){ S.events.push({type:'breachDone',team}); P.breach=null; P.brT=6; if(B.u.breach===B.o) B.u.breach=null; return; }
    if(B.u.alive&&!(B.u.downed>0)&&B.u.breach===B.o) return;
    const nu=units.filter(canBlast).filter(u=>u.team===team).sort((a,b)=>Math.hypot(a.x-B.o.x,a.z-B.o.z)-Math.hypot(b.x-B.o.x,b.z-B.o.z))[0];
    if(nu){ nu.breach=B.o; B.u=nu; } else P.breach=null;
    return;
  }
  if(P.brT>0||!P.focus||S.phase!=='battle') return;
  P.brT=3;
  const f=NAV.fields[team+'S']; if(!f||NAV.dirty) return;   // nobody has been blocked yet
  // the first wall on the straight line from the army to the enemy
  let wall=null, wt=1;
  for(const o of obstacles){ if(o.dead||!BREACHABLE[o.type]) continue; const tt=segBox(P.cx,P.cz,P.focus.x,P.focus.z,o,.6); if(tt>=0&&tt<wt){ wt=tt; wall=o; } }
  if(!wall) return;
  const straight=P.fd, wallDist=wt*straight; if(wallDist>45) return;   // still far away: not yet
  // walking distance around the wall, measured from the nearest open ground at the army's centre
  const n=NAV.n, ci=navCell(P.cx,P.cz), ix0=ci%n, iz0=(ci-ix0)/n; let best=1e9;
  for(let r=0;r<=4&&best>=1e9;r++) for(let dz=-r;dz<=r;dz++) for(let dx=-r;dx<=r;dx++){ const jx=ix0+dx, jz=iz0+dz; if(jx<0||jz<0||jx>=n||jz>=n||NAV.blockS[jz*n+jx]) continue; const v=f[jz*n+jx]; if(v<best) best=v; }
  const around=best<1e8?best*NAV.cs:1e9, extra=around-straight;
  let shooters=0; for(const e of units) if(e.alive&&e.team!==team&&!(e.downed>0)&&e.def.rng>=8&&e.def.dmg>0&&Math.hypot(e.x-wall.x,e.z-wall.z)<e.def.rng+12) shooters++;
  const dangerous=around>=1e9||(extra>14&&(around>straight*1.5||shooters>=3));
  if(!dangerous) return;
  const sap=units.filter(u=>u.team===team&&canBlast(u)).sort((a,b)=>Math.hypot(a.x-wall.x,a.z-wall.z)-Math.hypot(b.x-wall.x,b.z-wall.z))[0];
  if(!sap) return;
  sap.breach=wall; P.breach={o:wall,u:sap};
  S.events.push({type:'breach',team,name:sap.def.n,k:sap.type});
}
// the sapper walks to a safe distance from the wall and fires at it until it falls
function breachStep(u,dt){
  const o=u.breach, C=coord(u);
  if(!o||o.dead||!C||u.hp<u.mhp*.35){ u.breach=null; return null; }
  const d=u.def, px=clamp(u.x,o.x-o.hx,o.x+o.hx), pz=clamp(u.z,o.z-o.hz,o.z+o.hz);
  const dx=px-u.x, dz=pz-u.z, dist=Math.hypot(dx,dz)||.001, nx=dx/dist, nz=dz/dist;
  const want=clamp(d.rng*.6,(d.minRng||2)+2,30);
  const face=Math.atan2(nx,nz); let mvx=0,mvz=0;
  if(dist>want+1.5){ mvx=nx; mvz=nz; if(u.stuckN>1){ const fd=flowDir(u); if(fd){ mvx=fd.x; mvz=fd.z; } } }
  else if(dist<(d.minRng||0)+1){ mvx=-nx; mvz=-nz; }
  const inRange=dist<=want+2&&dist>=(d.minRng||0);
  if(!u.wallT||u.wallT.o!==o) u.wallT={o,alive:true,isWall:true,rad:0,moving:false,def:{hy:Math.min(1.2,o.h*.45),spd:0,fly:0,organic:0}};
  const T=u.wallT; T.x=px-nx*.2; T.z=pz-nz*.2; T.y=o.y;
  if(inRange&&u.cd<=0&&(aligned(u,face)||!u.turret)){ act(u,T,dist); u.cd=d.rate*R(.85,1.15); }
  return [mvx,mvz,face,inRange];
}
function commandMove(u,mvx,mvz,inRange){
  const d=u.def, C=coord(u); u.holdBack=false;
  if(u.breach) return [mvx,mvz];
  // bodyguards stay close to their commander
  if(u.guard){ const g=u.guard; if(!g.alive){ u.guard=null; }
    else { const dx=g.x-u.x, dz=g.z-u.z, dd=Math.hypot(dx,dz);
      if(u.target&&Math.hypot(u.target.x-g.x,u.target.z-g.z)>16&&!inRange) return dd>3?[dx/dd,dz/dd]:[0,0];
      if(dd>5) return [dx/dd,dz/dd]; } }
  if(!C) { // no commander: soldiers wander a little off their line
    if((mvx||mvz)&&!d.commander){ const w=Math.sin(S.t*.8+u.id*1.7)*.5, px=-mvz*w, pz=mvx*w; const l=Math.hypot(mvx+px,mvz+pz)||1; return [(mvx+px)/l,(mvz+pz)/l]; }
    return [mvx,mvz];
  }
  // the commander keeps behind the centre of his army
  if(d.commander){ let fx=0,fz=0; if(C.focus){ fx=C.focus.x-C.cx; fz=C.focus.z-C.cz; const l=Math.hypot(fx,fz)||1; fx/=l; fz/=l; }
    const rx=C.cx-fx*9, rz=C.cz-fz*9, dx=rx-u.x, dz=rz-u.z, dd=Math.hypot(dx,dz); return dd>3?[dx/dd,dz/dd]:[0,0]; }
  // badly wounded soldiers fall back to a medic
  if(d.organic&&d.atk!=='heal'&&C.medics){ if(u.hp<u.mhp*.3) u.retreat=true; else if(u.hp>u.mhp*.6) u.retreat=false;
    if(u.retreat){ let m=null,md=1e9; for(const o of units) if(o.alive&&o.team===u.team&&o.def.atk==='heal'&&!(o.downed>0)){ const q=Math.hypot(o.x-u.x,o.z-u.z); if(q<md){md=q;m=o;} }
      if(m&&md>3){ const dx=m.x-u.x, dz=m.z-u.z; return [dx/md,dz/md]; } if(m) return [0,0]; } }
  u.sepMul=C.spread?1.8:1;   // enemy artillery: keep distance from each other
  const melee=d.atk==='melee'||d.atk==='stomp';
  if(C.plan==='hold'&&!u.guard){  // outnumbered: stay together and let the enemy come into our fire
    const td=u.target?Math.hypot(u.target.x-u.x,u.target.z-u.z):1e9;
    if(melee){ const dc=Math.hypot(C.cx-u.x,C.cz-u.z); if(td<10) return [mvx,mvz]; if(dc>8) return [(C.cx-u.x)/dc,(C.cz-u.z)/dc]; return [0,0]; }
    if(!inRange&&td>d.rng*1.5) return [0,0];
  }
  if(C.plan==='flank'&&C.focus&&!u.guard&&(melee||d.spd>=6)&&!inRange){  // fast fighters go around the side
    let fx=C.focus.x-C.cx, fz=C.focus.z-C.cz; const l=Math.hypot(fx,fz)||1; fx/=l; fz/=l;
    const px=-fz*C.side, pz=fx*C.side, ux=u.x-C.focus.x, uz=u.z-C.focus.z, lateral=ux*px+uz*pz, dist=Math.hypot(ux,uz);
    if(dist>16&&lateral<14){ const tx=C.focus.x+px*22, tz=C.focus.z+pz*22, dx=tx-u.x, dz=tz-u.z, dd=Math.hypot(dx,dz)||1; return [dx/dd,dz/dd]; }
  }
  // advance together: whoever runs far ahead of the group slows down
  if((mvx||mvz)&&!inRange&&C.focus){ let fx=C.focus.x-C.cx, fz=C.focus.z-C.cz; const l=Math.hypot(fx,fz)||1; const ahead=((u.x-C.cx)*fx+(u.z-C.cz)*fz)/l; if(ahead>12) u.holdBack=true; }
  return [mvx,mvz];
}
