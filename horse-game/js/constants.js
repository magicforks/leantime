export const VERSION = '2026.06.2';

export const TILE = 48;
export const ISO_W = 96;
export const ISO_H = 48;
export const ISO_Z = 32;
export const WORLD_W = 70;
export const WORLD_H = 70;
export const CANVAS_W = 900;
export const CANVAS_H = 600;

export const T = { GRASS:0, FLOWER:1, DIRT:2, STABLE_FLOOR:3, STALL:4, WALL:5, FENCE:6, TREE:7, WATER:8, ARENA:9, PATH:10, PADDOCK:11 };
export const SOLID = new Set([T.WALL, T.FENCE, T.TREE, T.STALL]);
