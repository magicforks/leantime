import { T, ISO_W, ISO_H, ISO_Z, TILE } from './constants.js';
import { shadeColor } from './draw-entities.js';

export function drawIsoDiamond(ctx, sx, sy, color, strokeColor) {
  ctx.beginPath();
  ctx.moveTo(sx,          sy - ISO_H/2);
  ctx.lineTo(sx + ISO_W/2, sy);
  ctx.lineTo(sx,          sy + ISO_H/2);
  ctx.lineTo(sx - ISO_W/2, sy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 0.5; ctx.stroke(); }
}

export function drawIsoBlock(ctx, sx, sy, topColor, wallH) {
  const h = wallH || ISO_Z;
  // Left face (darkest)
  ctx.beginPath();
  ctx.moveTo(sx - ISO_W/2, sy - h);
  ctx.lineTo(sx, sy - h + ISO_H/2);
  ctx.lineTo(sx, sy + ISO_H/2);
  ctx.lineTo(sx - ISO_W/2, sy);
  ctx.closePath();
  ctx.fillStyle = shadeColor(topColor, -60);
  ctx.fill();
  // Right face
  ctx.beginPath();
  ctx.moveTo(sx, sy - h + ISO_H/2);
  ctx.lineTo(sx + ISO_W/2, sy - h);
  ctx.lineTo(sx + ISO_W/2, sy);
  ctx.lineTo(sx, sy + ISO_H/2);
  ctx.closePath();
  ctx.fillStyle = shadeColor(topColor, -35);
  ctx.fill();
  // Top face
  drawIsoDiamond(ctx, sx, sy - h, topColor, 'rgba(0,0,0,0.1)');
}

// ===== ISOMETRIC TILE RENDERER =====
// sx,sy = screen center of the diamond tile
export function isoPath(ctx, sx, sy) {
  // Expand 1px beyond exact diamond to prevent seams between tiles
  ctx.beginPath();
  ctx.moveTo(sx,              sy - ISO_H/2 - 1);
  ctx.lineTo(sx + ISO_W/2 + 1, sy);
  ctx.lineTo(sx,              sy + ISO_H/2 + 1);
  ctx.lineTo(sx - ISO_W/2 - 1, sy);
  ctx.closePath();
}

export function isoDiamondGrad(ctx, sx, sy, c0, c1) {
  const g = ctx.createLinearGradient(sx-ISO_W/2, sy-ISO_H/2, sx+ISO_W/2, sy+ISO_H/2);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  isoPath(ctx, sx, sy); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 0.5; ctx.stroke();
}

export function tileRNG(tx, ty, n) {
  let h = ((tx * 1664525 + ty * 1013904223) ^ (n * 22695477)) >>> 0;
  h ^= h >>> 13; h = (Math.imul(h, 0x85ebca6b)) >>> 0;
  h ^= h >>> 7;  h = (Math.imul(h, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

const _tileCache = new Map();
const _TILE_CW = ISO_W + 8, _TILE_CH = 200;
const _TILE_CX = (_TILE_CW) / 2, _TILE_CY = 165;

export function getCachedTile(tileType, tx, ty) {
  if (tileType === T.WATER || tileType === T.FLOWER) return null;
  const key = `${tileType}|${tx}|${ty}`;
  if (!_tileCache.has(key)) {
    const oc = document.createElement('canvas');
    oc.width = _TILE_CW; oc.height = _TILE_CH;
    const oc2 = oc.getContext('2d');
    drawTile(oc2, tileType, _TILE_CX, _TILE_CY, 0, tx, ty);
    _tileCache.set(key, oc);
  }
  return _tileCache.get(key);
}

export function drawTile(ctx, tileType, sx, sy, time, tx, ty) { tx=tx||0; ty=ty||0;
  switch(tileType) {
    case T.GRASS: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1),r2=tileRNG(tx,ty,2);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${105+r0*12},${55+r1*15}%,${38+r0*9}%)`);
      g.addColorStop(0.5,`hsl(${100+r2*10},${50+r0*12}%,${30+r2*8}%)`);
      g.addColorStop(1,`hsl(${95+r1*10},${45+r2*10}%,${22+r1*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      // Light patch
      const pg=ctx.createRadialGradient(sx+(r0-0.5)*20,sy-4+r1*8,0,sx+(r0-0.5)*10,sy,28);
      pg.addColorStop(0,`rgba(140,210,70,${0.15+r2*0.1})`); pg.addColorStop(1,'rgba(140,210,70,0)');
      isoPath(ctx,sx,sy); ctx.save(); ctx.clip(); ctx.fillStyle=pg; ctx.fillRect(sx-ISO_W/2-2,sy-ISO_H/2-2,ISO_W+4,ISO_H+4); ctx.restore();
      // Grass blades
      for(let i=0;i<14;i++){
        const rx=tileRNG(tx,ty,i*3+10),ry=tileRNG(tx,ty,i*3+11),rh=tileRNG(tx,ty,i*3+12);
        const bx=sx+(rx-0.5)*ISO_W*0.76,by=sy+(ry-0.5)*ISO_H*0.68;
        if(Math.abs(bx-sx)/(ISO_W/2+1)+Math.abs(by-sy)/(ISO_H/2+1)>0.92)continue;
        const bh=3+rh*5;
        ctx.strokeStyle=`hsl(${95+rx*20},${58+rh*12}%,${28+rh*14}%)`;
        ctx.lineWidth=0.7+rh*0.4;
        ctx.beginPath();ctx.moveTo(bx,by);
        ctx.quadraticCurveTo(bx+(rx-0.5)*3,by-bh*0.55,bx+(rx-0.5)*5,by-bh);
        ctx.stroke();
      }
      // AO edge
      ctx.strokeStyle='rgba(0,25,0,0.18)'; ctx.lineWidth=2.5;
      isoPath(ctx,sx,sy); ctx.stroke();
      break;
    }
    case T.FLOWER: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${105+r0*12},${55+r1*15}%,${38+r0*9}%)`);
      g.addColorStop(1,`hsl(${95+r1*10},${48+r0*12}%,${24+r1*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      const fc=['#ff5577','#FFD700','#cc44ff','#FF7722','#ff88aa'];
      for(let i=0;i<5;i++){
        const fr=tileRNG(tx,ty,i+10),fg=tileRNG(tx,ty,i+20);
        const fx=sx+(fr-0.5)*ISO_W*0.65,fy=sy+(fg-0.5)*ISO_H*0.55;
        if(Math.abs(fx-sx)/(ISO_W/2)+Math.abs(fy-sy)/(ISO_H/2)>0.85)continue;
        const col=fc[i%fc.length];
        ctx.globalAlpha=0.9;
        for(let p=0;p<5;p++){const a=(p/5)*Math.PI*2;ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(fx+Math.cos(a)*4,fy+Math.sin(a)*2.5,3,2,a*0.3,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#ffee44';ctx.globalAlpha=1;ctx.beginPath();ctx.arc(fx,fy,2.2,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle='rgba(0,25,0,0.15)'; ctx.lineWidth=2; isoPath(ctx,sx,sy); ctx.stroke();
      break;
    }
    case T.DIRT: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1),r2=tileRNG(tx,ty,2);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${28+r0*10},${52+r1*12}%,${38+r0*10}%)`);
      g.addColorStop(1,`hsl(${22+r2*8},${44+r0*10}%,${24+r2*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      for(let i=0;i<10;i++){
        const pr=tileRNG(tx,ty,i+5),px=tileRNG(tx,ty,i+15),py=tileRNG(tx,ty,i+25);
        const pbx=sx+(px-0.5)*ISO_W*0.72,pby=sy+(py-0.5)*ISO_H*0.65;
        if(Math.abs(pbx-sx)/(ISO_W/2)+Math.abs(pby-sy)/(ISO_H/2)>0.85)continue;
        ctx.fillStyle=`hsl(${22+pr*18},${18+pr*22}%,${35+pr*22}%)`;
        ctx.beginPath();ctx.ellipse(pbx,pby,2+pr*3.5,1+pr*2,pr*Math.PI,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=0.5;ctx.stroke();
      }
      ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=2; isoPath(ctx,sx,sy); ctx.stroke();
      break;
    }
    case T.STABLE_FLOOR: {
      const r0=tileRNG(tx,ty,0);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${28+r0*6},${48+r0*8}%,${54+r0*8}%)`);
      g.addColorStop(1,`hsl(${24+r0*6},${42+r0*8}%,${38+r0*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      // Wood planks
      ctx.strokeStyle='rgba(80,40,10,0.22)'; ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){const lx=sx+i*24,ly=sy+i*12;ctx.beginPath();ctx.moveTo(lx-ISO_W/2,ly+ISO_H/4);ctx.lineTo(lx+ISO_W/2,ly-ISO_H/4);ctx.stroke();}
      ctx.lineWidth=0.6; ctx.strokeStyle='rgba(80,40,10,0.12)';
      ctx.beginPath();ctx.moveTo(sx-ISO_W/2,sy);ctx.lineTo(sx,sy-ISO_H/2);ctx.stroke();
      // Wood grain
      ctx.strokeStyle=`rgba(${100+r0*30},${55+r0*20},${10+r0*15},0.15)`;ctx.lineWidth=0.5;
      ctx.beginPath();ctx.moveTo(sx-28,sy-8);ctx.quadraticCurveTo(sx,sy-12,sx+28,sy-4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx-28,sy+2);ctx.quadraticCurveTo(sx,sy-2,sx+28,sy+6);ctx.stroke();
      break;
    }
    case T.STALL: {
      const r0=tileRNG(tx,ty,0);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${28+r0*6},${48+r0*8}%,${50+r0*6}%)`);
      g.addColorStop(1,`hsl(${24+r0*4},${42+r0*8}%,${34+r0*6}%)`);
      isoPath(ctx,sx,sy);ctx.fillStyle=g;ctx.fill();
      // Straw/hay texture
      ctx.strokeStyle='rgba(160,120,20,0.25)';ctx.lineWidth=0.8;
      for(let i=0;i<5;i++){const sr=tileRNG(tx,ty,i+10),sb=tileRNG(tx,ty,i+20);
        const ox=(sr-0.5)*ISO_W*0.6,oy=(sb-0.5)*ISO_H*0.5;
        ctx.beginPath();ctx.moveTo(sx+ox-8+sr*4,sy+oy);ctx.lineTo(sx+ox+8+sr*4,sy+oy-4+sb*4);ctx.stroke();}
      ctx.strokeStyle='rgba(60,35,10,0.3)';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(sx,sy-ISO_H/2);ctx.lineTo(sx,sy+ISO_H/2);ctx.stroke();
      break;
    }
    case T.WALL: {
      const wh=ISO_Z*1.6;
      // Left face
      ctx.beginPath();ctx.moveTo(sx-ISO_W/2,sy-wh);ctx.lineTo(sx,sy-wh+ISO_H/2);ctx.lineTo(sx,sy+ISO_H/2);ctx.lineTo(sx-ISO_W/2,sy);ctx.closePath();
      const lf=ctx.createLinearGradient(sx-ISO_W/2,0,sx,0);
      lf.addColorStop(0,'#8a8a8a');lf.addColorStop(1,'#606060');
      ctx.fillStyle=lf; ctx.fill();
      // Left face bricks
      ctx.strokeStyle='rgba(0,0,0,0.22)'; ctx.lineWidth=0.8;
      for(let r=0;r<3;r++){const ry=sy-wh+(r+1)*(wh/3);ctx.beginPath();ctx.moveTo(sx-ISO_W/2,ry);ctx.lineTo(sx,ry+ISO_H/4);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(sx-ISO_W/4,sy-wh+ISO_H/4);ctx.lineTo(sx-ISO_W/4,sy-ISO_H/4);ctx.stroke();
      // Left face moss accent
      const r0=tileRNG(tx,ty,0);
      ctx.fillStyle=`rgba(60,90,40,${0.08+r0*0.06})`;
      ctx.beginPath();ctx.rect(sx-ISO_W/2,sy-wh*0.3,ISO_W/2,wh*0.15);ctx.fill();
      // Right face (darker)
      ctx.beginPath();ctx.moveTo(sx,sy-wh+ISO_H/2);ctx.lineTo(sx+ISO_W/2,sy-wh);ctx.lineTo(sx+ISO_W/2,sy);ctx.lineTo(sx,sy+ISO_H/2);ctx.closePath();
      const rf=ctx.createLinearGradient(sx,0,sx+ISO_W/2,0);
      rf.addColorStop(0,'#484848');rf.addColorStop(1,'#343434');
      ctx.fillStyle=rf; ctx.fill();
      for(let r=0;r<3;r++){const ry=sy-wh+ISO_H/2+(r+1)*((wh-ISO_H/2)/3);ctx.beginPath();ctx.moveTo(sx,ry);ctx.lineTo(sx+ISO_W/2,ry-ISO_H/4);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(sx+ISO_W/4,sy-wh+ISO_H/4*3);ctx.lineTo(sx+ISO_W/4,sy-ISO_H/4);ctx.stroke();
      // Top cap
      drawIsoDiamond(ctx,sx,sy-wh,'#a0a0a0','rgba(0,0,0,0.05)');
      // Top edge highlight
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(sx-ISO_W/2,sy-wh);ctx.lineTo(sx,sy-wh-ISO_H/2);ctx.lineTo(sx+ISO_W/2,sy-wh);ctx.stroke();
      break;
    }
    case T.FENCE: {
      isoDiamondGrad(ctx,sx,sy,'#4a8225','#306018');
      // Grassy base
      ctx.strokeStyle='rgba(0,30,0,0.15)';ctx.lineWidth=2;isoPath(ctx,sx,sy);ctx.stroke();
      // Post
      const pgf=ctx.createLinearGradient(sx-5,0,sx+5,0);
      pgf.addColorStop(0,'#6a4020');pgf.addColorStop(0.4,'#8a5828');pgf.addColorStop(1,'#5a3018');
      ctx.fillStyle=pgf;ctx.fillRect(sx-4,sy-ISO_Z*0.9,8,ISO_Z*0.9);
      ctx.fillStyle='#9a6838';ctx.fillRect(sx-5,sy-ISO_Z*0.92,10,5);
      // Rails
      const rc='#7a4520';
      [[0.65,0.5],[0.32,0.18]].forEach(([t,b])=>{
        // Left rail
        const lg=ctx.createLinearGradient(0,sy-ISO_Z*t,0,sy-ISO_Z*b);
        lg.addColorStop(0,shadeColor(rc,15));lg.addColorStop(1,rc);
        ctx.fillStyle=lg;
        ctx.beginPath();ctx.moveTo(sx-ISO_W/2,sy-ISO_Z*t);ctx.lineTo(sx,sy-ISO_Z*t-ISO_H/4);ctx.lineTo(sx,sy-ISO_Z*b-ISO_H/4);ctx.lineTo(sx-ISO_W/2,sy-ISO_Z*b);ctx.closePath();ctx.fill();
        // Right rail
        ctx.fillStyle=shadeColor(rc,-25);
        ctx.beginPath();ctx.moveTo(sx,sy-ISO_Z*t-ISO_H/4);ctx.lineTo(sx+ISO_W/2,sy-ISO_Z*t);ctx.lineTo(sx+ISO_W/2,sy-ISO_Z*b);ctx.lineTo(sx,sy-ISO_Z*b-ISO_H/4);ctx.closePath();ctx.fill();
      });
      break;
    }
    case T.TREE: {
      // Dark forest floor
      const fg2=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      fg2.addColorStop(0,'#1a480a'); fg2.addColorStop(1,'#0d2806');
      isoPath(ctx,sx,sy); ctx.fillStyle=fg2; ctx.fill();
      // Ground shadow
      ctx.fillStyle='rgba(0,0,0,0.22)';
      ctx.beginPath();ctx.ellipse(sx+5,sy+2,30,10,0,0,Math.PI*2);ctx.fill();
      // Trunk
      const tg=ctx.createLinearGradient(sx-7,0,sx+7,0);
      tg.addColorStop(0,'#3a1e08');tg.addColorStop(0.4,'#5e3418');tg.addColorStop(1,'#2e1606');
      ctx.fillStyle=tg;
      ctx.beginPath();ctx.moveTo(sx-6,sy);ctx.lineTo(sx+6,sy);ctx.lineTo(sx+3,sy-ISO_Z*2.9);ctx.lineTo(sx-3,sy-ISO_Z*2.9);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=0.7;
      for(let i=0;i<4;i++){const tly=sy-ISO_Z*(0.35+i*0.6);ctx.beginPath();ctx.moveTo(sx-5+i*0.5,tly);ctx.lineTo(sx+4-i*0.5,tly-4+i*2);ctx.stroke();}
      const ty3=sy-ISO_Z*2.9;
      // Rich multi-layer canopy
      const layers=[
        {dx:-6,dy:0.0,r:33,h:28},{dx:8,dy:0.15,r:29,h:30},{dx:-4,dy:0.5,r:27,h:33},
        {dx:6,dy:0.9,r:25,h:36},{dx:-8,dy:1.25,r:22,h:34},{dx:2,dy:1.55,r:24,h:38},
        {dx:-3,dy:1.95,r:20,h:36},{dx:7,dy:2.2,r:18,h:40},{dx:-1,dy:2.55,r:16,h:44},
        {dx:4,dy:2.8,r:13,h:46}
      ];
      layers.forEach(({dx,dy,r,h})=>{
        ctx.fillStyle=`hsl(108,${42+dy*6}%,${h}%)`;
        ctx.beginPath();ctx.arc(sx+dx,ty3-ISO_Z*dy,r,0,Math.PI*2);ctx.fill();
      });
      // Sunlight highlight (top-right)
      const hg=ctx.createRadialGradient(sx+7,ty3-ISO_Z*2.9,1,sx+5,ty3-ISO_Z*2.6,18);
      hg.addColorStop(0,'rgba(180,255,80,0.45)');hg.addColorStop(1,'rgba(180,255,80,0)');
      ctx.fillStyle=hg;ctx.beginPath();ctx.arc(sx+5,ty3-ISO_Z*2.6,18,0,Math.PI*2);ctx.fill();
      // Ambient shadow (bottom-left)
      const sg=ctx.createRadialGradient(sx-8,ty3-ISO_Z*0.3,0,sx-5,ty3-ISO_Z*0.5,22);
      sg.addColorStop(0,'rgba(0,0,0,0.3)');sg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx-5,ty3-ISO_Z*0.4,22,0,Math.PI*2);ctx.fill();
      break;
    }
    case T.WATER: {
      const wg=ctx.createRadialGradient(sx-5,sy-5,2,sx,sy,ISO_W/2);
      wg.addColorStop(0,'#2468e0');wg.addColorStop(0.5,'#0e3ea8');wg.addColorStop(1,'#06207a');
      isoPath(ctx,sx,sy);ctx.fillStyle=wg;ctx.fill();
      // Animated ripples
      for(let i=0;i<5;i++){
        const ph=time*1.3+i*1.2;
        const wx=sx+(Math.cos(ph)*14)-14+i*8,wy=sy-2+Math.sin(ph*0.75)*4;
        const al=0.12+Math.sin(ph+0.5)*0.08;
        ctx.strokeStyle=`rgba(100,180,255,${Math.max(0,al)})`;ctx.lineWidth=1.2;
        ctx.beginPath();ctx.ellipse(wx,wy,9+i*2,2.8,-0.05,0,Math.PI*2);ctx.stroke();
      }
      // Sparkles
      for(let i=0;i<4;i++){
        const sp=Math.sin(time*2.8+i*1.9);
        if(sp>0.65){const spx=sx-22+i*16+Math.sin(time*0.4+i)*7,spy=sy-5+Math.cos(time*0.6+i)*5;
          ctx.fillStyle=`rgba(255,255,255,${(sp-0.65)*2.5})`;
          ctx.beginPath();ctx.arc(spx,spy,1.8,0,Math.PI*2);ctx.fill();}
      }
      ctx.strokeStyle='rgba(60,140,255,0.2)';ctx.lineWidth=1;isoPath(ctx,sx,sy);ctx.stroke();
      break;
    }
    case T.ARENA: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${38+r0*8},${60+r1*10}%,${56+r0*8}%)`);
      g.addColorStop(1,`hsl(${32+r1*6},${52+r0*10}%,${38+r1*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      // Sand texture
      ctx.strokeStyle=`rgba(100,70,20,${0.12+r0*0.08})`; ctx.lineWidth=0.7;
      for(let i=0;i<3;i++){const ar=tileRNG(tx,ty,i+8),ab=tileRNG(tx,ty,i+18);
        ctx.beginPath();ctx.moveTo(sx+(ar-0.5)*ISO_W*0.7,sy+(ab-0.5)*ISO_H*0.5);
        ctx.lineTo(sx+(tileRNG(tx,ty,i+28)-0.5)*ISO_W*0.6,sy+(tileRNG(tx,ty,i+38)-0.5)*ISO_H*0.5);ctx.stroke();}
      break;
    }
    case T.PATH: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${32+r0*8},${30+r1*10}%,${52+r0*8}%)`);
      g.addColorStop(1,`hsl(${28+r1*6},${25+r0*8}%,${36+r1*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      for(let i=0;i<6;i++){
        const sr=tileRNG(tx,ty,i+5),sx2=tileRNG(tx,ty,i+15),sy2=tileRNG(tx,ty,i+25);
        const pbx=sx+(sx2-0.5)*ISO_W*0.75,pby=sy+(sy2-0.5)*ISO_H*0.7;
        if(Math.abs(pbx-sx)/(ISO_W/2)+Math.abs(pby-sy)/(ISO_H/2)>0.88)continue;
        ctx.fillStyle=`hsl(${28+sr*15},${25+sr*18}%,${42+sr*18}%)`;
        ctx.beginPath();ctx.ellipse(pbx,pby,4+sr*5,2+sr*2.5,sr*Math.PI,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=0.5;ctx.stroke();
      }
      break;
    }
    case T.PADDOCK: {
      const r0=tileRNG(tx,ty,0),r1=tileRNG(tx,ty,1);
      const g=ctx.createLinearGradient(sx-ISO_W/2,sy-ISO_H/2,sx+ISO_W/2,sy+ISO_H/2);
      g.addColorStop(0,`hsl(${100+r0*12},${52+r1*12}%,${36+r0*8}%)`);
      g.addColorStop(1,`hsl(${94+r1*8},${45+r0*10}%,${24+r1*8}%)`);
      isoPath(ctx,sx,sy); ctx.fillStyle=g; ctx.fill();
      // Slightly worn grass look
      ctx.fillStyle=`rgba(110,175,50,${0.1+r0*0.08})`;
      ctx.beginPath();ctx.ellipse(sx+(r0-0.5)*16,sy-3+r1*6,22+r0*8,9+r1*4,r0*0.4,0,Math.PI*2);ctx.fill();
      for(let i=0;i<8;i++){
        const rx=tileRNG(tx,ty,i*3+10),ry=tileRNG(tx,ty,i*3+11),rh=tileRNG(tx,ty,i*3+12);
        const bx=sx+(rx-0.5)*ISO_W*0.72,by=sy+(ry-0.5)*ISO_H*0.65;
        if(Math.abs(bx-sx)/(ISO_W/2)+Math.abs(by-sy)/(ISO_H/2)>0.88)continue;
        ctx.strokeStyle=`hsl(${94+rx*18},${55+rh*10}%,${26+rh*12}%)`;ctx.lineWidth=0.7;
        ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+(rx-0.5)*3,by-3-rh*3,bx+(rx-0.5)*4,by-4-rh*4);ctx.stroke();
      }
      ctx.strokeStyle='rgba(0,25,0,0.15)'; ctx.lineWidth=2; isoPath(ctx,sx,sy); ctx.stroke();
      break;
    }
    default:
      drawIsoDiamond(ctx, sx, sy, '#4A7C2F', 'rgba(0,0,0,0.05)');
  }
}
