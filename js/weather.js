'use strict';
/* ================= WEATHER =================
   Types: clear, rain, storm (rain + lightning), snow, sand (sandstorm), wind, tornado.
   Each type changes:
   - what you see: falling rain/snow, flying dust or leaves, darker sky, thicker fog, a funnel for the tornado
   - what you hear: rain hiss, wind howl, thunder, the tornado's rumble
   - how the battle plays (only during a battle):
       rain   → soldiers a little slower, aim a little worse
       storm  → like rain, plus lightning that strikes the battlefield (hurts, sets trees on fire)
       snow   → soldiers noticeably slower
       sand   → you can't see far: shooting range shorter and aim worse, soldiers slower
       wind   → arrows, stones, grenades and shells drift with the wind
       tornado→ a funnel wanders across the map, throws soldiers and vehicles, rips out trees
   WX.spd / WX.rng / WX.acc are read by the unit code. */
const WX_TYPES=['clear','rain','storm','snow','sand','wind','tornado'];
const WX_IC={clear:'☀️',rain:'🌧️',storm:'⛈️',snow:'❄️',sand:'🌪️',wind:'💨',tornado:'🌀',random:'🎲'};
const WX={type:'clear',spd:1,rng:1,acc:0,wx:0,wz:0,windK:0,dark:0,fog:1,tint:null,boltT:0,torn:null,flash:0,drops:null,amb:null};

/* ---------- rain / snow / dust drawn as many short lines or points around the camera ---------- */
const WX_N=3500; const WX_FLASH=new THREE.Color(0xdde6ff);
const wxLineGeo=new THREE.BufferGeometry(); const wxLinePos=new Float32Array(WX_N*6);
wxLineGeo.setAttribute('position',new THREE.BufferAttribute(wxLinePos,3).setUsage(THREE.DynamicDrawUsage));
const wxLines=new THREE.LineSegments(wxLineGeo,new THREE.LineBasicMaterial({color:0xd8e2ee,transparent:true,opacity:.7,depthWrite:false}));
wxLines.frustumCulled=false; wxLines.visible=false; scene.add(wxLines);
const wxPtGeo=new THREE.BufferGeometry(); const wxPtPos=new Float32Array(WX_N*3);
wxPtGeo.setAttribute('position',new THREE.BufferAttribute(wxPtPos,3).setUsage(THREE.DynamicDrawUsage));
const wxPtMat=new THREE.PointsMaterial({color:0xffffff,size:.35,transparent:true,opacity:.9,depthWrite:false,sizeAttenuation:true});
const wxPts=new THREE.Points(wxPtGeo,wxPtMat); wxPts.frustumCulled=false; wxPts.visible=false; scene.add(wxPts);
const wxP=new Float32Array(WX_N*3), wxV=new Float32Array(WX_N);   // particle positions relative to the camera target, own speed

/* ---------- lightning bolt: a jagged line from the clouds to the ground ---------- */
const boltGeo=new THREE.BufferGeometry(); const boltPos=new Float32Array(60*3); boltGeo.setAttribute('position',new THREE.BufferAttribute(boltPos,3));
const bolt=new THREE.Line(boltGeo,new THREE.LineBasicMaterial({color:0xeef4ff,transparent:true,opacity:1}));
bolt.frustumCulled=false; bolt.visible=false; scene.add(bolt);
const boltLight=new THREE.PointLight(0xcfe0ff,0,140,1.5); scene.add(boltLight);

/* ---------- tornado: rotating translucent rings + debris ---------- */
const tornG=new THREE.Group(); tornG.visible=false; scene.add(tornG);
const tornMat=new THREE.MeshBasicMaterial({color:0x6d675f,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide});
for(let i=0;i<14;i++){ const k=i/13, r0=1.2+k*k*9, m=new THREE.Mesh(new THREE.CylinderGeometry(r0*1.08,r0,2.4,18,1,true),tornMat); m.position.y=i*2.2+1.2; m.userData.k=k; tornG.add(m); }

function wxLabel(t){ return WX_IC[t]+' '+T('wx_'+t); }
function wxRandomFor(theme,level){
  const id=theme&&theme.id||'';
  const r=Math.random();
  if(/desert|mars|dune|canyon/.test(id)) return r<.35?'sand':r<.5?'wind':r<.58?'tornado':'clear';
  if(/snow|ice|arctic|tundra/.test(id)) return r<.55?'snow':r<.7?'wind':'clear';
  if(/space|moon|alien|neon|city|future/.test(id)) return r<.2?'rain':r<.3?'storm':'clear';
  if(level!=null&&level<4) return r<.25?'rain':'clear';   // first levels stay calm
  return r<.42?'clear':r<.6?'rain':r<.72?'storm':r<.84?'wind':r<.92?'snow':'tornado';
}
function setWeather(type){
  if(type==='random') type=wxRandomFor(curTheme,S.mode==='campaign'&&S.level?S.level.n:null);
  if(!WX_TYPES.includes(type)) type='clear';
  WX.type=type; S.weather=type;
  const a=Math.random()*6.283, k={clear:.15,rain:.35,storm:.7,snow:.3,sand:1,wind:1,tornado:.8}[type];
  WX.wx=Math.cos(a)*k; WX.wz=Math.sin(a)*k; WX.windK=k;
  WX.spd={clear:1,rain:.94,storm:.92,snow:.82,sand:.88,wind:.97,tornado:.95}[type];
  WX.rng={clear:1,rain:.95,storm:.92,snow:.95,sand:.62,wind:1,tornado:1}[type];
  WX.acc={clear:0,rain:-.04,storm:-.06,snow:-.03,sand:-.12,wind:-.03,tornado:-.02}[type];
  WX.dark={clear:0,rain:.35,storm:.6,snow:.25,sand:.3,wind:.1,tornado:.5}[type];
  WX.fog={clear:1,rain:.62,storm:.5,snow:.5,sand:.22,wind:.9,tornado:.6}[type];
  WX.tint=type==='sand'?new THREE.Color(0xc79a5c):type==='snow'?new THREE.Color(0xdfe6ee):(type==='rain'||type==='storm'||type==='tornado')?new THREE.Color(0x6f7a86):null;
  WX.boltT=R(3,7); WX.flash=0;
  // particles
  const lines=type==='rain'||type==='storm', pts=type==='snow'||type==='sand'||type==='wind'||type==='tornado';
  wxLines.visible=lines; wxPts.visible=pts;
  wxPtMat.color.setHex(type==='snow'?0xffffff:type==='sand'?0xd9b27a:type==='tornado'?0x8a8070:0x6f8a3c);
  wxPtMat.size=type==='snow'?.32:type==='sand'?.5:type==='wind'?.38:.3; wxPtMat.opacity=type==='sand'?.75:.9;
  const n=lines?WX_N:type==='snow'?WX_N:type==='sand'?WX_N:type==='tornado'?1200:500;
  WX.n=n;
  WX.seeded=null;   // drops are placed around the camera on the next step
  // tornado
  tornG.visible=type==='tornado';
  WX.torn=type==='tornado'?{x:R(-HALF*.4,HALF*.4),z:R(-HALF*.4,HALF*.4),dx:R(-1,1),dz:R(-1,1),r:7,t:0}:null;
  if(SMK) SMK.wind=.7+k*2;
  wxAmbience();
  if(typeof applyTOD==='function') applyTOD();
  if(typeof waterU!=='undefined'){ waterU.wind.value=k; waterU.rain.value=lines?1:0; }
  const hb=document.getElementById('wxB'); if(hb) hb.textContent=WX_IC[type];
}

/* sky and light: called from the day/night code after it sets the normal colours */
function wxLight(){
  if(!WX.dark&&!WX.tint){ WX.bg=scene.background.clone(); return; }
  if(WX.tint){ scene.background.lerp(WX.tint,WX.type==='sand'?.75:.55); scene.fog.color.copy(scene.background); }
  sun.intensity*=1-WX.dark*.75; hemi.intensity*=1-WX.dark*.35;
  if(typeof stars!=='undefined') stars.material.opacity*=1-WX.dark;
  WX.bg=scene.background.clone();
}

/* ---------- sounds: looping filtered noise ---------- */
function wxAmbience(){
  if(WX.amb){ try{ const t=AC.currentTime; WX.amb.g.gain.setTargetAtTime(0,t,.4); const old=WX.amb; setTimeout(()=>{try{old.src.stop();}catch(e){}},1500);}catch(e){} WX.amb=null; }
  if(!AC||!NB) return;
  const type=WX.type; if(type==='clear'||type==='snow') return;
  const src=AC.createBufferSource(); src.buffer=NB; src.loop=true;
  const f=AC.createBiquadFilter(), g=AC.createGain(); g.gain.value=0;
  if(type==='rain'||type==='storm'){ f.type='highpass'; f.frequency.value=1200; }
  else if(type==='tornado'){ f.type='lowpass'; f.frequency.value=220; }
  else { f.type='bandpass'; f.frequency.value=420; f.Q.value=.8; }
  src.connect(f); f.connect(g); g.connect(master); src.start();
  WX.amb={src,f,g,base:{rain:.07,storm:.11,sand:.16,wind:.12,tornado:.2}[type]||.08};
}
function wxThunder(x,z,near){
  if(!AC||muted) return; const now=AC.currentTime, d=near?.05:R(.5,1.8), vol=sfxVol(x,z);
  const src=AC.createBufferSource(); src.buffer=NB; src.loop=true; const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=near?900:300;
  const g=AC.createGain(); g.gain.setValueAtTime(.0001,now+d); g.gain.exponentialRampToValueAtTime(.9*vol,now+d+.05); g.gain.exponentialRampToValueAtTime(.0001,now+d+2.6);
  src.connect(f); f.connect(g); g.connect(master); if(revSend){ const w=AC.createGain(); w.gain.value=.6; g.connect(w); w.connect(revSend);} src.start(now+d); src.stop(now+d+2.8);
}

/* ---------- lightning strike (also used to replay a strike sent by the host in multiplayer) ---------- */
function wxStrike(x,z,real){
  const y0=gh(x,z); let px=x+R(-6,6), pz=z+R(-6,6), py=y0+70;
  for(let i=0;i<20;i++){ const k=i/19, ty=y0+70*(1-k); px+=(x-px)*.25+R(-2.2,2.2); pz+=(z-pz)*.25+R(-2.2,2.2); if(i===19){px=x;pz=z;}
    boltPos[i*3]=px; boltPos[i*3+1]=ty; boltPos[i*3+2]=pz; }
  boltGeo.setDrawRange(0,20); boltGeo.attributes.position.needsUpdate=true; bolt.visible=true; bolt.material.opacity=1; WX.flash=1;
  boltLight.position.set(x,y0+20,z); boltLight.intensity=6;
  for(let i=0;i<14;i++) ADD.emit(x,y0+.3,z,R(-5,5),R(2,8),R(-5,5),R(.2,.5),.25,.08,.8,.9,1,1,14,.3);
  wxThunder(x,z,Math.hypot(x-cam.tx,z-cam.tz)<60);
  if(real){ explosion(x,y0+.5,z,3,45,null,null,'blast');
    for(const o of obstacles) if(!o.dead&&TREES[o.type]&&Math.hypot(o.x-x,o.z-z)<5) igniteObs(o);
    if(typeof Net!=='undefined'&&Net.isHost()) Net.fx(['bolt',+x.toFixed(1),+z.toFixed(1)]); }
}

/* ---------- every simulation step ---------- */
function wxStep(dt){
  const type=WX.type, battle=S.phase==='battle', ctrl=!(typeof Net!=='undefined'&&Net.isClient());
  // lightning
  if(type==='storm'){ WX.boltT-=dt; if(WX.boltT<=0){ WX.boltT=R(3.5,9);
      if(ctrl){ let x,z; const tall=battle&&Math.random()<.45?units.filter(u=>u.alive&&!u.def.fly&&(u.def.model||u.def.hy>2)):[];
        if(tall.length){ const u=tall[Math.floor(Math.random()*tall.length)]; x=u.x; z=u.z; } else { x=R(-HALF*.85,HALF*.85); z=R(-HALF*.85,HALF*.85); }
        wxStrike(x,z,battle); } } }
  else if(type==='rain'&&Math.random()<dt*.04&&ctrl){ /* distant thunder only */ wxThunder(cam.tx+R(-200,200),cam.tz+R(-200,200),false); }
  if(WX.flash>0){ WX.flash=Math.max(0,WX.flash-dt*3.2); bolt.material.opacity=WX.flash; if(WX.flash<=0) bolt.visible=false; boltLight.intensity=WX.flash*6; }
  // tornado
  const Tn=WX.torn;
  if(Tn){ Tn.t+=dt;
    if(ctrl){ Tn.dx+=R(-.6,.6)*dt; Tn.dz+=R(-.6,.6)*dt; const l=Math.hypot(Tn.dx,Tn.dz)||1; Tn.dx/=l; Tn.dz/=l;
      const sp=3.2; Tn.x+=Tn.dx*sp*dt; Tn.z+=Tn.dz*sp*dt;
      const lim=HALF*.85; if(Math.abs(Tn.x)>lim){Tn.dx=-Math.sign(Tn.x)*Math.abs(Tn.dx); Tn.x=clamp(Tn.x,-lim,lim);} if(Math.abs(Tn.z)>lim){Tn.dz=-Math.sign(Tn.z)*Math.abs(Tn.dz); Tn.z=clamp(Tn.z,-lim,lim);}
      if(battle){ const R2=Tn.r*1.6;
        for(const u of units){ if(!u.alive||u.def.boss) continue; const dx=u.x-Tn.x, dz=u.z-Tn.z, d=Math.hypot(dx,dz); if(d>R2) continue;
          const f=1-d/R2, m=Math.sqrt(u.def.mass||1);
          // pulled in and spun around, then thrown out
          u.kvx+=(-dx/(d||1)*4+(-dz/(d||1))*9)*f/m*dt*6; u.kvz+=(-dz/(d||1)*4+(dx/(d||1))*9)*f/m*dt*6;
          if(!u.def.fly){ u.impY=Math.max(u.impY||0,f*10/m); u.impT=S.t; }
          hurt(u,(u.def.organic?22:12)*f*dt*(u.def.armor||1),null,'blast'); }
        for(const o of obstacles){ if(o.dead||o.def.hp>1e8) continue; const d=Math.hypot(o.x-Tn.x,o.z-Tn.z); if(d<Tn.r+Math.max(o.hx,o.hz)) hurtObs(o,(TREES[o.type]?60:25)*dt,Tn.x,Tn.z); }
        if(typeof critters!=='undefined') for(const c of critters){ if(c.dead) continue; const d=Math.hypot(c.x-Tn.x,c.z-Tn.z); if(d<R2){ c.kvx=(c.kvx||0)+(-(c.z-Tn.z))*.5*dt*10; c.kvz=(c.kvz||0)+(c.x-Tn.x)*.5*dt*10; } }
      } }
    const gy=gh(Tn.x,Tn.z); tornG.position.set(Tn.x,gy,Tn.z);
    tornG.children.forEach((m,i)=>{ m.rotation.y=Tn.t*(4-m.userData.k*2)+i; m.position.x=Math.sin(Tn.t*1.3+i*.5)*m.userData.k*2.2; m.position.z=Math.cos(Tn.t*1.1+i*.45)*m.userData.k*2.2; });
    for(let i=0;i<3;i++){ const a=Math.random()*6.283, r=R(1,Tn.r*1.2); SMK.emit(Tn.x+Math.cos(a)*r,gy+R(0,2),Tn.z+Math.sin(a)*r,-Math.sin(a)*9,R(2,6),Math.cos(a)*9,R(.8,1.6),.8,2.5,.48,.44,.38,.55,-1,1); }
    if(Math.random()<dt*20) ADD.emit(Tn.x+R(-2,2),gy+R(2,25),Tn.z+R(-2,2),R(-8,8),R(-2,4),R(-8,8),.6,.3,.3,.35,.3,.25,1,4,0);
  }
  // falling particles (around where the camera looks)
  wxParticles(dt);
  // sound level follows the camera height and the tornado distance
  if(WX.amb&&AC){ let v=WX.amb.base*clamp(1.4-cam.r/260,.35,1.2); if(type==='tornado'&&Tn) v*=clamp(1.6-Math.hypot(Tn.x-cam.tx,Tn.z-cam.tz)/90,.25,1.6); if(S.mode==='menu') v*=.3;
    WX.amb.g.gain.setTargetAtTime(v,AC.currentTime,.3); }
}
/* falling particles. The rain falls in a box IN FRONT OF THE CAMERA'S EYE (between the eye and the point it looks at),
   like rain in front of your own eyes, so it looks like it rains everywhere at any zoom.
   Each drop keeps its own place in the world; a drop that leaves the box re-enters on the opposite side.
   Splashes on the ground appear all around the area you look at. */
const WX_C=new THREE.Vector3(), WX_D=new THREE.Vector3();
function wxBox(){
  WX_D.set(cam.tx,gh(cam.tx,cam.tz),cam.tz).sub(camera.position); const dist=WX_D.length()||1; WX_D.divideScalar(dist);
  WX_C.copy(camera.position).addScaledVector(WX_D,Math.min(32,dist*.6));
  return {span:30,H:22};
}
function wxSeed(){
  const B=wxBox(), horiz=WX.type==='sand'||WX.type==='wind'||WX.type==='tornado';
  for(let i=0;i<WX_N;i++){ const j=i*3; wxP[j]=WX_C.x+R(-B.span,B.span); wxP[j+2]=WX_C.z+R(-B.span,B.span); wxP[j+1]=WX_C.y+R(-B.H,B.H); wxV[i]=R(.8,1.2); }
  WX.seeded=WX.type;
}
function wxParticles(dt){
  const type=WX.type; if(type==='clear') return;
  if(WX.seeded!==type) wxSeed();
  const B=wxBox(), span=B.span, s2=span*2, H=B.H, n=WX.n||0, cx=WX_C.x, cy=WX_C.y, cz=WX_C.z;
  const wrap=j=>{ let d=wxP[j]-cx; if(d>span) wxP[j]-=s2*Math.ceil((d-span)/s2); else if(d<-span) wxP[j]+=s2*Math.ceil((-span-d)/s2);
    d=wxP[j+2]-cz; if(d>span) wxP[j+2]-=s2*Math.ceil((d-span)/s2); else if(d<-span) wxP[j+2]+=s2*Math.ceil((-span-d)/s2);
    d=wxP[j+1]-cy; if(d>H) wxP[j+1]-=2*H*Math.ceil((d-H)/(2*H)); };
  const rain=type==='rain'||type==='storm';
  // splashes on the ground around the point the camera looks at
  if(rain){ const rr=Math.min(90,20+cam.r*.5); for(let k=0;k<Math.ceil(dt*90);k++){ const x=cam.tx+R(-rr,rr), z=cam.tz+R(-rr,rr); SMK.emit(x,gh(x,z)+.05,z,0,.6,0,.25,.12,.45,.8,.85,.9,.4,0,1); } }
  if(rain){
    const fall=26, sx=WX.wx*10, sz=WX.wz*10;
    for(let i=0;i<WX_N;i++){ const j=i*3, k=i*6; if(i>=n){ wxLinePos.fill(0,k,k+6); continue; }
      wxP[j+1]-=fall*wxV[i]*dt; wxP[j]+=sx*dt; wxP[j+2]+=sz*dt; wrap(j);
      if(wxP[j+1]<cy-H||wxP[j+1]<gh(wxP[j],wxP[j+2])) wxP[j+1]=cy+H-R(0,4);
      const x=wxP[j], y=wxP[j+1], z=wxP[j+2];
      wxLinePos[k]=x; wxLinePos[k+1]=y; wxLinePos[k+2]=z; wxLinePos[k+3]=x-sx*.04; wxLinePos[k+4]=y+1.4; wxLinePos[k+5]=z-sz*.04; }
    wxLineGeo.attributes.position.needsUpdate=true; return;
  }
  const horiz=type==='sand'||type==='wind'||type==='tornado';
  const fall=type==='snow'?2.2:type==='sand'?.4:.8, sx=WX.wx*(horiz?22:4), sz=WX.wz*(horiz?22:4);
  for(let i=0;i<WX_N;i++){ const j=i*3; if(i>=n){ wxPtPos[j+1]=-999; continue; }
    wxP[j+1]-=fall*wxV[i]*dt; wxP[j]+=sx*wxV[i]*dt+(type==='snow'?Math.sin(S.t+i)*.6*dt:0); wxP[j+2]+=sz*wxV[i]*dt; wrap(j);
    if(wxP[j+1]<cy-H||wxP[j+1]<gh(wxP[j],wxP[j+2])) wxP[j+1]=horiz?Math.max(gh(wxP[j],wxP[j+2])+R(.2,4),cy-H+R(0,2*H)):cy+H-R(0,4);
    wxPtPos[j]=wxP[j]; wxPtPos[j+1]=wxP[j+1]; wxPtPos[j+2]=wxP[j+2]; }
  wxPtGeo.attributes.position.needsUpdate=true;
}
/* every rendered frame: fog distance and lightning flash on the sky */
function wxFrame(){
  const k=HALF/80; scene.fog.near=170*k*(WX.fog<1?WX.fog*.35:1); scene.fog.far=420*k*WX.fog;
  if(WX.type==='sand') { scene.fog.near=12; scene.fog.far=Math.max(110,cam.r*1.3); }
  if(WX.bg){ if(WX.flash>0){ scene.background.copy(WX.bg).lerp(WX_FLASH,WX.flash*.5); scene.fog.color.copy(scene.background); WX.flashing=1; } else if(WX.flashing){ scene.background.copy(WX.bg); scene.fog.color.copy(WX.bg); WX.flashing=0; } }
}
