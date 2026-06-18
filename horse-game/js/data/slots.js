import { TILE } from '../constants.js';

// ===== STALL SLOTS (6 Pferdeboxen im Stall) =====
// Linke Boxen: Spalten 31-35, rechte Boxen: Spalten 40-44
export const STALL_SLOTS = [
  {tc:33,tr:6,  wx:33*48+24,wy:6*48+24,  label:'Box L1'},
  {tc:33,tr:8,  wx:33*48+24,wy:8*48+24,  label:'Box L2'},
  {tc:33,tr:10, wx:33*48+24,wy:10*48+24, label:'Box L3'},
  {tc:42,tr:6,  wx:42*48+24,wy:6*48+24,  label:'Box R1'},
  {tc:42,tr:8,  wx:42*48+24,wy:8*48+24,  label:'Box R2'},
  {tc:42,tr:10, wx:42*48+24,wy:10*48+24, label:'Box R3'},
];

// ===== SHOP HORSE DISPLAY SLOTS (linke Wand col 49, zweite Reihe col 52) =====
export const SHOP_HORSE_SLOTS = [
  {tr:23,tc:49, wx:49*48+24,wy:23*48+24, breedIdx:0},
  {tr:25,tc:49, wx:49*48+24,wy:25*48+24, breedIdx:1},
  {tr:27,tc:49, wx:49*48+24,wy:27*48+24, breedIdx:2},
  {tr:29,tc:49, wx:49*48+24,wy:29*48+24, breedIdx:3},
  {tr:31,tc:49, wx:49*48+24,wy:31*48+24, breedIdx:4},
  {tr:23,tc:52, wx:52*48+24,wy:23*48+24, breedIdx:5},
  {tr:25,tc:52, wx:52*48+24,wy:25*48+24, breedIdx:6},
  {tr:27,tc:52, wx:52*48+24,wy:27*48+24, breedIdx:7},
  {tr:29,tc:52, wx:52*48+24,wy:29*48+24, breedIdx:8},
  {tr:31,tc:52, wx:52*48+24,wy:31*48+24, breedIdx:9},
];

// ===== SHOP EQUIPMENT SLOTS (rechte Wand col 60, an Wand hängend) =====
export const SHOP_EQUIP_SLOTS = [
  {tr:23,tc:60, wx:60*48+24,wy:23*48+24, cat:'saddles',  itemIdx:0},
  {tr:25,tc:60, wx:60*48+24,wy:25*48+24, cat:'saddles',  itemIdx:1},
  {tr:27,tc:60, wx:60*48+24,wy:27*48+24, cat:'saddles',  itemIdx:2},
  {tr:29,tc:60, wx:60*48+24,wy:29*48+24, cat:'saddles',  itemIdx:3},
  {tr:24,tc:60, wx:60*48+24,wy:24*48+24, cat:'bridles',  itemIdx:0},
  {tr:26,tc:60, wx:60*48+24,wy:26*48+24, cat:'bridles',  itemIdx:1},
  {tr:28,tc:60, wx:60*48+24,wy:28*48+24, cat:'blankets', itemIdx:0},
  {tr:30,tc:60, wx:60*48+24,wy:30*48+24, cat:'blankets', itemIdx:1},
  {tr:32,tc:60, wx:60*48+24,wy:32*48+24, cat:'blankets', itemIdx:2},
];
