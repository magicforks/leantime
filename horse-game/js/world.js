import { T, SOLID, WORLD_W, WORLD_H, TILE } from './constants.js';

export class World {
  constructor() {
    this.tiles = [];
    this.time = 0;
    this.generate();
  }
  generate() {
    // Fill with grass
    for (let r = 0; r < WORLD_H; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < WORLD_W; c++) {
        this.tiles[r][c] = T.GRASS;
      }
    }
    this._addFlowers();
    this._addStable();
    this._addArena();
    this._addPaddocks();
    this._addTrail();
    this._addPond();
    this._addTrees();
    this._addPaths();
    this._addShop();
  }
  set(r,c,t) { if(r>=0&&r<WORLD_H&&c>=0&&c<WORLD_W) this.tiles[r][c]=t; }
  get(r,c) { if(r<0||r>=WORLD_H||c<0||c>=WORLD_W) return T.WALL; return this.tiles[r][c]; }
  isSolid(r,c) { return SOLID.has(this.get(r,c)); }

  _addFlowers() {
    const positions = [
      [3,10],[3,15],[4,8],[4,22],[5,3],[7,50],[8,55],[9,60],[2,62],[3,65],
      [10,2],[12,4],[14,7],[15,3],[2,20],[4,25],[6,28],[1,35],[2,40],[3,45],
      [18,50],[19,55],[20,60],[21,65],[22,50],[23,55],[1,5],[1,8],[1,12]
    ];
    for (const [r,c] of positions) this.set(r,c,T.FLOWER);
  }
  _addStable() {
    // Stable: rows 5-15, cols 30-45
    for (let r=5; r<=15; r++) for (let c=30; c<=45; c++) {
      if (r===5||r===15) { this.set(r,c,T.WALL); }
      else if (c===30||c===45) { this.set(r,c,T.WALL); }
      else { this.set(r,c,T.STABLE_FLOOR); }
    }
    // Door gap south wall cols 37-38
    this.set(15,37,T.STABLE_FLOOR);
    this.set(15,38,T.STABLE_FLOOR);
    // Stalls: 3 left, 3 right, corridor middle (cols 37-38)
    const stallRows = [6,8,10];
    for (const sr of stallRows) {
      // Left stalls cols 31-35
      for (let r=sr; r<=sr+1; r++) for (let c=31; c<=35; c++) this.set(r,c,T.STALL);
      this.set(sr+2,31,T.WALL); this.set(sr+2,32,T.WALL); this.set(sr+2,33,T.WALL);
      this.set(sr+2,34,T.WALL); this.set(sr+2,35,T.WALL);
      // Right stalls cols 40-44
      for (let r=sr; r<=sr+1; r++) for (let c=40; c<=44; c++) this.set(r,c,T.STALL);
      this.set(sr+2,40,T.WALL); this.set(sr+2,41,T.WALL); this.set(sr+2,42,T.WALL);
      this.set(sr+2,43,T.WALL); this.set(sr+2,44,T.WALL);
    }
    // Shop/notice area top of stable
    for (let c=32; c<=43; c++) this.set(5,c,T.WALL);
    // Corridor
    for (let r=6; r<=14; r++) { this.set(r,36,T.STABLE_FLOOR); this.set(r,37,T.STABLE_FLOOR); this.set(r,38,T.STABLE_FLOOR); this.set(r,39,T.STABLE_FLOOR); }
  }
  _addArena() {
    // Arena rows 22-37, cols 5-25
    for (let r=22; r<=37; r++) for (let c=5; c<=25; c++) this.set(r,c,T.ARENA);
    // Fence border
    for (let c=5; c<=25; c++) { this.set(22,c,T.FENCE); this.set(37,c,T.FENCE); }
    for (let r=22; r<=37; r++) { this.set(r,5,T.FENCE); this.set(r,25,T.FENCE); }
    // Gate opening south cols 14-15
    this.set(37,14,T.ARENA); this.set(37,15,T.ARENA);
    // Small dirt path to arena
    for (let r=38; r<=41; r++) { this.set(r,14,T.PATH); this.set(r,15,T.PATH); }
  }
  _addPaddocks() {
    // Paddock 1: rows 5-18, cols 48-58
    for (let r=5; r<=18; r++) for (let c=48; c<=58; c++) this.set(r,c,T.PADDOCK);
    for (let c=48; c<=58; c++) { this.set(5,c,T.FENCE); this.set(18,c,T.FENCE); }
    for (let r=5; r<=18; r++) { this.set(r,48,T.FENCE); this.set(r,58,T.FENCE); }
    this.set(18,52,T.PADDOCK); this.set(18,53,T.PADDOCK); // gate
    // Paddock 2: rows 5-18, cols 60-68
    for (let r=5; r<=18; r++) for (let c=60; c<=68; c++) this.set(r,c,T.PADDOCK);
    for (let c=60; c<=68; c++) { this.set(5,c,T.FENCE); this.set(18,c,T.FENCE); }
    for (let r=5; r<=18; r++) { this.set(r,60,T.FENCE); this.set(r,68,T.FENCE); }
    this.set(18,63,T.PADDOCK); this.set(18,64,T.PADDOCK); // gate
  }
  _addTrail() {
    // Trail rows 37-69, cols 32-38
    for (let r=37; r<=69; r++) for (let c=32; c<=38; c++) this.set(r,c,T.PATH);
    // Trees along trail
    for (let r=40; r<=68; r+=4) {
      this.set(r,30,T.TREE); this.set(r,39,T.TREE);
      this.set(r+2,29,T.TREE); this.set(r+2,40,T.TREE);
    }
  }
  _addPond() {
    // Pond rows 38-45, cols 10-20
    for (let r=38; r<=45; r++) for (let c=10; c<=20; c++) {
      const dist = Math.abs(r-41.5)/3.5 + Math.abs(c-15)/5;
      if (dist < 1) this.set(r,c,T.WATER);
    }
    // Some flowers around pond
    for (let c=9; c<=21; c+=2) { this.set(37,c,T.FLOWER); this.set(46,c,T.FLOWER); }
  }
  _addTrees() {
    const treePos = [
      [2,2],[2,5],[3,63],[4,67],[5,69],[6,1],[8,3],[9,68],[10,66],
      [12,1],[15,69],[17,1],[18,66],[19,2],[20,68],[21,3],[23,67],
      [25,2],[27,68],[30,3],[32,67],[35,2],[36,68],[38,2],[40,3],
      [41,68],[43,3],[44,25],[45,26],[46,27],[47,2],[48,68],[50,3],
      [52,68],[54,3],[56,68],[58,2],[60,68],[62,3],[64,68],[66,2],[68,69],
      [35,50],[36,55],[37,60],[38,62],[40,65],[42,50],[44,60],[46,65],
      [47,50],[49,55],[50,58],[52,62],[54,50],[56,57],[58,65],[60,50],
      [62,55],[64,58],[66,62]
    ];
    for (const [r,c] of treePos) { if(this.get(r,c)===T.GRASS||this.get(r,c)===T.FLOWER) this.set(r,c,T.TREE); }
  }
  _addPaths() {
    // Dirt path from stable door to arena
    for (let r=16; r<=21; r++) { this.set(r,36,T.DIRT); this.set(r,37,T.DIRT); this.set(r,38,T.DIRT); }
    // Path from stable to paddocks
    for (let c=46; c<=48; c++) { for (let r=10; r<=12; r++) this.set(r,c,T.DIRT); }
    // Path from arena southward connecting to trail
    for (let r=38; r<=41; r++) this.set(r,37,T.PATH);
    // Horizontal connector
    for (let c=26; c<=31; c++) { this.set(40,c,T.PATH); }
    // dirt around stable entrance
    for (let c=34; c<=41; c++) this.set(16,c,T.DIRT);
  }
  _addShop() {
    // Shop-Gebäude: Zeilen 20-34, Spalten 48-62
    for(let r=20;r<=34;r++) for(let c=48;c<=62;c++){
      if(r===20||r===34||c===48||c===62) this.set(r,c,T.WALL);
      else this.set(r,c,T.STABLE_FLOOR);
    }
    // Nur Südtür (Eingang): Zeile 34, Spalten 54-55
    this.set(34,54,T.STABLE_FLOOR); this.set(34,55,T.STABLE_FLOOR);
    // Tresen: Zeile 22, volle Breite STALL (solid – Maria steht in Zeile 21 dahinter)
    for(let c=49;c<=61;c++) this.set(22,c,T.STALL);
    // Pfad-Verbindung (Zeilen 18-19 nach Osten, von Stall zu Shop)
    for(let r=18;r<=19;r++) for(let c=39;c<=55;c++){
      const t=this.get(r,c);
      if(t===T.GRASS||t===T.FLOWER) this.set(r,c,T.DIRT);
    }
  }
}
