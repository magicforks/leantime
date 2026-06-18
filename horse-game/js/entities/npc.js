import { TILE, WORLD_W, WORLD_H } from '../constants.js';
import { Horse } from './horse.js';

// ===== NPC =====
export class NPC {
  constructor(name, horseColor, startR, startC) {
    this.name = name;
    this.x = startC*TILE+24;
    this.y = startR*TILE+24;
    this.dir = 'down';
    this.horse = new Horse(Math.floor(Math.random()*10), name+"s Pferd");
    this.horse.color = horseColor;
    this.animT = 0;
    this.moving = false;
    this.wanderTimer = Math.random()*3;
    this.wanderDir = null;
    this.wanderDuration = 0;
    this.speed = 60;
  }
  update(dt, world) {
    this.animT += dt;
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      const dirs = ['up','down','left','right',null,null];
      this.wanderDir = dirs[Math.floor(Math.random()*dirs.length)];
      this.wanderDuration = 0.5 + Math.random()*1.5;
      this.wanderTimer = this.wanderDuration + Math.random()*2;
    }
    if (this.wanderDir) {
      const speed = this.speed;
      let nx=this.x, ny=this.y;
      if (this.wanderDir==='up') { ny-=speed*dt; this.dir='up'; }
      else if (this.wanderDir==='down') { ny+=speed*dt; this.dir='down'; }
      else if (this.wanderDir==='left') { nx-=speed*dt; this.dir='left'; }
      else if (this.wanderDir==='right') { nx+=speed*dt; this.dir='right'; }
      if (!this._collides(nx, this.y, world)) this.x=nx;
      if (!this._collides(this.x, ny, world)) this.y=ny;
      this.x=Math.max(TILE,Math.min((WORLD_W-2)*TILE,this.x));
      this.y=Math.max(TILE,Math.min((WORLD_H-2)*TILE,this.y));
      this.moving = true;
    } else { this.moving = false; }
  }
  _collides(px, py, world) {
    const hw=8;
    const corners = [[px-hw,py-hw],[px+hw,py-hw],[px-hw,py+hw],[px+hw,py+hw]];
    for (const [cx,cy] of corners) {
      const r=Math.floor(cy/TILE), c=Math.floor(cx/TILE);
      if (world.isSolid(r,c)) return true;
    }
    return false;
  }
}
