import { ISO_H } from './constants.js';
import { camAngle, camPitchH, camZoom, setCamAngle, setCamPitchH, setCamZoom } from './camera.js';
import { Game } from './game.js';

// ===== INPUT =====
export const Input = {
  keys: {},
  init() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) {
        this.keys[k] = true;
        this.onKeyDown(k, e);
      }
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()) ||
          ['w','a','s','d'].includes(k)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => {
      this.keys[e.key.toLowerCase()] = false;
    });
  },
  onKeyDown(k, e) {
    if (k==='e') Game.interact();
    if (k==='l') Game.toggleLead();
    if (k==='escape') {
      if (Training.active) { Training.finish(); UI.notify('Training abgebrochen.'); }
      else if (TrailRide.active) { TrailRide.finish(); UI.notify('Trail abgebrochen.'); }
      else if (Tournament.active) { Tournament.finish(); UI.notify('Turnier abgebrochen.'); }
      else UI.closePanel();
    }
    if (k==='tab') { e.preventDefault(); UI.toggleInventory(); }
    if (k===' ') Game.actionPress();
    if (k==='c') { setCamAngle(0); setCamPitchH(ISO_H * 5 / 12); setCamZoom(1.0); UI.notify('Kamera zurückgesetzt'); }
    if (k==='q') { setCamAngle(camAngle - Math.PI/2); }
    if (k==='r') { setCamAngle(camAngle + Math.PI/2); }
  },
  isDown(k) { return !!this.keys[k]; }
};
