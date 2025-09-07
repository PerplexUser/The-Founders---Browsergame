'use strict';
// =============== RNG ===============
function xmur3(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){ h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return function(){ h=Math.imul(h^h>>>16,2246822507); h=Math.imul(h^h>>>13,3266489909); return (h^h>>>16)>>>0; }; }
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; } }

// =============== Constants ===============
const WORLD = 64; // map size
const VIEW_W = 28, VIEW_H = 20; // viewport
const TICK_MS = 250;
const Tiles = ['grass','forest','mountain','field','water','fish'];
const TileEmoji = { grass:'', forest:'\ud83c\udf32', mountain:'\u26f0\ufe0f', field:'\ud83c\udf3e', water:'\ud83d\udca7', fish:'\ud83d\udc1f' };
const ResList = ['wood','planks','stone','grain','flour','bread','fish','meat','water','pigs','coal','iron_ore','gold_ore','iron','gold','tools','weapons','beer'];
const ResEmoji = {wood:'🪵', planks:'\ud83e\ude9a', stone:'\ud83e\uddf1\ufe0f', grain:'\ud83c\udf3e', flour:'\u2699\ufe0f', bread:'\ud83c\udf5e', fish:'\ud83d\udc1f', meat:'\ud83c\udf56', water:'\ud83d\udeb0', pigs:'\ud83d\udc16', coal:'\u26ab\ufe0f', iron_ore:'\u26d3\ufe0f', gold_ore:'\ud83d\udc8e', iron:'\ud83d\udd29', gold:'\ud83e\ude99', tools:'\ud83e\uddee', weapons:'\u2694\ufe0f', beer:'\ud83c\udf7a'};

// Building prototypes
const BP = {
  hq: {name:'Headquarters', icon:'\ud83c\udfe0', cost:{}, needs:null, every:0, claim:4},
  lumber: {name:'Woodcutter', icon:'🪓', cost:{wood:5}, needs:'forest', every:3500, out:{wood:1}},
  forester:{name:'Forester', icon:'\ud83c\udf33', cost:{wood:10, planks:5}, needs:null, every:6000},
  sawmill:{name:'Sawmill', icon:'\ud83e\ude9a', cost:{wood:10, stone:5}, needs:null, every:4000, in:{wood:1}, out:{planks:1}},
  mason:  {name:'Stonecutter', icon:'\ud83e\uddf1\ufe0f', cost:{wood:10}, needs:'mountain', every:4000, out:{stone:1}},
  farm:   {name:'Farm', icon:'\ud83e\uddd1\u200d\ud83c\udf3e', cost:{wood:15}, needs:null, every:4500, out:{grain:1}},
  acre:   {name:'Field (Acre)', icon:'\ud83c\udf3e', cost:{}, needs:null, every:0},
  well:   {name:'Well', icon:'\u26f2\ufe0f', cost:{stone:10}, needs:null, every:5000, out:{water:1}},
  mill:   {name:'Mill', icon:'\u2699\ufe0f', cost:{wood:15, stone:10}, needs:null, every:4500, in:{grain:1}, out:{flour:1}},
  bakery: {name:'Bakery', icon:'\ud83e\udd56', cost:{wood:15, stone:10}, needs:null, every:5000, in:{flour:1, water:1}, out:{bread:1}},
  fisher: {name:'Fisher Hut', icon:'\ud83c\udfa3', cost:{wood:12}, needs:'fish', every:4500, out:{fish:1}},
  fish_farm:{name:'Fish Farm', icon:'\ud83d\udc1f', cost:{wood:12, planks:6}, needs:'water', every:6500},
  hunter: {name:'Hunter', icon:'\ud83c\udf3f', cost:{wood:12}, needs:'forest', every:5000, out:{meat:1}},
  pig_farm:{name:'Pig Farm', icon:'\ud83d\udc16', cost:{wood:15, planks:5}, needs:null, every:6000, in:{grain:1, water:1}, out:{pigs:1}},
  slaughter:{name:'Slaughter', icon:'\ud83d\udd2a', cost:{stone:15}, needs:null, every:5000, in:{pigs:1}, out:{meat:2}},
  brewery:{name:'Brewery', icon:'\ud83c\udf7a', cost:{wood:10, stone:10}, needs:null, every:5000, in:{grain:1, water:1}, out:{beer:1}},
  coal_mine:{name:'Coal Mine', icon:'\u26cf\ufe0f', cost:{wood:12, stone:10}, needs:'mountain', every:5500, out:{coal:1}},
  iron_mine:{name:'Iron Mine', icon:'\u26cf\ufe0f', cost:{wood:12, stone:10}, needs:'mountain', every:5500, out:{iron_ore:1}},
  gold_mine:{name:'Gold Mine', icon:'\u26cf\ufe0f', cost:{wood:15, stone:12}, needs:'mountain', every:6500, out:{gold_ore:1}},
  furnace: {name:'Furnace', icon:'\ud83d\udd25', cost:{stone:20}, needs:null, every:6000},
  gold_smelter:{name:'Gold Smelter', icon:'🪙', cost:{stone:25}, needs:null, every:6500},
  toolsmith:{name:'Toolsmith', icon:'\ud83e\uddee', cost:{stone:15, planks:10}, needs:null, every:6000, in:{iron:1, planks:1}, out:{tools:1}},
  weaponsmith:{name:'Weaponsmith', icon:'\u2694\ufe0f', cost:{stone:20, coal:1}, needs:null, every:7000, in:{iron:1, coal:1}, out:{weapons:1}},
  barracks:{name:'Barracks', icon:'\ud83c\udfdf\ufe0f', cost:{stone:30, planks:20}, needs:null, every:8000, in:{bread:1, weapons:1}, outStat:'soldiers'},
  training:{name:'Training Camp', icon:'\ud83c\udf96\ufe0f', cost:{stone:25, planks:20}, needs:null, every:7000},
  watch:{name:'Watchtower', icon:'\ud83d\udee1\ufe0f', cost:{stone:20}, needs:null, every:0, cap:6, claim:5},
  castle:{name:'Castle', icon:'\ud83c\udff0', cost:{stone:60, planks:40, iron:10}, needs:null, every:0, cap:20, claim:8}
};

// =============== State & DOM ===============
const State = {
  map:[], seed:'founders', speed:1, tickCount:0,
  res:{}, soldiers:0, veterans:0,
  ai:{ res:{}, soldiers:0, veterans:0, planStep:0, actionTimer:0, soldierTimer:0 },
  control:{ player:[], ai:[] },
  cam:{x:0,y:0},
  quests:[],
  musicOn:false,
  stats:{ playerUnitsUsed:0, aiUnitsUsed:0, playerUnitsLost:0, aiUnitsLost:0, destroyedByPlayer:0, destroyedByAI:0, capturesByPlayer:0, capturesByAI:0 },
  started:false,
  ended:false,
};
window.State = State;

let elBoard, elResBar, elBuildPalette, elModeBuild, elModeDemolish, elSeed, elPlaceHint, elMini, elEnd, elEndTitle, elEndStats, elQuests, elStart;

// =============== Audio ===============
const audio = new Audio('music.mp3');
audio.loop = true;
window.audio = audio;

// =============== RNG helpers ===============
let rng = mulberry32(xmur3('founders')());
function setSeed(s){ State.seed = s||'founders'; rng = mulberry32(xmur3(State.seed)()); }
function rand(){ return rng(); }

// =============== Map generation ===============
function defaultStock(type){ if(type==='forest') return 30; if(type==='mountain') return 60; if(type==='water') return null; if(type==='fish') return 25; return null; }
function inBounds(x,y){ return x>=0 && y>=0 && x<WORLD && y<WORLD; }
function neighbors(x,y){ return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>inBounds(a,b)); }
function newMap(){ const map=[]; for(let y=0;y<WORLD;y++){ const row=[]; for(let x=0;x<WORLD;x++){ const r=rand(); let type='grass'; if(r<0.12) type='water'; else if(r<0.34) type='forest'; else if(r<0.52) type='mountain'; row.push({type, stock: defaultStock(type), building:null, deposit:null, dStock:0, surveyed:false}); } map.push(row);} for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ if(map[y][x].type==='water' && Math.random()<0.10){ map[y][x].type='fish'; map[y][x].stock=defaultStock('fish'); } } return map; }

// =============== Control / Territory ===============
function resetControl(){ State.control.player = Array.from({length:WORLD},()=>Array(WORLD).fill(false)); State.control.ai = Array.from({length:WORLD},()=>Array(WORLD).fill(false)); }
function claimCircle(owner,cx,cy,r){ const tgt = owner==='player'? State.control.player : State.control.ai; const r2=r*r; for(let y=Math.max(0,cy-r); y<Math.min(WORLD,cy+r+1); y++){ for(let x=Math.max(0,cx-r); x<Math.min(WORLD,cx+r+1); x++){ const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy<=r2) tgt[y][x]=true; } } }
function sumGarrison(b){ return (b.garrisonS||0)+(b.garrisonV||0); }
function updateControl(){ resetControl(); for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const t=State.map[y][x]; const b=t.building; if(!b) continue; const bp=BP[b.kind]; if((bp.claim||0)>0){ if(b.kind==='hq'){ if(b.owner==='player') claimCircle('player',x,y,bp.claim); else claimCircle('ai',x,y,bp.claim); } else { if(sumGarrison(b)>=1){ if(b.owner==='player') claimCircle('player',x,y,bp.claim); else claimCircle('ai',x,y,bp.claim); } } } } }
function friendlyCoverageAt(owner,x,y){ for(let yy=0; yy<WORLD; yy++) for(let xx=0; xx<WORLD; xx++){ const t=State.map[yy][xx]; const b=t.building; if(!b) continue; const bp=BP[b.kind]; if(!bp.claim||b.owner!==owner) continue; if(b.kind==='watch' || b.kind==='castle' || b.kind==='hq'){ if(sumGarrison(b)>=1 || b.kind==='hq'){ const dx=xx-x, dy=yy-y; if(dx*dx+dy*dy <= bp.claim*bp.claim) return b; } } } return null; }
function isControlledBy(owner,x,y){ return owner==='player'? State.control.player[y][x] : State.control.ai[y][x]; }
function isVisibleToPlayer(x,y){ return State.control.player[y][x]; }

// =============== UI helpers ===============
function renderResBar(){ const pills = [ ...ResList.map(k=>`<div class="pill" title="${k}"><span>${ResEmoji[k]||'•'}</span><span class="val">${Math.floor(State.res[k]||0)}</span></div>`), `<div class="pill" title="Soldiers"><span>\ud83e\uddb0</span><span class="val">${State.soldiers}</span></div>`, `<div class="pill" title="Veterans"><span>\u2b50\ufe0f</span><span class="val">${State.veterans}</span></div>` ].join(''); elResBar.innerHTML = pills; }
function placeHintFor(k){
  if(k==='acre') return 'Field: free, only on GRASS and next to a Farm, within your territory.';
  if(k==='farm') return 'Farm: free placement (in territory); produces only with adjacent Fields.';
  if(k==='lumber') return 'Woodcutter: place on GRASS adjacent to forest (not on forest).';
  if(k==='forester') return 'Forester: plants nearby GRASS tiles into forest over time.';
  if(k==='mason') return 'Stonecutter: place on GRASS adjacent to mountain (not on mountain).';
  if(k==='fisher') return 'Fisher Hut: place on GRASS adjacent to fish (shore), not on water.';
  if(k==='fish_farm') return 'Fish Farm: place on GRASS adjacent to water; creates new fish on nearby water.';
  if(k==='hunter') return 'Hunter: place on GRASS adjacent to forest (not on forest).';
  if(k==='pig_farm') return 'Pig Farm: grain + water → pigs.';
  if(k==='slaughter') return 'Slaughterhouse: pigs → meat.';
  if(k==='brewery') return 'Brewery: grain + water → beer.';
  if(['coal_mine','iron_mine','gold_mine'].includes(k)) return 'Mines: build on GRASS adjacent to mountain; work only if a surveyed matching deposit is in range.';
  if(k==='furnace') return 'Furnace: iron ore + coal → iron.';
  if(k==='gold_smelter') return 'Gold Smelter: gold ore + coal → gold.';
  if(k==='barracks') return 'Barracks: bread + weapons → soldiers.';
  if(k==='watch') return 'Watchtower: expands territory only if garrisoned (≥1).';
  if(k==='castle') return 'Castle: larger territory only if garrisoned (≥1).';
  if(k==='training') return 'Training Camp: gold + beer → veteran.';
  const bp=BP[k]; return bp && bp.needs ? ('Needs '+bp.needs) : 'Free placement.';
}
function renderPalette(){ const order=['lumber','mason','sawmill','forester','farm','acre','well','mill','bakery','fisher','fish_farm','hunter','pig_farm','slaughter','brewery','coal_mine','iron_mine','gold_mine','furnace','gold_smelter','toolsmith','weaponsmith','barracks','training','watch','castle']; elBuildPalette.innerHTML = order.map(k=>{ const bp=BP[k]; const cost = Object.entries(bp.cost||{}).map(([r,v])=> v>0? `${ResEmoji[r]||r} ${v}`:null).filter(Boolean).join(' · '); return `<button data-kind="${k}" title="${bp.name}"><span class="title">${bp.icon} ${bp.name}</span><span class="cost">${cost||'free'}</span></button>`; }).join(''); elBuildPalette.querySelectorAll('button').forEach(btn=>{ btn.addEventListener('click',()=>{ selectedKind = btn.dataset.kind; elBuildPalette.querySelectorAll('button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); if(elPlaceHint) elPlaceHint.innerHTML = placeHintFor(selectedKind); }); }); const def = elBuildPalette.querySelector('button[data-kind="lumber"]'); if(def) def.classList.add('active'); if(elPlaceHint) elPlaceHint.innerHTML = placeHintFor('lumber'); }

// =============== Camera & Minimap ===============
function clampCam(){ State.cam.x = Math.max(0, Math.min(WORLD-VIEW_W, State.cam.x)); State.cam.y = Math.max(0, Math.min(WORLD-VIEW_H, State.cam.y)); }
function pan(dx,dy){ State.cam.x+=dx; State.cam.y+=dy; clampCam(); renderBoard(); drawMinimap(); }
function drawMinimap(){ const ctx=elMini.getContext('2d'); const W=elMini.width, H=elMini.height; ctx.clearRect(0,0,W,H); const sx=W/WORLD, sy=H/WORLD; for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const p = State.control.player[y][x]; const a = State.control.ai[y][x]; let col = 'rgba(15,23,42,0.8)'; if(p && a) col = 'rgba(127,29,29,0.9)'; else if(p) col = 'rgba(30,58,138,0.9)'; ctx.fillStyle = col; ctx.fillRect(Math.floor(x*sx), Math.floor(y*sy), Math.ceil(sx), Math.ceil(sy)); } ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(State.cam.x*sx, State.cam.y*sy, VIEW_W*sx, VIEW_H*sy); }

// =============== Context Menu ===============
let ctxEl=null;
function closeMenu(){ if(ctxEl){ ctxEl.remove(); ctxEl=null; } }
function openMenu(px,py,x,y){ closeMenu(); if(!isVisibleToPlayer(x,y)) return; const t=State.map[y][x]; const b=t.building; const div=document.createElement('div'); div.className='ctxmenu'; let html='';
  if(b && b.owner==='player'){ const bp=BP[b.kind]; const gsum = bp.cap? ((b.garrisonS||0)+(b.garrisonV||0)) : 0; html+=`<div class=title>${bp.icon} ${bp.name}${bp.cap?` · Garrison: ${gsum}/${bp.cap}`:''}</div>`; html+=`<div class=hint>Status: ${b.paused?'⏸️ paused':'▶️ active'}${(b.idle && !b.paused)?' · <span style="color:#f87171">✖ idle</span>':''}</div>`; const canDemo = (b.kind!=='hq'); html+=`<div class=actions>`+`<button data-act=toggle>${b.paused?'Resume ▶️':'Pause ⏸️'}</button>`+(canDemo?`<button data-act=demolish>Demolish 🧹</button>`:'')+`<button data-act=close>Close</button>`+`</div>`; }
  else if(b && b.owner==='ai'){ const bp=BP[b.kind]; html+=`<div class=title>👾 [AI] ${bp.icon} ${bp.name}</div><div class=hint>In your vision.</div><div class=actions><button data-act=close>Close</button></div>`; }
  else if(t.type==='mountain'){
    const depName = t.deposit? (t.deposit==='coal'?'Coal':t.deposit==='iron'?'Iron':'Gold') : '—';
    const dline = t.deposit? `Deposit: <b>${depName}</b> · Left: ${t.dStock}` : 'No deposit surveyed yet.';
    html+=`<div class=title>⛰ Mountain (${x+1},${y+1})</div>`; html+=`<div class=hint>${dline}</div>`;
    const canGeo = isControlledBy('player',x,y);
    html+=`<div class=actions>${(t.deposit||!canGeo)?'':`<button data-act=geo>Send geologist 🔎</button>`}<button data-act=close>Close</button></div>`;
  } else {
    html+=`<div class=title>Tile (${x+1},${y+1})</div>`; const st=(t.stock===null?'∞':t.stock); html+=`<div class=hint">Type: ${t.type}${(t.type==='forest'||t.type==='mountain'||t.type==='fish')?` · Stock: ${st}`:''}</div>`; html+=`<div class=actions><button data-act=close>Close</button></div>`;
  }
  div.innerHTML=html; div.style.left=Math.min(px, window.innerWidth-260)+'px'; div.style.top=Math.min(py, window.innerHeight-200)+'px'; document.body.appendChild(div);
  div.addEventListener('click',(ev)=>{ const btn=ev.target.closest('button'); if(!btn) return; const act=btn.dataset.act; if(act==='toggle'){
      if(!t.building) return; t.building.paused=!t.building.paused; const bp= BP[t.building.kind];
      if(bp && bp.cap && t.building.owner==='player'){
        // keep at least 1 unit to avoid losing territory
        if((t.building.garrisonS||0)+(t.building.garrisonV||0)===0){ /* baseline assigned in autoGarrison */ }
        else {
          if((t.building.garrisonS||0)>0){ t.building.garrisonS=1; t.building.garrisonV=0; }
          else { t.building.garrisonS=0; t.building.garrisonV=1; }
        }
      }
      renderBoard(); autoGarrisonPlayer(); updateControl(); closeMenu(); }
    else if(act==='demolish'){ demolishAt(x,y); closeMenu(); }
    else if(act==='geo'){ sendGeologist(x,y); closeMenu(); }
    else if(act==='close'){ closeMenu(); } });
  ctxEl=div;
}

// =============== Geology ===============
function sendGeologist(x,y){ const t=State.map[y][x]; if(t.type!=='mountain' || t.deposit) return; t.surveyed=true; const r=Math.random(); let dep='iron'; if(r<0.35) dep='coal'; else if(r>0.85) dep='gold'; t.deposit=dep; t.dStock = dep==='gold'? 20 + (Math.random()*15|0) : dep==='iron'? 28 + (Math.random()*18|0) : 35 + (Math.random()*20|0); renderBoard(); }

// =============== Build / Demolish ===============
let currentMode='build'; let selectedKind='lumber';
function hasAdjOf(x,y,type){ return neighbors(x,y).some(([a,b])=> State.map[b][a].type===type); }
function isGrass(x,y){ return State.map[y][x].type==='grass'; }
function canPlace(kind,x,y,owner){
  const tile = State.map[y][x];
  if(owner==='player' && !isControlledBy('player',x,y) && kind!=='watch' && kind!=='castle'){ return {ok:false, reason:'outside territory'}; }
  if(tile.building) return {ok:false, reason:'occupied'};
  if(kind==='acre'){
    if(!isGrass(x,y)) return {ok:false, reason:'fields only on grass'};
    const nearFarm = neighbors(x,y).some(([a,b])=> (State.map[b][a].building && State.map[b][a].building.kind==='farm' && State.map[b][a].building.owner===owner));
    if(!nearFarm) return {ok:false, reason:'needs adjacent Farm'};
    return {ok:true};
  }
  if(['forest','mountain','water','fish','field'].includes(tile.type)) return {ok:false, reason:'invalid ground'};
  if(kind==='lumber' || kind==='hunter'){ if(!hasAdjOf(x,y,'forest')) return {ok:false, reason:'needs adjacent forest'}; }
  if(kind==='mason'){ if(!hasAdjOf(x,y,'mountain')) return {ok:false, reason:'needs adjacent mountain'}; }
  if(kind==='fisher'){ if(!hasAdjOf(x,y,'fish')) return {ok:false, reason:'needs adjacent fish'}; }
  if(kind==='fish_farm'){ if(!hasAdjOf(x,y,'water')) return {ok:false, reason:'needs adjacent water'}; }
  if(['coal_mine','iron_mine','gold_mine'].includes(kind)){ if(!hasAdjOf(x,y,'mountain')) return {ok:false, reason:'needs adjacent mountain'}; }
  const bp=BP[kind]; const R = owner==='player'? State.res : State.ai.res; for(const [r,c] of Object.entries(bp.cost||{})){ if((R[r]||0)<c) return {ok:false, reason:'too expensive'}; }
  return {ok:true};
}
function tryBuildAt(kind,x,y,owner='player'){
  const can=canPlace(kind,x,y,owner); if(!can.ok) return;
  if(kind==='acre'){ State.map[y][x].type='field'; State.map[y][x].stock=null; renderBoard(); return; }
  const bp=BP[kind]; const b={kind, timer:bp.every, paused:false, idle:false, idleReason:null, owner, builtAt:(State.tickCount||0)};
  if(bp.cap){ b.garrisonS=0; b.garrisonV=0; }
  const R = owner==='player'? State.res : State.ai.res; for(const [r,c] of Object.entries(bp.cost||{})){ R[r]=(R[r]||0)-c; }
  State.map[y][x].building=b; renderBoard(); renderResBar(); if(owner==='player'){ autoGarrisonPlayer(); } updateControl(); drawMinimap();
}
function demolishAt(x,y){ const t=State.map[y][x]; if(!t.building) return; const b=t.building; if(b.owner!=='player') return; if(b.kind==='hq') return; const bp=BP[b.kind]; const R = b.owner==='player'? State.res : State.ai.res; for(const [r,c] of Object.entries(bp.cost||{})){ R[r]=(R[r]||0)+Math.floor(c*0.5); } if(bp.cap){ b.garrisonS=0; b.garrisonV=0; } t.building=null; updateControl(); renderBoard(); renderResBar(); if(b.owner==='player') autoGarrisonPlayer(); drawMinimap(); }

// =============== Board Render ===============
function renderBoard(){ elBoard.innerHTML=''; for(let vy=0; vy<VIEW_H; vy++){
  for(let vx=0; vx<VIEW_W; vx++){
    const x = State.cam.x + vx, y = State.cam.y + vy; if(!inBounds(x,y)) continue; const t=State.map[y][x]; const vis = isVisibleToPlayer(x,y);
    const cell = document.createElement('div'); cell.className = `cell t-${t.type}`; cell.dataset.x=x; cell.dataset.y=y;
    if(vis){ if(t.building){ const b=t.building; const bp=BP[b.kind]; const badge=document.createElement('div'); badge.className='badge'+(b.owner==='ai'?' ai':''); const gsum = (bp.cap? ((b.garrisonS||0)+(b.garrisonV||0)) : null); if(bp.cap){ badge.textContent = `${bp.icon} ${gsum||0}${b.paused?' ⏸':''}`; } else { badge.textContent = `${bp.icon}${b.paused?' ⏸':''}`; } cell.appendChild(badge); const label=document.createElement('div'); label.textContent=(b.owner==='ai'?'👾 ':'')+bp.name; label.style.fontSize='10px'; label.style.opacity=.85; cell.appendChild(label); if(b.idle && !b.paused){ const xm=document.createElement('div'); xm.className='xmark'; xm.textContent='✖'; cell.appendChild(xm);} }
      else { const s=document.createElement('div'); s.textContent=TileEmoji[t.type]; s.style.fontSize='16px'; s.style.opacity=.9; cell.appendChild(s); if((t.type==='forest'||t.type==='mountain'||t.type==='fish') && (t.type!=='mountain'? t.stock!==null : t.stock!==null)){ const q=document.createElement('div'); q.textContent=(t.type==='mountain' && t.deposit)? '' : (t.stock===null?'∞':t.stock); q.style.fontSize='10px'; q.style.opacity=.6; q.style.position='absolute'; q.style.bottom='4px'; q.style.right='6px'; cell.appendChild(q);} }
      if(t.type==='mountain' && t.deposit){ const tag=document.createElement('div'); tag.className='tag'; tag.textContent=(t.deposit==='coal'?'C':t.deposit==='iron'?'Fe':'Au')+':'+t.dStock; tag.style.borderColor='#445'; tag.style.background='#0008'; if(t.deposit==='gold') tag.style.color='#f7d308'; cell.appendChild(tag); }
    } else { const fog=document.createElement('div'); fog.className='fog'; cell.appendChild(fog); }
    const overlay=document.createElement('div'); overlay.className='overlay'; cell.appendChild(overlay);
    cell.addEventListener('mouseenter',()=>{ if(currentMode==='build'){ const can=(isVisibleToPlayer(x,y)? canPlace(selectedKind,x,y,'player'): {ok:false}); cell.classList.toggle('valid',can.ok); cell.classList.toggle('invalid',!can.ok); }});
    cell.addEventListener('mouseleave',()=>{ cell.classList.remove('valid','invalid'); });
    cell.addEventListener('click',()=>{ if(!isVisibleToPlayer(x,y)) return; if(currentMode==='demolish') demolishAt(x,y); else if(currentMode==='build'){ if(State.map[y][x].building){ const rect=cell.getBoundingClientRect(); openMenu(rect.left+rect.width/2, rect.top+rect.height/2, x,y); } else { tryBuildAt(selectedKind,x,y,'player'); } }});
    cell.addEventListener('contextmenu',(e)=>{ e.preventDefault(); if(!isVisibleToPlayer(x,y)) return; openMenu(e.pageX,e.pageY,x,y); });
    elBoard.appendChild(cell);
  }
} }
function centerCam(){ let hx=Math.floor(WORLD/2), hy=Math.floor(WORLD/2); outer: for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.kind==='hq' && b.owner==='player'){ hx=x; hy=y; break outer; } } State.cam.x = Math.max(0, Math.min(WORLD-VIEW_W, hx-Math.floor(VIEW_W/2))); State.cam.y = Math.max(0, Math.min(WORLD-VIEW_H, hy-Math.floor(VIEW_H/2))); renderBoard(); drawMinimap(); }

// =============== Resources & Ops ===============
function RES(owner){ return owner==='player'? State.res : State.ai.res; }
function consumeNearby(x,y,need,amt=1){ const tiles = [{x,y,t:State.map[y][x]}].concat(neighbors(x,y).map(([a,b])=>({x:a,y:b,t:State.map[b][a]}))).filter(n=>n.t.type===need); if(tiles.length===0) return false; tiles.sort((A,B)=>((B.t.stock??1e9)-(A.t.stock??1e9))); const pick=tiles[0]; if(pick.t.stock===null) return true; pick.t.stock -= amt; if(pick.t.stock<=0){ if(need==='fish'){ State.map[pick.y][pick.x].type='water'; State.map[pick.y][pick.x].stock=null; } else { pick.t.type='grass'; pick.t.stock=null; } renderBoard(); drawMinimap(); } return true; }
function hasDepositNearby(x,y,dep){ const tiles = [{x,y,t:State.map[y][x]}].concat(neighbors(x,y).map(([a,b])=>({x:a,y:b,t:State.map[b][a]}))); return tiles.some(n=> n.t.type==='mountain' && n.t.deposit===dep && n.t.dStock>0); }
function consumeDepositNearby(x,y,dep,amt=1){ const tiles = [{x,y,t:State.map[y][x]}].concat(neighbors(x,y).map(([a,b])=>({x:a,y:b,t:State.map[b][a]}))).filter(n=> n.t.type==='mountain' && n.t.deposit===dep && n.t.dStock>0); if(tiles.length===0) return false; tiles.sort((A,B)=> (B.t.dStock - A.t.dStock)); const pick=tiles[0]; pick.t.dStock -= amt; if(pick.t.dStock<=0){ pick.t.deposit=null; pick.t.dStock=0; if(pick.t.stock==null || pick.t.stock<=0) { pick.t.stock = 20; } } return true; }
function consumeRation(owner){ const pref=['fish','meat','bread']; const R=RES(owner); for(const r of pref){ if((R[r]||0)>=1){ R[r]--; return true; } } return false; }

// =============== Auto Garrison ===============
function autoGarrisonPlayer(){
  // Reset
  for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const bb=State.map[y][x].building; if(bb && bb.owner==='player' && BP[bb.kind].cap){ bb.garrisonS=0; bb.garrisonV=0; } }
  let totalV = Math.max(0, State.veterans|0);
  let totalS = Math.max(0, (State.soldiers|0) - (State.veterans|0));
  // Collect forts and score priority: frontier first, then newer, then castles before towers
  const forts=[]; for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.owner==='player' && BP[b.kind].cap){ const frontier = neighbors(x,y).some(([a,b2])=> !State.control.player[b2][a]); const score = (frontier?1000:0) + (b.kind==='castle'?100:0) + ((b.builtAt||0)%100); forts.push({b,x,y,score,frontier}); } }
  forts.sort((A,B)=> B.score - A.score);
  // Baseline: keep 1 SOLDIER in every fort — fallback to veteran if no soldiers available
  for(const f of forts){ if(totalS>0){ f.b.garrisonS=1; totalS--; } else if(totalV>0){ f.b.garrisonV=1; totalV--; } }
  // Fill castles with VETERANS first
  const castles = forts.filter(f=> f.b.kind==='castle' && !f.b.paused);
  for(const f of castles){ const cap = BP[f.b.kind].cap; let free = cap - ((f.b.garrisonS||0)+(f.b.garrisonV||0)); if(free<=0) continue; const putV = Math.min(free, totalV); f.b.garrisonV += putV; totalV -= putV; }
  // Then fill towers with SOLDIERS
  const towers = forts.filter(f=> f.b.kind==='watch' && !f.b.paused);
  for(const f of towers){ const cap = BP[f.b.kind].cap; let free = cap - ((f.b.garrisonS||0)+(f.b.garrisonV||0)); if(free<=0) continue; const putS = Math.min(free, totalS); f.b.garrisonS += putS; totalS -= putS; }
  // overflow balancing
  for(const f of towers){ const cap = BP[f.b.kind].cap; let free = cap - ((f.b.garrisonS||0)+(f.b.garrisonV||0)); if(free<=0) continue; const putV = Math.min(free, totalV); f.b.garrisonV += putV; totalV -= putV; }
  for(const f of castles){ const cap = BP[f.b.kind].cap; let free = cap - ((f.b.garrisonS||0)+(f.b.garrisonV||0)); if(free<=0) continue; const putS = Math.min(free, totalS); f.b.garrisonS += putS; totalS -= putS; }
  renderBoard(); renderResBar(); updateControl(); drawMinimap();
}
function autoGarrisonAI(){ for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.owner==='ai' && BP[b.kind].cap){ b.garrisonS=0; b.garrisonV=0; } }
  let availS = State.ai.soldiers|0; const forts=[]; for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.owner==='ai' && BP[b.kind].cap && !b.paused){ forts.push(b); } }
  for(const b of forts){ const cap=BP[b.kind].cap; const put=Math.min(cap, availS); b.garrisonS=put; availS-=put; if(availS<=0) break; }
  updateControl(); renderBoard(); drawMinimap();
}

// =============== Capture & Endgame ===============
function destroyAround(ownerVictim,cx,cy,r){ let destroyed=0, lostUnits=0; const r2=r*r; for(let y=Math.max(0,cy-r); y<Math.min(WORLD,cy+r+1); y++) for(let x=Math.max(0,cx-r); x<Math.min(WORLD,cx+r+1); x++){ const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy>r2) continue; const t=State.map[y][x]; const b=t.building; if(b && b.owner===ownerVictim){ if(BP[b.kind].cap){ lostUnits += (b.garrisonS||0)+(b.garrisonV||0); } t.building=null; destroyed++; } } return {destroyed,lostUnits}; }
function captureAt(x,y,newOwner,captor){ const t=State.map[y][x]; const b=t.building; if(!b) return; const oldOwner=b.owner; if(oldOwner===newOwner) return; const bp=BP[b.kind]; const gLost = (b.garrisonS||0)+(b.garrisonV||0); if(newOwner==='player'){ State.stats.aiUnitsLost += gLost; State.stats.playerUnitsUsed += Math.max(1, sumGarrison(captor)); State.stats.capturesByPlayer++; } else { State.stats.playerUnitsLost += gLost; State.stats.aiUnitsUsed += Math.max(1, sumGarrison(captor)); State.stats.capturesByAI++; }
  b.owner=newOwner; b.garrisonS=0; b.garrisonV=0; if(b.kind==='hq'){ endGame(newOwner==='player' ? 'win' : 'lose'); return; }
  const res=destroyAround(newOwner==='player'? 'ai':'player', x,y, bp.claim||4);
  if(newOwner==='player'){ State.stats.destroyedByPlayer += res.destroyed; State.stats.aiUnitsLost += res.lostUnits; }
  else { State.stats.destroyedByAI += res.destroyed; State.stats.playerUnitsLost += res.lostUnits; }
  updateControl(); renderBoard(); drawMinimap(); if(newOwner==='player') autoGarrisonPlayer();
}
function checkCaptures(){ for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const t=State.map[y][x]; const b=t.building; if(!b) continue; if(b.owner==='ai' && (b.kind==='watch'||b.kind==='castle'||b.kind==='hq')){ const cap = friendlyCoverageAt('player',x,y); if(cap){ captureAt(x,y,'player',cap); } } }
  for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const t=State.map[y][x]; const b=t.building; if(!b) continue; if(b.owner==='player' && (b.kind==='watch'||b.kind==='castle'||b.kind==='hq')){ const cap = friendlyCoverageAt('ai',x,y); if(cap){ captureAt(x,y,'ai',cap); } } }
}
function endGame(result){ if(State.ended) return; State.ended=true; elEnd.classList.add('show'); elEndTitle.textContent = result==='win' ? 'Victory!' : 'Defeat!'; const s=State.stats; elEndStats.innerHTML = `
  <div>Own units used: <b>${s.playerUnitsUsed}</b></div>
  <div>Own losses: <b>${s.playerUnitsLost}</b></div>
  <div>Enemy losses: <b>${s.aiUnitsLost}</b></div>
  <div>Enemy buildings destroyed: <b>${s.destroyedByPlayer}</b></div>
  <div>Captures (you): <b>${s.capturesByPlayer}</b> · (AI): <b>${s.capturesByAI}</b></div>`; }

// =============== Quests ===============
function countBuildings(owner,kind){ let n=0; for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.owner===owner && (!kind || b.kind===kind)) n++; } return n; }
function anyFortGarrisoned(owner){ for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.owner===owner && (b.kind==='watch'||b.kind==='castle') && sumGarrison(b)>=1) return true; } return false; }
function fieldsNearAnyFarm(){ let n=0; for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){ const b=State.map[y][x].building; if(b && b.kind==='farm' && b.owner==='player'){ n += neighbors(x,y).filter(([a,b2])=> State.map[b2][a].type==='field').length; } } return n; }
function rewardStr(rw){ if(!rw) return ''; return Object.entries(rw).map(([k,v])=> `${ResEmoji[k]||k} +${v}`).join(' · '); }
function setupQuests(){ State.quests = [
  {id:'q1', text:'Build a Woodcutter 🪓', reward:{wood:5}, check:()=> countBuildings('player','lumber')>=1, awarded:false},
  {id:'q2', text:'Build a Stonecutter 🧱', reward:{stone:5}, check:()=> countBuildings('player','mason')>=1, awarded:false},
  {id:'q3', text:'Build a Sawmill 🪚', reward:{planks:5}, check:()=> countBuildings('player','sawmill')>=1, awarded:false},
  {id:'q4', text:'Build a Forester 🌳 (to sustain wood)', reward:{wood:5, planks:5}, check:()=> countBuildings('player','forester')>=1, awarded:false},
  {id:'q5', text:'Build a Farm 🚜 and 2 Fields 🌾', reward:{grain:4}, check:()=> countBuildings('player','farm')>=1 && fieldsNearAnyFarm()>=2, awarded:false},
  {id:'q6', text:'Build a Well ⛲, a Mill ⚙️ and a Bakery 🥖', reward:{bread:4, water:4}, check:()=> countBuildings('player','well')>=1 && countBuildings('player','mill')>=1 && countBuildings('player','bakery')>=1, awarded:false},
  {id:'q7', text:'Build a Barracks and train 1 Soldier 🪖', reward:{weapons:1, bread:2}, check:()=> countBuildings('player','barracks')>=1 && State.soldiers>=1, awarded:false},
  {id:'q8', text:'Build a Watchtower and garrison it (≥1)', reward:{stone:10}, check:()=> anyFortGarrisoned('player'), awarded:false},
  {id:'q9', text:'Send geologists & operate any Mine', reward:{coal:3, iron_ore:2, gold_ore:1}, check:()=> (countBuildings('player','coal_mine')+countBuildings('player','iron_mine')+countBuildings('player','gold_mine'))>=1, awarded:false},
]; renderQuests(); }
function renderQuests(){ const items = State.quests.map(q=>{ const ok=q.check(); const rew = q.reward? ` — Reward: ${rewardStr(q.reward)}${q.awarded?' (claimed)':''}` : ''; return `<div>• ${ok?'✅':'⬜'} ${q.text}${rew}</div>`; }).join(''); elQuests.innerHTML = items; }
function processQuestRewards(){ let changed=false; for(const q of State.quests){ if(!q.awarded && q.check()){ if(q.reward){ for(const [k,v] of Object.entries(q.reward)){ State.res[k]=(State.res[k]||0)+v; } } q.awarded=true; changed=true; } } if(changed){ renderResBar(); renderQuests(); } }

// =============== Production & AI ===============
function tick(ms){ if(State.ended || !State.started) return;
  for(let y=0;y<WORLD;y++) for(let x=0;x<WORLD;x++){
    const t=State.map[y][x]; const b=t.building; if(!b) continue; const bp=BP[b.kind]; if(!bp.every) continue; if(b.paused){ b.timer = bp.every; b.idle=false; b.idleReason=null; continue; }
    b.idle=false; b.idleReason=null; b.timer -= ms; if(b.timer>0) continue;
    const R=RES(b.owner);
    if(bp.in){ let ok=true; for(const [r,c] of Object.entries(bp.in)){ if((R[r]||0) < c){ ok=false; break; } } if(!ok){ b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; } for(const [r,c] of Object.entries(bp.in)) R[r]-=c; }
    if(b.kind==='forester'){ const cands = neighbors(x,y).filter(([a,b2])=> State.map[b2][a].type==='grass' && !State.map[b2][a].building); if(cands.length){ const [ax,ay]=cands[(Math.random()*cands.length)|0]; State.map[ay][ax].type='forest'; State.map[ay][ax].stock=30; renderBoard(); drawMinimap(); } b.timer += Math.max(250,bp.every); continue; }
    if(b.kind==='fish_farm'){ const cands = neighbors(x,y).filter(([a,b2])=> State.map[b2][a].type==='water' && !State.map[b2][a].building); if(cands.length){ const [ax,ay]=cands[(Math.random()*cands.length)|0]; State.map[ay][ax].type='fish'; State.map[ay][ax].stock=25; renderBoard(); drawMinimap(); } b.timer += Math.max(250,bp.every); continue; }
    if(['lumber','mason','fisher','hunter'].includes(b.kind)){
      const need = BP[b.kind].needs; if(need && !consumeNearby(x,y,need,1)){ b.idle=true; b.idleReason='no-near-resource'; b.timer += Math.max(250,bp.every); continue; }
    }
    if(['coal_mine','iron_mine','gold_mine'].includes(b.kind)){
      const dep = b.kind==='coal_mine'?'coal':b.kind==='iron_mine'?'iron':'gold';
      if(!hasDepositNearby(x,y,dep)){ b.idle=true; b.idleReason='no-deposit'; b.timer += Math.max(250,bp.every); continue; }
      if(!consumeRation(b.owner)){ b.idle=true; b.idleReason='no-rations'; b.timer += Math.max(250,bp.every); continue; }
      if(!consumeDepositNearby(x,y,dep,1)){ b.idle=true; b.idleReason='deposit-empty'; b.timer += Math.max(250,bp.every); continue; }
    }
    if(b.kind==='farm'){ if(!neighbors(x,y).some(([a,b2])=> State.map[b2][a].type==='field')){ b.idle=true; b.idleReason='no-field'; b.timer += Math.max(250,bp.every); continue; } }
    if(b.kind==='furnace'){
      if((R.iron_ore||0)>=1 && (R.coal||0)>=1){ R.iron=(R.iron||0)+1; R.iron_ore--; R.coal--; }
      else { b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; }
    } else if(b.kind==='gold_smelter'){
      if((R.gold_ore||0)>=1 && (R.coal||0)>=1){ R.gold=(R.gold||0)+1; R.gold_ore--; R.coal--; }
      else { b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; }
    } else if(b.kind==='barracks'){
      if(b.owner==='player'){
        if((R.bread||0)>=1 && (R.weapons||0)>=1){ R.bread--; R.weapons--; State.soldiers++; autoGarrisonPlayer(); }
        else { b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; }
      } else { b.timer += Math.max(250,bp.every); continue; }
    } else if(b.kind==='training'){
      if(b.owner==='player'){
        if(State.soldiers>State.veterans && (R.gold||0)>=1 && (R.beer||0)>=1){ R.gold--; R.beer--; State.veterans++; autoGarrisonPlayer(); }
        else { b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; }
      } else { b.idle=true; b.idleReason='no-input'; b.timer += Math.max(250,bp.every); continue; }
    } else {
      for(const [k,v] of Object.entries(bp.out||{})){ R[k]=(R[k]||0)+v; }
    }
    b.timer += Math.max(250,bp.every);
  }
  aiStep(ms);
  updateControl();
  checkCaptures();
  processQuestRewards();
  if(State.tickCount%4===0){ renderResBar(); renderQuests(); drawMinimap(); }
  State.tickCount++;
}

function aiStep(ms){ const A = State.ai; A.actionTimer += ms; A.soldierTimer += ms; if(A.soldierTimer > 30000){ A.soldierTimer = 0; if(A.soldiers < 6){ A.soldiers++; autoGarrisonAI(); } }
  if(A.actionTimer < 2600) return; A.actionTimer = 0; const plan = ['lumber','sawmill','mason','farm','acre','acre','well','mill','bakery','watch','watch','watch','fisher','fish_farm']; if(A.planStep < plan.length){ const k = plan[A.planStep]; if(aiTryBuild(k)) A.planStep++; return; } if((A.res.stone||0) >= 24){ aiTryBuild('watch'); }
}
function aiFindSpot(kind){ const tries = 400; for(let i=0;i<tries;i++){ const x=(Math.random()*WORLD)|0, y=(Math.random()*WORLD)|0; if(!State.control.ai[y][x]) continue; const c=canPlace(kind,x,y,'ai'); if(!c.ok) continue; if(kind==='watch'){ const nearEdge = neighbors(x,y).some(([a,b])=> !State.control.ai[b][a]); if(!nearEdge) continue; } return {x,y}; } return null; }
function aiTryBuild(kind){ const bp=BP[kind]; const R=State.ai.res; for(const [r,c] of Object.entries(bp.cost||{})){ if((R[r]||0)<c) return false; } const spot = aiFindSpot(kind); if(!spot) return false; tryBuildAt(kind, spot.x, spot.y, 'ai'); return true; }

// =============== Boot / Seed / Controls ===============
let _accum=0,_last=performance.now(),_loopId=null;
function loop(now){ const dt=now-_last; _last=now; _accum += dt*State.speed; while(_accum>=TICK_MS){ tick(TICK_MS); _accum -= TICK_MS; } _loopId = requestAnimationFrame(loop); }

function boot(){ cancelAnimationFrame(_loopId); State.map=newMap(); State.res={}; State.ai.res={}; for(const r of ResList){ State.res[r]=0; State.ai.res[r]=0; }
  State.res.wood=20; State.res.stone=10; State.res.grain=6; State.soldiers=3; State.veterans=0;
  State.ai.res.wood=20; State.ai.res.stone=10; State.ai.res.grain=6; State.ai.soldiers=0; State.ai.veterans=0; State.ai.planStep=0; State.ai.actionTimer=0; State.ai.soldierTimer=0;
  State.stats={ playerUnitsUsed:0, aiUnitsUsed:0, playerUnitsLost:0, aiUnitsLost:0, destroyedByPlayer:0, destroyedByAI:0, capturesByPlayer:0, capturesByAI:0 };
  State.started=false; State.ended=false; elStart.classList.add('show'); elEnd.classList.remove('show');
  const cx=Math.floor(WORLD/2), cy=Math.floor(WORLD/2); State.map[cy][cx].building={kind:'hq', owner:'player', timer:0, paused:false, idle:false};
  const aiCorners = [[4,4],[WORLD-5,4],[4,WORLD-5],[WORLD-5,WORLD-5]]; const pick = aiCorners[(rand()*aiCorners.length)|0]; const ax=pick[0], ay=pick[1];
  State.map[ay][ax].building={kind:'hq', owner:'ai', timer:0, paused:false, idle:false};
  for(const [sx,sy] of [[cx,cy],[ax,ay]]){ for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const X=sx+dx, Y=sy+dy; if(inBounds(X,Y)){ State.map[Y][X].type='grass'; State.map[Y][X].stock=null; } } }
  updateControl(); centerCam(); renderResBar(); renderPalette(); setupQuests(); renderBoard(); drawMinimap(); _last=performance.now(); _accum=0; _loopId=requestAnimationFrame(loop); }
window.boot = boot;

// =============== Game facade ===============
const Game = {
  start(){
    try{ audio.play().catch(()=>{}); }catch(e){}
    const overlay = document.getElementById('start'); if(overlay) overlay.classList.remove('show');
    State.started = true;
  },
  newMap(){ const s=elSeed.value||State.seed; setSeed(s); boot(); },
  randomSeed(){ const s=Math.random().toString(36).slice(2,10); elSeed.value=s; setSeed(s); boot(); }
};
window.Game = Game;

// =============== Init after DOM ready ===============
document.addEventListener('DOMContentLoaded', ()=>{
  // hook DOM
  elBoard = document.getElementById('board');
  elResBar = document.getElementById('resBar');
  elBuildPalette = document.getElementById('buildPalette');
  elModeBuild = document.getElementById('modeBuild');
  elModeDemolish = document.getElementById('modeDemolish');
  elSeed = document.getElementById('seedInput');
  elPlaceHint = document.getElementById('placeHint');
  elMini = document.getElementById('minimap');
  elEnd = document.getElementById('end');
  elEndTitle = document.getElementById('endTitle');
  elEndStats = document.getElementById('endStats');
  elQuests = document.getElementById('quests');
  elStart = document.getElementById('start');

  // camera
  elBoard.style.setProperty('--vw', VIEW_W);
  elBoard.style.setProperty('--vh', VIEW_H);
  document.getElementById('camUp').onclick=()=>pan(0,-3);
  document.getElementById('camDown').onclick=()=>pan(0,3);
  document.getElementById('camLeft').onclick=()=>pan(-3,0);
  document.getElementById('camRight').onclick=()=>pan(3,0);
  document.getElementById('camCenter').onclick=()=>centerCam();
  window.addEventListener('keydown',(e)=>{ if(['ArrowUp','w','W'].includes(e.key)) pan(0,-1); else if(['ArrowDown','s','S'].includes(e.key)) pan(0,1); else if(['ArrowLeft','a','A'].includes(e.key)) pan(-1,0); else if(['ArrowRight','d','D'].includes(e.key)) pan(1,0); });

  // minimap
  elMini.addEventListener('click',(e)=>{ const rect=elMini.getBoundingClientRect(); const rx=(e.clientX-rect.left)/rect.width; const ry=(e.clientY-rect.top)/rect.height; const tx=Math.floor(rx*WORLD); const ty=Math.floor(ry*WORLD); State.cam.x = Math.max(0, Math.min(WORLD-VIEW_W, tx-Math.floor(VIEW_W/2))); State.cam.y = Math.max(0, Math.min(WORLD-VIEW_H, ty-Math.floor(VIEW_H/2))); renderBoard(); drawMinimap(); });

  // toolbar
  document.getElementById('btnNewMap').addEventListener('click',()=>Game.newMap());
  document.getElementById('btnRandSeed').addEventListener('click',()=>Game.randomSeed());
  elModeBuild.addEventListener('click',()=>{ currentMode='build'; elModeBuild.classList.add('active'); elModeDemolish.classList.remove('active'); });
  elModeDemolish.addEventListener('click',()=>{ currentMode='demolish'; elModeDemolish.classList.add('active'); elModeBuild.classList.remove('active'); });
  document.getElementById('btnMusic').onclick = async ()=>{ try{ if(State.musicOn){ await audio.pause(); State.musicOn=false; } else { await audio.play(); State.musicOn=true; } }catch(e){} };
  document.getElementById('btnStart').addEventListener('click',()=>Game.start());
  document.getElementById('btnRestart').addEventListener('click',()=>boot());

  // boot first map (overlay open; tick waits for start)
  setSeed('founders');
  boot();
});
