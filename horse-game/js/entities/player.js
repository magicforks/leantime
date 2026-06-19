import { TILE } from '../constants.js';
import { Horse } from './horse.js';

// ===== PLAYER =====
export class Player {
  constructor() {
    this.x = 37*TILE+24;
    this.y = 16*TILE+24;
    this.dir = 'down';
    this.money = 500;
    this.horses = [];
    this.activeHorse = null;
    this.equipment = { saddle: null, bridle: null, blanket: null };
    this.inventory = { saddles:[], bridles:[], blankets:[] };
    this.outfit = { helmet:'basic', jacket:'basic', pants:'basic', boots:'basic',
      helmetColor:'#1a1a1a', jacketColor:'#1a3a5c', pantsColor:'#FFFFFF', bootsColor:'#2c1810' };
    this.leadHorse = null;
    this.speed = 150;
    this.animT = 0;
    this.moving = false;
  }
  getEquipForDraw() {
    const h = this.activeHorse;
    if (!h) return this.equipment;
    return h.equipment;
  }
  tileR() { return Math.floor(this.y/TILE); }
  tileC() { return Math.floor(this.x/TILE); }
}
