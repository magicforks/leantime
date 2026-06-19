import { TILE, CANVAS_W, CANVAS_H } from '../constants.js';
import { Game } from '../game.js';
import { UI } from '../ui.js';

// ===== TOURNAMENT (WORLD-BASED) =====
export const Tournament = {
  active: false,
  type: null,
  _t: 0,
  elapsed: 0,
  // Jumping
  obstacles: [],
  jumpIdx: 0,
  faults: 0,
  jumpWindow: false,
  // Dressage
  dressageLetters: [],
  dressagePhase: 0,
  dressageScore: 0,
  dressageTimer: 0,

  showSelection() {
    if (!Game.player.activeHorse) { UI.notify('Du brauchst ein Pferd!'); return; }
    UI.showPanel('Turnier wählen', `
      <div style="display:flex;gap:16px;justify-content:center;margin-top:16px;">
        <button class="btn btn-primary" style="font-size:16px;padding:14px 28px" onclick="Tournament.start('jumping')">🏇 Springen</button>
        <button class="btn btn-primary" style="font-size:16px;padding:14px 28px" onclick="Tournament.start('dressage')">🎭 Dressur</button>
      </div>
    `);
  },

  start(type) {
    UI.closePanel();
    this.active = true;
    this.type = type;
    this._t = 0;
    this.elapsed = 0;
    UI.hidePrompt();
    if (type === 'jumping') {
      this.faults = 0;
      this.jumpIdx = 0;
      this.jumpWindow = false;
      // Jump obstacles inside arena (rows 23-36, cols 6-24)
      this.obstacles = [
        {x:15*TILE, y:24*TILE, cleared:false, missed:false, _wasClose:false},
        {x:21*TILE, y:28*TILE, cleared:false, missed:false, _wasClose:false},
        {x:15*TILE, y:32*TILE, cleared:false, missed:false, _wasClose:false},
        {x:9*TILE,  y:28*TILE, cleared:false, missed:false, _wasClose:false},
        {x:20*TILE, y:24*TILE, cleared:false, missed:false, _wasClose:false},
        {x:10*TILE, y:35*TILE, cleared:false, missed:false, _wasClose:false},
      ];
      UI.notify('Springturnier! Reite zu den Hindernissen und drücke LEERTASTE!');
    } else {
      this.dressagePhase = 0;
      this.dressageScore = 0;
      this.dressageTimer = 15;
      // Dressage letter markers around the arena perimeter (inside fence)
      this.dressageLetters = [
        {label:'A', x:15*TILE, y:36*TILE, done:false},
        {label:'K', x:8*TILE,  y:35*TILE, done:false},
        {label:'E', x:7*TILE,  y:29*TILE, done:false},
        {label:'H', x:8*TILE,  y:24*TILE, done:false},
        {label:'C', x:15*TILE, y:23*TILE, done:false},
        {label:'M', x:22*TILE, y:24*TILE, done:false},
        {label:'B', x:23*TILE, y:29*TILE, done:false},
        {label:'F', x:22*TILE, y:35*TILE, done:false},
      ];
      UI.notify('Dressurturnier! Reite zu den leuchtenden Buchstaben!');
    }
  },

  update(dt) {
    if (!this.active) return;
    this._t += dt;
    this.elapsed += dt;
    if (this.type === 'jumping') this._updateJumping();
    else this._updateDressage(dt);
  },

  _updateJumping() {
    if (this.jumpIdx >= this.obstacles.length) { this.finish(); return; }
    const p = Game.player;
    const obs = this.obstacles[this.jumpIdx];
    const dx = p.x - obs.x, dy = p.y - obs.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    this.jumpWindow = dist < 80;
    if (dist < 110) obs._wasClose = true;
    if (obs._wasClose && dist > 160 && !obs.cleared && !obs.missed) {
      obs.missed = true;
      this.faults += 4;
      this.jumpWindow = false;
      UI.notify('Hindernis verpasst! +4 Strafpunkte');
      this.jumpIdx++;
    }
  },

  actionPress() {
    if (!this.active || this.type !== 'jumping') return;
    if (this.jumpWindow && this.jumpIdx < this.obstacles.length) {
      const obs = this.obstacles[this.jumpIdx];
      if (!obs.cleared && !obs.missed) {
        obs.cleared = true;
        this.jumpWindow = false;
        UI.notify('Perfekter Sprung! ✓');
        this.jumpIdx++;
        if (this.jumpIdx >= this.obstacles.length) this.finish();
      }
    }
  },

  _updateDressage(dt) {
    if (this.dressagePhase >= this.dressageLetters.length) { this.finish(); return; }
    this.dressageTimer -= dt;
    const p = Game.player;
    const letter = this.dressageLetters[this.dressagePhase];
    const dx = p.x - letter.x, dy = p.y - letter.y;
    if (Math.sqrt(dx*dx + dy*dy) < 65) {
      const pts = Math.max(5, Math.floor(this.dressageTimer / 15 * 20) + 5);
      this.dressageScore += pts;
      letter.done = true;
      UI.notify(`${letter.label}! +${pts} Punkte`);
      this.dressagePhase++;
      this.dressageTimer = 15;
      if (this.dressagePhase >= this.dressageLetters.length) { this.finish(); return; }
    } else if (this.dressageTimer <= 0) {
      UI.notify(`${letter.label} verpasst!`);
      this.dressagePhase++;
      this.dressageTimer = 15;
      if (this.dressagePhase >= this.dressageLetters.length) { this.finish(); return; }
    }
  },

  finish() {
    if (!this.active) return;
    this.active = false;
    let placement, earned;
    if (this.type === 'jumping') {
      const perf = Math.max(0, 100 - this.faults * 5);
      placement = perf >= 80 ? 1 : perf >= 50 ? 2 : 3;
    } else {
      const maxScore = 8 * 25;
      placement = this.dressageScore >= maxScore * 0.8 ? 1 : this.dressageScore >= maxScore * 0.5 ? 2 : 3;
    }
    earned = placement === 1 ? 200 : placement === 2 ? 100 : 50;
    Economy.earn(earned, 'Turnier abgeschlossen!');
    const medals = ['🥇','🥈','🥉'];
    UI.showPanel('Turnierergebnis', `
      <div style="text-align:center;padding:20px">
        <div style="font-size:60px">${medals[placement-1]}</div>
        <div style="font-size:22px;color:#FFD700;margin:12px 0">${placement}. Platz!</div>
        <div style="color:#90EE90;font-size:18px">+${earned} Münzen</div>
        ${this.type==='jumping' ? `<div style="color:#aaa;margin-top:8px">Strafpunkte: ${this.faults}</div>` : `<div style="color:#aaa;margin-top:8px">Punkte: ${this.dressageScore}</div>`}
        <button class="btn btn-primary" style="margin-top:16px;padding:10px 24px" onclick="UI.closePanel()">Schließen</button>
      </div>
    `);
  }
};
