import { BREEDS, EQUIPMENT_ITEMS } from './data/breeds.js';
import { Horse } from './entities/horse.js';
import { Game } from './game.js';
import { Economy } from './economy.js';

// ===== UI =====
export const UI = {
  panelType: null,

  init() {
    document.getElementById('panelClose').onclick = () => this.closePanel();
    this.updateMoney();
  },
  updateMoney() {
    document.getElementById('moneyAmt').textContent = Game.player.money;
  },
  notify(msg) {
    const div = document.createElement('div');
    div.className='notification';
    div.textContent=msg;
    document.getElementById('notifications').appendChild(div);
    setTimeout(()=>div.remove(), 2100);
  },
  showPrompt(msg) {
    const p=document.getElementById('interactPrompt');
    p.textContent=msg;
    p.style.display='block';
  },
  hidePrompt() {
    document.getElementById('interactPrompt').style.display='none';
  },
  showPanel(title, html) {
    document.getElementById('panelTitle').textContent=title;
    document.getElementById('panelContent').innerHTML=html;
    document.getElementById('panel').style.display='block';
  },
  closePanel() {
    document.getElementById('panel').style.display='none';
    this.panelType=null;
  },
  toggleInventory() {
    if (document.getElementById('panel').style.display==='block' && this.panelType==='inventory') {
      this.closePanel();
    } else {
      this.showInventory();
    }
  },
  showInventory() {
    this.panelType='inventory';
    const p=Game.player;
    let html=`<div class="inventory-tabs">
      <div class="inv-tab active" onclick="UI.switchInvTab('horses',this)">Pferde</div>
      <div class="inv-tab" onclick="UI.switchInvTab('equipment',this)">Ausrüstung</div>
      <div class="inv-tab" onclick="UI.switchInvTab('outfit',this)">Outfit</div>
    </div>`;

    // Horses tab
    html+=`<div class="inv-content active" id="inv-horses">`;
    if (p.horses.length===0) html+=`<p style="color:#888">Keine Pferde</p>`;
    for (let i=0;i<p.horses.length;i++) {
      const h=p.horses[i];
      const isActive=p.activeHorse===h;
      html+=`<div class="shop-item">
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${h.color}"></div>
            <span class="item-name">${h.name} (${h.breed})</span>
          </div>
          <div class="horse-stat">⚡${h.speed.toFixed(1)} 💪${h.stamina.toFixed(1)} 🦘${h.jump.toFixed(1)} 🎭${h.dressage.toFixed(1)} 💖${h.happiness}%</div>
        </div>
        <button class="btn ${isActive?'btn-action':'btn-equip'}" onclick="Game.setActiveHorse(${i});UI.showInventory()">
          ${isActive?'Absteigen':'Aufsteigen'}
        </button>
      </div>`;
    }
    html+=`</div>`;

    // Equipment tab
    html+=`<div class="inv-content" id="inv-equipment">`;
    if (p.inventory.saddles.length===0&&p.inventory.bridles.length===0&&p.inventory.blankets.length===0) {
      html+=`<p style="color:#888">Keine Ausrüstung</p>`;
    }
    const renderInvItems=(items,type)=>{
      for (const item of items) {
        const h=p.activeHorse;
        const equipped=h&&h.equipment[type]===item;
        html+=`<div class="shop-item">
          <div><div class="item-name">${item.name}</div></div>
          <button class="btn ${equipped?'btn-action':'btn-equip'}" onclick="Game.equipItem('${type}','${item.name}');UI.showInventory()">
            ${equipped?'Ablegen':'Anlegen'}
          </button>
        </div>`;
      }
    };
    if (p.inventory.saddles.length>0){html+=`<h3 style="color:#90EE90;margin:8px 0 4px">Sättel</h3>`;renderInvItems(p.inventory.saddles,'saddle');}
    if (p.inventory.bridles.length>0){html+=`<h3 style="color:#90EE90;margin:8px 0 4px">Zäume</h3>`;renderInvItems(p.inventory.bridles,'bridle');}
    if (p.inventory.blankets.length>0){html+=`<h3 style="color:#90EE90;margin:8px 0 4px">Decken</h3>`;renderInvItems(p.inventory.blankets,'blanket');}
    html+=`</div>`;

    // Outfit tab
    const helmetColors=['#1a1a1a','#2244AA','#AA2222','#228822','#884488','#FFD700'];
    const jacketColors=['#1a3a5c','#3a1a1a','#1a3a1a','#3a1a3a','#1a1a3a','#5c3a1a'];
    const pantsColors=['#FFFFFF','#F5F5DC','#C0C0C0','#000000','#F0E68C','#1a1a6a'];
    const bootsColors=['#2c1810','#1a1a1a','#4a3020','#8B4513','#2a1a30','#000000'];
    html+=`<div class="inv-content" id="inv-outfit">
      <h3 style="color:#90EE90;margin-bottom:6px">Helm</h3>
      <div class="color-picker-row">${helmetColors.map(c=>`<div class="color-swatch ${Game.player.outfit.helmetColor===c?'selected':''}" style="background:${c}" onclick="Game.setOutfitColor('helmetColor','${c}');UI.showInventory()"></div>`).join('')}</div>
      <h3 style="color:#90EE90;margin:10px 0 6px">Jacke</h3>
      <div class="color-picker-row">${jacketColors.map(c=>`<div class="color-swatch ${Game.player.outfit.jacketColor===c?'selected':''}" style="background:${c}" onclick="Game.setOutfitColor('jacketColor','${c}');UI.showInventory()"></div>`).join('')}</div>
      <h3 style="color:#90EE90;margin:10px 0 6px">Hose</h3>
      <div class="color-picker-row">${pantsColors.map(c=>`<div class="color-swatch ${Game.player.outfit.pantsColor===c?'selected':''}" style="background:${c}" onclick="Game.setOutfitColor('pantsColor','${c}');UI.showInventory()"></div>`).join('')}</div>
      <h3 style="color:#90EE90;margin:10px 0 6px">Stiefel</h3>
      <div class="color-picker-row">${bootsColors.map(c=>`<div class="color-swatch ${Game.player.outfit.bootsColor===c?'selected':''}" style="background:${c}" onclick="Game.setOutfitColor('bootsColor','${c}');UI.showInventory()"></div>`).join('')}</div>
    </div>`;

    this.showPanel('Inventar (TAB)', html);
  },
  switchInvTab(name, el) {
    document.querySelectorAll('.inv-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.inv-content').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const content=document.getElementById('inv-'+name);
    if(content)content.classList.add('active');
  },
  showHorseMenu(horse, idx, cx, cy) {
    const p = Game.player;
    const isMounted  = p.activeHorse === horse;
    const isLeading  = p.leadHorse   === horse;
    const mountBtn  = isMounted
      ? `<button onclick="Game.setActiveHorse(${idx});UI.hideHorseMenu()">🚶 Absteigen</button>`
      : `<button onclick="Game.setActiveHorse(${idx});UI.hideHorseMenu()">🐎 Aufsteigen</button>`;
    const leadBtn = !isMounted
      ? (isLeading
          ? `<button onclick="Game.setLeadHorse(${idx});UI.hideHorseMenu()">🔓 Führstrick lösen</button>`
          : `<button onclick="Game.setLeadHorse(${idx});UI.hideHorseMenu()">🔗 Aufhalftern / Führen</button>`)
      : '';
    const menu = document.getElementById('horseMenu');
    menu.innerHTML = `<div class="hm-title">${horse.name}</div>${mountBtn}${leadBtn}`;
    menu.style.display = 'block';
    const mw = 160, mh = menu.children.length * 34 + 30;
    menu.style.left = `${Math.min(cx + 6, 900 - mw - 4)}px`;
    menu.style.top  = `${Math.min(cy - 12, 600 - mh - 4)}px`;
  },
  hideHorseMenu() {
    document.getElementById('horseMenu').style.display = 'none';
  },

  showShop() {
    this.panelType = 'shop';
    const p = Game.player;

    // Pferde-Karten
    let horsesHtml = '';
    BREEDS.forEach((b,i) => {
      const owned = p.horses.some(h => h.breed === b.name);
      const can = p.money >= b.cost;
      horsesHtml += '<div class="horse-shop-box">' +
        '<canvas id="shopHorse' + i + '" width="90" height="68" style="display:block;margin:0 auto;border-radius:5px;background:rgba(0,0,0,0.35)"></canvas>' +
        '<div style="font-weight:bold;font-size:12px;color:#FFD700;margin-top:5px">' + b.name + '</div>' +
        '<div style="font-size:10px;color:#aaa;margin:2px 0">⚡' + b.speed + ' 💪' + b.stamina + ' 🦘' + b.jump + ' 🎭' + b.dressage + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">' +
        '<span style="color:#FFD700;font-size:12px">' + b.cost + '💰</span>' +
        '<button class="btn ' + (owned ? 'btn-equip' : 'btn-buy') + '" onclick="Game.buyHorse(' + i + ')" ' + (owned || !can ? 'disabled' : '') + ' style="font-size:10px;padding:3px 9px">' + (owned ? '✓ Besitz' : 'Kaufen') + '</button>' +
        '</div></div>';
    });

    let html = '<div style="text-align:center;margin-bottom:12px;padding:8px;background:rgba(255,215,0,0.08);border-radius:6px;color:#ddd;font-size:13px;font-style:italic;">💬 &quot;Guten Tag! Ich helfe Ihnen gerne weiter.&quot;</div>' +
      '<div class="inventory-tabs" id="shopTabs">' +
      '<div class="inv-tab active" onclick="UI.switchShopTab(\'horses\',this)">🐴 Pferde</div>' +
      '<div class="inv-tab" onclick="UI.switchShopTab(\'saddles\',this)">🎠 Sättel</div>' +
      '<div class="inv-tab" onclick="UI.switchShopTab(\'bridles\',this)">🎯 Zäume</div>' +
      '<div class="inv-tab" onclick="UI.switchShopTab(\'blankets\',this)">🛡️ Decken</div>' +
      '</div>' +
      '<div id="shop-tab-horses" class="inv-content active">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px;">' + horsesHtml + '</div></div>';

    const icons = {saddles:'🎠', bridles:'🎯', blankets:'🛡️'};
    ['saddles','bridles','blankets'].forEach(cat => {
      let itemsHtml = '';
      EQUIPMENT_ITEMS[cat].forEach(item => {
        const can = p.money >= item.cost;
        itemsHtml += '<div class="horse-shop-box">' +
          '<div style="width:90px;height:68px;margin:0 auto;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(0,0,0,0.35)">' +
          '<div style="text-align:center"><div style="font-size:24px">' + icons[cat] + '</div>' +
          '<div style="width:50px;height:12px;background:' + item.color + ';border-radius:3px;margin:6px auto 0;box-shadow:0 2px 5px rgba(0,0,0,0.5)"></div></div></div>' +
          '<div style="font-weight:bold;font-size:12px;color:#FFD700;margin-top:5px">' + item.name + '</div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">' +
          '<span style="color:#FFD700;font-size:12px">' + item.cost + '💰</span>' +
          '<button class="btn btn-buy" onclick="Game.buyEquip(\'' + cat + '\',\'' + item.name + '\')" ' + (!can ? 'disabled' : '') + ' style="font-size:10px;padding:3px 9px">Kaufen</button>' +
          '</div></div>';
      });
      html += '<div id="shop-tab-' + cat + '" class="inv-content">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:2px;">' + itemsHtml + '</div></div>';
    });

    this.showPanel('🏪 Pferdeladen', html);
    requestAnimationFrame(() => this._renderShopHorseCanvases());
  },

  switchShopTab(name, el) {
    document.querySelectorAll('#shopTabs .inv-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('#panel .inv-content').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    const content=document.getElementById('shop-tab-'+name);
    if(content) content.classList.add('active');
    if(name==='horses') requestAnimationFrame(()=>this._renderShopHorseCanvases());
  },

  _renderShopHorseCanvases() {
    for(let i=0;i<BREEDS.length;i++){
      const c=document.getElementById('shopHorse'+i);
      if(!c) continue;
      const ctx=c.getContext('2d');
      ctx.clearRect(0,0,90,68);
      drawHorse(ctx,38,60,BREEDS[i].color,'right',0.6,{},0.82);
    }
  },
  showStallMenu(stallId) {
    const p=Game.player;
    const horse=p.activeHorse||p.horses[stallId];
    let html=`<div style="text-align:center">`;
    if (horse) {
      html+=`<div style="margin-bottom:12px;color:#FFD700;font-size:16px">${horse.name}</div>
      <div class="horse-stat" style="margin-bottom:12px">Energie: ${horse.energy.toFixed(0)}% | Glück: ${horse.happiness.toFixed(0)}%</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="Game.feedHorse(${p.horses.indexOf(horse)});UI.closePanel()">🥕 Füttern (+10💰)</button>
        <button class="btn btn-equip" onclick="Game.groomHorse(${p.horses.indexOf(horse)});UI.closePanel()">✂️ Pflegen (+15💰)</button>
      </div>`;
    } else {
      html+=`<p style="color:#888">Dieser Stand ist leer.</p>
      <p style="color:#aaa;margin-top:8px;font-size:13px">Kaufe ein Pferd im Shop!</p>`;
    }
    html+=`</div>`;
    this.showPanel('Stallmanagement', html);
  },
  updateStatus(msg) {
    document.getElementById('statusBar').textContent=msg;
  }
};
