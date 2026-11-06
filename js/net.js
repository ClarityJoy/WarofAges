'use strict';
/* ================= ONLINE MULTIPLAYER =================
   How it works, in plain words:
   - Everyone who opens the game shares one "lobby". A player who searches puts a small note on himself:
     "looking for 1v1 / 2v2 / 3v3". When enough players with the same note are there, the one who has been
     waiting longest becomes the HOST and invites the others into a private game room.
   - The HOST runs the whole battle on his screen (map, soldiers, damage, weather). Ten times a second he
     publishes the state: where every soldier stands, which way he faces, how much life he has, and the
     shots/explosions that just happened. The other screens only DRAW that state.
   - Before the battle each player places soldiers in his own strip of his side's zone, with his own money.
     A player's clicks go to the host as a short list ("rifleman at x,z, 5 of them"); the host places them.
   - The battle starts when all players pressed "Ready", or after the setup timer.
   - Empty seats (nobody came, or someone left) are played by bots.
   Transport: the artifact "room" (live messages between people who have the page open).
   For testing on one computer, ?netlocal=1 uses the browser's own channel between tabs instead. */
const NETV=3;
const Net={tp:null,lobby:null,g:null,role:null,mode:null,me:null,hostPeer:null,slot:-1,cfg:null,
  searching:false,searchT:0,seq:0,fxq:[],fxSeq:0,shotN:0,lastFx:0,cmds:[],cmdSeq:0,acks:{},lastCmd:{},money:[],ready:{},
  nid:0,byNid:new Map(),part:0,tick:0,lane:null,joined:{},setupT:0,leftWarned:false,lastHostSeen:0,
  isHost(){ return this.role==='host'&&S.mode==='net'; },
  isClient(){ return this.role==='client'&&S.mode==='net'; },
  fx(e){ if(this.fxq.length>400) this.fxq.splice(0,200); this.fxq.push([++this.fxSeq,...e]); },
  shot(u,x,y,z){ if(this.shotN>=14) return; this.shotN++; this.fx(['s',u.nid,+x.toFixed(1),+y.toFixed(1),+z.toFixed(1)]); }
};
const MP_MODES={'1v1':2,'2v2':4,'3v3':6};
const MP_BUDGET=3000, MP_SETUP=90;

/* ---------- a stand-in "room" between tabs of one browser, for testing ---------- */
function LocalRoom(){
  const me='p'+Math.random().toString(36).slice(2,10), bc=new BroadcastChannel('war_ages_net');
  const rooms={};
  function mk(name){
    const R={name,mine:{},others:new Map(),subs:[],
      presence(patch){ for(const k in patch){ if(patch[k]===null) delete R.mine[k]; else R.mine[k]=patch[k]; } send(); fire({updated:[]}); return Promise.resolve(); },
      peers(){ const l=[{peer:me,isMe:true,sameTab:true,kind:'viewer',guest:false,by:null,presence:Object.freeze({...R.mine}),updatedAt:Date.now()}];
        for(const [p,o] of R.others) l.push({peer:p,isMe:false,sameTab:false,kind:'viewer',guest:false,by:null,presence:o.presence,updatedAt:o.at}); return l; },
      onPeers(fn){ R.subs.push(fn); setTimeout(()=>fn({peers:R.peers(),joined:R.peers(),left:[],updated:[]}),0); return ()=>{R.subs=R.subs.filter(f=>f!==fn);}; },
      connected(){ return true; },
      leave(){ bc.postMessage({t:'bye',room:name,peer:me}); delete rooms[name]; return Promise.resolve(); }
    };
    function send(){ bc.postMessage({t:'p',room:name,peer:me,presence:R.mine}); }
    function fire(ch){ setTimeout(()=>{ const c={peers:R.peers(),joined:ch.joined||[],left:ch.left||[],updated:ch.updated||[]}; for(const f of R.subs) f(c); },0); }
    R._send=send; R._fire=fire; rooms[name]=R; return R;
  }
  bc.onmessage=e=>{ const m=e.data, R=rooms[m.room]; if(!R||m.peer===me) return;
    if(m.t==='bye'){ if(R.others.delete(m.peer)) R._fire({left:[{peer:m.peer}]}); return; }
    const was=R.others.has(m.peer); R.others.set(m.peer,{presence:Object.freeze(m.presence),at:Date.now()}); R._fire(was?{updated:[{peer:m.peer}]}:{joined:[{peer:m.peer}]});
    if(!was) R._send(); };
  setInterval(()=>{ for(const n in rooms){ const R=rooms[n]; R._send(); const now=Date.now(); for(const [p,o] of R.others) if(now-o.at>4000){ R.others.delete(p); R._fire({left:[{peer:p}]}); } } },1000);
  window.addEventListener('beforeunload',()=>{ for(const n in rooms) bc.postMessage({t:'bye',room:n,peer:me}); });
  const lobby=mk('lobby');
  return Object.assign(lobby,{join(name){ return Promise.resolve(rooms[name]||mk(name)); }});
}

async function netConnect(){
  if(Net.tp) return Net.tp;
  if(/[?&]netlocal/.test(location.search)&&typeof BroadcastChannel!=='undefined'){ Net.tp=LocalRoom(); return Net.tp; }
  let r=null;
  try{ if(window.claude&&typeof window.claude.use==='function') r=await Promise.race([window.claude.use('room'),new Promise(res=>setTimeout(()=>res(null),11000))]); }catch(e){ r=null; }
  Net.tp=r; return r;
}
const myPeer=room=>{ const p=room.peers().find(q=>q.isMe&&q.sameTab); return p?p.peer:null; };

/* ================= LOBBY / MATCHMAKING ================= */
async function mpSearch(mode){
  const st=$('#mpStatus'); st.textContent=T('mp_connecting');
  const tp=await netConnect();
  if(!tp){ st.innerHTML=T('mp_unavail'); return; }
  Net.lobby=tp; Net.mode=mode; Net.searching=true; Net.searchT=performance.now();
  $('#mpSearch').classList.add('hide'); $('#mpCancel').classList.remove('hide');
  await tp.presence({mm:{m:mode,t:Date.now(),v:NETV}});
  if(!Net.lobbyUnsub) Net.lobbyUnsub=tp.onPeers(()=>mpLobbyCheck());
  mpLobbyCheck();
  clearInterval(Net.lobbyTimer); Net.lobbyTimer=setInterval(mpLobbyCheck,1000);
}
function mpCancel(){
  Net.searching=false; clearInterval(Net.lobbyTimer);
  if(Net.lobby) Net.lobby.presence({mm:null});
  $('#mpSearch').classList.remove('hide'); $('#mpCancel').classList.add('hide'); $('#mpBots').classList.add('hide'); $('#mpStatus').textContent='';
}
function mpSeekers(){
  const L=Net.lobby, now=Date.now();
  return L.peers().filter(p=>p.kind==='viewer'&&p.presence&&p.presence.mm&&p.presence.mm.m===Net.mode&&p.presence.mm.v===NETV&&!p.presence.mm.busy)
    .sort((a,b)=>(a.presence.mm.t-b.presence.mm.t)||(a.peer<b.peer?-1:1));
}
function mpLobbyCheck(force){
  if(!Net.searching||!Net.lobby) return;
  const L=Net.lobby, me=myPeer(L), need=MP_MODES[Net.mode]; if(!me) return;
  const list=mpSeekers();
  // 1) someone invited me
  for(const p of list){ const o=p.presence.mm.off; if(p.peer!==me&&o&&Array.isArray(o.mem)&&o.mem.includes(me)&&Date.now()-o.at<20000){ mpAccept(o,p.peer,me); return; } }
  const waited=(performance.now()-Net.searchT)/1000;
  $('#mpStatus').textContent=T('mp_searching',list.length,need)+(waited>12?' · '+T('mp_wait_s',Math.round(waited)):'');
  $('#mpBots').classList.toggle('hide',waited<12);
  // 2) I have waited longest and there are enough players (or I asked to fill with bots)
  const first=list.length&&list[0].peer===me;
  if((first&&list.length>=need)||force){
    const mem=[me,...list.filter(p=>p.peer!==me).map(p=>p.peer)].slice(0,need);
    const off={g:'g-'+me.slice(0,12).toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+(Date.now()%1e6),mem,at:Date.now()};
    Net.searching=false;
    L.presence({mm:{m:Net.mode,t:list.find(p=>p.peer===me)?.presence.mm.t||Date.now(),v:NETV,off}});
    mpHost(off,me);
  }
}
async function mpAccept(off,hostPeer,me){
  Net.searching=false; clearInterval(Net.lobbyTimer);
  Net.lobby.presence({mm:{m:Net.mode,t:Date.now(),v:NETV,busy:1}});
  $('#mpStatus').textContent=T('mp_found');
  Net.role='client'; Net.hostPeer=hostPeer; Net.slot=off.mem.indexOf(me); Net.me=me;
  try{ Net.g=await Net.lobby.join(off.g); Net.gf=await Net.lobby.join(off.g+'.fx'); }
  catch(e){ $('#mpStatus').textContent=T('mp_fail'); Net.role=null; return; }
  await Net.g.presence({hi:Net.slot});
  Net.lastHostSeen=performance.now();
  Net.g.onPeers(ch=>netClientPeers(ch));
  Net.gf.onPeers(ch=>netClientFx(ch));
  clearInterval(Net.cliTimer); Net.cliTimer=setInterval(netClientWatch,1000);
}
async function mpHost(off,me){
  Net.searching=false; clearInterval(Net.lobbyTimer);
  $('#mpStatus').textContent=T('mp_found');
  Net.role='host'; Net.hostPeer=me; Net.me=me; Net.slot=0; Net.off=off;
  try{ Net.g=await Net.lobby.join(off.g); Net.gf=await Net.lobby.join(off.g+'.fx'); }
  catch(e){ $('#mpStatus').textContent=T('mp_fail'); Net.role=null; return; }
  Net.joined={[me]:true};
  Net.g.onPeers(ch=>netHostPeers(ch));
  const t0=performance.now();
  // wait up to 8 s for the invited players to arrive, then start (bots take empty seats)
  const wait=setInterval(()=>{
    const all=off.mem.every(p=>Net.joined[p]);
    if(all||performance.now()-t0>8000){ clearInterval(wait); Net.lobby.presence({mm:null}); netHostStart(); }
  },300);
}

/* ================= GAME SETUP (both sides run the same code with the host's settings) ================= */
function withSeed(seed,fn){
  const old=Math.random; let a=seed>>>0;
  Math.random=function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  try{ fn(); } finally{ Math.random=old; }
}
const slotTeam=i=>i%2===0?'blue':'red', slotLane=i=>Math.floor(i/2);
function laneBox(slot,k){ const Z=ZONES[slotTeam(slot)], j=slotLane(slot), h=(Z.z1-Z.z0)/k; return {x0:Z.x0,x1:Z.x1,z0:Z.z0+h*j,z1:Z.z0+h*(j+1)}; }
const inBox=(b,x,z)=>x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1;
const TYPE_KEYS=()=>Object.keys(DEFS).filter(k=>!DEFS[k].custom).sort();

function netHostStart(){
  const mem=Net.off.mem, need=MP_MODES[Net.mode];
  const slots=[]; for(let i=0;i<need;i++) slots.push({peer:mem[i]&&Net.joined[mem[i]]?mem[i]:null});
  const sizes={'1v1':80,'2v2':120,'3v3':120};
  const cand=MAPS.map((m,i)=>i).filter(i=>!/space|navy/.test(MAPS[i].theme.id||''));
  const map=cand[Math.floor(Math.random()*cand.length)];
  const cfg={v:NETV,mode:Net.mode,seed:Math.floor(Math.random()*2**31),map,half:sizes[Net.mode],tod:[8,10,12.5,15,17][Math.floor(Math.random()*5)],
    wx:null,budget:MP_BUDGET,slots,start:Date.now()};
  withSeed(cfg.seed,()=>{ /* weather chosen like the map: same on every screen */ });
  cfg.wx=wxRandomFor(MAPS[map].theme);
  cfg.wind=[0,0];
  netStartGame(cfg);
  cfg.wind=[+WX.wx.toFixed(2),+WX.wz.toFixed(2)];
  Net.cfg=cfg;
  // bots in empty seats place their soldiers right away
  slots.forEach((s,i)=>{ Net.money[i]=cfg.budget; if(!s.peer){ netBotDeploy(i); } });
  S.money[S.player]=Net.money[Net.slot];
  netHostPublish(true);
  clearInterval(Net.hostTimer); Net.hostTimer=setInterval(()=>netHostPublish(false),100);
}
function netStartGame(cfg){
  Net.cfg=cfg; Net.nid=0; Net.byNid=new Map(); Net.fxq=[]; Net.fxSeq=0; Net.lastFx=0; Net.ready={}; Net.cmds=[]; Net.cmdSeq=0; Net.acks={}; Net.lastCmd={};
  Net.setupT=MP_SETUP; NETC=Net.role==='client';
  $('#menu').classList.add('hide');
  S.mode='net'; Music.setEra(3);
  withSeed(cfg.seed,()=>{ loadWorld(cfg.map,cfg.tod,cfg.half,false); });
  setWeather(cfg.wx); if(cfg.wind&&(cfg.wind[0]||cfg.wind[1])){ WX.wx=cfg.wind[0]; WX.wz=cfg.wind[1]; }
  S.mode='net'; S.teams=['blue','red']; S.player=slotTeam(Net.slot); setSkins(save.skin);
  S.pool=nonCustom().filter(d=>!d.boss); S.money={blue:0,red:0}; S.money[S.player]=cfg.budget; S.speed=1;
  showZones([S.player]); camTo(S.player); enterHUD();
  netLaneMesh();
  toast(T('mp_lane',netLaneName())+' · '+wxLabel(WX.type),6);
  updateStartBtn();
}
function netLaneName(){ const k=MP_MODES[Net.cfg.mode]/2; if(k===1) return T('mp_lane_all'); const j=slotLane(Net.slot); return T(k===2?(j===0?'mp_lane_l':'mp_lane_r'):(j===0?'mp_lane_l':j===1?'mp_lane_m':'mp_lane_r')); }
let laneMesh=null;
function netLaneMesh(){
  if(laneMesh){ scene.remove(laneMesh); laneMesh=null; }
  const b=laneBox(Net.slot,MP_MODES[Net.cfg.mode]/2), w=b.x1-b.x0, d=b.z1-b.z0;
  const g=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,6,d)); laneMesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xffd36a}));
  laneMesh.position.set((b.x0+b.x1)/2,gh((b.x0+b.x1)/2,(b.z0+b.z1)/2)+2,(b.z0+b.z1)/2); scene.add(laneMesh);
}
function netBotDeploy(slot){
  const team=slotTeam(slot), b=laneBox(slot,MP_MODES[Net.cfg.mode]/2), before=new Set(units);
  const left=botDeploy(team,Net.cfg.budget,'normal',S.pool,false,true);
  for(const u of units) if(!before.has(u)){ u.owner=slot; u.x=clamp(u.x,b.x0+.6,b.x1-.6); u.z=clamp(u.z,b.z0+.6,b.z1-.6); netTag(u); }
  Net.money[slot]=Math.max(0,left||0); Net.ready[slot]=true;
}
function netTag(u){ if(!u.nid){ u.nid=++Net.nid; Net.byNid.set(u.nid,u); } }

/* ---------- placing and erasing (the host applies everyone's clicks) ---------- */
function netPlaceLocal(type,x,z,n,erase){
  if(Net.isHost()){ const r=netApply(Net.slot,erase?'e':'p',type,x,z,n); S.money[S.player]=Net.money[Net.slot]; updateAfford(); return r; }
  Net.cmds.push([++Net.cmdSeq,erase?'e':'p',type,+x.toFixed(1),+z.toFixed(1),n]); if(Net.cmds.length>40) Net.cmds.shift();
  Net.g&&Net.g.presence({c:Net.cmds,hi:Net.slot,r:!!Net.ready[Net.slot]});
  if(!erase){ const d=DEFS[type]; S.money[S.player]-=d.cost*(d.commander?1:n); updateAfford(); }  // shown now, corrected by the host
  return true;
}
function netApply(slot,op,type,x,z,n){
  if(S.phase!=='setup') return false;
  const b=laneBox(slot,MP_MODES[Net.cfg.mode]/2), team=slotTeam(slot);
  if(!inBox(b,x,z)) return false;
  if(op==='e'){ for(const u of units) if(u.alive&&u.owner===slot&&Math.hypot(u.x-x,u.z-z)<3+u.rad&&!u.guard){ Net.money[slot]+=u.def.cost; removeUnit(u); if(u.def.commander) for(const g of units) if(g.guard===u) removeUnit(g); }
    units=units.filter(u=>!u.removed); return true; }
  const d=DEFS[type]; if(!d||d.custom||d.boss) return false;
  n=Math.max(1,Math.min(100,n|0)); n=Math.min(n,Math.floor((Net.money[slot]||0)/d.cost)); if(n<=0) return false;
  if(d.commander&&units.some(u=>u.alive&&u.team===team&&u.def.commander)) return false;
  const out=placeGroup(type,team,x,z,n);
  for(const u of out){ u.owner=slot; u.x=clamp(u.x,b.x0+.6,b.x1-.6); u.z=clamp(u.z,b.z0+.6,b.z1-.6); netTag(u); }
  Net.money[slot]-=d.commander?(out.length?d.cost:0):out.length*d.cost;
  return out.length>0;
}
function netReadyToggle(){
  Net.ready[Net.slot]=!Net.ready[Net.slot];
  if(Net.isClient()) Net.g&&Net.g.presence({c:Net.cmds,hi:Net.slot,r:Net.ready[Net.slot]});
  updateStartBtn();
}

/* ================= HOST: read the others, publish the state ================= */
function netHostPeers(ch){
  const g=Net.g; if(!g) return;
  for(const p of g.peers()){ if(p.isMe) continue; const pr=p.presence||{};
    if(pr.hi!=null){ Net.joined[p.peer]=true; const slot=Net.cfg?Net.cfg.slots.findIndex(s=>s.peer===p.peer):-1; if(slot<0) continue;
      const cmds=Array.isArray(pr.c)?pr.c:[]; const last=Net.lastCmd[p.peer]||0;
      for(const c of cmds){ if(!Array.isArray(c)||c[0]<=last) continue; Net.lastCmd[p.peer]=c[0]; netApply(slot,c[1],c[2],+c[3],+c[4],+c[5]); }
      Net.ready[slot]=!!pr.r; } }
  if(Net.cfg&&ch&&ch.left) for(const l of ch.left){ const slot=Net.cfg.slots.findIndex(s=>s.peer===l.peer); if(slot>=0&&Net.cfg.slots[slot].peer){ Net.cfg.slots[slot].peer=null; Net.ready[slot]=true; toast(T('mp_left'),4); } }
}
function packUnits(list){
  const keys=TYPE_KEYS(), idx={}; keys.forEach((k,i)=>idx[k]=i);
  const b=new Uint8Array(list.length*10); let o=0; const H=HALF;
  for(const u of list){
    const x=Math.round(clamp((u.x+H)/(2*H),0,1)*65535), z=Math.round(clamp((u.z+H)/(2*H),0,1)*65535);
    const r=Math.round((((u.rot%6.2832)+6.2832)%6.2832)/6.2832*255)&255, hp=Math.round(clamp(u.hp/u.mhp,0,1)*255);
    const f=(u.alive?1:0)|(u.moving?2:0)|(u.downed>0?4:0)|(u.team==='red'?8:0)|(u.atkF?16:0)|(u.burn>0?32:0)|((u.rank&3)<<6);
    u.atkF=0;
    b[o++]=u.nid>>8; b[o++]=u.nid&255; b[o++]=x>>8; b[o++]=x&255; b[o++]=z>>8; b[o++]=z&255; b[o++]=r; b[o++]=hp; b[o++]=f; b[o++]=idx[u.type]??255;
  }
  let s=''; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s);
}
function netHostPublish(first){
  if(!Net.isHost()||!Net.g) return;
  netHostPeers(null);
  // setup timer and start of the battle
  if(S.phase==='setup'){ Net.setupT-=.1; const humans=Net.cfg.slots.map((s,i)=>i).filter(i=>Net.cfg.slots[i].peer);
    const allReady=humans.every(i=>Net.ready[i]);
    if((allReady&&humans.length)||Net.setupT<=0) netBeginBattle(); }
  for(const u of units) netTag(u);
  const live=units.filter(u=>u.alive||(u.deadT<5)).sort((a,b)=>a.nid-b.nid);
  const per=210, parts=Math.max(1,Math.ceil(live.length/per)); Net.part=(Net.part+1)%parts;
  const chunk=live.slice(Net.part*per,(Net.part+1)*per);
  const st={ph:S.phase,t:Math.round(Net.setupT),w:S.winner||null,m:Net.money.map(v=>Math.round(v)),rd:Net.cfg.slots.map((s,i)=>Net.ready[i]?1:0),
    sl:Net.cfg.slots.map(s=>s.peer),wx:WX.type,tn:WX.torn?[+WX.torn.x.toFixed(1),+WX.torn.z.toFixed(1)]:null,n:live.length};
  const pres={cfg:Net.cfg,st,u:{p:Net.part,n:parts,d:packUnits(chunk)}};
  Net.g.presence(pres).catch(()=>{});
  const fx=Net.fxq.slice(-70); Net.shotN=0;
  let fxs=JSON.stringify(fx); while(fxs.length>3800&&fx.length){ fx.shift(); fxs=JSON.stringify(fx); }
  Net.gf.presence({f:fx}).catch(()=>{});
}
function netBeginBattle(){
  if(S.phase!=='setup') return;
  if(!units.some(u=>u.alive&&u.team==='blue')||!units.some(u=>u.alive&&u.team==='red')){
    for(let i=0;i<Net.cfg.slots.length;i++) if(!units.some(u=>u.alive&&u.owner===i)) netBotDeploy(i); }
  S.phase='battle'; S.paused=false; battleCry(); updateStartBtn(); if(laneMesh) laneMesh.visible=false; showZones([]);
}
function netHostEnd(){ if(!Net.isHost()) return; }

/* ================= CLIENT: draw what the host sends ================= */
function netClientPeers(ch){
  const g=Net.g; if(!g) return;
  const h=g.peers().find(p=>p.peer===Net.hostPeer); if(!h) return;
  Net.lastHostSeen=performance.now();
  const pr=h.presence||{};
  if(pr.cfg&&(!Net.cfg||Net.cfg.seed!==pr.cfg.seed)){ netStartGame(pr.cfg); }
  if(!Net.cfg) return;
  const st=pr.st;
  if(st){
    Net.money=st.m||Net.money; if(S.phase==='setup'){ S.money[S.player]=Net.money[Net.slot]??S.money[S.player]; updateAfford(); }
    Net.setupT=st.t; Net.hostSt=st;
    if(st.wx&&st.wx!==WX.type){ setWeather(st.wx); }
    if(WX.torn&&st.tn){ WX.torn.x+=(st.tn[0]-WX.torn.x)*.5; WX.torn.z+=(st.tn[1]-WX.torn.z)*.5; }
    if(st.ph==='battle'&&S.phase==='setup'){ S.phase='battle'; battleCry(); if(laneMesh) laneMesh.visible=false; showZones([]); updateStartBtn(); }
    if(st.ph==='over'&&S.phase!=='over'){ for(const u of units) if(u.alive&&u.netPk!=null&&u.netPk<(Net.packN||0)-1) kill(u,null); S.phase='over'; updateStartBtn(); showEnd(st.w===S.player); }
  }
  if(pr.u&&pr.u.d&&pr.u.d!==Net.lastPack){ Net.lastPack=pr.u.d; Net.packN=(Net.packN||0)+1; Net.parts=pr.u.n||1; netUnpack(pr.u.d);
    // a soldier missing from several fresh updates in a row has died on the host: lay him down here too.
    // (counted in updates received, not in seconds, so a slow host or a pause never wipes out an army)
    if(S.phase!=='setup'){ const lim=2*Net.parts+4; for(const u of units) if(u.alive&&u.netPk!=null&&Net.packN-u.netPk>lim) kill(u,null); } }
}
function netUnpack(b64){
  const s=atob(b64), keys=TYPE_KEYS(), H=HALF;
  for(let o=0;o+10<=s.length;o+=10){
    const c=i=>s.charCodeAt(o+i);
    const nid=c(0)<<8|c(1), x=(c(2)<<8|c(3))/65535*2*H-H, z=(c(4)<<8|c(5))/65535*2*H-H, rot=c(6)/255*6.2832, hp=c(7)/255, f=c(8), type=keys[c(9)];
    let u=Net.byNid.get(nid);
    if(!u){ if(!(f&1)||!type) continue; u=addUnit(type,f&8?'red':'blue',x,z,rot); if(!u) continue; u.nid=nid; Net.byNid.set(nid,u); u.netX=x; u.netZ=z; }
    u.netX=x; u.netZ=z; u.netR=rot; u.netMove=!!(f&2); u.netT=performance.now(); u.netPk=Net.packN;
    if(u.alive){ u.hp=hp*u.mhp; if(f&16){ u.anim=1; if(u.def.atk==='melee') u.swing=.25; } u.burn=f&32?.5:0;
      const rk=f>>6; if(rk>u.rank){ u.rank=rk; if(u.pips) u.pips.forEach((p,i)=>p.visible=i<rk); }
      if(!(f&1)){ u.x=x; u.z=z; kill(u,null); } }
  }
}
// move a drawn soldier smoothly toward where the host says he is
function netDrive(u,dt){
  if(u.netX==null) return null;
  const dx=u.netX-u.x, dz=u.netZ-u.z, d=Math.hypot(dx,dz);
  if(d>12){ u.x=u.netX; u.z=u.netZ; }
  else { const k=1-Math.exp(-dt*8); u.x+=dx*k; u.z+=dz*k; }
  u.moving=u.netMove||d>.15; if(d>.05) u.mvAng=Math.atan2(dx,dz);
  u.rot=turnTo(u.rot,u.netR,8*dt);
  return u.moving?null:u.netR;
}
function netClientFx(ch){
  const gf=Net.gf; if(!gf||!Net.cfg) return;
  const h=gf.peers().find(p=>p.peer===Net.hostPeer); if(!h||!h.presence||!Array.isArray(h.presence.f)) return;
  NETREPLAY=true;
  try{ for(const e of h.presence.f){ if(!Array.isArray(e)||e[0]<=Net.lastFx) continue; Net.lastFx=e[0]; netPlayFx(e); } }
  finally{ NETREPLAY=false; }
}
function netPlayFx(e){
  const k=e[1];
  if(k==='b'){ explosion(e[2],e[3],e[4],e[5],0,null,null,'blast',e[6]?'plasma':null); }
  else if(k==='p'){ spawnProj({kind:e[2],x:e[3],y:e[4],z:e[5],vx:e[6],vy:e[7],vz:e[8],g:e[9],life:e[10],team:null,src:null,dmg:0,splash:0,visual:true,direct:e[2]==='arrow'||e[2]==='stone'}); }
  else if(k==='s'){ const u=Net.byNid.get(e[2]); if(!u||!u.alive||!u.tips) return; const p=tipPos(u), las=u.def.atk==='laser';
    shotFx(u,p,e[3],e[4],e[5],false,null,las); tracer(p.x,p.y,p.z,e[3],e[4],e[5],1,.8,.35,.08,las); muzzle(p.x,p.y,p.z,.7); sfx(las?'laser':u.def.rate<=.2?'mg':'shot',u.x,u.z); }
  else if(k==='o'){ const o=obstacles[e[2]]; if(o&&!o.dead){ o.hitA=e[3]; destroyObs(o); } }
  else if(k==='d'){ const u=Net.byNid.get(e[2]); if(u){ removeUnit(u); units=units.filter(q=>!q.removed); Net.byNid.delete(e[2]); } }
  else if(k==='bolt'){ wxStrike(e[2],e[3],false); }
}
function netClientWatch(){
  if(!Net.isClient()) { clearInterval(Net.cliTimer); return; }
  if(performance.now()-Net.lastHostSeen>9000&&S.phase!=='over'){ clearInterval(Net.cliTimer); toast(T('mp_host_left'),6); S.phase='over'; updateStartBtn(); netLeave(); setTimeout(goMenu,2500); }
}
function netLeave(){
  clearInterval(Net.hostTimer); clearInterval(Net.cliTimer); clearInterval(Net.lobbyTimer);
  try{ Net.g&&Net.g.leave(); Net.gf&&Net.gf.leave(); }catch(e){}
  if(Net.lobby) Net.lobby.presence({mm:null}).catch(()=>{});
  Net.g=null; Net.gf=null; Net.role=null; Net.cfg=null; NETC=false; Net.searching=false;
  if(laneMesh){ scene.remove(laneMesh); laneMesh=null; }
}
// keep the host's own screen informed of the setup clock
function netHud(){
  if(S.mode!=='net'||!Net.cfg) return '';
  const st=Net.isHost()?{t:Math.round(Net.setupT),rd:Net.cfg.slots.map((s,i)=>Net.ready[i]?1:0)}:Net.hostSt||{};
  if(S.phase==='setup') return `⏱ ${Math.max(0,st.t|0)}s · ✅ ${(st.rd||[]).filter(Boolean).length}/${Net.cfg.slots.length}`;
  return Net.cfg.mode;
}
