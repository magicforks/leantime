import { TILE } from '../constants.js';
import { Game } from '../game.js';
import { UI } from '../ui.js';

// ===== TRAIL RIDE (WORLD-BASED) =====
export const TrailRide = {
  active: false,
  _t: 0,
  elapsed: 0,
  duration: 90,
  coins: [],
  obstacles: [],
  coinsCollected: 0,
  jumpWindow: false,
  jumpWindowObs: null,

  start() {
    if (!Game.player.activeHorse) { UI.notify('Du brauchst ein Pferd!'); return; }
    this.active = true;
    this._t = 0;
    this.elapsed = 0;
    this.coinsCollected = 0;
    this.jumpWindow = false;
    this.jumpWindowObs = null;
    UI.hidePrompt();
    // Trail: rows 37-69, cols 32-38
    this.coins = [];
    const coinRows = [42, 46, 50, 53, 56, 59, 62, 65];
    const coinCols = [35, 33, 36, 34, 37, 33, 35, 36];
    for (let i = 0; i < coinRows.length; i++) {
      this.coins.push({x: coinCols[i]*TILE+12, y: coinRows[i]*TILE+12, collected: false});
    }
    this.obstacles = [
      {x:35*TILE+12, y:48*TILE+12, cleared:false, _wasClose:false},
      {x:34*TILE+12, y:57*TILE+12, cleared:false, _wasClose:false},
      {x:36*TILE+12, y:63*TILE+12, cleared:false, _wasClose:false},
    ];
    UI.notify('Trail-Ausritt! Reite zum Ziel am Ende des Pfades! LEERTASTE = Springen!');
  },

  update(dt) {
    if (!this.active) return;
    this._t += dt;
    this.elapsed += dt;
    const p = Game.player;
    for (const c of this.coins) {
      if (!c.collected) {
        const dx = p.x-c.x, dy = p.y-c.y;
        if (Math.sqrt(dx*dx+dy*dy) < 44) { c.collected = true; this.coinsCollected++; UI.notify('Münze! 💰'); }
      }
    }
    this.jumpWindow = false;
    this.jumpWindowObs = null;
    for (const obs of this.obstacles) {
      if (!obs.cleared) {
        const dx = p.x-obs.x, dy = p.y-obs.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 80) { this.jumpWindow = true; this.jumpWindowObs = obs; }
        if (obs._wasClose && dist > 160) obs.cleared = true;
        if (dist < 100) obs._wasClose = true;
      }
    }
    if (p.y > 68*TILE) this.finish();
    if (this.elapsed >= this.duration) this.finish();
  },

  actionPress() {
    if (!this.active || !this.jumpWindow || !this.jumpWindowObs) return;
    const obs = this.jumpWindowObs;
    if (!obs.cleared) {
      obs.cleared = true;
      this.coinsCollected += 2;
      UI.notify('Sprung! 🦘 +2 Münzen Bonus!');
      this.jumpWindow = false;
      this.jumpWindowObs = null;
    }
  },

  finish() {
    if (!this.active) return;
    this.active = false;
    const earned = 30 + this.coinsCollected * 5;
    Economy.earn(earned, 'Trail-Ausritt abgeschlossen!');
    UI.notify(`Trail beendet! ${this.coinsCollected} Münzen | +${earned} 💰`);
    if (Game.player.activeHorse) {
      Game.player.activeHorse.happiness = Math.min(100, Game.player.activeHorse.happiness + 15);
      Game.player.activeHorse.energy = Math.max(0, Game.player.activeHorse.energy - 20);
    }
  }
};
