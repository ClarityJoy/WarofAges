'use strict';
/* ================= TERRAIN: hills, valleys, mountains, real water, sky, grass =================
   Height comes from a grid (TER.h). gh(x,z) gives the ground height anywhere on the map.
   Built per map: noise hills by theme -> water beds carved -> mesh with colours by slope/height. */
const TER={res:0,cs:1,h:null,maxH:0,waters:[],bridges:[],mesh:null,outer:null,grass:null,pebbles:null,border:null,waterMeshes:[],time:0};
const THEME_RELIEF={field:{a:7,s:70},city:{a:1.2,s:90},forest:{a:9,s:60},desert:{a:5,s:34,dunes:1},snow:{a:15,s:70,ridge:1},village:{a:5,s:80},ruins:{a:6,s:60},lakes:{a:4,s:70},base:{a:2,s:90},future:{a:1,s:100},mars:{a:9,s:60,craters:1}};
function makeNoise(seed){ const r=mulberry32(seed), P=new Float32Array(65536); for(let i=0;i<65536;i++) P[i]=r();
  const g=(i,j)=>P[((j&255)<<8)|(i&255)];
  return (x,z)=>{ const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi, u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
    const a=g(xi,zi), b=g(xi+1,zi), c=g(xi,zi+1), d=g(xi+1,zi+1); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }; }
function fbm(n,x,z,o){ let s=0,a=1,f=1,t=0; for(let i=0;i<(o||4);i++){ s+=n(x*f,z*f)*a; t+=a; a*=.5; f*=2.03; } return s/t; }
function gh(x,z){ let h=ghRaw(x,z); for(const b of TER.bridges) if(Math.abs(x-b.x)<b.hx&&Math.abs(z-b.z)<b.hz&&h<b.y) h=b.y; return h; }
function ghRaw(x,z){ const T=TER; if(!T.h) return 0; const n=T.res; let fx=(x+HALF)/T.cs, fz=(z+HALF)/T.cs;
  if(fx<0)fx=0; if(fz<0)fz=0; if(fx>n-1.0001)fx=n-1.0001; if(fz>n-1.0001)fz=n-1.0001;
  const ix=fx|0, iz=fz|0, tx=fx-ix, tz=fz-iz, i=iz*n+ix, h=T.h; const a=h[i], b=h[i+1], c=h[i+n], d=h[i+n+1];
  return a+(b-a)*tx+(c-a)*tz+(a-b-c+d)*tx*tz; }
const _gn=new THREE.Vector3();
function gNormal(x,z,out){ out=out||_gn; return out.set(gh(x-1,z)-gh(x+1,z),2,gh(x,z-1)-gh(x,z+1)).normalize(); }
let NOISE=makeNoise(1);
function buildHeights(map){
  const th=map.theme, P=THEME_RELIEF[th.id]||{a:4,s:70}, cs=Math.max(1,HALF/128), n=Math.ceil(2*HALF/cs)+1;
  TER.cs=cs; TER.res=n; TER.h=new Float32Array(n*n); TER.waters=[]; TER.bridges=[]; NOISE=makeNoise(map.seed);
  const r=mulberry32(map.seed+77), craters=[];
  if(P.craters) for(let i=0;i<Math.round(6*HALF/80);i++) craters.push({x:(r()*2-1)*HALF*.8,z:(r()*2-1)*HALF*.8,R:6+r()*14});
  let mx=0;
  for(let iz=0;iz<n;iz++) for(let ix=0;ix<n;ix++){
    const x=-HALF+ix*cs, z=-HALF+iz*cs;
    let h=(fbm(NOISE,x/P.s,z/P.s,4)-.5)*2*P.a;
    if(P.ridge){ const q=fbm(NOISE,x/P.s*.7+40,z/P.s*.7+40,3); h+=(1-Math.abs(q*2-1))*P.a*.9-P.a*.4; }
    if(P.dunes){ const w=Math.sin((x+z*.35)/P.s*5+fbm(NOISE,x/60,z/60,2)*6); h+=w*w*P.a*.6; }
    for(const c of craters){ const d=Math.hypot(x-c.x,z-c.z)/c.R; if(d<1.4){ h+=d<1?-(1-d*d)*c.R*.25:Math.sin((d-1)/.4*Math.PI)*c.R*.08; } }
    h+=(fbm(NOISE,x/9+100,z/9+100,2)-.5)*Math.min(.8,P.a*.1);           // small bumps
    const e=Math.max(Math.abs(x),Math.abs(z)), edge=1-clamp((e-(HALF-14))/12,0,1); // flatten toward the map edge
    h*=edge*edge*(3-2*edge);
    TER.h[iz*n+ix]=h; if(h>mx) mx=h;
  }
  TER.maxH=mx+.5;
}
/* water beds: lower the ground inside the rectangle and blend the banks */
function carveWater(x,z,w,d){
  const n=TER.res, cs=TER.cs, hx=w/2, hz=d/2, bank=3;
  let rim=1e9; for(let k=0;k<=24;k++){ const t=k/24; for(const [px,pz] of [[x-hx+t*w,z-hz],[x-hx+t*w,z+hz],[x-hx,z-hz+t*d],[x+hx,z-hz+t*d]]) rim=Math.min(rim,ghRaw(px,pz)); }
  const level=rim-.25, bed=level-1.6;
  const x0=Math.max(0,Math.floor((x-hx-bank+HALF)/cs)), x1=Math.min(n-1,Math.ceil((x+hx+bank+HALF)/cs));
  const z0=Math.max(0,Math.floor((z-hz-bank+HALF)/cs)), z1=Math.min(n-1,Math.ceil((z+hz+bank+HALF)/cs));
  for(let iz=z0;iz<=z1;iz++) for(let ix=x0;ix<=x1;ix++){
    const px=-HALF+ix*cs, pz=-HALF+iz*cs, dx=Math.max(0,Math.abs(px-x)-hx), dz=Math.max(0,Math.abs(pz-z)-hz), dd=Math.hypot(dx,dz), i=iz*n+ix;
    if(dd===0){ const inner=Math.min(hx-Math.abs(px-x),hz-Math.abs(pz-z)); TER.h[i]=Math.min(TER.h[i],bed+Math.max(0,1.2-inner*.6)); }
    else if(dd<bank){ const t=dd/bank, s=t*t*(3-2*t); TER.h[i]=Math.min(TER.h[i],(level-.4)*(1-s)+TER.h[i]*s); }
  }
  const W={x,z,w,d,level}; TER.waters.push(W); return W;
}
/* ---------- meshes ---------- */
const terrainMat=new THREE.MeshLambertMaterial({vertexColors:true});
const outerMat=new THREE.MeshLambertMaterial({vertexColors:true});
const C_ROCK=new THREE.Color(0x7d776d), C_SNOW=new THREE.Color(0xf4f7fa), C_DIRT=new THREE.Color(0x7a6448), _c=new THREE.Color(), _c2=new THREE.Color();
function themeBase(th){ return new THREE.Color(th.ground[0]); }
function colorAt(th,x,z,h,slope,out){
  const base=themeBase(th); out.copy(base);
  const v=fbm(NOISE,x/18+300,z/18+300,3); out.multiplyScalar(.82+v*.36);
  if(th.id==='field'||th.id==='village'||th.id==='lakes'||th.id==='forest'){ const dry=fbm(NOISE,x/45+500,z/45,2); out.lerp(_c2.set(0x9a8a52),clamp((dry-.55)*2.5,0,.6)); }
  if(slope>.35) out.lerp(th.id==='desert'?_c2.set(0xb58a5a):th.id==='mars'?_c2.set(0x7a3a20):C_ROCK,clamp((slope-.35)*2.5,0,.85));
  if((th.id==='snow'&&h>2)||(th.id==='forest'&&h>8.5)) out.lerp(C_SNOW,clamp((h-(th.id==='snow'?2:8.5))/3,0,1)*(slope>.6?.4:1));
  for(const W of TER.waters){ const dx=Math.max(0,Math.abs(x-W.x)-W.w/2), dz=Math.max(0,Math.abs(z-W.z)-W.d/2), dd=Math.hypot(dx,dz); if(dd<3.5) out.lerp(_c2.set(0x6b5a40),(1-dd/3.5)*.7); }
  return out;
}
function buildTerrainMesh(map){
  const th=map.theme, n=TER.res, cs=TER.cs, segs=Math.min(n-1,320), step=2*HALF/segs;
  const N=(segs+1)*(segs+1), pos=new Float32Array(N*3), col=new Float32Array(N*3), uv=new Float32Array(N*2), idx=new Uint32Array(segs*segs*6);
  for(let iz=0,k=0;iz<=segs;iz++) for(let ix=0;ix<=segs;ix++,k++){
    const x=-HALF+ix*step, z=-HALF+iz*step, h=ghRaw(x,z);
    pos[k*3]=x; pos[k*3+1]=h; pos[k*3+2]=z; uv[k*2]=ix/segs; uv[k*2+1]=1-iz/segs;
    const sl=Math.hypot(ghRaw(x+1,z)-ghRaw(x-1,z),ghRaw(x,z+1)-ghRaw(x,z-1))/2;
    colorAt(th,x,z,h,sl,_c); col[k*3]=_c.r; col[k*3+1]=_c.g; col[k*3+2]=_c.b;
  }
  for(let iz=0,q=0;iz<segs;iz++) for(let ix=0;ix<segs;ix++){ const a=iz*(segs+1)+ix, b=a+1, c=a+segs+1, d=c+1; idx[q++]=a; idx[q++]=c; idx[q++]=b; idx[q++]=b; idx[q++]=c; idx[q++]=d; }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.setAttribute('uv',new THREE.BufferAttribute(uv,2)); g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeVertexNormals();
  if(TER.mesh){ scene.remove(TER.mesh); TER.mesh.geometry.dispose(); }
  terrainMat.map=groundTex(th); terrainMat.needsUpdate=true;
  TER.mesh=new THREE.Mesh(g,terrainMat); TER.mesh.receiveShadow=true; scene.add(TER.mesh);
  buildOuter(th); buildBorder(); buildWaterMeshes(); buildGrass(th); rebuildZoneMeshes();
}
/* mountains and hills around the playing field */
function buildOuter(th){
  if(TER.outer){ scene.remove(TER.outer); TER.outer.geometry.dispose(); }
  const E=HALF*5.5, segs=150, step=2*E/segs, N=(segs+1)*(segs+1), pos=new Float32Array(N*3), col=new Float32Array(N*3), idx=new Uint32Array(segs*segs*6);
  const mh=(th.id==='snow'||th.id==='mars'?1.4:th.id==='city'||th.id==='future'||th.id==='base'?.7:1)*(45+HALF*.45), oc=new THREE.Color(th.outer), mc=new THREE.Color(th.mount);
  for(let iz=0,k=0;iz<=segs;iz++) for(let ix=0;ix<=segs;ix++,k++){
    const x=-E+ix*step, z=-E+iz*step, out=Math.max(Math.abs(x),Math.abs(z))-HALF;
    let h; if(out<=0) h=-4; else { const t=clamp(out/(HALF*1.8),0,1); const m=fbm(NOISE,x/90+900,z/90+900,5); h=Math.pow(t,1.6)*mh*(.35+m*1.3)+(m-.5)*6*clamp(out/10,0,1); h=Math.max(h,0); }
    pos[k*3]=x; pos[k*3+1]=h; pos[k*3+2]=z;
    const t=clamp(h/(mh*.9),0,1); _c.copy(oc).lerp(mc,clamp(t*1.6,0,1)); if(h>mh*.75&&th.id!=='desert'&&th.id!=='mars') _c.lerp(C_SNOW,clamp((h-mh*.75)/(mh*.25),0,1)); _c.multiplyScalar(.85+fbm(NOISE,x/30,z/30,2)*.3);
    col[k*3]=_c.r; col[k*3+1]=_c.g; col[k*3+2]=_c.b;
  }
  for(let iz=0,q=0;iz<segs;iz++) for(let ix=0;ix<segs;ix++){ const a=iz*(segs+1)+ix, b=a+1, c=a+segs+1, d=c+1; idx[q++]=a; idx[q++]=c; idx[q++]=b; idx[q++]=b; idx[q++]=c; idx[q++]=d; }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(pos,3)); g.setAttribute('color',new THREE.BufferAttribute(col,3)); g.setIndex(new THREE.BufferAttribute(idx,1)); g.computeVertexNormals();
  TER.outer=new THREE.Mesh(g,outerMat); TER.outer.receiveShadow=true; scene.add(TER.outer);
}
function buildBorder(){
  if(TER.border){ scene.remove(TER.border); TER.border.geometry.dispose(); }
  const pts=[], s=2; const H=HALF-.5;
  for(let x=-H;x<=H;x+=s) pts.push(new THREE.Vector3(x,gh(x,-H)+.3,-H)); for(let z=-H;z<=H;z+=s) pts.push(new THREE.Vector3(H,gh(H,z)+.3,z));
  for(let x=H;x>=-H;x-=s) pts.push(new THREE.Vector3(x,gh(x,H)+.3,H)); for(let z=H;z>=-H;z-=s) pts.push(new THREE.Vector3(-H,gh(-H,z)+.3,z));
  TER.border=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.35})); scene.add(TER.border);
}
/* zone overlays follow the ground */
function rebuildZoneMeshes(){
  for(const t of TEAM_IDS){ const Z=ZONES[t], m=zoneMeshes[t], w=Z.x1-Z.x0, d=Z.z1-Z.z0, sx=Math.max(2,Math.ceil(w/3)), sz=Math.max(2,Math.ceil(d/3));
    const pos=[], idx=[]; for(let j=0;j<=sz;j++) for(let i=0;i<=sx;i++){ const x=Z.x0+w*i/sx, z=Z.z0+d*j/sz; pos.push(x,gh(x,z)+.25,z); }
    for(let j=0;j<sz;j++) for(let i=0;i<sx;i++){ const a=j*(sx+1)+i, b=a+1, c=a+sx+1, e=c+1; idx.push(a,c,b,b,c,e); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setIndex(idx);
    m.geometry.dispose(); m.geometry=g; m.rotation.set(0,0,0); m.position.set(0,0,0); m.material.side=THREE.DoubleSide; }
}
/* ---------- realistic water: moving ripples, sky reflection, sun glints ---------- */
const waterU={time:{value:0},sunDir:{value:new THREE.Vector3(0,1,0)},sky:{value:new THREE.Color(0xa9c7dc)},day:{value:1}};
const waterMat=new THREE.ShaderMaterial({uniforms:waterU,transparent:true,depthWrite:false,
  vertexShader:`uniform float time; varying vec3 vW; void main(){ vec3 p=position; vec4 w=modelMatrix*vec4(p,1.0); w.y+=sin(w.x*.6+time*1.3)*.04+cos(w.z*.5+time*1.1)*.04; vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader:`uniform float time; uniform vec3 sunDir; uniform vec3 sky; uniform float day; varying vec3 vW;
    void main(){ vec2 p=vW.xz;
      float a=sin(p.x*1.7+time*1.6)+sin(p.y*2.3-time*1.2)+sin((p.x+p.y)*3.1+time*2.1)*.6+sin((p.x-p.y)*5.3-time*2.7)*.35;
      float b=cos(p.x*2.1-time*1.4)+cos(p.y*1.6+time*1.7)+cos((p.x-p.y)*3.7+time*2.3)*.6+cos((p.x+p.y)*6.1+time*3.1)*.35;
      vec3 N=normalize(vec3(a*.06,1.0,b*.06));
      vec3 V=normalize(cameraPosition-vW);
      float fr=pow(1.0-max(dot(N,V),0.0),3.0);
      vec3 deep=vec3(.05,.17,.24)*(.3+.7*day), shallow=vec3(.12,.36,.42)*(.3+.7*day);
      vec3 col=mix(deep,shallow,.35+.25*a*.3);
      col=mix(col,sky,clamp(.25+fr*.75,0.0,1.0));
      vec3 R=reflect(-sunDir,N); float sp=pow(max(dot(R,V),0.0),120.0)*day;
      col+=vec3(1.0,.95,.85)*sp*1.6;
      gl_FragColor=vec4(col,.86+fr*.12);
    }`});
function buildWaterMeshes(){
  for(const m of TER.waterMeshes){ scene.remove(m); m.geometry.dispose(); } TER.waterMeshes=[];
  for(const W of TER.waters){ const g=new THREE.PlaneGeometry(W.w+1.5,W.d+1.5,Math.max(2,Math.ceil(W.w/2)),Math.max(2,Math.ceil(W.d/2))); g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,waterMat); m.position.set(W.x,W.level,W.z); m.renderOrder=1; scene.add(m); TER.waterMeshes.push(m); }
}
/* ---------- grass tufts and pebbles (instanced: thousands for the price of one) ---------- */
const grassGeo=(()=>{const p=[]; for(let i=0;i<3;i++){const a=i*Math.PI/3, c=Math.cos(a)*.35, s=Math.sin(a)*.35; p.push(-c,0,-s, c,0,s, 0,.7,0);} const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(p,3)); g.computeVertexNormals(); return g;})();
const grassMat=new THREE.MeshLambertMaterial({side:THREE.DoubleSide});
const pebbleGeo=new THREE.DodecahedronGeometry(.25,0), pebbleMat=new THREE.MeshLambertMaterial({color:0x8a857c,flatShading:true});
function buildGrass(th){
  for(const k of ['grass','pebbles']) if(TER[k]){ scene.remove(TER[k]); TER[k].dispose&&TER[k].dispose(); TER[k]=null; }
  const lush={field:1,village:1,lakes:1,forest:1,ruins:.6,base:.3,city:.15,desert:.15,snow:0,future:0,mars:0}[th.id]||0;
  const area=(2*HALF)*(2*HALF), cnt=Math.round(Math.min(16000,area/160*12*lush));
  const M4=new THREE.Matrix4(), Q=new THREE.Quaternion(), Sv=new THREE.Vector3(), Pv=new THREE.Vector3(), UP=new THREE.Vector3(0,1,0), col=new THREE.Color();
  const r=mulberry32(4242);
  if(cnt>0){
    const im=new THREE.InstancedMesh(grassGeo,grassMat,cnt); let k=0;
    for(let i=0;i<cnt*2&&k<cnt;i++){ const x=(r()*2-1)*(HALF-1), z=(r()*2-1)*(HALF-1);
      if(TER.waters.some(W=>Math.abs(x-W.x)<W.w/2+1&&Math.abs(z-W.z)<W.d/2+1)) continue;
      if(fbm(NOISE,x/25+70,z/25,2)<.38) continue;
      const s=.6+r()*.9; Q.setFromAxisAngle(UP,r()*6.283); Pv.set(x,gh(x,z)-.05,z); Sv.set(s,s*(.7+r()*.8),s); M4.compose(Pv,Q,Sv); im.setMatrixAt(k,M4);
      if(th.id==='desert') col.setHSL(.12+r()*.03,.35,.35+r()*.1); else col.setHSL(.22+r()*.07,.45+r()*.2,.24+r()*.14);
      im.setColorAt(k,col); k++; }
    im.count=k; im.instanceMatrix.needsUpdate=true; if(im.instanceColor) im.instanceColor.needsUpdate=true; scene.add(im); TER.grass=im;
  }
  const pc=Math.round(Math.min(2500,area/160*1.2));
  const pm=new THREE.InstancedMesh(pebbleGeo,pebbleMat,pc);
  for(let i=0;i<pc;i++){ const x=(r()*2-1)*(HALF-1), z=(r()*2-1)*(HALF-1), s=.4+r()*1.4; Q.setFromEuler(new THREE.Euler(r()*3,r()*3,r()*3)); Pv.set(x,gh(x,z),z); Sv.set(s,s*.6,s); M4.compose(Pv,Q,Sv); pm.setMatrixAt(i,M4);
    col.copy(new THREE.Color(th.mars?0x8a4a2a:th.id==='snow'?0x9aa0a8:0x8a857c)).multiplyScalar(.8+r()*.4); pm.setColorAt(i,col); }
  pm.castShadow=true; pm.receiveShadow=true; scene.add(pm); TER.pebbles=pm;
}
/* ---------- sky dome with a horizon glow and a sun ---------- */
const skyU={top:{value:new THREE.Color(0x4f86c6)},hor:{value:new THREE.Color(0xc8dbe8)},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color(0xfff1d6)},day:{value:1}};
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(4000,32,16),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:`varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader:`uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float day; varying vec3 vD;
    void main(){ float h=max(vD.y,0.0); vec3 c=mix(hor,top,pow(h,.55)); if(vD.y<0.0) c=hor*.9;
      float s=max(dot(vD,normalize(sunDir)),0.0); c+=sunCol*(pow(s,600.0)*2.5+pow(s,12.0)*.35*day);
      gl_FragColor=vec4(c,1.0); }`}));
skyDome.renderOrder=-1; scene.add(skyDome);
function updateSky(){
  skyDome.position.copy(camera.position);
  const night=S.night||0;
  skyU.hor.value.copy(scene.fog.color); skyU.top.value.setRGB(.18,.38,.72).lerp(new THREE.Color(0x050915),night);
  skyU.sunDir.value.copy(sun.position).normalize(); skyU.sunCol.value.copy(sun.color).multiplyScalar(sun.intensity>0.02?1:0); skyU.day.value=1-night;
  waterU.sunDir.value.copy(skyU.sunDir.value); waterU.sky.value.copy(scene.fog.color); waterU.day.value=1-night*.75; waterU.time.value=performance.now()/1000;
}
/* ---------- ray vs ground for mouse picking ---------- */
function rayGround(ray,out){
  const o=ray.origin, d=ray.direction; if(d.y>=-.001) return false;
  let t0=0, t1=(o.y+20)/-d.y; const step=Math.max(.5,HALF/200);
  let prev=0; for(let t=0;t<t1;t+=step){ const x=o.x+d.x*t, z=o.z+d.z*t, y=o.y+d.y*t; if(y<=gh(x,z)){ let a=prev,b=t; for(let k=0;k<12;k++){ const m=(a+b)/2; if(o.y+d.y*m<=gh(o.x+d.x*m,o.z+d.z*m)) b=m; else a=m; } t0=b; out.set(o.x+d.x*t0,o.y+d.y*t0,o.z+d.z*t0); return true; } prev=t; }
  return false;
}
/* ---------- line of sight over hills ---------- */
function terrainLos(ax,ay,az,bx_,by,bz){
  const L=Math.hypot(bx_-ax,bz-az), n=Math.min(30,Math.ceil(L/3));
  for(let i=1;i<n;i++){ const t=i/n, x=ax+(bx_-ax)*t, z=az+(bz-az)*t, y=ay+(by-ay)*t; if(gh(x,z)>y-.15) return false; }
  return true;
}

/* a bridge: the river keeps flowing underneath, soldiers walk on the deck */
function addBridgeSpan(x,z,w,d){
  const along=w>d;               // the deck runs along x when wider than deep
  const W=carveWater(x,z,along?w-3:w,along?d:d-3);
  const b={x,z,hx:w/2,hz:d/2,y:W.level+.55}; TER.bridges.push(b); return b;
}
