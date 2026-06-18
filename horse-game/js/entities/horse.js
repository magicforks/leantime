import { TILE } from '../constants.js';
import { BREEDS } from '../data/breeds.js';

// ===== HORSE CLASS =====
export class Horse {
  constructor(breedIdx, name) {
    const b = BREEDS[breedIdx];
    this.breed = b.name;
    this.name = name || b.name;
    this.color = b.color;
    this.speed = b.speed;
    this.stamina = b.stamina;
    this.jump = b.jump;
    this.dressage = b.dressage;
    this.happiness = 80;
    this.energy = 100;
    this.equipment = { saddle: null, bridle: null, blanket: null };
    this.x = 0; this.y = 0;
    this.dir = 'down';
    this.animT = 0;
  }
}
