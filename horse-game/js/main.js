import { Game } from './game.js';
import { UI } from './ui.js';
import { Economy } from './economy.js';
import { Training } from './systems/training.js';
import { TrailRide } from './systems/trail.js';
import { Tournament } from './systems/tournament.js';
import { Input } from './input.js';
import { VERSION } from './constants.js';

window.Game = Game;
window.UI = UI;
window.Economy = Economy;
window.Training = Training;
window.TrailRide = TrailRide;
window.Tournament = Tournament;

window.addEventListener('load', () => {
  const vd = document.getElementById('versionDisplay');
  if (vd) vd.textContent = 'v' + VERSION;
  Game.init();
});
