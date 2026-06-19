import { ISO_W, ISO_H, TILE, CANVAS_W, CANVAS_H, WORLD_W, WORLD_H } from './constants.js';

let camAngle = 0;           // Azimuth in radians (0 = original SW view)
let camPitchH = ISO_H * 5 / 12; // Effective tile half-height — ~20px gives overhead view like Star Stable
let camZoom = 1.0;          // Zoom factor

export function setCamAngle(v) { camAngle = v; }
export function setCamPitchH(v) { camPitchH = v; }
export function setCamZoom(v) { camZoom = v; }

export { camAngle, camPitchH, camZoom };

export function updateCamera() { /* player always centred — nothing to update */ }

// World tile → screen pixel — continuous isometric projection with free camera orbit
export function tileToScreen(tx, ty) {
  const ptx = Game.player ? Game.player.x / TILE : WORLD_W / 2;
  const pty = Game.player ? Game.player.y / TILE : WORLD_H / 2;
  const dx = tx - ptx, dy = ty - pty;
  const ca = Math.cos(camAngle), sa = Math.sin(camAngle);
  // Rotate tile coords around player, then project isometrically
  const hw = (ISO_W / 2) * camZoom;
  const hh = camPitchH * camZoom;
  return {
    x: (dx * (ca - sa) - dy * (sa + ca)) * hw + CANVAS_W / 2,
    y: (dx * (ca + sa) + dy * (ca - sa)) * hh + CANVAS_H / 3
  };
}
export function worldToScreen(wx, wy) {
  return tileToScreen(wx / TILE, wy / TILE);
}
