'use strict';
/* ================= UI / MODES ================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const SAVE_KEY='war_ages_v2';
const save={max:1,stars:{},money:400,skin:'default',customs:[],shadows:true,sound:true,music:true,musicVol:.5,lang:null,masterVol:1,sfxVol:1,gore:true};
try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s) Object.assign(save,s);}catch(e){}
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(e){}}
const totalStars=()=>Object.values(save.stars).reduce((a,b)=>a+b,0);
const fmt=n=>Math.round(n).toLocaleString('en-US');

/* custom units */
function registerCustom(c){
  const tpl=DEFS[c.tpl]||DEFS.rifle;
  const d={n:c.n,ic:c.ic,era:'custom',custom:1,unlock:1,hp:+c.hp,spd:+c.spd,rng:+c.rng,dmg:+c.dmg,rate:+c.rate,acc:.8,atk:c.atk,
    splash:+c.splash||0,air:c.air?1:0,armor:+c.armor<1?+c.armor:0,shield:+c.shield||0,fly:c.fly?(tpl.fly||9):0,model:tpl.model,v:tpl.v,look:tpl.look,
    scale:(tpl.scale||1)*(+c.scale||1),tplName:tpl.n,tplId:tpl.id};
  if(d.atk==='heal'){d.heal=d.dmg;} if(d.atk==='rail') d.pierce=4;
  finalizeDef(c.id,d); DEFS[c.id]=d; return d;
}
save.customs.forEach(c=>{try{registerCustom(c);}catch(e){}});

const ui={tab:'all',tool:{kind:'unit',id:'caveman'},brush:1,team:'blue',rotQ:0,inspected:null,skMap:0,sbMap:10,skBots:1,sbTeams:2,snapshot:null,sideOpen:true,bannerClosed:false,demoT:0,bars:'all'};
let toastT=0;
function toast(s,t){const e=$('#toast'); e.innerHTML=s; e.style.opacity=1; toastT=t||2.6;}

/* ================= WORLD LOADING ================= */
function loadWorld(mapId,tod,half,life){
  clearUnits(); clearObstacles();
  setMapSize(half||80);
  S.mapId=mapId; const map=MAPS[mapId]; curMap=map; setTheme(map.theme);
  buildHeights(map);
  const list=[]; genMap(map,(t,x,z,rq,w,d)=>list.push([t,clamp(x,-HALF+.5,HALF-.5),clamp(z,-HALF+.5,HALF-.5),rq,w,d]),HALF/80);
  for(const [t,x,z,rq,w,d] of list) if(t==='water'){ let W=w||OBS.water.w, D=d||OBS.water.d; carveWater(x,z,W,D); }
  for(const [t,x,z,rq,w,d] of list) if(t==='bridge') addBridgeSpan(x,z,w||OBS.bridge.w,d||OBS.bridge.d);
  buildTerrainMesh(map);
  for(const e of list) addObstacle(...e);
  S.hurtCiv=0; S.events=[]; CMD.team={}; CMD.had={}; if(life!==false) spawnLife(map.theme);
  S.tod=tod; S.todSpeed=0; applyTOD();
  S.phase='setup'; S.paused=false; S.t=0; S.incomeT=0; S.placed={}; S.bots={}; S.money={}; S.income=0; S.winner=null; S.tutorial=null; S.revives=0;
  ui.inspected=null; ui.bannerClosed=false; ui.snapshot=null;
  $('#end').classList.add('hide'); $('#banner').classList.add('hide'); $('#info').classList.add('hide'); $('#tut').classList.add('hide');
}
function camTo(team){
  const z=ZONES[team], k=HALF/80, cx=(z.x0+z.x1)/2*.75, cz=(z.z0+z.z1)/2*.75;
  cam.tx=cx; cam.tz=cz; cam.r=105; cam.phi=.95;
  cam.theta=team==='blue'?-Math.PI/2:team==='red'?Math.PI/2:team==='green'?Math.PI:0;
}
const nonCustom=()=>Object.values(DEFS).filter(d=>!d.custom);
function setSkins(playerSkin){ S.skins={blue:'default',red:'default',green:'default',yellow:'default'}; if(playerSkin) S.skins[S.player]=playerSkin; }
const eraIc=d=>d.boss?'👑':d.custom?'🛠️':ERAS[d.era].ic;

/* ---------- campaign ---------- */
function startCampaign(L){
  const info=levelInfo(L); S.mode='campaign'; Music.setEra(info.era); loadWorld(info.mapId,info.tod,info.half);
  S.level=info; S.teams=['blue','red']; S.player='blue'; setSkins(save.skin);
  let wallet=save.money; const minF=Math.round(info.enemyBudget*.85/10)*10; info.topped=0;
  if(wallet<minF){info.topped=minF-wallet; wallet=minF;}
  info.walletStart=wallet; S.money={blue:wallet,red:0};
  const enemyPool=nonCustom().filter(d=>!d.boss&&d.unlock<=L+2&&d.era<=info.era);
  S.bots={red:{diff:info.diff,pool:enemyPool}};
  if(info.boss){ const pt=zonePoint('red','armor'); addUnit(BOSS_IDS[info.boss-1],'red',pt.x,pt.z); }
  if(info.mini){ const pt=zonePoint('red','front'); addUnit(info.mini,'red',pt.x,pt.z); }
  S.money.red=botDeploy('red',info.boss||info.mini?info.enemyBudget*.6:info.enemyBudget,info.diff,enemyPool,false,true);
  S.placed.blue=0;
  showZones(['blue','red']); camTo('blue'); enterHUD();
  const m=MAPS[info.mapId];
  toast(T('t_level',L,info.boss?T('t_bosslvl'):info.mini?T('t_minibosslvl'):'',ERAS[info.era].ic+' '+eraN(info.era),m.theme.ic+' '+mapName(m),fmt(info.enemyBudget),diffN(info.diff))+(info.topped?T('t_emerg',fmt(info.topped)):''),6);
}
/* ---------- skirmish ---------- */
function skirmCfg(){
  return {map:ui.skMap,half:MAP_SIZES[$('#skSize').value],bots:ui.skBots,life:$('#skLife').checked,diffs:$$('#skDiffs select').map(s=>s.value),budget:+$('#skBudget').value,
    eras:$$('#skEras input').filter(i=>i.checked).map(i=>+i.value),boss:$('#skBoss').checked,income:0,tod:+$('#skTod').value,cycle:$('#skCycle').checked};
}
function startSkirmish(cfg){
  S.mode='skirm'; loadWorld(cfg.map,cfg.tod,cfg.half,cfg.life); S.cfg=cfg; Music.setEra(Math.max(...(cfg.eras.length?cfg.eras:[3])));
  S.teams=TEAM_IDS.slice(0,1+cfg.bots); S.player='blue'; setSkins(save.skin);
  if(!cfg.eras.length) cfg.eras=[0,1,2,3,4,5];
  S.pool=nonCustom().filter(d=>cfg.eras.includes(d.era)&&(!d.boss||cfg.boss));
  S.money={blue:cfg.budget}; S.income=cfg.income; S.todSpeed=cfg.cycle?.08:0;
  S.teams.slice(1).forEach((t,i)=>{S.bots[t]={diff:cfg.diffs[i]||'normal',pool:S.pool}; S.money[t]=0;});
  showZones(S.teams); camTo('blue'); enterHUD();
  toast(T('t_skirm'),6);
}
/* ---------- sandbox ---------- */
function startSandbox(){
  S.mode='sandbox'; loadWorld(ui.sbMap,+$('#sbTod').value,MAP_SIZES[$('#sbSize').value],$('#sbLife').checked);
  S.teams=TEAM_IDS.slice(0,ui.sbTeams); S.player=null; setSkins(); ui.team='blue';
  S.pool=Object.values(DEFS);
  showZones(S.teams); camTo('blue'); cam.tx=0; cam.tz=0; cam.r=125*Math.max(1,HALF/100); enterHUD();
}
/* ---------- tutorial ---------- */
const TUT=[
  {k:'tut1',ok:s=>Math.abs(cam.theta-s.th)>.4},
  {k:'tut2',ok:s=>cam.r<s.r-15},
  {k:'tut3',ok:()=>ui.tool.kind==='unit'&&ui.tool.id==='spear'},
  {k:'tut4',ok:()=>countType('blue','spear')>=4},
  {k:'tut5',ok:()=>countType('blue','archer')>=3||S.money.blue<DEFS.archer.cost},
  {k:'tut6',ok:()=>S.phase!=='setup'},
  {k:'tut7',ok:()=>false}
];
function countType(team,type){return units.filter(u=>u.alive&&u.team===team&&u.type===type).length;}
function startTutorial(){
  S.mode='tutorial'; Music.setEra(0); loadWorld(0,12.5,80,true); S.teams=['blue','red']; S.player='blue'; setSkins(save.skin);
  S.pool=['caveman','spear','slinger','archer','shaman'].map(k=>DEFS[k]); S.money={blue:450,red:0};
  placeGroup('caveman','red',62,-6,5); placeGroup('slinger','red',70,8,2);
  showZones(['blue','red']); camTo('blue'); enterHUD();
  S.tutorial={step:0,th:cam.theta,r:cam.r}; ui.tool={kind:'unit',id:'caveman'}; refreshCards(); showTut();
}
function showTut(){ const s=S.tutorial; if(!s){$('#tut').classList.add('hide'); return;} $('#tut').classList.remove('hide'); $('#tutT').innerHTML=`<b>${T('tut_h',s.step+1,TUT.length)}</b><br>`+T(TUT[s.step].k); $('#tutNext').classList.toggle('hide',s.step>=TUT.length-1); }
function tutTick(){ const s=S.tutorial; if(!s) return; if(s.step<TUT.length-1&&TUT[s.step].ok(s)){ s.step++; s.th=cam.theta; s.r=cam.r; showTut(); sfx('coin'); } }
$('#tutNext').onclick=()=>{const s=S.tutorial; if(s&&s.step<TUT.length-1){s.step++; s.th=cam.theta; s.r=cam.r; showTut();}};
$('#tutSkip').onclick=()=>{S.tutorial=null; showTut();};

/* ---------- menu demo battle ---------- */
function startDemo(){
  S.mode='menu'; const m=Math.floor(Math.random()*MAPS.length); loadWorld(m,[8,12.5,12.5,18.2,22][Math.floor(Math.random()*5)],80);
  const era=Math.floor(Math.random()*6); Music.setEra(era); S.teams=['blue','red']; S.player=null; setSkins();
  const pool=nonCustom().filter(d=>!d.boss&&d.era===era);
  for(const t of S.teams){ S.bots[t]={diff:'normal',pool}; S.money[t]=botDeploy(t,1400+era*600,'normal',pool); }
  S.phase='battle'; showZones([]); cam.tx=0; cam.tz=0; cam.r=95; cam.phi=1.0; ui.demoT=0; S.speed=1;
}

/* ================= MENU ================= */
function showMenu(id){
  $('#menu').classList.remove('hide'); $('#hud').classList.add('hide');
  $$('#menu>.pnl').forEach(p=>p.classList.toggle('hide',p.id!==id));
  if(id==='mMain') $('#mFoot').innerHTML=T('foot',Math.min(save.max,LEVELS),LEVELS,totalStars(),fmt(save.money));
  if(id==='mCampaign') buildCampaign();
  if(id==='mSkins') buildSkins();
  if(id==='mSkirm'){ $('#skMap').textContent=mapLabel(ui.skMap); buildSkDiffs(); buildEras(); }
  if(id==='mSandbox') $('#sbMap').textContent=mapLabel(ui.sbMap);
  if(id==='mLang') buildLangs();
  Music.play('menu');
}
function goMenu(){ S.tutorial=null; $('#end').classList.add('hide'); $('#modal').classList.add('hide'); startDemo(); showMenu('mMain'); }
const mapLabel=i=>`${MAPS[i].theme.ic} #${i+1} ${themeN(MAPS[i].theme)} – ${mapName(MAPS[i])} ▾`;
$$('.mbtn[data-go]').forEach(b=>b.onclick=()=>{initAudio(); Music.play('menu'); const g=b.dataset.go;
  if(g==='campaign') showMenu('mCampaign'); else if(g==='skirm') showMenu('mSkirm'); else if(g==='sandbox') showMenu('mSandbox');
  else if(g==='tutorial') startTutorial(); else if(g==='skins') showMenu('mSkins'); else if(g==='lang') showMenu('mLang'); else showMenu('mSettings');});
$$('[data-back]').forEach(b=>b.onclick=()=>showMenu('mMain'));
function buildLangs(){
  $('#langList').innerHTML=LANGS.map(l=>`<button class="mbtn" data-l="${l.id}" style="${l.id===LANG?'border-color:#ffc94a':''}"><span class="i">${l.flag}</span><span>${l.n}</span></button>`).join('');
  $$('#langList .mbtn').forEach(b=>b.onclick=()=>{ save.lang=b.dataset.l; writeSave(); setLanguage(save.lang); showMenu('mMain'); });
}
function setLanguage(id){ applyLang(id); fillSizeSelects(); }
function fillSizeSelects(){
  for(const id of ['#skSize','#sbSize']){ const e=$(id), v=e.value||'normal'; e.innerHTML=Object.keys(MAP_SIZES).map(k=>`<option value="${k}" ${k===v?'selected':''}>${T('size_'+k)}</option>`).join(''); }
}
function buildCampaign(){
  $('#campStat').innerHTML=`<span class="tb">💰 ${T('camp_bank')}: <b>${fmt(save.money)}</b></span><span class="tb">⭐ ${T('camp_stars')}: <b>${totalStars()}</b>/${LEVELS*3}</span><span class="tb">🔓 ${T('camp_reached')} <b>${Math.min(save.max,LEVELS)}</b></span><span style="color:#9fb0c3;font-size:12.5px">${T('camp_note')}</span>`;
  let h='';
  for(const e of ERAS){
    const b=DEFS[BOSS_IDS[e.id]];
    h+=`<div class="era-h">${e.ic} ${eraN(e.id)} <span style="font-weight:400;color:#9fb0c3;font-size:13px">${T('camp_levels',e.id*15+1,e.id*15+15,b.ic+' '+uName(b))}</span></div><div class="lvls">`;
    for(let L=e.id*15+1;L<=e.id*15+15;L++){ const lock=L>save.max, st=save.stars[L]||0, boss=L%15===0;
      const mini=MINI_BOSS[L];
      h+=`<button class="lv ${boss||mini?'boss':''} ${lock?'lock':''} ${L===save.max?'cur':''}" data-l="${L}" ${lock?'disabled':''}>${lock?'🔒':boss?'👑':mini?DEFS[mini].ic:L}<small>${lock?L:'★'.repeat(st)||'·'}</small></button>`; }
    h+='</div>';
  }
  $('#campLv').innerHTML=h;
  $$('#campLv .lv').forEach(b=>b.onclick=()=>{ if(!b.disabled) startCampaign(+b.dataset.l); });
}
function buildSkDiffs(){
  const old=$$('#skDiffs select').map(s=>s.value);
  $('#skDiffs').innerHTML=Array.from({length:ui.skBots},(_,i)=>`<span>${TEAMS[TEAM_IDS[i+1]].ic} <select class="b">${Object.keys(DIFF).map(k=>`<option value="${k}" ${(old[i]||'normal')===k?'selected':''}>${diffN(k)}</option>`).join('')}</select></span>`).join('');
}
function buildEras(){
  const old=$$('#skEras input'); const on=old.length?old.filter(i=>i.checked).map(i=>+i.value):[0,1,2,3,4,5];
  $('#skEras').innerHTML=ERAS.map(e=>`<label><input type="checkbox" value="${e.id}" ${on.includes(e.id)?'checked':''}> ${e.ic} ${eraN(e.id)}</label>`).join('');
}
$$('#skBots button').forEach(b=>b.onclick=()=>{ui.skBots=+b.dataset.n; $$('#skBots button').forEach(x=>x.classList.toggle('on',x===b)); buildSkDiffs();});
$$('#sbTeams button').forEach(b=>b.onclick=()=>{ui.sbTeams=+b.dataset.n; $$('#sbTeams button').forEach(x=>x.classList.toggle('on',x===b));});
$('#skMap').onclick=()=>openMapPicker(ui.skMap,i=>{ui.skMap=i; $('#skMap').textContent=mapLabel(i);});
$('#sbMap').onclick=()=>openMapPicker(ui.sbMap,i=>{ui.sbMap=i; $('#sbMap').textContent=mapLabel(i);});
$('#skGo').onclick=()=>startSkirmish(skirmCfg());
$('#sbGo').onclick=()=>startSandbox();
function skinUnlocked(s){ if(s.boss) return save.max>s.boss*15; return totalStars()>=s.cost; }
function buildSkins(){
  $('#skinInfo').innerHTML=T('skin_info',totalStars());
  $('#skinGrid').innerHTML=SKINS.map(s=>{const un=skinUnlocked(s), c=s.uni!=null?s.uni:TEAMS.blue.main, v=s.veh!=null?s.veh:TEAMS.blue.veh, hx=n=>'#'+n.toString(16).padStart(6,'0');
    return `<div class="skin ${save.skin===s.id?'sel':''} ${un?'':'lock'}" data-s="${s.id}"><div class="sw"><i style="background:${hx(c)}${s.glow?';box-shadow:0 0 12px '+hx(c)+' inset':''}"></i><i style="background:${hx(v)}"></i><i style="background:${hx(TEAMS.blue.main)};flex:.35"></i></div><b>${skinN(s)}</b><br>${un?(save.skin===s.id?T('sel'):T('click_sel')):(s.boss?T('beat_boss',s.boss):`🔒 ${s.cost} ⭐`)}</div>`;}).join('');
  $$('#skinGrid .skin').forEach(e=>e.onclick=()=>{const s=SKINS.find(x=>x.id===e.dataset.s); if(!skinUnlocked(s)) return; save.skin=s.id; writeSave(); buildSkins();});
}
/* settings */
$('#setGore').checked=save.gore; $('#setShadow').checked=save.shadows; $('#setSound').checked=save.sound; $('#setMusic').checked=save.music; $('#setVol').value=save.musicVol; $('#setMaster').value=save.masterVol; $('#setSfx').value=save.sfxVol;
function applySettings(){ S.gore=save.gore; renderer.shadowMap.enabled=save.shadows; sun.castShadow=save.shadows; muted=!save.sound; $('#sndB').textContent=muted&&!save.music?'🔇':save.masterVol<.34?'🔈':save.masterVol<.67?'🔉':'🔊';
  VOL.master=save.masterVol; VOL.sfx=save.sfxVol; Music.on=save.music; Music.vol=save.musicVol; applyVolumes(); $('#musB').style.opacity=save.music?1:.4;
  scene.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>m.needsUpdate=true);}}); }
$('#setGore').onchange=e=>{save.gore=e.target.checked; writeSave(); applySettings();};
$('#setShadow').onchange=e=>{save.shadows=e.target.checked; writeSave(); applySettings();};
$('#setSound').onchange=e=>{save.sound=e.target.checked; writeSave(); applySettings();};
$('#setMusic').onchange=e=>{save.music=e.target.checked; writeSave(); initAudio(); applySettings(); if(save.music){Music.mode=null; Music.play('menu');}};
function setVolume(k,v){ save[k]=v; writeSave(); for(const [id,key] of [['#setMaster','masterVol'],['#setSfx','sfxVol'],['#setVol','musicVol'],['#vpMaster','masterVol'],['#vpSfx','sfxVol'],['#vpMusic','musicVol']]){ const el=$(id); if(el&&key===k) el.value=v; } applySettings(); }
$('#setVol').oninput=e=>setVolume('musicVol',+e.target.value);
$('#setMaster').oninput=e=>{initAudio(); setVolume('masterVol',+e.target.value);};
$('#setSfx').oninput=e=>{initAudio(); setVolume('sfxVol',+e.target.value); sfx('shot');};
let resetArm=0;
$('#setReset').onclick=()=>{ if(!resetArm){resetArm=1; $('#setReset').textContent=T('set_sure'); setTimeout(()=>{resetArm=0; $('#setReset').textContent=T('set_reset');},3000); return;}
  save.max=1; save.stars={}; save.money=400; save.skin='default'; writeSave(); resetArm=0; $('#setReset').textContent=T('set_done'); };

/* map picker */
function openMapPicker(cur,cb){
  let filt='all';
  const draw=()=>{
    $('#modalP').innerHTML=`<div class="mh"><h2>${T('mp_title',MAPS.length)}</h2><button class="b" id="mpX">${T('dz_close')}</button></div>
      <div class="row"><button class="b ${filt==='all'?'on':''}" data-f="all">${T('tab_all')}</button>${THEMES.map(t=>`<button class="b ${filt===t.id?'on':''}" data-f="${t.id}">${t.ic} ${themeN(t)}</button>`).join('')}<button class="b" id="mpRand">${T('mp_rand')}</button></div>
      <div class="mapgrid">${MAPS.filter(m=>filt==='all'||m.theme.id===filt).map(m=>`<button class="mapc ${m.id===cur?'on':''}" data-m="${m.id}"><b>${m.theme.ic} ${mapName(m)}</b>#${m.id+1} · ${themeN(m.theme)}</button>`).join('')}</div>`;
    $('#mpX').onclick=()=>$('#modal').classList.add('hide');
    $('#mpRand').onclick=()=>{cb(Math.floor(Math.random()*MAPS.length)); $('#modal').classList.add('hide');};
    $$('#modalP [data-f]').forEach(b=>b.onclick=()=>{filt=b.dataset.f; draw();});
    $$('#modalP .mapc').forEach(b=>b.onclick=()=>{cb(+b.dataset.m); $('#modal').classList.add('hide');});
  };
  draw(); $('#modal').classList.remove('hide');
}

/* ================= HUD ================= */
function enterHUD(){
  $('#menu').classList.add('hide'); $('#hud').classList.remove('hide');
  S.speed=1; buildSpeeds(); buildSide(); ui.tab='all';
  const vis=visibleDefs(); if(!vis.find(d=>d.id===ui.tool.id&&ui.tool.kind==='unit')){ const f=vis.find(d=>!isLocked(d)); ui.tool={kind:'unit',id:f?f.id:'rifle'}; }
  buildTabs(); refreshCards(); updateStartBtn(); rebuildGhost();
  $('#side').classList.toggle('hide',!ui.sideOpen);
  $('#title').innerHTML=S.mode==='campaign'?T('ti_level',S.level.L,LEVELS)+(S.level.boss?' 👑':''):S.mode==='skirm'?T('ti_vs',S.teams.length-1):S.mode==='sandbox'?T('ti_sand'):T('ti_tut');
  $('#money').classList.toggle('hide',S.mode==='sandbox');
}
function buildSpeeds(){
  const sp=S.mode==='tutorial'?[.25,.5,1,2,4]:[.25,.5,1,2,4,8];
  $('#speeds').innerHTML=sp.map(s=>`<button data-s="${s}" class="${s===S.speed?'on':''}">×${s===.25?'¼':s===.5?'½':s}</button>`).join('');
  $$('#speeds button').forEach(b=>b.onclick=()=>{S.speed=+b.dataset.s; $$('#speeds button').forEach(x=>x.classList.toggle('on',x===b));});
}
function updateStartBtn(){const s=$('#startB'); if(S.phase==='setup'){s.textContent=T('start'); s.classList.remove('pause');} else if(S.phase==='over'){s.textContent=T('over'); s.classList.remove('pause');} else if(S.paused){s.textContent=T('resume'); s.classList.remove('pause');} else {s.textContent=T('pause'); s.classList.add('pause');}}
$('#startB').onclick=startToggle;
$('#menuB').onclick=goMenu;
$('#sndB').onclick=e=>{ e.stopPropagation(); initAudio(); const p=$('#volPop'); const open=p.classList.contains('hide');
  if(open){ $('#vpMaster').value=save.masterVol; $('#vpSfx').value=save.sfxVol; $('#vpMusic').value=save.musicVol; $('#vpMute').checked=!save.sound||!save.music&&false; $('#vpMute').checked=!save.sound&&!save.music; const r=$('#sndB').getBoundingClientRect(); p.style.top=(r.bottom+6)+'px'; p.style.left=Math.max(8,r.left-80)+'px'; }
  p.classList.toggle('hide',!open); };
$('#vpMaster').oninput=e=>setVolume('masterVol',+e.target.value);
$('#vpSfx').oninput=e=>{setVolume('sfxVol',+e.target.value); sfx('shot');};
$('#vpMusic').oninput=e=>{ if(!save.music){save.music=true; $('#setMusic').checked=true; Music.mode=null;} setVolume('musicVol',+e.target.value); };
$('#vpMute').onchange=e=>{ const m=e.target.checked; save.sound=!m; save.music=!m; $('#setSound').checked=!m; $('#setMusic').checked=!m; writeSave(); applySettings(); if(!m){Music.mode=null;} };
document.addEventListener('pointerdown',e=>{ const p=$('#volPop'); if(!p.classList.contains('hide')&&!p.contains(e.target)&&e.target.id!=='sndB') p.classList.add('hide'); });
$('#musB').onclick=()=>{save.music=!save.music; $('#setMusic').checked=save.music; writeSave(); initAudio(); applySettings(); if(save.music){Music.mode=null; Music.play(S.phase==='battle'?'battle':'menu');}};
$('#sideB').onclick=()=>{ui.sideOpen=!ui.sideOpen; $('#side').classList.toggle('hide',!ui.sideOpen);};

function startToggle(){
  initAudio();
  if(S.phase==='setup'){
    const me=S.player;
    if(me&&!units.some(u=>u.alive&&u.team===me)){toast(T('t_need_units')); return;}
    if(S.mode==='sandbox'){ const alive=S.teams.filter(t=>units.some(u=>u.alive&&u.team===t)); if(alive.length<2){toast(T('t_need2')); return;}
      ui.snapshot={half:HALF,units:units.filter(u=>u.alive).map(u=>({type:u.type,team:u.team,x:u.x,z:u.z,rot:u.rot})),obs:obstacles.filter(o=>!o.dead).map(o=>({type:o.type,x:o.x,z:o.z,rq:o.rq,w:o.rq?o.d:o.w,d:o.rq?o.w:o.d}))}; }
    if(S.mode==='skirm'){ for(const t of S.teams.slice(1)){ const b=S.bots[t]; S.money[t]=botDeploy(t,S.cfg.budget*DIFF[b.diff].mult,b.diff,b.pool,false,true); } }
    S.phase='battle'; S.paused=false; ui.bannerClosed=false;
    if(S.mode==='sandbox'){ const l=units.filter(u=>u.alive&&!u.def.custom); if(l.length) Music.setEra(Math.round(l.reduce((a,u)=>a+u.def.era,0)/l.length)); }
    battleCry();
    if(S.mode!=='sandbox') buildSide();
  } else if(S.phase==='battle') S.paused=!S.paused;
  updateStartBtn();
}

/* ---------- side panel ---------- */
function buildSide(){
  const sb=S.mode==='sandbox'; let h='';
  if(sb){
    h+=`<div class="sec">${T('sd_team')}</div><div class="seg2" id="sdTeam">${S.teams.map(t=>`<button data-t="${t}" class="${ui.team===t?'on':''}">${TEAMS[t].ic} ${teamN(t)}</button>`).join('')}</div>
      <div class="sec">${T('sd_skin')}</div><select class="b" id="sdSkin" style="width:100%">${SKINS.map(s=>`<option value="${s.id}" ${S.skins[ui.team]===s.id?'selected':''}>${skinN(s)}</option>`).join('')}</select>`;
  } else {
    h+=`<div class="sec">${T('sd_how')}</div><div style="color:#b9c4d0;line-height:1.5">${T('sd_how_t',TEAMS[S.player].css,T('sd_noreinf'))}</div>`;
  }
  h+=`<div style="color:#c9d3de;font-size:12px;margin-top:8px;line-height:1.45">${T('sd_medic_tip')}<br>${T('sd_cmd_tip')}</div>`;
  h+=`<div class="sec">${T('sd_brush')}</div><div class="seg2" id="sdBrush">${(sb?[1,5,10,25,50,100]:[1,3,5,10]).map(n=>`<button data-n="${n}" class="${ui.brush===n?'on':''}">${n}</button>`).join('')}</div>
    <div class="sec">${T('sd_tools')}</div><div class="grid" id="sdTools">
      <button class="ob" data-k="inspect"><span class="ic">🔍</span>${T('tl_inspect')}</button>
      <button class="ob" data-k="erase"><span class="ic">🧽</span>${sb?T('tl_erase'):T('tl_refund')}</button>
      ${sb?`<button class="ob" data-k="strike"><span class="ic">✈️</span>${T('tl_strike')}</button>`:''}</div>`;
  if(sb){
    h+=`<div class="sec">${T('sd_obs')}</div><div class="grid" id="sdObs">${Object.keys(OBS).map(k=>`<button class="ob" data-o="${k}"><span class="ic">${OBS[k].ic}</span>${obsN(k)}</button>`).join('')}</div>
      <div class="sec">${T('life')}</div><div class="grid" id="sdLife">${Object.keys(CRIT).map(k=>`<button class="ob" data-c="${k}"><span class="ic">${CRIT[k].ic}</span>${critN(k)}</button>`).join('')}</div>
      <div class="sec">${T('sd_bots')}</div>
      ${S.teams.map(t=>`<div class="botrow" data-t="${t}"><span>${TEAMS[t].ic}</span>
        <select class="bd">${Object.keys(DIFF).map(k=>`<option value="${k}" ${k==='normal'?'selected':''}>${diffN(k)}</option>`).join('')}</select>
        <select class="bb">${[500,1000,2000,5000,10000,20000,50000,100000].map(v=>`<option ${v===2000?'selected':''}>${v}</option>`).join('')}</select>
        <select class="be"><option value="all">${T('all_eras')}</option>${ERAS.map(e=>`<option value="${e.id}">${e.ic} ${eraN(e.id)}</option>`).join('')}</select>
        <button>🤖</button></div>`).join('')}
      <button class="b" id="sdAllBots" style="width:100%">${T('sd_allbots')}</button>
      <div class="sec"></div><button class="b" id="sdDesign" style="width:100%">${T('sd_design')}</button>
      <div class="sec">${T('sd_time')}</div>
      <div>${T('tod')}: <b id="sdTodV"></b></div><input type="range" id="sdTod" min="0" max="24" step="0.1" value="${S.tod}" style="width:100%">
      <div class="row" style="margin:4px 0">${T('cy')}: <select class="b" id="sdCycle"><option value="0">${T('cy_off')}</option><option value="0.05">${T('cy_slow')}</option><option value="0.25">${T('cy_norm')}</option><option value="1">${T('cy_fast')}</option></select></div>
      <div style="color:#9fb0c3;font-size:12px">${T('sd_speed_note')}</div>
      <div class="sec">${T('sd_opts')}</div>
      <label><input type="checkbox" id="sdFF" ${S.ff?'checked':''}> ${T('ff')}</label><br>
      <div class="row"><button class="b" id="sdReset">${T('bn_reset')}</button><button class="b" id="sdClear">${T('sd_clear')}</button><button class="b" id="sdCorpse">${T('sd_corpse')}</button></div>`;
  } else if(S.phase==='setup') h+=`<div class="row"><button class="b" id="sdRefund">${T('sd_refundall')}</button></div>`;
  h+=`<div class="sec">${T('sd_view')} – ${T('bars')}</div><div class="seg2" id="sdBars">${['all','hurt','off'].map(k=>`<button data-b="${k}" class="${ui.bars===k?'on':''}">${T('bars_'+k)}</button>`).join('')}</div>
    <div style="color:#9fb0c3;font-size:11.5px;margin-top:6px;line-height:1.45">${T('sp_rank')}</div>`;
  $('#side').innerHTML=h;
  $$('#sdTeam button').forEach(b=>b.onclick=()=>{ui.team=b.dataset.t; buildSide(); rebuildGhost();});
  if($('#sdSkin')) $('#sdSkin').onchange=e=>{S.skins[ui.team]=e.target.value; toast(T('t_skin'));};
  $$('#sdBrush button').forEach(b=>b.onclick=()=>{ui.brush=+b.dataset.n; $$('#sdBrush button').forEach(x=>x.classList.toggle('on',x===b)); rebuildGhost();});
  $$('#sdTools .ob').forEach(b=>b.onclick=()=>{ui.tool={kind:b.dataset.k,id:b.dataset.k}; markTools();});
  $$('#sdObs .ob').forEach(b=>b.onclick=()=>{ui.tool={kind:'obs',id:b.dataset.o}; markTools();});
  $$('#sdLife .ob').forEach(b=>b.onclick=()=>{ui.tool={kind:'crit',id:b.dataset.c}; markTools();});
  $$('.botrow').forEach(r=>r.querySelector('button').onclick=()=>sandboxBot(r));
  if($('#sdAllBots')) $('#sdAllBots').onclick=()=>$$('.botrow').forEach(r=>sandboxBot(r));
  if($('#sdDesign')) $('#sdDesign').onclick=openDesigner;
  if($('#sdTod')){ $('#sdTod').oninput=e=>{S.tod=+e.target.value; applyTOD();}; $('#sdCycle').value=String(S.todSpeed); $('#sdCycle').onchange=e=>{S.todSpeed=+e.target.value;}; }
  if($('#sdFF')) $('#sdFF').onchange=e=>{S.ff=e.target.checked;};
  if($('#sdReset')) $('#sdReset').onclick=sandboxReset;
  if($('#sdClear')) $('#sdClear').onclick=()=>{clearUnits(); S.phase='setup'; S.bots={}; updateStartBtn();};
  if($('#sdCorpse')) $('#sdCorpse').onclick=()=>{for(const u of corpses) removeUnit(u); corpses=[];};
  if($('#sdRefund')) $('#sdRefund').onclick=()=>{ for(const u of units) if(u.alive&&u.team===S.player){S.money[S.player]+=u.def.cost; S.placed[S.player]-=u.def.cost; removeUnit(u);} units=units.filter(u=>!u.removed); };
  $$('#sdBars button').forEach(b=>b.onclick=()=>{ui.bars=b.dataset.b; $$('#sdBars button').forEach(x=>x.classList.toggle('on',x===b));});
  markTools();
}
function markTools(){
  $$('#sdTools .ob').forEach(b=>b.classList.toggle('on',ui.tool.kind===b.dataset.k));
  $$('#sdObs .ob').forEach(b=>b.classList.toggle('on',ui.tool.kind==='obs'&&ui.tool.id===b.dataset.o));
  $$('#sdLife .ob').forEach(b=>b.classList.toggle('on',ui.tool.kind==='crit'&&ui.tool.id===b.dataset.c));
  $$('#ucards .uc').forEach(c=>c.classList.toggle('on',ui.tool.kind==='unit'&&ui.tool.id===c.dataset.id));
  rebuildGhost();
}
function sandboxBot(r){
  const t=r.dataset.t, diff=r.querySelector('.bd').value, budget=+r.querySelector('.bb').value, era=r.querySelector('.be').value;
  const pool=nonCustom().filter(d=>!d.boss&&(era==='all'||d.era===+era));
  S.bots[t]={diff,pool}; S.money[t]=botDeploy(t,budget,diff,pool);
  toast(T('t_bot',TEAMS[t].ic,diffN(diff),fmt(budget),fmt(S.money[t])));
}
function sandboxReset(){
  if(!ui.snapshot){toast(T('t_nosnap')); return;}
  const snap=ui.snapshot, bots=S.bots; clearUnits(); clearObstacles();
  for(const o of snap.obs) addObstacle(o.type,o.x,o.z,o.rq,o.w,o.d);
  for(const u of snap.units) addUnit(u.type,u.team,u.x,u.z,u.rot);
  S.phase='setup'; S.paused=false; S.bots=bots; $('#banner').classList.add('hide'); updateStartBtn(); Music.mode=null;
}
$('#bnReset').onclick=sandboxReset; $('#bnClose').onclick=()=>{ui.bannerClosed=true; $('#banner').classList.add('hide');};

/* ---------- bottom unit bar ---------- */
function isLocked(d){ return S.mode==='campaign'&&d.unlock>save.max; }
function baseList(){
  if(S.mode==='campaign') return nonCustom();
  if(S.mode==='sandbox') return Object.values(DEFS);
  return S.pool;
}
function visibleDefs(){
  let l=baseList();
  if(ui.tab==='boss') l=l.filter(d=>d.boss); else if(ui.tab==='custom') l=l.filter(d=>d.custom); else if(ui.tab!=='all') l=l.filter(d=>d.era===+ui.tab&&!d.boss);
  return l.slice().sort((a,b)=>(a.custom?9:a.era)-(b.custom?9:b.era)||(a.boss?1:0)-(b.boss?1:0)||a.cost-b.cost);
}
function buildTabs(){
  const base=baseList(), tabs=[['all',T('tab_all')]];
  for(const e of ERAS) if(base.some(d=>d.era===e.id&&!d.boss)) tabs.push([String(e.id),e.ic+' '+eraN(e.id)]);
  if(base.some(d=>d.boss)) tabs.push(['boss',T('tab_boss')]);
  if(S.mode==='sandbox') tabs.push(['custom',T('tab_mine')]);
  $('#tabs').innerHTML=tabs.map(([k,n])=>`<button data-t="${k}" class="${ui.tab===k?'on':''}">${n}</button>`).join('');
  $$('#tabs button').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.t; buildTabs(); refreshCards();});
}
const LP0=Math.log(25), LP1=Math.log(20000);
function refreshCards(){
  const l=visibleDefs(), sb=S.mode==='sandbox';
  $('#ucards').innerHTML=l.length?l.map(d=>{const lk=isLocked(d), pw=clamp((Math.log(d.power)-LP0)/(LP1-LP0),.04,1);
    return `<div class="uc ${lk?'lock':''} ${ui.tool.kind==='unit'&&ui.tool.id===d.id?'on':''}" data-id="${d.id}"><span class="era">${eraIc(d)}</span>
      <div class="ic">${d.ic}</div><div class="nm">${uName(d)}</div><div class="cost">${sb?T('free'):'💰 '+fmt(d.cost)}</div>
      <div class="st"><span>❤️${fmt(d.hp)}</span><span>${d.atk==='heal'?'💚'+d.heal:'⚔️'+fmt(d.dmg)}</span></div><div class="pw"><i style="width:${pw*100}%"></i></div>
      ${lk?`<div class="lk">🔒 ${T('lvl_short',d.unlock)}</div>`:''}</div>`;}).join(''):`<div style="padding:20px;color:#9fb0c3">${T('no_custom')}</div>`;
  $$('#ucards .uc').forEach(c=>{
    const d=DEFS[c.dataset.id];
    c.onclick=()=>{ if(isLocked(d)){toast(T('t_locked',uName(d),d.unlock)); return;} ui.tool={kind:'unit',id:d.id}; markTools(); };
    c.onmouseenter=()=>showTip(d); c.onmouseleave=()=>$('#tip').classList.add('hide');
  });
  updateAfford();
}
function updateAfford(){ if(S.mode==='sandbox') return; const m=S.money[S.player]||0; $$('#ucards .uc').forEach(c=>c.classList.toggle('poor',DEFS[c.dataset.id].cost>m)); }
function showTip(d){
  const dps=d.atk==='heal'?'—':(d.dmg/d.rate*(d.acc||.85)*(d.volley||1)).toFixed(0);
  const sp=[]; if(d.armor) sp.push('🛡 '+T('sp_armor',Math.round(d.armor*100))); if(d.shield) sp.push('🛡 '+T('sp_shield',Math.round(d.shield*100)));
  if(d.splash) sp.push('💥 '+T('sp_splash',d.splash)); if(d.fly) sp.push('✈️ '+T('sp_fly')); sp.push(d.air?'🎯 '+T('sp_air'):'🚫 '+T('sp_noair'));
  if(d.charge) sp.push('🐎 '+T('sp_charge')); if(d.antiCav) sp.push('🐴 '+T('sp_anticav')); if(d.aura) sp.push('⭐ '+T('sp_aura')); if(d.pierce) sp.push('⚡ '+T('sp_pierce',d.pierce));
  if(d.minRng) sp.push('↔ '+T('sp_minrng',d.minRng)); if(d.antiAir) sp.push('✈️ '+T('sp_aa',d.antiAir)); if(d.assassin) sp.push('🥷 '+T('sp_assassin')); if(d.atk==='heal') sp.push('🚑 '+T('sp_revive')); if(d.commander) sp.push('🎖️ '+T('sp_cmd')); if(d.volley) sp.push('🎆 '+T('sp_volley',d.volley)); if(d.spawn) sp.push('👾 '+T('sp_spawn')); if(d.commander) sp.push('🎖️ '+T('sp_cmd'));
  $('#tip').innerHTML=`<b>${d.ic} ${uName(d)}</b> <span style="color:#9fb0c3">${d.boss?T('tp_boss'):d.custom?T('tp_custom'):ERAS[d.era].ic+' '+eraN(d.era)}</span><br>${uDesc(d)}
    <div class="st"><span>💰 ${T('tp_cost')}: ${fmt(d.cost)}</span><span>⚡ ${T('tp_power')}: ${fmt(d.power)}</span><span>❤️ ${T('tp_hp')}: ${fmt(d.hp)}</span>
    <span>${d.atk==='heal'?'💚 '+T('tp_heal')+': '+d.heal:'⚔️ '+T('tp_dmg')+': '+fmt(d.dmg)}</span><span>⏱ ${T('tp_every',d.rate)}</span><span>📈 ${T('tp_dps')}: ~${dps}</span>
    <span>🎯 ${T('tp_range')}: ${d.rng}</span><span>🏃 ${T('tp_speed')}: ${d.spd}</span><span>🔫 ${atkN(d.atk)}</span></div>
    <div style="margin-top:4px;color:#c4ceda">${sp.join(' · ')}</div>${isLocked(d)?`<div style="color:#ffd36a;margin-top:4px">${T('unlock_at',d.unlock)}</div>`:''}`;
  $('#tip').classList.remove('hide');
}

/* ---------- unit designer ---------- */
const ICONS=['🦸','🧟','🥷','👽','🐉','🦖','🤠','🧙','🦍','🐺','🚜','🛩️','🦂','🔥','❄️','⚡','💀','👾','🐻','🦅'];
function openDesigner(){
  const tpls=nonCustom();
  const f={hp:200,dmg:25,rng:24,rate:1,spd:3.5,splash:0,armor:1,shield:0,scale:1};
  const sl=(k,l,min,max,st)=>`<span>${l}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${st}" value="${f[k]}"><b data-v="${k}">${f[k]}</b>`;
  $('#modalP').innerHTML=`<div class="mh"><h2>${T('sd_design')}</h2><button class="b" id="dzX">${T('dz_close')}</button></div>
    <div class="form">
      <span>${T('dz_name')}</span><input type="text" id="dzN" value="${T('dz_default')}" maxlength="18"><span></span>
      <span>${T('dz_icon')}</span><select id="dzI">${ICONS.map(i=>`<option>${i}</option>`).join('')}</select><span></span>
      <span>${T('dz_look')}</span><select id="dzT">${tpls.map(d=>`<option value="${d.id}" ${d.id==='rifle'?'selected':''}>${d.ic} ${uName(d)}</option>`).join('')}</select><span></span>
      <span>${T('dz_atk')}</span><select id="dzA">${Object.keys(ATK_NAME).map(k=>`<option value="${k}">${atkN(k)}</option>`).join('')}</select><span></span>
      ${sl('hp','❤️ '+T('tp_hp'),10,50000,10)}${sl('dmg','⚔️ '+T('dz_dmg'),1,2000,1)}${sl('rng','🎯 '+T('tp_range'),1.5,90,.5)}${sl('rate','⏱ '+T('dz_rate'),.05,10,.05)}
      ${sl('spd','🏃 '+T('tp_speed'),.5,15,.5)}${sl('splash','💥 '+T('dz_splash'),0,10,.5)}${sl('armor','🛡 '+T('dz_armor'),.1,1,.05)}${sl('shield','🛡 '+T('dz_shield'),0,.9,.05)}${sl('scale','📏 '+T('dz_size'),.5,4,.1)}
      <span>${T('sd_opts')}</span><span><label><input type="checkbox" id="dzAir" checked> ${T('dz_air')}</label> &nbsp; <label><input type="checkbox" id="dzFly"> ${T('sp_fly')}</label></span><span></span>
    </div>
    <div class="row" style="margin-top:12px"><span class="tb" id="dzCost"></span><button class="b go" id="dzSave">${T('dz_save')}</button></div>
    <div id="dzList" style="margin-top:8px"></div>`;
  const read=()=>({n:$('#dzN').value||'?',ic:$('#dzI').value,tpl:$('#dzT').value,atk:$('#dzA').value,air:$('#dzAir').checked,fly:$('#dzFly').checked,
    ...Object.fromEntries($$('#modalP input[type=range]').map(i=>[i.dataset.k,+i.value]))});
  const upd=()=>{ $$('#modalP input[type=range]').forEach(i=>$(`[data-v="${i.dataset.k}"]`).textContent=i.value);
    const c=read(); try{const d=registerCustom({...c,id:'__preview'}); $('#dzCost').innerHTML=T('dz_cost',fmt(d.power),fmt(d.cost)); delete DEFS.__preview;}catch(e){} };
  $$('#modalP input,#modalP select').forEach(i=>i.oninput=upd); upd();
  const list=()=>{ $('#dzList').innerHTML=save.customs.length?'<b>'+T('dz_list')+'</b> '+save.customs.map(c=>`<span class="tb" style="display:inline-block;margin:3px">${c.ic} ${c.n} <button class="b" data-del="${c.id}" style="padding:0 6px">🗑</button></span>`).join(''):'';
    $$('[data-del]').forEach(b=>b.onclick=()=>{const id=b.dataset.del; save.customs=save.customs.filter(c=>c.id!==id); delete DEFS[id]; writeSave(); list(); buildTabs(); refreshCards();}); };
  list();
  $('#dzX').onclick=()=>$('#modal').classList.add('hide');
  $('#dzSave').onclick=()=>{ const c={...read(),id:'c_'+Date.now().toString(36)}; registerCustom(c); save.customs.push(c); writeSave(); ui.tab='custom'; buildTabs(); refreshCards(); ui.tool={kind:'unit',id:c.id}; markTools(); list(); toast(T('t_custom_added',c.ic+' '+c.n)); };
  $('#modal').classList.remove('hide');
}

/* ================= INPUT ================= */
const ray=new THREE.Raycaster(), plane=new THREE.Plane(new THREE.Vector3(0,1,0),0), ndc=new THREE.Vector2(), gp=new THREE.Vector3();
let groundOk=false, drag=null, lastStamp=null, mouseX=0, mouseY=0; const pointers=new Map(); let pinch=null;
function pick(cx,cy){const r=canvas.getBoundingClientRect(); ndc.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1); ray.setFromCamera(ndc,camera);
  groundOk=rayGround(ray.ray,gp)&&Math.abs(gp.x)<=HALF&&Math.abs(gp.z)<=HALF; return groundOk;}
const placeTeam=()=>S.mode==='sandbox'?ui.team:S.player;
function placeOk(){
  if(!groundOk) return false; if(S.mode==='sandbox') return true;
  if(S.phase!=='setup') return false;
  if(ui.tool.kind==='unit') return inZone(S.player,gp.x,gp.z)&&(S.money[S.player]||0)>=DEFS[ui.tool.id].cost;
  return true;
}
function applyTool(first){
  if(!groundOk||S.mode==='menu') return; const gx=gp.x, gz=gp.z, sb=S.mode==='sandbox';
  if(ui.tool.kind==='unit'){
    const d=DEFS[ui.tool.id]; if(!d) return;
    const sp=d.model?Math.max(5,d.rad*2.4):1.8, minD=Math.max(2.4,sp*Math.ceil(Math.sqrt(ui.brush)));
    if(!first&&lastStamp&&Math.hypot(gx-lastStamp.x,gz-lastStamp.z)<minD) return;
    if(S.phase==='over') return;
    let n=ui.brush; const team=placeTeam();
    if(!sb){
      if(S.phase!=='setup'){ if(first) toast(T('t_no_place')); return; }
      if(isLocked(d)){toast(T('t_locked',uName(d),d.unlock)); return;}
      if(!inZone(team,gx,gz)){ if(first) toast(T('t_zone',teamN(team))); return; }
      n=Math.min(n,Math.floor((S.money[team]||0)/d.cost)); if(n<=0){ if(first) toast(T('t_money')); return; }
      if(d.commander&&!first) return;
    }
    const out=placeGroup(d.id,team,gx,gz,n);
    if(!sb){ const Z=ZONES[team]; for(const u of out){u.x=clamp(u.x,Z.x0+.6,Z.x1-.6); u.z=clamp(u.z,Z.z0+.6,Z.z1-.6);} S.money[team]-=d.commander?(out.length?d.cost:0):out.length*d.cost; updateAfford(); }
    if(units.length>1500&&first) toast(T('t_many'));
    lastStamp={x:gx,z:gz}; sfx('place');
  } else if(ui.tool.kind==='obs'&&sb){
    const d=OBS[ui.tool.id], len=Math.max(d.w,d.d);
    if(!first&&lastStamp&&Math.hypot(gx-lastStamp.x,gz-lastStamp.z)<Math.max(1.2,len*.98)) return;
    addObstacle(ui.tool.id,gx,gz,ui.rotQ); lastStamp={x:gx,z:gz}; sfx('place');
  } else if(ui.tool.kind==='crit'&&sb){
    if(!first&&lastStamp&&Math.hypot(gx-lastStamp.x,gz-lastStamp.z)<1.5) return;
    for(let i=0;i<Math.min(ui.brush,25);i++) addCritter(ui.tool.id,gx+R(-1,1)*Math.sqrt(ui.brush),gz+R(-1,1)*Math.sqrt(ui.brush)); lastStamp={x:gx,z:gz}; sfx('place');
  } else if(ui.tool.kind==='erase'){
    if(!sb){
      if(S.phase!=='setup'){ if(first) toast(T('t_refund_only')); return; }
      for(const u of units) if(u.alive&&u.team===S.player&&Math.hypot(u.x-gx,u.z-gz)<3+u.rad&&!u.guard){ S.money[S.player]+=u.def.cost; S.placed[S.player]-=u.def.cost; removeUnit(u); if(u.def.commander) for(const g of units) if(g.guard===u) removeUnit(g); }
      units=units.filter(u=>!u.removed); updateAfford(); return;
    }
    for(const u of units) if(Math.hypot(u.x-gx,u.z-gz)<3+u.rad) removeUnit(u);
    for(const u of corpses) if(Math.hypot(u.x-gx,u.z-gz)<3+u.rad) removeUnit(u);
    for(const c of critters) if(Math.hypot(c.x-gx,c.z-gz)<3){scene.remove(c.g); c.moved=true;} critters=critters.filter(c=>!c.moved);
    units=units.filter(u=>!u.removed); corpses=corpses.filter(u=>!u.removed);
    for(const o of obstacles) if(!o.dead&&Math.abs(o.x-gx)<o.hx+2&&Math.abs(o.z-gz)<o.hz+2){o.dead=true; scene.remove(o.mesh);}
    obstacles=obstacles.filter(o=>!o.dead); NAV.dirty=true;
  } else if(ui.tool.kind==='strike'&&first&&sb){
    sfx('whistle',gx,gz);
    for(let i=0;i<5;i++){const ox=i?R(-7,7):0, oz=i?R(-7,7):0; pending.push({t:.65+i*.17,fn:()=>explosion(gx+ox,.5,gz+oz,i?5:8.5,i?110:240,null,null,'blast')});}
  } else if(ui.tool.kind==='inspect'&&first){
    const best=unitAt(gx,gz,3.5); ui.inspected=best; $('#info').classList.toggle('hide',!best); selRing.visible=!!best;
  }
}
function unitAt(gx,gz,maxD){ let best=null,bs=maxD; for(const u of units){ if(!u.alive) continue; const s=Math.hypot(u.x-gx,u.z-gz)-u.rad; if(s<bs){bs=s;best=u;} } return best; }
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  initAudio(); if(save.music&&!Music.mode) Music.play('menu');
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(S.mode==='menu') return;
  if(e.pointerType==='touch'){ if(pointers.size===1) drag={mode:'touchtool',sx:e.clientX,sy:e.clientY,moved:0}; else {drag={mode:'touch2'}; pinch=null;} return; }
  if(e.button===0&&!e.shiftKey){drag={mode:'tool'}; pick(e.clientX,e.clientY); lastStamp=null; applyTool(true);}
  else if(e.button===2&&!e.shiftKey) drag={mode:'rot',lx:e.clientX,ly:e.clientY};
  else drag={mode:'pan',lx:e.clientX,ly:e.clientY};
});
canvas.addEventListener('pointermove',e=>{
  const prev=pointers.get(e.pointerId); if(prev){prev.x=e.clientX; prev.y=e.clientY;}
  mouseX=e.clientX; mouseY=e.clientY;
  pick(e.clientX,e.clientY);
  if(!drag) return;
  if(drag.mode==='tool') applyTool(false);
  else if(drag.mode==='rot'){cam.theta-=(e.clientX-drag.lx)*.006; cam.phi=clamp(cam.phi-(e.clientY-drag.ly)*.005,.18,1.38); drag.lx=e.clientX; drag.ly=e.clientY;}
  else if(drag.mode==='pan'){panBy(e.clientX-drag.lx,e.clientY-drag.ly); drag.lx=e.clientX; drag.ly=e.clientY;}
  else if(drag.mode==='touchtool'){drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)); if(drag.moved>12){drag.mode='touchpan'; drag.lx=e.clientX; drag.ly=e.clientY;}}
  else if(drag.mode==='touchpan'){panBy(e.clientX-drag.lx,e.clientY-drag.ly); drag.lx=e.clientX; drag.ly=e.clientY;}
  else if(drag.mode==='touch2'&&pointers.size>=2){
    const [a,b]=[...pointers.values()]; const dist=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    if(pinch){cam.r=clamp(cam.r*pinch.d/dist,15,camMax()); cam.theta-=(mx-pinch.mx)*.006; cam.phi=clamp(cam.phi-(my-pinch.my)*.005,.18,1.38);}
    pinch={d:dist,mx,my};
  }
});
canvas.addEventListener('pointerleave',()=>{groundOk=false;});
function endPointer(e){
  if(drag&&drag.mode==='touchtool'&&pointers.size===1){pick(e.clientX,e.clientY); lastStamp=null; applyTool(true);}
  pointers.delete(e.pointerId); if(pointers.size===0){drag=null; pinch=null;}
}
const camMax=()=>260*Math.max(1,HALF/80);
canvas.addEventListener('pointerup',endPointer); canvas.addEventListener('pointercancel',endPointer);
canvas.addEventListener('wheel',e=>{e.preventDefault(); if(S.mode!=='menu') cam.r=clamp(cam.r*Math.exp(e.deltaY*.0011),15,camMax());},{passive:false});
const keys={};
window.addEventListener('keydown',e=>{
  if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT') return;
  keys[e.code]=true;
  if(S.mode==='menu') return;
  if(e.code==='Space'){e.preventDefault(); startToggle();}
  if(e.code==='KeyR'){ui.rotQ^=1; rebuildGhost();}
  if(e.code==='Escape'){$('#modal').classList.add('hide'); $('#info').classList.add('hide'); ui.inspected=null; selRing.visible=false;}
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{for(const k in keys) keys[k]=false;});
$('#infoX').onclick=()=>{ui.inspected=null; $('#info').classList.add('hide'); selRing.visible=false;};

/* ghost & selection ring */
const ghost=new THREE.Group(); scene.add(ghost);
const ghostMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false});
const selRing=new THREE.Mesh(new THREE.RingGeometry(1,1.2,32),new THREE.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.9,depthWrite:false}));
selRing.rotation.x=-Math.PI/2; selRing.visible=false; scene.add(selRing);
function rebuildGhost(){
  while(ghost.children.length){const c=ghost.children.pop(); c.geometry.dispose();}
  const ring=r=>{const m=new THREE.Mesh(new THREE.RingGeometry(Math.max(.1,r-.15),r,40),ghostMat); m.rotation.x=-Math.PI/2; m.position.y=.06; ghost.add(m);};
  if(ui.tool.kind==='unit'){const d=DEFS[ui.tool.id]; if(!d) return; const sp=d.model?Math.max(5,d.rad*2.4):1.8; ring(Math.max(d.rad+.3,sp*Math.ceil(Math.sqrt(ui.brush))/2+.4));}
  else if(ui.tool.kind==='obs'){const d=OBS[ui.tool.id]; const m=new THREE.Mesh(new THREE.BoxGeometry(ui.rotQ?d.d:d.w,Math.max(.2,d.h),ui.rotQ?d.w:d.d),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.28,depthWrite:false})); m.position.y=d.h/2; ghost.add(m);}
  else if(ui.tool.kind==='crit') ring(1+Math.sqrt(Math.min(ui.brush,25)));
  else if(ui.tool.kind==='erase') ring(3); else if(ui.tool.kind==='strike') ring(8.5); else ring(1.3);
}

/* ================= END OF BATTLE ================= */
function aliveTeams(){ return S.teams.filter(t=>units.some(u=>u.alive&&u.team===t)); }
function checkEnd(){
  if(S.phase!=='battle') return;
  const alive=aliveTeams();
  if(S.mode==='sandbox'){
    if(alive.length<=1&&!ui.bannerClosed&&$('#banner').classList.contains('hide')){
      Music.sting(!!alive[0]); const w=alive[0]; $('#bnT').innerHTML=w?`<span style="color:${TEAMS[w].css}">${T('sb_win',teamPl(w))}</span>`:T('e_none');
      $('#bnS').textContent=S.teams.map(t=>T('sb_lost',teamPl(t),stats[t].lost)).join(' · '); $('#banner').classList.remove('hide'); sfx('win');
    } else if(alive.length>1) $('#banner').classList.add('hide');
    return;
  }
  if(S.mode==='menu'){ if(alive.length<=1||ui.demoT>100){ S.phase='over'; pending.push({t:3,fn:()=>{if(S.mode==='menu') startDemo();}}); } return; }
  const me=S.player;
  if(alive.length<=1||!alive.includes(me)){ S.phase='over'; updateStartBtn(); showEnd(alive.includes(me)&&alive.length===1); }
}
function showEnd(win){
  const me=S.player, aliveCost=units.filter(u=>u.alive&&u.team===me).reduce((a,u)=>a+u.def.cost,0), placed=Math.max(1,S.placed[me]||1);
  const stars=win?(aliveCost/placed>=.6?3:aliveCost/placed>=.3?2:1):0;
  let h=`<h2>${win?T('win'):T('lose')}</h2>`; let btns='';
  Music.sting(win);
  const rev=(S.revives?`<br>${T('e_revives',S.revives)}`:'')+(S.hurtCiv?`<br>${T('e_civ',S.hurtCiv)}`:'');
  if(S.mode==='campaign'){
    const L=S.level.L, reward=win?Math.round(S.level.enemyBudget*.6/10)*10:0, refund=aliveCost;
    save.money=Math.round((S.money[me]||0)+refund+reward);
    let unlocked=[];
    if(win){ save.stars[L]=Math.max(save.stars[L]||0,stars); const old=save.max; save.max=Math.max(save.max,L+1); unlocked=nonCustom().filter(d=>d.unlock>old&&d.unlock<=save.max); }
    writeSave();
    h+=win?`<div class="stars">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3-stars)}</span></div>`:'';
    h+=`<div class="rw">${win?T('e_reward',fmt(reward))+'<br>':''}${T('e_refund',fmt(refund))}<br>${T('e_bank',fmt(save.money))}${rev}
      ${!win?'<br><span style="color:#9fb0c3">'+T('e_emerg_note')+'</span>':''}
      ${unlocked.length?`<br><br>${T('e_unlocked')}<br>${unlocked.map(d=>d.ic+' '+uName(d)).join(' · ')}`:''}
      ${win&&L%15===0?`<br><br>${T('e_boss',uName(DEFS[BOSS_IDS[L/15-1]]))}${L===LEVELS?'<br>'+T('e_done'):''}`:''}</div>`;
    if(win&&L<LEVELS) btns+=`<button class="b go" id="eNext">${T('e_next')}</button> `;
    btns+=`<button class="b" id="eRetry">${win?T('e_again'):T('e_retry')}</button> <button class="b" id="eLv">${T('e_levels')}</button> <button class="b" id="eMenu">${T('e_menu')}</button>`;
  } else if(S.mode==='skirm'){
    const alive=aliveTeams(), w=alive[0];
    h+=`<div class="rw">${w?T('e_winner',TEAMS[w].css,teamPl(w)):T('e_none')}<br>${S.teams.map(t=>T('e_lost',TEAMS[t].ic,teamPl(t),stats[t].lost,fmt(stats[t].lostCost))).join('<br>')}${rev}</div>`;
    btns=`<button class="b go" id="eRetry">${T('e_again')}</button> <button class="b" id="eMenu">${T('e_menu')}</button>`;
  } else if(S.mode==='tutorial'){
    S.tutorial=null; showTut();
    h+=`<div class="rw">${win?T('e_tut_win'):T('e_tut_lose')}</div>`;
    btns=win?`<button class="b go" id="eLv">${T('e_to_camp')}</button> <button class="b" id="eMenu">${T('e_menu')}</button>`:`<button class="b go" id="eRetry">${T('e_retry')}</button> <button class="b" id="eMenu">${T('e_menu')}</button>`;
  }
  $('#endP').innerHTML=h+`<div style="margin-top:12px">${btns}</div>`; $('#end').classList.remove('hide');
  const on=(id,f)=>{const b=document.getElementById(id); if(b) b.onclick=f;};
  on('eNext',()=>startCampaign(S.level.L+1));
  on('eRetry',()=>{ if(S.mode==='campaign') startCampaign(S.level.L); else if(S.mode==='skirm') startSkirmish(S.cfg); else startTutorial(); });
  on('eLv',()=>{ $('#end').classList.add('hide'); startDemo(); showMenu('mCampaign'); });
  on('eMenu',goMenu);
}

/* ================= MAIN LOOP ================= */
function resize(){const w=window.innerWidth,h=window.innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); pUniform.scale.value=renderer.domElement.height/(2*Math.tan(camera.fov*Math.PI/360));}
window.addEventListener('resize',resize); resize();
let uiT=0, lastT=performance.now();
const DOWN_C=0xffa040;
function frame(now){
  requestAnimationFrame(frame);
  const rdt=Math.min(.05,(now-lastT)/1000); lastT=now;
  if(S.mode==='menu'){ cam.theta+=rdt*.06; ui.demoT+=rdt; }
  else {
    const ks=cam.r*.9*rdt, cx=Math.cos(cam.theta), sx=Math.sin(cam.theta);
    let f=0,s=0; if(keys.KeyW||keys.ArrowUp) f++; if(keys.KeyS||keys.ArrowDown) f--; if(keys.KeyD||keys.ArrowRight) s++; if(keys.KeyA||keys.ArrowLeft) s--;
    if(f||s){cam.tx+=(-sx*f+cx*s)*ks; cam.tz+=(-cx*f-sx*s)*ks; cam.tx=clamp(cam.tx,-HALF-20,HALF+20); cam.tz=clamp(cam.tz,-HALF-20,HALF+20);}
    if(keys.KeyQ) cam.theta+=1.6*rdt; if(keys.KeyE) cam.theta-=1.6*rdt;
  }
  if(!S.paused){ let sdt=rdt*S.speed; while(sdt>1e-5){ const d=Math.min(sdt,.034); step(d); sdt-=d; } if(S.todSpeed) applyTOD(); }
  updateSnow(rdt);
  const tt=performance.now()/1000;
  for(const u of units){
    u.g.position.set(u.x,u.y+(u.hover?.35+Math.sin(tt*2+u.id)*.12:0),u.z); u.g.rotation.y=u.rot;
    if(u.rotors&&(u.alive||u.falling)) for(const r of u.rotors) r.rotation.y+=rdt*(u.def.model==='drone'?40:u.def.model==='saucer'?3:24);
    if(u.trotor&&u.alive) u.trotor.rotation.x+=rdt*30;
    if(u.cmdRing){ u.cmdRing.visible=u.alive; u.cmdRing.material.opacity=.45+Math.sin(tt*3)*.3; }
    if(u.props&&u.alive) for(const p of u.props) p.rotation.z+=rdt*12;
    const down=u.downed>0;
    const show=ui.bars!=='off'&&u.alive&&(ui.bars==='all'||u.hp<u.mhp||down||u.def.boss||u.rank>0);
    u.bar.visible=show;
    if(show){
      const fr=down?u.downed/5:Math.max(0,u.hp/u.mhp); u.bar.position.set(u.x,u.y+u.def.barH*(down?.55:1),u.z); u.bar.quaternion.copy(camera.quaternion);
      u.fg.scale.x=u.bw*fr; u.fg.position.x=-(1-fr)*u.bw/2; u.fg.material.color.setHex(down?DOWN_C:TEAMS[u.team].bar);
    }
  }
  if(S.mode!=='menu'&&groundOk&&(!drag||drag.mode==='tool')){ghost.visible=true; ghost.position.set(gp.x,gp.y,gp.z); ghostMat.color.setHex(placeOk()?(S.mode==='sandbox'?TEAMS[ui.team].bar:0xffffff):0xff4444);} else ghost.visible=false;
  const ins=ui.inspected; if(ins){ if(!ins.alive&&ins.deadT>2){ui.inspected=null; $('#info').classList.add('hide'); selRing.visible=false;} else {selRing.position.set(ins.x,ins.y+.12,ins.z); const sc=ins.rad+.6; selRing.scale.set(sc,sc,sc);} }
  shake*=Math.pow(.004,rdt);
  updateCam(); updateSky();
  renderer.render(scene,camera);
  if(toastT>0){toastT-=rdt; if(toastT<=0) $('#toast').style.opacity=0;}
  uiT-=rdt; if(uiT<=0){ uiT=.2; hudTick(); }
}
function unitLine(u){
  const d=u.def, down=u.downed>0, fr=down?0:Math.max(0,u.hp/u.mhp);
  return `<b>${d.ic} ${uName(d)}</b> <span style="color:${TEAMS[u.team].css}">(${teamN(u.team)})</span>${u.rank?' '+'⭐'.repeat(u.rank):''}<br>`+
    (down?`<span style="color:#ffb060">${T('in_down',u.downed.toFixed(1))}</span>`:`❤️ ${fmt(Math.max(0,u.hp))} / ${fmt(u.mhp)} · ⚔️ ${fmt((d.atk==='heal'?d.heal:d.dmg)*dm(u))}`)+
    `<div class="hb"><i style="width:${(down?u.downed/5:fr)*100}%;background:${down?'#ffa040':fr>.5?'#4fbf63':fr>.25?'#ffc94a':'#ff5547'}"></i></div>`;
}
function hudTick(){
  checkEnd();
  if(S.mode==='menu') Music.play('menu'); else if(S.phase==='setup') Music.play('prep'); else if(S.phase==='battle') Music.play('battle');
  if(S.mode==='menu') return;
  tutTick();
  while(S.events.length){ const e=S.events.shift(); if(e.type==='cmdDown') toast(T('t_cmd_down',TEAMS[e.team].ic,teamPl(e.team)),3.5); else if(e.type==='plan'&&(e.team===S.player||S.mode==='sandbox')&&S.phase==='battle') toast(TEAMS[e.team].ic+' '+T('plan_'+e.plan)+(e.spread?' · '+T('plan_spread'):''),3.5); else if((e.type==='breach'||e.type==='breachDone')&&(e.team===S.player||S.mode==='sandbox')&&S.phase==='battle') toast(TEAMS[e.team].ic+' '+(e.type==='breach'?T('plan_breach',DEFS[e.k]?DEFS[e.k].ic+' '+uName(DEFS[e.k]):e.name):T('plan_breached')),4); else if(e.type==='oneCmd'&&(S.mode==='sandbox'||e.team===S.player)) toast(T('t_one_cmd')); }
  const counts={}; for(const t of S.teams) counts[t]=0; for(const u of units) if(u.alive&&counts[u.team]!=null) counts[u.team]++;
  $('#chips').innerHTML=S.teams.map(t=>`<span class="chip" style="color:${TEAMS[t].css}" title="${CMD.team[t]&&CMD.team[t].cmd?T('cmd_on')+' – '+T('plan_'+(CMD.team[t].plan||'attack')):T('cmd_off')}">${TEAMS[t].ic} ${counts[t]}${CMD.team[t]&&CMD.team[t].cmd?' 🎖️':''}</span>`).join('');
  if(S.mode!=='sandbox') $('#money').innerHTML=`💰 ${fmt(S.money[S.player]||0)}${S.income?` <span style="font-weight:400;font-size:11px;color:#c9b77a">(+${S.income}/10s)</span>`:''}`;
  updateAfford();
  const h=((S.tod%24)+24)%24, hh=Math.floor(h), mm=Math.floor((h-hh)*60);
  $('#todL').textContent=`${h>=6.3&&h<18.7?'☀️':'🌙'} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  if($('#sdTodV')){ $('#sdTodV').textContent=$('#todL').textContent; if(S.todSpeed) $('#sdTod').value=S.tod; }
  const boss=units.find(u=>u.alive&&u.def.boss&&u.team!==S.player);
  $('#bossbar').classList.toggle('hide',!boss);
  if(boss){$('#bossN').textContent=`👑 ${boss.def.ic} ${uName(boss.def)} – ${fmt(boss.hp)} / ${fmt(boss.mhp)}`; $('#bossHp').style.width=(boss.hp/boss.mhp*100)+'%';}
  const u=ui.inspected;
  if(u){const d=u.def, t=u.target;
    $('#infoBody').innerHTML=unitLine(u)+`${u.alive?'':T('in_fallen')}<br>💀 ${T('in_kills')}: ${u.kills}${u.rank?` · ${T('in_rank')} ${'⭐'.repeat(u.rank)}`:''}<br>${d.atk==='heal'?T('in_patient'):T('in_target')}: ${t&&t.alive?t.def.ic+' '+uName(t.def):'—'}${u.buff>1?'<br>⭐ '+T('in_aura'):''}${u.burn>0?'<br>🔥 '+T('in_burn'):''}`;}
  // hover health readout
  const hov=$('#hov');
  if(groundOk&&!drag&&S.mode!=='menu'){ const hu=unitAt(gp.x,gp.z,1.6);
    let hc=null; if(!hu){ for(const c of critters){ if(!c.dead&&Math.hypot(c.x-gp.x,c.z-gp.z)<c.rad+.8){hc=c; break;} } }
    if(hc){ const fr=Math.max(0,hc.hp/hc.D.hp); hov.innerHTML=`<b>${hc.D.ic} ${critN(hc.type)}</b><br>❤️ ${fmt(Math.max(0,hc.hp))} / ${hc.D.hp}${hc.panic>0?' · 😱':''}<div class="hb"><i style="width:${fr*100}%;background:${fr>.5?'#4fbf63':'#ff5547'}"></i></div>`; hov.style.left=(mouseX+16)+'px'; hov.style.top=(mouseY+14)+'px'; hov.classList.remove('hide'); }
    else if(hu){ hov.innerHTML=unitLine(hu); hov.style.left=(mouseX+16)+'px'; hov.style.top=(mouseY+14)+'px'; hov.classList.remove('hide'); } else hov.classList.add('hide'); }
  else hov.classList.add('hide');
}

/* ================= BOOT ================= */
const guessLang=()=>{const n=(navigator.language||'he').slice(0,2); return LANGS.some(l=>l.id===n)?n:'he';};
setLanguage(save.lang||'he');
applySettings();
startDemo(); showMenu('mMain');
requestAnimationFrame(frame);
