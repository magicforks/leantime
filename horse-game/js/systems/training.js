import { TILE, CANVAS_W, CANVAS_H } from '../constants.js';
import { Game } from '../game.js';
import { UI } from '../ui.js';

// ===== TRAINING (WORLD-BASED) =====
export const Training = {
  active: false,
  phase: 0,
  phases: ['Schritt','Trab','Galopp','Sprung'],
  score: 0,
  checkpoints: [],
  nextCheckpoint: 0,
  phaseTimer: 0,
  jumpObstacleX: 0,
  jumpObstacleY: 0,
  jumpDone: false,
  jumpWindow: false,
  _t: 0,

  start() {
    if (!Game.player.activeHorse) { UI.notify('Du brauchst ein Pferd!'); return; }
    this.active = true;
    this.phase = 0;
    this.score = 0;
    this._t = 0;
    UI.hidePrompt();
    this._setupPhase();
    UI.notify('Training gestartet! Reite durch die Markierungen!');
  },

  _setupPhase() {
    this.nextCheckpoint = 0;
    this.jumpWindow = false;
    // Arena: rows 23-36, cols 6-24 (fence at rows 22,37 cols 5,25)
    if (this.phase === 0) {
      this.checkpoints = [
        {x:10*TILE, y:25*TILE, done:false},
        {x:20*TILE, y:25*TILE, done:false},
        {x:20*TILE, y:34*TILE, done:false},
        {x:10*TILE, y:34*TILE, done:false},
      ];
      this.phaseTimer = 60;
    } else if (this.phase === 1) {
      this.checkpoints = [
        {x:9*TILE,  y:24*TILE, done:false},
        {x:21*TILE, y:24*TILE, done:false},
        {x:21*TILE, y:35*TILE, done:false},
        {x:9*TILE,  y:35*TILE, done:false},
        {x:15*TILE, y:29*TILE, done:false},
      ];
      this.phaseTimer = 45;
    } else if (this.phase === 2) {
      this.checkpoints = [
        {x:9*TILE,  y:24*TILE, done:false},
        {x:21*TILE, y:35*TILE, done:false},
        {x:9*TILE,  y:35*TILE, done:false},
        {x:21*TILE, y:24*TILE, done:false},
      ];
      this.phaseTimer = 30;
    } else if (this.phase === 3) {
      this.jumpDone = false;
      this.jumpObstacleX = 15*TILE;
      this.jumpObstacleY = 29*TILE;
      this.checkpoints = [
        {x:8*TILE,  y:29*TILE, done:false},
        {x:22*TILE, y:29*TILE, done:false},
      ];
      this.phaseTimer = 30;
    }
    const hints = ['Reite durch alle orangen Kegel!','Trab! Reite durch alle Kegel!','Galopp! Sprint durch alle Kegel!','Springe über das rote Hindernis! (LEERTASTE)'];
    UI.notify(this.phases[this.phase] + ' — ' + hints[this.phase]);
  },

  update(dt) {
    if (!this.active) return;
    this._t += dt;
    this.phaseTimer -= dt;
    const p = Game.player;
    if (this.nextCheckpoint < this.checkpoints.length) {
      const cp = this.checkpoints[this.nextCheckpoint];
      const dx = p.x - cp.x, dy = p.y - cp.y;
      if (Math.sqrt(dx*dx+dy*dy) < 52) {
        cp.done = true;
        this.score += 10;
        this.nextCheckpoint++;
        if (this.nextCheckpoint >= this.checkpoints.length && (this.phase !== 3 || this.jumpDone)) {
          this._advancePhase(); return;
        }
      }
    }
    if (this.phase === 3 && !this.jumpDone) {
      const dx = p.x - this.jumpObstacleX, dy = p.y - this.jumpObstacleY;
      this.jumpWindow = Math.sqrt(dx*dx+dy*dy) < 80;
    } else { this.jumpWindow = false; }
    if (this.phaseTimer <= 0) {
      UI.notify('Zeit abgelaufen für ' + this.phases[this.phase]);
      this._advancePhase();
    }
  },

  _advancePhase() {
    this.score += 25;
    this.phase++;
    if (this.phase >= this.phases.length) { this.finish(); return; }
    this._setupPhase();
  },

  actionPress() {
    if (!this.active || this.phase !== 3 || !this.jumpWindow || this.jumpDone) return;
    this.jumpDone = true;
    this.score += 30;
    UI.notify('Perfekter Sprung! 🏆');
    this.checkpoints.forEach(c => c.done = true);
    this.nextCheckpoint = this.checkpoints.length;
    this._advancePhase();
  },

  finish() {
    if (!this.active) return;
    this.active = false;
    const earned = 20 + Math.floor(this.score / 2);
    Economy.earn(earned, 'Training abgeschlossen!');
    const horse = Game.player.activeHorse;
    if (horse) {
      horse.speed = Math.min(10, horse.speed + 0.1);
      horse.stamina = Math.min(10, horse.stamina + 0.1);
      horse.happiness = Math.min(100, horse.happiness + 10);
    }
    UI.notify(`Training beendet! ${this.score} Punkte | +${earned} Münzen | Pferd verbessert!`);
  },
};
