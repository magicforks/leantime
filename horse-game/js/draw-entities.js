// ===== DRAW HORSE =====
export function drawHorse(ctx, sx, sy, color, direction, t, equipment, scale) {
  scale = scale || 1;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(scale, scale);

  const moving = t > 0;
  const legAnim = moving ? Math.sin(t * 5.5) * 7 : 0;
  const bodyBob = moving ? Math.abs(Math.sin(t * 5.5)) * 2.5 : 0;

  // Shadow on ground (stays at tile level even after horse is lifted)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(2, 0, 22, 7, -0.2, 0, Math.PI*2);
  ctx.fill();

  // Lift horse 20px so hooves sit at ground level (sy) instead of sy+21
  ctx.translate(0, -20);

  let angle = 0;
  if (direction === 'left') angle = 0.4;
  else if (direction === 'right') angle = -0.4;
  else if (direction === 'up') angle = 0.2;
  else angle = -0.2;

  ctx.rotate(angle);

  // Back legs (draw before body)
  ctx.strokeStyle = shadeColor(color, -25);
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 2 - bodyBob); ctx.lineTo(-12 + legAnim*0.3, 18 - bodyBob + Math.abs(legAnim)*0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2, 4 - bodyBob); ctx.lineTo(-1 - legAnim*0.3, 20 - bodyBob); ctx.stroke();

  // Blanket (under body)
  if (equipment && equipment.blanket) {
    ctx.fillStyle = equipment.blanket.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.ellipse(2, -4 - bodyBob, 16, 9, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Body
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(2, -3 - bodyBob, 20, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = shadeColor(color, -35); ctx.lineWidth = 1; ctx.stroke();

  // Body shading (isometric lighting from top-left)
  const bodyGrad = ctx.createLinearGradient(-20, -14, 20, 8);
  bodyGrad.addColorStop(0, shadeColor(color, 20));
  bodyGrad.addColorStop(1, shadeColor(color, -15));
  ctx.fillStyle = bodyGrad;
  ctx.globalAlpha = 0.35;
  ctx.beginPath(); ctx.ellipse(2, -3 - bodyBob, 20, 11, 0, 0, Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;

  // Saddle
  if (equipment && equipment.saddle) {
    ctx.fillStyle = equipment.saddle.color;
    ctx.beginPath(); ctx.ellipse(4, -9 - bodyBob, 9, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = shadeColor(equipment.saddle.color, -30); ctx.lineWidth = 1; ctx.stroke();
  }

  // Front legs
  ctx.strokeStyle = shadeColor(color, -20);
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(10, 0 - bodyBob); ctx.lineTo(12 - legAnim*0.3, 16 - bodyBob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(16, 2 - bodyBob); ctx.lineTo(18 + legAnim*0.3, 18 - bodyBob); ctx.stroke();

  // Hooves
  ctx.fillStyle = '#222';
  [[-12 + legAnim*0.3, 19 - bodyBob], [-1 - legAnim*0.3, 21-bodyBob],
   [12 - legAnim*0.3, 17-bodyBob], [18 + legAnim*0.3, 19-bodyBob]].forEach(([hx,hy]) => {
    ctx.beginPath(); ctx.ellipse(hx, hy+1, 3, 2, 0, 0, Math.PI*2); ctx.fill();
  });

  // Neck
  ctx.strokeStyle = color; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(14, -6 - bodyBob); ctx.quadraticCurveTo(20, -14-bodyBob, 22, -20-bodyBob); ctx.stroke();

  // Head
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(25, -22 - bodyBob, 8, 5.5, 0.35, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = shadeColor(color,-30); ctx.lineWidth=1; ctx.stroke();

  // Nose/muzzle
  ctx.fillStyle = shadeColor(color, 10);
  ctx.beginPath(); ctx.ellipse(30, -18 - bodyBob, 4.5, 3.5, 0.3, 0, Math.PI*2); ctx.fill();

  // Nostril
  ctx.fillStyle = shadeColor(color, -40);
  ctx.beginPath(); ctx.arc(32, -17 - bodyBob, 1.2, 0, Math.PI*2); ctx.fill();

  // Eye
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(23, -24 - bodyBob, 2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(23, -24 - bodyBob, 0.8, 0, Math.PI*2); ctx.fill();

  // Mane
  ctx.strokeStyle = shadeColor(color, -55); ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(15, -8-bodyBob); ctx.quadraticCurveTo(18, -16-bodyBob, 22, -20-bodyBob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(12, -6-bodyBob); ctx.quadraticCurveTo(15, -14-bodyBob, 20, -18-bodyBob); ctx.stroke();

  // Tail
  ctx.strokeStyle = shadeColor(color, -45); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-16, -2-bodyBob); ctx.quadraticCurveTo(-26, 6-bodyBob, -24, 18-bodyBob); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-16, -2-bodyBob); ctx.quadraticCurveTo(-28, 4-bodyBob, -30, 0-bodyBob); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-16, -2-bodyBob); ctx.quadraticCurveTo(-25, 8-bodyBob, -20, 22-bodyBob); ctx.stroke();

  // Bridle
  if (equipment && equipment.bridle) {
    ctx.strokeStyle = equipment.bridle.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(25, -21-bodyBob, 6, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22,-16-bodyBob); ctx.lineTo(24,-13-bodyBob); ctx.stroke();
  }

  ctx.restore();
}

// ===== DRAW RIDER =====
export function drawRider(ctx, sx, sy, direction, outfit) {
  ctx.save();
  ctx.translate(sx, sy);

  let angle = direction==='left'?0.4:direction==='right'?-0.4:direction==='up'?0.2:-0.2;
  ctx.rotate(angle);

  // Boots/lower legs
  ctx.fillStyle = outfit.bootsColor || '#2c1810';
  ctx.fillRect(-5, -10, 4, 7);
  ctx.fillRect(3, -10, 4, 7);

  // Pants
  ctx.fillStyle = outfit.pantsColor || '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(0, -18, 7, 5, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillRect(-5, -22, 10, 8);

  // Jacket body
  ctx.fillStyle = outfit.jacketColor || '#1a3a5c';
  ctx.fillRect(-6, -36, 13, 16);

  // Left arm
  ctx.fillStyle = shadeColor(outfit.jacketColor || '#1a3a5c', -20);
  ctx.fillRect(-10, -36, 4, 10);
  // Right arm
  ctx.fillStyle = outfit.jacketColor || '#1a3a5c';
  ctx.fillRect(7, -35, 4, 10);

  // Hands
  ctx.fillStyle = '#F5C5A0';
  ctx.beginPath(); ctx.arc(-8, -26, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(9, -25, 2.5, 0, Math.PI*2); ctx.fill();

  // Head/face
  ctx.fillStyle = '#F5C5A0';
  ctx.beginPath(); ctx.arc(1, -44, 6, 0, Math.PI*2); ctx.fill();

  // Helmet
  ctx.fillStyle = outfit.helmetColor || '#1a1a1a';
  ctx.beginPath(); ctx.arc(1, -44, 6.5, Math.PI, 0); ctx.fill();
  ctx.fillRect(-7, -44, 15, 3);

  // Helmet brim
  ctx.fillStyle = shadeColor(outfit.helmetColor || '#1a1a1a', -15);
  ctx.fillRect(-8, -44, 17, 2);

  ctx.restore();
}

export function shadeColor(hex, amount) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.max(0,Math.min(255,r+amount));
  g = Math.max(0,Math.min(255,g+amount));
  b = Math.max(0,Math.min(255,b+amount));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

export function drawShopkeeper(ctx, sx, sy) {
  ctx.save();
  ctx.translate(sx, sy - 20);
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(1, 20, 9, 3, 0, 0, Math.PI*2); ctx.fill();
  // Schuhe
  ctx.fillStyle = '#5C3317';
  ctx.fillRect(-6, 0, 4, 7); ctx.fillRect(3, 0, 4, 7);
  // Rock (weiße Schürze)
  ctx.fillStyle = '#F8F8FF';
  ctx.beginPath(); ctx.moveTo(-7,-4); ctx.lineTo(8,-4); ctx.lineTo(10,0); ctx.lineTo(-9,0); ctx.closePath(); ctx.fill();
  // Grüne Jacke
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(-7,-18,15,16);
  // Schürze vorne
  ctx.fillStyle = '#F8F8FF';
  ctx.fillRect(-4,-16,9,14);
  // Arme
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(-11,-18,4,11); ctx.fillRect(8,-18,4,11);
  // Hände
  ctx.fillStyle = '#F5C5A0';
  ctx.beginPath(); ctx.arc(-9,-7,2.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10,-7,2.5,0,Math.PI*2); ctx.fill();
  // Kopf
  ctx.fillStyle = '#F5C5A0';
  ctx.beginPath(); ctx.arc(1,-28,6,0,Math.PI*2); ctx.fill();
  // Haare (braun, Dutt)
  ctx.fillStyle = '#5C3317';
  ctx.beginPath(); ctx.arc(1,-28,6.5,Math.PI,0); ctx.fill();
  ctx.beginPath(); ctx.arc(1,-35,5,0,Math.PI*2); ctx.fill();
  // Gesicht
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(-2,-28,1.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4,-28,1.3,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#c68642'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(1,-26,2.5,0,Math.PI); ctx.stroke();
  ctx.restore();
}
