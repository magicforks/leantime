import { TILE, ISO_W, WORLD_W, WORLD_H, CANVAS_W, CANVAS_H, T } from './constants.js';
import { tileToScreen, worldToScreen, camAngle, camPitchH, camZoom, setCamAngle, setCamPitchH, setCamZoom, updateCamera } from './camera.js';
import { drawHorse, drawRider, drawShopkeeper } from './draw-entities.js';
import { drawTile, getCachedTile, isoPath, drawIsoDiamond, _TILE_CX, _TILE_CY } from './draw-tiles.js';
import { World } from './world.js';
import { Horse } from './entities/horse.js';
import { Player } from './entities/player.js';
import { NPC } from './entities/npc.js';
import { BREEDS, EQUIPMENT_ITEMS } from './data/breeds.js';
import { STALL_SLOTS, SHOP_HORSE_SLOTS, SHOP_EQUIP_SLOTS } from './data/slots.js';
import { Input } from './input.js';
import { Economy } from './economy.js';
import { Training } from './systems/training.js';
import { TrailRide } from './systems/trail.js';
import { Tournament } from './systems/tournament.js';
import { UI } from './ui.js';

const VERSION = '2026.06.1';

// ===== GAME =====
export const Game = {
  world: null,
  player: null,
  npcs: [],
  canvas: null,
  ctx: null,
  lastTime: 0,
  time: 0,
  minimapCanvas: null,
  minimapCtx: null,
  minimapDirty: true,
  interactionZone: null,

  init() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap');
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.world = new World();
    this.player = new Player();
    this.npcs = [
      new NPC('Lena',  '#B8860B', 8,  52),
      new NPC('Max',   '#4A3728', 12, 64),
      new NPC('Sophie','#C4A27A', 6,  55),
      new NPC('Tom',   '#D4882A', 10, 61)
    ];
    this.shopkeeper = { x: 54*TILE+24, y: 21*TILE+24 };
    this.shopGreeted = false;
    this.shopPlayerInside = false;
    this.stableSlots = new Array(6).fill(null); // horse|null für die 6 Pferdeboxen
    this.paddockHorses = [];                    // Pferde auf der Koppel
    this.stableGreeted = false;
    Input.init();
    UI.init();
    this.drawMinimap();

    // Right-click drag: horizontal = rotate camera, vertical = change pitch (like Star Stable)
    let rcDragging = false, rcLastX = 0, rcLastY = 0;
    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 2) { rcDragging = true; rcLastX = e.clientX; rcLastY = e.clientY; e.preventDefault(); }
    });
    window.addEventListener('mousemove', e => {
      if (!rcDragging) return;
      const ddx = e.clientX - rcLastX, ddy = e.clientY - rcLastY;
      setCamAngle(camAngle + ddx * 0.007);                                         // horizontal = rotate
      setCamPitchH(Math.max(12, Math.min(44, camPitchH - ddy * 0.25))); // vertical = pitch
      rcLastX = e.clientX; rcLastY = e.clientY;
    });
    window.addEventListener('mouseup', e => { if (e.button === 2) rcDragging = false; });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    // Scroll wheel zoom
    this.canvas.addEventListener('wheel', e => {
      setCamZoom(Math.max(0.4, Math.min(2.5, camZoom - e.deltaY * 0.001)));
      e.preventDefault();
    }, { passive: false });

    // Left-click on horse → context menu
    this.canvas.addEventListener('click', e => {
      const rect = this.canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const cy = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
      const p = this.player;
      let hit = null, hitIdx = -1;
      for (let i = 0; i < p.horses.length; i++) {
        const h = p.horses[i];
        const src = (h === p.activeHorse) ? worldToScreen(p.x, p.y) : worldToScreen(h.x, h.y);
        const dx = cx - src.x, dy = cy - src.y;
        if (Math.sqrt(dx*dx + dy*dy) < 38) { hit = h; hitIdx = i; break; }
      }
      if (hit) { UI.showHorseMenu(hit, hitIdx, cx, cy); e.stopPropagation(); }
      else UI.hideHorseMenu();
    });
    window.addEventListener('click', () => UI.hideHorseMenu());
    requestAnimationFrame(ts => this.gameLoop(ts));
  },

  gameLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime)/1000, 0.05);
    this.lastTime = timestamp;
    this.time += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame(ts => this.gameLoop(ts));
  },

  update(dt) {
    this.movePlayer(dt);
    for (const npc of this.npcs) npc.update(dt, this.world);
    if (this.player.activeHorse) this.player.animT += dt;

    if (Training.active) Training.update(dt);
    if (TrailRide.active) TrailRide.update(dt);
    if (Tournament.active) Tournament.update(dt);

    if (!Training.active && !TrailRide.active && !Tournament.active) {
      this.checkInteractions();
    }
    // Paddock-Pferde wandern
    for (const h of this.paddockHorses) {
      h._wt = (h._wt||0) + dt;
      if (h._wt > 2.5) { h._wt = 0; h._wx = (Math.random()-0.5)*2; h._wy = (Math.random()-0.5)*2; }
      h.x = Math.max(50*TILE, Math.min(57*TILE, h.x + (h._wx||0)*28*dt));
      h.y = Math.max(7*TILE,  Math.min(17*TILE, h.y + (h._wy||0)*28*dt));
    }
    // Shop-Begrüßung
    const pr2 = this.player.tileR(), pc2 = this.player.tileC();
    const inShop = pr2>=23&&pr2<=33&&pc2>=49&&pc2<=61;
    if(inShop && !this.shopGreeted) {
      this.shopGreeted = true;
      UI.notify('Verkäuferin: "Guten Tag! Wie kann ich Ihnen helfen?" 👩');
    }
    if(!inShop) this.shopGreeted = false;
    this.shopPlayerInside = inShop;
    updateCamera();
    UI.updateStatus(this.getStatusText());
  },

  movePlayer(dt) {
    const p = this.player;
    const spd = p.activeHorse ? 250 : 150;
    let dx=0, dy=0;
    // Continuous camera-relative movement (works for any camAngle)
    const ca = Math.cos(camAngle), sa = Math.sin(camAngle);
    if (Input.isDown('w')||Input.isDown('arrowup'))    { dx -= (ca+sa); dy += (sa-ca); p.dir='up'; }
    if (Input.isDown('s')||Input.isDown('arrowdown'))  { dx += (ca+sa); dy -= (sa-ca); p.dir='down'; }
    if (Input.isDown('a')||Input.isDown('arrowleft'))  { dx += (sa-ca); dy += (sa+ca); p.dir='left'; }
    if (Input.isDown('d')||Input.isDown('arrowright')) { dx += (ca-sa); dy -= (sa+ca); p.dir='right'; }

    if (dx!==0||dy!==0) {
      const len=Math.sqrt(dx*dx+dy*dy);
      const nx=p.x+dx/len*spd*dt;
      const ny=p.y+dy/len*spd*dt;
      if (!this.collidesAt(nx, p.y)) p.x=nx;
      if (!this.collidesAt(p.x, ny)) p.y=ny;
      p.x=Math.max(TILE/2,Math.min((WORLD_W)*TILE-TILE/2,p.x));
      p.y=Math.max(TILE/2,Math.min((WORLD_H)*TILE-TILE/2,p.y));
      p.animT+=dt;
      p.moving=true;
    } else {
      p.moving=false;
    }

    // Lead horse follows player
    if (p.leadHorse) {
      const lh=p.leadHorse;
      const ldx=p.x-lh.x, ldy=p.y-lh.y;
      const ldist=Math.sqrt(ldx*ldx+ldy*ldy);
      if (ldist>80) {
        const spd2=100;
        lh.x+=ldx/ldist*spd2*dt;
        lh.y+=ldy/ldist*spd2*dt;
        if (ldx<0) lh.dir='left'; else if(ldx>0) lh.dir='right';
        else if (ldy<0) lh.dir='up'; else lh.dir='down';
      }
    }
  },

  collidesAt(px, py) {
    const hw=10;
    const corners=[[px-hw,py-hw],[px+hw,py-hw],[px-hw,py+hw],[px+hw,py+hw]];
    for (const [cx,cy] of corners) {
      const r=Math.floor(cy/TILE), c=Math.floor(cx/TILE);
      if (this.world.isSolid(r,c)) return true;
    }
    return false;
  },

  checkInteractions() {
    const p=this.player;
    const pr=p.tileR(), pc=p.tileC();
    this.interactionZone=null;

    // Koppel-Tor (Paddock 1 gate bei Zeile 18, Spalten 52-53)
    if ((pr>=17&&pr<=19)&&(pc>=51&&pc<=54)) {
      if (p.activeHorse) {
        UI.showPrompt('E: ' + p.activeHorse.name + ' auf Koppel schicken 🐴');
        this.interactionZone = {type:'paddock_gate', action:'send'};
      } else if (this.paddockHorses.length > 0) {
        UI.showPrompt('E: Pferd von Koppel holen (' + this.paddockHorses.length + ')');
        this.interactionZone = {type:'paddock_gate', action:'get'};
      }
      if (this.interactionZone) return;
    }

    // Pferdeboxen im Stall (6 Slots)
    for (let i = 0; i < STALL_SLOTS.length; i++) {
      const sl = STALL_SLOTS[i];
      const dx = p.x - sl.wx, dy = p.y - sl.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 72) {
        const horse = this.stableSlots[i];
        if (horse) {
          UI.showPrompt('E: ' + horse.name + ' aufsteigen');
          this.interactionZone = {type:'stall_slot', slotIdx:i};
        } else if (p.activeHorse) {
          UI.showPrompt('E: ' + p.activeHorse.name + ' hier einstellen');
          this.interactionZone = {type:'stall_slot_empty', slotIdx:i};
        } else {
          UI.showPrompt(sl.label + ' — leer');
          this.interactionZone = {type:'stall_slot_empty', slotIdx:i};
        }
        return;
      }
    }

    // Near stable door (legacy stall management)
    if (pr>=6&&pr<=14&&pc>=31&&pc<=44) {
      // Willkommen im Stall
      if (!this.stableGreeted) {
        // greeting fires once in update
      }
    }

    // Shop: Pferdeboxen (physisch in der Welt)
    for (let i = 0; i < SHOP_HORSE_SLOTS.length; i++) {
      const sl = SHOP_HORSE_SLOTS[i];
      const dx = p.x - sl.wx, dy = p.y - sl.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 80) {
        const b = BREEDS[sl.breedIdx];
        const owned = p.horses.some(h => h.breed === b.name);
        if (owned) {
          UI.showPrompt(b.name + ' – bereits in deinem Besitz');
        } else {
          UI.showPrompt('E: ' + b.name + ' kaufen (' + b.cost + ' Münzen)');
          this.interactionZone = {type:'shop_horse', breedIdx: sl.breedIdx};
        }
        return;
      }
    }
    // Shop: Equipment an der Wand
    for (let i = 0; i < SHOP_EQUIP_SLOTS.length; i++) {
      const sl = SHOP_EQUIP_SLOTS[i];
      const dx = p.x - sl.wx, dy = p.y - sl.wy;
      if (Math.sqrt(dx*dx+dy*dy) < 80) {
        const item = EQUIPMENT_ITEMS[sl.cat][sl.itemIdx];
        UI.showPrompt('E: ' + item.name + ' kaufen (' + item.cost + ' Münzen)');
        this.interactionZone = {type:'shop_equip', cat: sl.cat, itemIdx: sl.itemIdx};
        return;
      }
    }
    // Maria am Tresen
    if (pr>=23&&pr<=24&&pc>=53&&pc<=56) {
      UI.showPrompt('E: Maria ansprechen');
      this.interactionZone = {type:'shopkeeper'};
      return;
    }

    // Near stable door from outside
    if (pr===15&&(pc===37||pc===38)||pr===16&&(pc===36||pc===37||pc===38||pc===39)) {
      UI.showPrompt('E: Stall betreten');
      this.interactionZone={type:'stable_enter'};
    }

    // Arena entrance
    if ((pr===37||pr===38)&&(pc===14||pc===15)) {
      UI.showPrompt('E: Training starten | T: Turnier');
      this.interactionZone={type:'arena'};
      return;
    }

    // Trail entrance
    if (pr>=37&&pr<=42&&pc>=32&&pc<=38) {
      UI.showPrompt('E: Trail-Ausritt starten');
      this.interactionZone={type:'trail'};
      return;
    }

    // Near paddock horses (NPCs)
    for (const npc of this.npcs) {
      const dx=p.x-npc.x, dy=p.y-npc.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if (dist<80) {
        if (!p.activeHorse && p.horses.length>0) {
          UI.showPrompt(`E: ${npc.name} begrüßen`);
          this.interactionZone={type:'npc', npc};
        } else {
          UI.showPrompt(`E: ${npc.name} begrüßen`);
          this.interactionZone={type:'npc', npc};
        }
        return;
      }
    }

    // Tournament sign area (inside/near arena north area)
    if (pr>=22&&pr<=26&&pc>=15&&pc<=22) {
      UI.showPrompt('E: Turnier starten');
      this.interactionZone={type:'tournament'};
      return;
    }

    if (!this.interactionZone) UI.hidePrompt();
  },

  interact() {
    if (Training.active||TrailRide.active||Tournament.active) return;
    if (document.getElementById('panel').style.display==='block') { UI.closePanel(); return; }
    if (!this.interactionZone) return;
    const z=this.interactionZone;
    if (z.type==='shop_horse') {
      const b = BREEDS[z.breedIdx];
      const owned = this.player.horses.some(h => h.breed === b.name);
      if (owned) { UI.notify('Du hast bereits einen ' + b.name + '!'); return; }
      if (!Economy.spend(b.cost)) { UI.notify('Nicht genug Münzen! (' + b.cost + ' benötigt)'); return; }
      const h = new Horse(z.breedIdx, b.name);
      h.x = this.player.x + TILE; h.y = this.player.y;
      this.player.horses.push(h);
      UI.notify(b.name + ' gekauft! 🐴');
      if (this.player.horses.length === 1) { this.player.activeHorse = h; UI.notify('Aufgesessen auf ' + h.name + '!'); }
    }
    else if (z.type==='shop_equip') {
      const item = EQUIPMENT_ITEMS[z.cat][z.itemIdx];
      if (!Economy.spend(item.cost)) { UI.notify('Nicht genug Münzen! (' + item.cost + ' benötigt)'); return; }
      this.player.inventory[z.cat].push(item);
      UI.notify(item.name + ' gekauft! ✅');
    }
    else if (z.type==='shopkeeper') {
      UI.notify('💬 Maria: "Guten Tag! Wie kann ich weiter helfen?"');
    }
    else if (z.type==='stall') UI.showStallMenu(z.stallId);
    else if (z.type==='arena') Training.start();
    else if (z.type==='trail') TrailRide.start();
    else if (z.type==='tournament') Tournament.showSelection();
    else if (z.type==='stable_enter') UI.notify('Willkommen im Stall!');
    else if (z.type==='stall_slot') {
      const h = this.stableSlots[z.slotIdx];
      if (h) {
        this.stableSlots[z.slotIdx] = null;
        if (this.player.activeHorse) {
          // aktives Pferd in die alte Box stellen, neues nehmen
          this.stableSlots[z.slotIdx] = this.player.activeHorse;
          this.player.activeHorse.x = STALL_SLOTS[z.slotIdx].wx;
          this.player.activeHorse.y = STALL_SLOTS[z.slotIdx].wy;
        }
        this.player.activeHorse = h;
        h.x = this.player.x; h.y = this.player.y;
        UI.notify('Aufgesessen auf ' + h.name + '!');
      }
    }
    else if (z.type==='stall_slot_empty') {
      const h = this.player.activeHorse;
      if (h) {
        h.x = STALL_SLOTS[z.slotIdx].wx;
        h.y = STALL_SLOTS[z.slotIdx].wy;
        this.stableSlots[z.slotIdx] = h;
        this.player.activeHorse = null;
        UI.notify(h.name + ' in Box ' + (z.slotIdx+1) + ' eingestellt.');
      }
    }
    else if (z.type==='paddock_gate') {
      if (z.action === 'send') {
        const h = this.player.activeHorse;
        if (h) {
          h.x = 53*TILE+24; h.y = 11*TILE+24;
          h._wt = 0; h._wx = 0; h._wy = 0;
          this.paddockHorses.push(h);
          this.player.activeHorse = null;
          UI.notify(h.name + ' ist auf der Koppel.');
        }
      } else {
        if (this.paddockHorses.length === 1) {
          const h = this.paddockHorses.pop();
          h.x = this.player.x + TILE; h.y = this.player.y;
          this.player.activeHorse = h;
          UI.notify(h.name + ' von Koppel geholt!');
        } else {
          let html = '<p style="color:#aaa;margin-bottom:10px">Welches Pferd möchtest du holen?</p>';
          this.paddockHorses.forEach((h,i) => {
            html += '<div class="shop-item"><div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:' + h.color + '"></div><span>' + h.name + '</span></div>' +
              '<button class="btn btn-primary" onclick="Game.getPaddockHorse(' + i + ');UI.closePanel()">Holen</button></div>';
          });
          UI.showPanel('Pferd von Koppel holen', html);
        }
      }
    }
    else if (z.type==='npc') {
      const npc=z.npc;
      UI.notify(npc.name + ': "Hallo! Schöner Tag zum Reiten!"');
    }
  },

  actionPress() {
    if (Training.active) Training.actionPress();
    if (TrailRide.active) TrailRide.actionPress();
    if (Tournament.active) Tournament.actionPress();
  },

  toggleLead() {
    const p=this.player;
    if (p.leadHorse) {
      p.leadHorse=null;
      UI.notify('Pferd losgelassen');
    } else if (p.horses.length>0&&!p.activeHorse) {
      p.leadHorse=p.horses[0];
      UI.notify(`${p.horses[0].name} am Führstrick`);
    }
  },

  setLeadHorse(idx) {
    const p = this.player;
    const h = p.horses[idx];
    if (!h || p.activeHorse === h) return;
    if (p.leadHorse === h) {
      // Park lead horse beside player before releasing
      h.x = p.x + TILE * 0.8;
      h.y = p.y;
      p.leadHorse = null;
      UI.notify(`${h.name} losgelassen`);
    } else {
      p.leadHorse = h;
      UI.notify(`${h.name} aufgehalfert`);
    }
  },

  buyHorse(breedIdx) {
    const p=this.player;
    const b=BREEDS[breedIdx];
    if (!Economy.spend(b.cost)) { UI.notify('Nicht genug Münzen!'); return; }
    const h=new Horse(breedIdx, b.name);
    h.x=p.x+60; h.y=p.y;
    p.horses.push(h);
    UI.notify(`${b.name} gekauft!`);
    if (p.horses.length===1) { p.activeHorse=h; UI.notify('Aufgesessen!'); }
    UI.showShop();
  },

  buyEquip(category, itemName) {
    const p=this.player;
    const items=EQUIPMENT_ITEMS[category];
    const item=items.find(i=>i.name===itemName);
    if (!item) return;
    if (!Economy.spend(item.cost)) { UI.notify('Nicht genug Münzen!'); return; }
    p.inventory[category].push(item);
    UI.notify(`${item.name} gekauft!`);
    UI.showShop();
  },

  equipItem(type, itemName) {
    const p=this.player;
    const horse=p.activeHorse;
    if (!horse) { UI.notify('Kein Pferd aktiv!'); return; }
    const allItems=[...p.inventory.saddles,...p.inventory.bridles,...p.inventory.blankets];
    const item=allItems.find(i=>i.name===itemName);
    if (!item) return;
    if (horse.equipment[type]===item) {
      horse.equipment[type]=null;
      UI.notify(`${item.name} abgelegt`);
    } else {
      horse.equipment[type]=item;
      UI.notify(`${item.name} angelegt!`);
    }
  },

  setActiveHorse(idx) {
    const p=this.player;
    if (p.activeHorse===p.horses[idx]) {
      // Park horse at current player position before dismounting
      p.activeHorse.x = p.x;
      p.activeHorse.y = p.y;
      p.activeHorse=null;
      UI.notify('Abgesessen');
    } else {
      p.activeHorse=p.horses[idx];
      UI.notify(`Aufgesessen auf ${p.horses[idx].name}!`);
    }
  },

  getPaddockHorse(idx) {
    const h = this.paddockHorses.splice(idx, 1)[0];
    if (!h) return;
    h.x = this.player.x + TILE; h.y = this.player.y;
    this.player.activeHorse = h;
    UI.notify(h.name + ' von Koppel geholt!');
  },

  setOutfitColor(key, color) {
    Game.player.outfit[key]=color;
  },

  feedHorse(idx) {
    const p=this.player;
    const h=p.horses[idx];
    if (!h) return;
    h.energy=Math.min(100,h.energy+20);
    h.happiness=Math.min(100,h.happiness+5);
    Economy.earn(10,'Pferd gefüttert!');
    UI.notify(`${h.name} gefüttert! Energie +20`);
  },

  groomHorse(idx) {
    const p=this.player;
    const h=p.horses[idx];
    if (!h) return;
    h.happiness=Math.min(100,h.happiness+15);
    Economy.earn(15,'Pferd gepflegt!');
    UI.notify(`${h.name} gepflegt! Glück +15`);
  },

  getStatusText() {
    const p=this.player;
    const r=p.tileR(), c=p.tileC();
    const tName=['Gras','Blume','Erde','Stallboden','Stand','Wand','Zaun','Baum','Wasser','Arena','Pfad','Koppel'];
    const tileName=tName[this.world.get(r,c)]||'?';
    let status=`Pos:(${c},${r}) Tile:${tileName}`;
    if (p.activeHorse) status+=` | Pferd: ${p.activeHorse.name}`;
    if (p.leadHorse) status+=` | Führt: ${p.leadHorse.name}`;
    return status;
  },

  drawMinimap() {
    const ctx=this.minimapCtx;
    const W=88,H=88;
    const scaleX=W/WORLD_W, scaleY=H/WORLD_H;
    ctx.clearRect(0,0,W,H);
    const colors={
      [T.GRASS]:'#4A7C2F',[T.FLOWER]:'#FF6B8A',[T.DIRT]:'#8B6914',
      [T.STABLE_FLOOR]:'#D4A574',[T.STALL]:'#C4944A',[T.WALL]:'#696969',
      [T.FENCE]:'#8B4513',[T.TREE]:'#1a5a0a',[T.WATER]:'#4169E1',
      [T.ARENA]:'#C4A35A',[T.PATH]:'#A0896B',[T.PADDOCK]:'#5a9040'
    };
    for (let r=0;r<WORLD_H;r++) {
      for (let c=0;c<WORLD_W;c++) {
        const t=this.world.get(r,c);
        ctx.fillStyle=colors[t]||'#4A7C2F';
        ctx.fillRect(c*scaleX, r*scaleY, scaleX+0.5, scaleY+0.5);
      }
    }
    ctx.fillStyle='rgba(0,0,0,0.3)';
    ctx.fillRect(0,0,W,H);
  },

  updateMinimap() {
    const ctx=this.minimapCtx;
    const W=88,H=88;
    const scaleX=W/WORLD_W, scaleY=H/WORLD_H;
    const p=this.player;
    // Player dot
    const px=p.x/TILE*scaleX, py=p.y/TILE*scaleY;
    ctx.clearRect(0,0,W,H);
    // Redraw would be slow; just use existing background and draw dots
    if (this.minimapDirty) { this.drawMinimap(); this.minimapDirty=false; }
    ctx.fillStyle='#FF0';
    ctx.beginPath();
    ctx.arc(px,py,2.5,0,Math.PI*2);
    ctx.fill();
    // NPCs
    for (const npc of this.npcs) {
      ctx.fillStyle='#FF6600';
      ctx.beginPath();
      ctx.arc(npc.x/TILE*scaleX, npc.y/TILE*scaleY, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
  },

  render() {
    const ctx = this.ctx;
    const p = this.player;

    // Sky — atmospheric gradient with sun and clouds
    const skyG = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.75);
    skyG.addColorStop(0,   '#1b4fa8');
    skyG.addColorStop(0.35,'#3d7ec8');
    skyG.addColorStop(0.7, '#7ab8e0');
    skyG.addColorStop(1,   '#c8e4f4');
    ctx.fillStyle = skyG; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Horizon haze
    const hazeG = ctx.createLinearGradient(0, CANVAS_H*0.55, 0, CANVAS_H*0.75);
    hazeG.addColorStop(0,'rgba(220,235,248,0)'); hazeG.addColorStop(1,'rgba(220,235,248,0.55)');
    ctx.fillStyle = hazeG; ctx.fillRect(0, CANVAS_H*0.55, CANVAS_W, CANVAS_H*0.2);
    // Sun
    { const sx2=CANVAS_W*0.78, sy2=CANVAS_H*0.1;
      const sg2=ctx.createRadialGradient(sx2,sy2,2,sx2,sy2,35);
      sg2.addColorStop(0,'rgba(255,252,200,1)'); sg2.addColorStop(0.3,'rgba(255,220,120,0.7)'); sg2.addColorStop(1,'rgba(255,200,80,0)');
      ctx.fillStyle=sg2; ctx.beginPath(); ctx.arc(sx2,sy2,35,0,Math.PI*2); ctx.fill();
      const gg=ctx.createRadialGradient(sx2,sy2,15,sx2,sy2,90);
      gg.addColorStop(0,'rgba(255,230,120,0.12)'); gg.addColorStop(1,'rgba(255,230,120,0)');
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(sx2,sy2,90,0,Math.PI*2); ctx.fill(); }
    // Clouds
    ctx.fillStyle='rgba(255,255,255,0.8)';
    [[160,55,1.0],[370,38,0.85],[590,65,1.1],[800,42,0.75]].forEach(([cx2,cy2,sc])=>{
      const cx3=(cx2+this.time*8)%(CANVAS_W+250)-125;
      [[0,0,22],[26,6,17],[-26,6,16],[12,-7,14],[-12,-5,13],[38,2,11],[-38,2,10]].forEach(([ox,oy,cr])=>{
        ctx.beginPath(); ctx.arc(cx3+ox*sc, cy2+oy*sc, cr*sc, 0, Math.PI*2); ctx.fill();
      });
      ctx.fillStyle='rgba(210,225,240,0.45)';
      ctx.beginPath(); ctx.arc(cx3, cy2+12*sc, 16*sc, Math.PI, 0); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.8)';
    });

    const objects = [];

    // Collect tiles (with viewport culling)
    // depth = pos.y (screen Y) so z-sort works correctly for all camera rotations
    for (let ty = 0; ty < WORLD_H; ty++) {
      for (let tx = 0; tx < WORLD_W; tx++) {
        const pos = tileToScreen(tx, ty);
        if (pos.x > -ISO_W*2 && pos.x < CANVAS_W + ISO_W*2 && pos.y > -200 && pos.y < CANVAS_H + 300) {
          objects.push({ depth: pos.y, subDepth: 0, type: 'tile', tx, ty, tile: this.world.get(ty, tx), sx: pos.x, sy: pos.y });
        }
      }
    }

    // Tournament sign
    const signTX = 18, signTY = 23;
    const signPos = tileToScreen(signTX, signTY);
    objects.push({ depth: signPos.y, subDepth: 0.5, type: 'sign', sx: signPos.x, sy: signPos.y });

    // Wegweiser zum Shop (bei Stall-Bereich)
    const sign1Pos = tileToScreen(43, 19);
    objects.push({ depth: sign1Pos.y, subDepth: 0.4, type: 'shopSign', sx: sign1Pos.x, sy: sign1Pos.y, label:'SHOP →' });
    // Wegweiser bei Arena
    const sign2Pos = tileToScreen(27, 37);
    objects.push({ depth: sign2Pos.y, subDepth: 0.4, type: 'shopSign', sx: sign2Pos.x, sy: sign2Pos.y, label:'→ SHOP' });

    // Lead horse — sort by current TILE (floor) so entity always draws after its ground tile
    if (p.leadHorse) {
      const lpos = worldToScreen(p.leadHorse.x, p.leadHorse.y);
      if (lpos.x > -100 && lpos.x < CANVAS_W + 100) {
        const ltile = tileToScreen(Math.floor(p.leadHorse.x/TILE), Math.floor(p.leadHorse.y/TILE));
        objects.push({ depth: ltile.y, subDepth: 1, type: 'leadhorse', sx: lpos.x, sy: lpos.y });
      }
    }

    // NPCs
    for (const npc of this.npcs) {
      const npos = worldToScreen(npc.x, npc.y);
      if (npos.x > -100 && npos.x < CANVAS_W + 100) {
        const ntile = tileToScreen(Math.floor(npc.x/TILE), Math.floor(npc.y/TILE));
        objects.push({ depth: ntile.y, subDepth: 1, type: 'npc', npc, sx: npos.x, sy: npos.y });
      }
    }

    // Shopkeeper (Maria hinter Tresen)
    const skpos = worldToScreen(this.shopkeeper.x, this.shopkeeper.y);
    const sktile = tileToScreen(Math.floor(this.shopkeeper.x/TILE), Math.floor(this.shopkeeper.y/TILE));
    objects.push({ depth: sktile.y, subDepth: 1, type: 'shopkeeper', sx: skpos.x, sy: skpos.y });

    // Shop-Pferde physisch in Boxen
    for (let i = 0; i < SHOP_HORSE_SLOTS.length; i++) {
      const sl = SHOP_HORSE_SLOTS[i];
      const spos = worldToScreen(sl.wx, sl.wy);
      if (spos.x > -120 && spos.x < CANVAS_W + 120) {
        const stile = tileToScreen(sl.tc, sl.tr);
        objects.push({depth: stile.y, subDepth: 0.85, type:'shopHorse', breedIdx:sl.breedIdx, sx:spos.x, sy:spos.y});
      }
    }
    // Shop-Equipment an der rechten Wand
    for (let i = 0; i < SHOP_EQUIP_SLOTS.length; i++) {
      const sl = SHOP_EQUIP_SLOTS[i];
      const spos = worldToScreen(sl.wx, sl.wy);
      if (spos.x > -120 && spos.x < CANVAS_W + 120) {
        const stile = tileToScreen(sl.tc, sl.tr);
        objects.push({depth: stile.y, subDepth: 0.5, type:'shopEquip', cat:sl.cat, itemIdx:sl.itemIdx, sx:spos.x, sy:spos.y});
      }
    }

    // Eingestallte Pferde in den Boxen
    for (let i = 0; i < 6; i++) {
      const h = this.stableSlots[i];
      if (!h) continue;
      const sl = STALL_SLOTS[i];
      const hpos = worldToScreen(sl.wx, sl.wy);
      const htile = tileToScreen(sl.tc, sl.tr);
      objects.push({depth: htile.y, subDepth: 0.9, type:'stabledHorse', horse:h, slotIdx:i, sx:hpos.x, sy:hpos.y});
    }
    // Pferde auf Koppel
    for (const h of this.paddockHorses) {
      const hpos = worldToScreen(h.x, h.y);
      const htile = tileToScreen(Math.floor(h.x/TILE), Math.floor(h.y/TILE));
      objects.push({depth: htile.y, subDepth: 0.9, type:'paddockHorse', horse:h, sx:hpos.x, sy:hpos.y});
    }
    // Koppel-Tor-Schild
    const gatePos = tileToScreen(52, 18);
    objects.push({depth: gatePos.y - 2, subDepth: 0.3, type:'paddockGate', sx: gatePos.x, sy: gatePos.y});

    // Player — sort by current tile (floor), draw at actual screen pos
    const ppos = worldToScreen(p.x, p.y);
    const ptile = tileToScreen(Math.floor(p.x/TILE), Math.floor(p.y/TILE));
    objects.push({ depth: ptile.y, subDepth: 1, type: 'player', sx: ppos.x, sy: ppos.y });

    // Training checkpoints and jump obstacle
    if (Training.active) {
      for (let i = 0; i < Training.checkpoints.length; i++) {
        const cp = Training.checkpoints[i];
        const cpos = worldToScreen(cp.x, cp.y);
        const ctile = tileToScreen(Math.floor(cp.x/TILE), Math.floor(cp.y/TILE));
        objects.push({depth: ctile.y, subDepth: 0.5, type: 'trnCone', cp, idx: i, sx: cpos.x, sy: cpos.y});
      }
      if (Training.phase === 3) {
        const jpos = worldToScreen(Training.jumpObstacleX, Training.jumpObstacleY);
        const jtile = tileToScreen(Math.floor(Training.jumpObstacleX/TILE), Math.floor(Training.jumpObstacleY/TILE));
        objects.push({depth: jtile.y, subDepth: 0.6, type: 'trnJump', sx: jpos.x, sy: jpos.y});
      }
    }
    // Tournament world objects
    if (Tournament.active) {
      if (Tournament.type === 'jumping') {
        for (let i = 0; i < Tournament.obstacles.length; i++) {
          const obs = Tournament.obstacles[i];
          const opos = worldToScreen(obs.x, obs.y);
          const otile = tileToScreen(Math.floor(obs.x/TILE), Math.floor(obs.y/TILE));
          objects.push({depth: otile.y, subDepth: 0.6, type: 'tournJump', obs, isCurrent: i===Tournament.jumpIdx, sx: opos.x, sy: opos.y});
        }
      } else {
        for (let i = 0; i < Tournament.dressageLetters.length; i++) {
          const dl = Tournament.dressageLetters[i];
          const lpos = worldToScreen(dl.x, dl.y);
          const ltile = tileToScreen(Math.floor(dl.x/TILE), Math.floor(dl.y/TILE));
          objects.push({depth: ltile.y, subDepth: 0.6, type: 'dressLetter', dl, isCurrent: i===Tournament.dressagePhase, sx: lpos.x, sy: lpos.y});
        }
      }
    }
    // Trail coins and logs
    if (TrailRide.active) {
      for (const c of TrailRide.coins) {
        if (!c.collected) {
          const cpos = worldToScreen(c.x, c.y);
          const ctile = tileToScreen(Math.floor(c.x/TILE), Math.floor(c.y/TILE));
          objects.push({depth: ctile.y, subDepth: 0.4, type: 'trailCoin', coin: c, sx: cpos.x, sy: cpos.y});
        }
      }
      for (const obs of TrailRide.obstacles) {
        const opos = worldToScreen(obs.x, obs.y);
        const otile = tileToScreen(Math.floor(obs.x/TILE), Math.floor(obs.y/TILE));
        objects.push({depth: otile.y, subDepth: 0.6, type: 'trailLog', obs, sx: opos.x, sy: opos.y});
      }
      // Goal flag at trail end
      const gpos = worldToScreen(35*TILE, 68*TILE);
      const gtile = tileToScreen(35, 68);
      objects.push({depth: gtile.y, subDepth: 0.8, type: 'trailGoal', sx: gpos.x, sy: gpos.y});
    }

    // Z-sort by screen Y (handles all camera rotations correctly)
    objects.sort((a, b) => a.depth - b.depth || a.subDepth - b.subDepth);

    // Draw lead rope line (before sorted objects, in world space order)
    if (p.leadHorse) {
      const lpos = worldToScreen(p.leadHorse.x, p.leadHorse.y);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(ppos.x, ppos.y);
      ctx.lineTo(lpos.x, lpos.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw all sorted objects
    for (const obj of objects) {
      if (obj.type === 'tile') {
        if (obj.tile === T.WATER || obj.tile === T.FLOWER) {
          drawTile(ctx, obj.tile, obj.sx, obj.sy, this.time, obj.tx, obj.ty);
        } else {
          const tc = getCachedTile(obj.tile, obj.tx, obj.ty);
          if (tc) { ctx.drawImage(tc, obj.sx - _TILE_CX, obj.sy - _TILE_CY); }
          else { drawTile(ctx, obj.tile, obj.sx, obj.sy, this.time, obj.tx, obj.ty); }
        }
      } else if (obj.type === 'player') {
        if (p.activeHorse) {
          drawHorse(ctx, obj.sx, obj.sy, p.activeHorse.color, p.dir, p.animT, p.activeHorse.equipment);
          drawRider(ctx, obj.sx, obj.sy - 15, p.dir, p.outfit);
          // Horse name chip above rider
          ctx.fillStyle = 'rgba(0,0,0,0.72)';
          const hn = p.activeHorse.name;
          ctx.font = 'bold 11px sans-serif';
          const hw = ctx.measureText('🐎 ' + hn).width;
          ctx.fillRect(obj.sx - hw/2 - 5, obj.sy - 92, hw + 10, 17);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.fillText('🐎 ' + hn, obj.sx, obj.sy - 79);
          ctx.textAlign = 'left';
        } else {
          this._drawWalker(ctx, obj.sx, obj.sy, p.dir, p.animT, p.outfit);
        }
      } else if (obj.type === 'npc') {
        const npc = obj.npc;
        drawHorse(ctx, obj.sx, obj.sy, npc.horse.color, npc.dir, npc.animT, {});
        drawRider(ctx, obj.sx, obj.sy - 15, npc.dir, {helmetColor:'#333',jacketColor:'#8B0000',pantsColor:'#F0F0F0',bootsColor:'#1a1a1a'});
        // Name tag
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = '12px sans-serif';
        const tw = ctx.measureText(npc.name).width;
        ctx.fillRect(obj.sx - tw/2 - 4, obj.sy - 80, tw + 8, 18);
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, obj.sx, obj.sy - 67);
        ctx.textAlign = 'left';
      } else if (obj.type === 'shopkeeper') {
        drawShopkeeper(ctx, obj.sx, obj.sy);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = '11px sans-serif';
        const skw = ctx.measureText('Maria').width;
        ctx.fillRect(obj.sx - skw/2 - 4, obj.sy - 80, skw+8, 17);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
        ctx.fillText('Maria', obj.sx, obj.sy - 67);
        ctx.textAlign = 'left';
      } else if (obj.type === 'shopHorse') {
        const b = BREEDS[obj.breedIdx];
        const owned = p.horses.some(h => h.breed === b.name);
        // Stallbox-Rahmen (Holzwände der Box)
        ctx.fillStyle = '#6B3A1F';
        ctx.fillRect(obj.sx - 26, obj.sy - 2, 52, 6);
        ctx.fillRect(obj.sx - 26, obj.sy - 22, 52, 5);
        ctx.fillRect(obj.sx - 26, obj.sy - 22, 5, 22);
        ctx.fillRect(obj.sx + 21, obj.sy - 22, 5, 22);
        // Innenboden der Box
        ctx.fillStyle = 'rgba(180,130,70,0.25)';
        ctx.fillRect(obj.sx - 21, obj.sy - 17, 42, 15);
        // Pferd zeichnen
        drawHorse(ctx, obj.sx, obj.sy - 10, b.color, 'down', 0, {}, 0.8);
        // Namensschild (braune Tafel oben an der Box)
        const bname = b.name;
        const bprice = b.cost + ' M';
        const bnw = Math.max(ctx.measureText(bname).width, ctx.measureText(bprice).width);
        ctx.fillStyle = owned ? '#1a4a1a' : '#4a2800';
        ctx.fillRect(obj.sx - bnw/2 - 5, obj.sy - 88, bnw + 10, 30);
        ctx.strokeStyle = owned ? '#2d8a2d' : '#8B5C1A';
        ctx.lineWidth = 1.5; ctx.strokeRect(obj.sx - bnw/2 - 5, obj.sy - 88, bnw + 10, 30);
        ctx.fillStyle = owned ? '#90EE90' : '#FFD700';
        ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(bname, obj.sx, obj.sy - 74);
        ctx.fillStyle = owned ? '#90EE90' : '#FFF';
        ctx.font = '9px sans-serif';
        ctx.fillText(owned ? '✓ Besitz' : bprice, obj.sx, obj.sy - 63);
        ctx.textAlign = 'left';
      } else if (obj.type === 'shopEquip') {
        const item = EQUIPMENT_ITEMS[obj.cat][obj.itemIdx];
        const icons = {saddles:'🎠', bridles:'🎯', blankets:'🛡️'};
        // Wandhalter (Holzhaken)
        ctx.fillStyle = '#5C3317';
        ctx.fillRect(obj.sx - 18, obj.sy - 48, 36, 5);
        ctx.fillRect(obj.sx - 3, obj.sy - 43, 6, 14);
        // Artikel-Farbblock (symbolisiert Sattel / Trense / Decke)
        ctx.fillStyle = item.color;
        const shapes = {saddles:[[-16,-29,32,18]], bridles:[[-12,-29,24,14]], blankets:[[-16,-29,32,16]]};
        const shape = (shapes[obj.cat]||shapes.saddles)[0];
        ctx.fillRect(obj.sx + shape[0], obj.sy + shape[1], shape[2], shape[3]);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
        ctx.strokeRect(obj.sx + shape[0], obj.sy + shape[1], shape[2], shape[3]);
        // Glanzlicht
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(obj.sx + shape[0]+2, obj.sy + shape[1]+2, shape[2]-4, 4);
        // Namensschild
        ctx.font = '9px sans-serif';
        const iname = item.name;
        const iprice = item.cost + ' M';
        const inw = Math.max(ctx.measureText(iname).width, ctx.measureText(iprice).width);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(obj.sx - inw/2 - 4, obj.sy - 62, inw + 8, 28);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
        ctx.fillText(iname, obj.sx, obj.sy - 49);
        ctx.fillStyle = '#ddd';
        ctx.fillText(iprice, obj.sx, obj.sy - 39);
        ctx.textAlign = 'left';
      } else if (obj.type === 'stabledHorse') {
        drawHorse(ctx, obj.sx, obj.sy, obj.horse.color, 'down', 0, obj.horse.equipment);
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.font = '10px sans-serif';
        const hn = obj.horse.name;
        const hw = ctx.measureText(hn).width;
        ctx.fillRect(obj.sx - hw/2 - 3, obj.sy - 76, hw+6, 14);
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
        ctx.fillText(hn, obj.sx, obj.sy - 65); ctx.textAlign = 'left';
      } else if (obj.type === 'paddockHorse') {
        drawHorse(ctx, obj.sx, obj.sy, obj.horse.color, 'down', this.time * 0.5, obj.horse.equipment);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = '10px sans-serif';
        const phn = obj.horse.name;
        const phw = ctx.measureText(phn).width;
        ctx.fillRect(obj.sx - phw/2 - 3, obj.sy - 76, phw+6, 14);
        ctx.fillStyle = '#90EE90'; ctx.textAlign = 'center';
        ctx.fillText(phn, obj.sx, obj.sy - 65); ctx.textAlign = 'left';
      } else if (obj.type === 'paddockGate') {
        // Koppel-Tor Schild
        ctx.fillStyle = '#5C3317';
        ctx.fillRect(obj.sx - 2, obj.sy - 38, 4, 28);
        ctx.fillRect(obj.sx + 28, obj.sy - 38, 4, 28);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obj.sx - 2, obj.sy - 38, 30, 6);
        ctx.fillRect(obj.sx - 2, obj.sy - 20, 30, 6);
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(obj.sx - 26, obj.sy - 50, 58, 16);
        ctx.fillStyle = '#3a1a00'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('🐴 KOPPEL', obj.sx + 14, obj.sy - 38);
        ctx.textAlign = 'left';
      } else if (obj.type === 'leadhorse') {
        drawHorse(ctx, obj.sx, obj.sy, p.leadHorse.color, p.leadHorse.dir, this.time, p.leadHorse.equipment);
      } else if (obj.type === 'sign') {
        // Tournament sign
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obj.sx - 2, obj.sy - 50, 4, 32);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(obj.sx - 26, obj.sy - 50, 54, 22);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TURNIER', obj.sx, obj.sy - 41);
        ctx.fillText('E: Starten', obj.sx, obj.sy - 31);
        ctx.textAlign = 'left';
      } else if (obj.type === 'shopSign') {
        ctx.fillStyle = '#5C3317';
        ctx.fillRect(obj.sx - 2, obj.sy - 48, 4, 34);
        ctx.fillStyle = '#F5DEB3';
        ctx.fillRect(obj.sx - 32, obj.sy - 48, 66, 20);
        ctx.fillStyle = '#3a1a00';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obj.label, obj.sx + 1, obj.sy - 34);
        ctx.fillText('Pferdeladen', obj.sx + 1, obj.sy - 24);
        ctx.textAlign = 'left';
      } else if (obj.type === 'trnCone') {
        const {cp, idx, sx, sy} = obj;
        const isNext = idx === Training.nextCheckpoint;
        const isDone = cp.done;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(sx, sy, 11, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = isDone ? '#44CC44' : isNext ? '#FF8800' : '#FFCC00';
        ctx.beginPath(); ctx.moveTo(sx, sy-28); ctx.lineTo(sx-10, sy); ctx.lineTo(sx+10, sy); ctx.closePath(); ctx.fill();
        if (!isDone) {
          ctx.fillStyle = 'rgba(255,255,255,0.65)';
          ctx.fillRect(sx-8, sy-17, 16, 4); ctx.fillRect(sx-6, sy-24, 12, 4);
          if (isNext) {
            ctx.strokeStyle = 'rgba(255,136,0,0.55)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(sx, sy, 46, 0, Math.PI*2); ctx.stroke();
          }
          ctx.fillStyle = '#222'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(idx+1, sx, sy-5); ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('✓', sx, sy-8); ctx.textAlign = 'left';
        }
      } else if (obj.type === 'trnJump') {
        const {sx, sy} = obj;
        const inRange = Training.jumpWindow && !Training.jumpDone;
        ctx.fillStyle = inRange ? '#FF3333' : '#AA1111';
        ctx.fillRect(sx-28, sy-36, 6, 36); ctx.fillRect(sx+22, sy-36, 6, 36);
        ctx.fillStyle = inRange ? '#FFFF00' : '#FF6600';
        ctx.fillRect(sx-28, sy-30, 56, 8);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx-28, sy-20, 56, 8);
        if (inRange) {
          ctx.fillStyle = 'rgba(255,255,0,0.22)';
          ctx.beginPath(); ctx.arc(sx, sy, 74, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('LEERTASTE! 🦘', sx, sy-46); ctx.textAlign = 'left';
        }
      } else if (obj.type === 'tournJump') {
        const {obs, isCurrent, sx, sy} = obj;
        const col = obs.cleared ? '#44CC44' : obs.missed ? '#FF4444' : isCurrent ? '#FF8800' : '#777';
        ctx.fillStyle = col;
        ctx.fillRect(sx-28, sy-38, 7, 38); ctx.fillRect(sx+21, sy-38, 7, 38);
        ctx.fillStyle = obs.cleared ? '#44CC44' : isCurrent ? '#FFFF00' : '#AAAAAA';
        ctx.fillRect(sx-28, sy-32, 56, 8);
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx-28, sy-22, 56, 8);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Tournament.obstacles.indexOf(obs)+1, sx, sy-44); ctx.textAlign = 'left';
        if (isCurrent && Tournament.jumpWindow && !obs.cleared) {
          ctx.fillStyle = 'rgba(255,255,0,0.22)';
          ctx.beginPath(); ctx.arc(sx, sy, 74, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('LEERTASTE! 🦘', sx, sy-50); ctx.textAlign = 'left';
        }
      } else if (obj.type === 'dressLetter') {
        const {dl, isCurrent, sx, sy} = obj;
        const isDone = dl.done;
        ctx.fillStyle = isDone ? '#44CC44' : isCurrent ? '#FFD700' : '#555';
        ctx.fillRect(sx-3, sy-46, 6, 46);
        ctx.fillStyle = isDone ? '#44CC44' : isCurrent ? '#FFD700' : '#777';
        ctx.fillRect(sx-18, sy-52, 36, 22);
        ctx.fillStyle = isDone ? '#fff' : isCurrent ? '#000' : '#ccc';
        ctx.font = `bold ${isCurrent?18:13}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(dl.label, sx, sy-35); ctx.textAlign = 'left';
        if (isCurrent && !isDone) {
          const pulse = 0.5 + 0.5*Math.sin(this.time*4);
          ctx.strokeStyle = `rgba(255,215,0,${0.55*pulse})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(sx, sy, 48+pulse*10, 0, Math.PI*2); ctx.stroke();
          const frac = Math.max(0, Tournament.dressageTimer/15);
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(sx-28, sy-68, 56, 8);
          ctx.fillStyle = frac>0.4?'#4A7C2F':'#FF6600'; ctx.fillRect(sx-28, sy-68, 56*frac, 8);
        }
      } else if (obj.type === 'trailCoin') {
        const {sx, sy} = obj;
        const pulse = 0.5 + 0.5*Math.sin(this.time*5 + sx*0.04);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(sx, sy-14, 9+pulse*2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#FFA500'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#8B4500'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('$', sx, sy-11); ctx.textAlign = 'left';
      } else if (obj.type === 'trailLog') {
        const {obs, sx, sy} = obj;
        if (!obs.cleared) {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(sx-32, sy-14, 64, 14);
          ctx.strokeStyle = '#6B3410'; ctx.lineWidth = 1.5;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx-30+i*16, sy-14); ctx.lineTo(sx-30+i*16, sy); ctx.stroke(); }
          if (TrailRide.jumpWindow && TrailRide.jumpWindowObs === obs) {
            ctx.fillStyle = 'rgba(255,255,0,0.22)';
            ctx.beginPath(); ctx.arc(sx, sy, 74, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#FFD700'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('LEERTASTE! 🦘', sx, sy-26); ctx.textAlign = 'left';
          }
        } else {
          ctx.fillStyle = 'rgba(68,204,68,0.7)'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('✓', sx, sy-8); ctx.textAlign = 'left';
        }
      } else if (obj.type === 'trailGoal') {
        const {sx, sy} = obj;
        ctx.fillStyle = '#FFD700'; ctx.fillRect(sx-3, sy-65, 6, 65);
        ctx.fillStyle = '#FF4444'; ctx.fillRect(sx, sy-65, 48, 28);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('ZIEL', sx+8, sy-45);
      }
    }

    // Vignette effect
    const vignette = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_H*0.3, CANVAS_W/2, CANVAS_H/2, CANVAS_H*0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Compass rose (top-right corner) — arrow points toward world-north
    { const cx2 = CANVAS_W - 30, cy2 = 30, r = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.arc(cx2, cy2, r + 3, 0, Math.PI*2); ctx.fill();
      // N arrow: world north is in the -camAngle direction on screen
      const na = -camAngle - Math.PI/2;
      ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(na);
      ctx.fillStyle = '#FF4444';
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(4, -4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('N', cx2 + Math.cos(na - Math.PI/2) * (r - 4), cy2 + Math.sin(na - Math.PI/2) * (r - 4) + 3);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '8px sans-serif';
      ctx.fillText('Scroll=Zoom  Q/R=Drehen', cx2, cy2 + r + 14);
      ctx.textAlign = 'left'; }
    // Version watermark
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('v' + VERSION, CANVAS_W - 6, CANVAS_H - 6);
    ctx.textAlign = 'left';

    // Mini-game HUD bar at top of canvas
    if (Training.active) {
      const done = Training.checkpoints.filter(c => c.done).length;
      const total = Training.checkpoints.length;
      const timer = Math.max(0, Training.phaseTimer).toFixed(1);
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, CANVAS_W, 44);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`Training: ${Training.phases[Training.phase]||''} | Punkte: ${Training.score} | Kegel: ${done}/${total} | Zeit: ${timer}s`, CANVAS_W/2, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(CANVAS_W/2-160, 26, 320, 9);
      ctx.fillStyle = '#4A7C2F'; ctx.fillRect(CANVAS_W/2-160, 26, 320*(done/Math.max(1,total)), 9);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
      ctx.fillText('ESC: Abbrechen', CANVAS_W-60, 18); ctx.textAlign = 'left';
    }
    if (TrailRide.active) {
      const remaining = Math.max(0, TrailRide.duration - TrailRide.elapsed).toFixed(1);
      ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, 36);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`Trail-Ausritt | Münzen: ${TrailRide.coinsCollected} | Zeit: ${remaining}s | Reite zum Ziel am Ende des Pfades!`, CANVAS_W/2, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
      ctx.fillText('ESC: Abbrechen', CANVAS_W-60, 22); ctx.textAlign = 'left';
    }
    if (Tournament.active) {
      ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, 36);
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      if (Tournament.type === 'jumping') {
        ctx.fillText(`Springturnier | Hindernis: ${Math.min(Tournament.jumpIdx+1, Tournament.obstacles.length)}/${Tournament.obstacles.length} | Strafpunkte: ${Tournament.faults} | LEERTASTE zum Springen!`, CANVAS_W/2, 22);
      } else {
        const tl = Math.max(0, Tournament.dressageTimer).toFixed(1);
        ctx.fillText(`Dressurturnier | Buchstabe ${Math.min(Tournament.dressagePhase+1,8)}/8 | Punkte: ${Tournament.dressageScore} | Zeit: ${tl}s`, CANVAS_W/2, 22);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
      ctx.fillText('ESC: Abbrechen', CANVAS_W-60, 22); ctx.textAlign = 'left';
    }

    this.updateMinimap();
  },

  _drawWalker(ctx, x, y, dir, t, outfit) {
    ctx.save();
    ctx.translate(x, y);

    let angle = dir==='left'?0.4:dir==='right'?-0.4:dir==='up'?0.2:-0.2;
    ctx.rotate(angle);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 4, 0, 0, Math.PI*2);
    ctx.fill();

    const walkAnim = Math.sin(t*6)*4;
    // Boots
    ctx.fillStyle = outfit.bootsColor || '#2c1810';
    ctx.fillRect(-7, -22+walkAnim, 5, 8);
    ctx.fillRect(3, -22-walkAnim, 5, 8);
    // Pants
    ctx.fillStyle = outfit.pantsColor || '#FFFFFF';
    ctx.fillRect(-7, -34, 15, 14);
    // Jacket
    ctx.fillStyle = outfit.jacketColor || '#1a3a5c';
    ctx.fillRect(-7, -47, 15, 15);
    // Arms
    const armAnim = Math.sin(t*6)*5;
    ctx.fillRect(-11, -47+armAnim, 4, 10);
    ctx.fillRect(8, -47-armAnim, 4, 10);
    // Head
    ctx.fillStyle = '#F5C5A0';
    ctx.beginPath(); ctx.arc(0, -54, 6, 0, Math.PI*2); ctx.fill();
    // Helmet
    ctx.fillStyle = outfit.helmetColor || '#1a1a1a';
    ctx.beginPath(); ctx.arc(0, -54, 6.5, Math.PI, 0); ctx.fill();
    ctx.fillRect(-7, -54, 14, 3);

    ctx.restore();
  }
};
