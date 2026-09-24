// 40 格环形棋盘布局（与 docs/rules.md 表一致，索引 0..39，顺时针）
// 与 server/src/board/constants.ts 保持同步
export type TileKind =
  | 'start' | 'lantern' | 'riddle' | 'knowledge' | 'math'
  | 'moonview' | 'feast' | 'toss' | 'rabbit' | 'moonwell' | 'wind';

export interface TileDef {
  kind: TileKind;
  label: string;
  coins?: number;
  move?: number;
}

export const BOARD: readonly TileDef[] = [
  { kind: 'start', label: '团圆门' },                       // 0
  { kind: 'lantern', label: '灯笼位 L1' },                 // 1
  { kind: 'riddle', label: '灯谜站' },                     // 2
  { kind: 'lantern', label: '灯笼位 L2' },                 // 3
  { kind: 'math', label: '数学小关' },                     // 4
  { kind: 'moonview', label: '赏月位', coins: 10 },        // 5
  { kind: 'lantern', label: '灯笼位 L3' },                 // 6
  { kind: 'knowledge', label: '知识问' },                  // 7
  { kind: 'feast', label: '团圆宴', coins: 30 },           // 8
  { kind: 'lantern', label: '灯笼位 L4' },                 // 9
  { kind: 'toss', label: '投壶位' },                       // 10
  { kind: 'rabbit', label: '兔子洞', move: 4 },            // 11
  { kind: 'lantern', label: '灯笼位 L5' },                 // 12
  { kind: 'math', label: '数学小关' },                     // 13
  { kind: 'knowledge', label: '知识问' },                  // 14
  { kind: 'moonview', label: '赏月位', coins: 10 },        // 15
  { kind: 'riddle', label: '灯谜站' },                     // 16
  { kind: 'lantern', label: '灯笼位 L6' },                 // 17
  { kind: 'knowledge', label: '知识问' },                  // 18
  { kind: 'feast', label: '团圆宴', coins: 30 },           // 19
  { kind: 'moonwell', label: '月亮井', move: 6 },          // 20
  { kind: 'math', label: '数学小关' },                     // 21
  { kind: 'toss', label: '投壶位' },                       // 22
  { kind: 'moonview', label: '赏月位', coins: 10 },        // 23
  { kind: 'knowledge', label: '知识问' },                  // 24
  { kind: 'riddle', label: '灯谜站' },                     // 25
  { kind: 'math', label: '数学小关' },                     // 26
  { kind: 'feast', label: '团圆宴', coins: 30 },           // 27
  { kind: 'toss', label: '投壶位' },                       // 28
  { kind: 'knowledge', label: '知识问' },                  // 29
  { kind: 'rabbit', label: '兔子洞', move: 4 },            // 30
  { kind: 'riddle', label: '灯谜站' },                     // 31
  { kind: 'wind', label: '秋风', move: -4 },               // 32
  { kind: 'knowledge', label: '知识问' },                  // 33
  { kind: 'moonview', label: '赏月位', coins: 10 },        // 34
  { kind: 'riddle', label: '灯谜站' },                     // 35
  { kind: 'math', label: '数学小关' },                     // 36
  { kind: 'knowledge', label: '知识问' },                  // 37
  { kind: 'moonview', label: '赏月位', coins: 10 },        // 38
  { kind: 'riddle', label: '灯谜站' },                     // 39
];

export const TILE_COUNT = BOARD.length;
export const GRID_SIZE = 10;

export interface Pos { row: number; col: number; }

// 10x10 环：4 个角各放 2 格，其余边每格 1，共 40 格
export function tileToCell(tile: number): Pos {
  if (tile === 0 || tile === 1) return { row: 0, col: 0 };
  if (tile >= 2 && tile <= 9) return { row: 0, col: tile - 1 };
  if (tile === 10 || tile === 11) return { row: 0, col: 9 };
  if (tile >= 12 && tile <= 19) return { row: tile - 11, col: 9 };
  if (tile === 20 || tile === 21) return { row: 9, col: 9 };
  if (tile >= 22 && tile <= 29) return { row: 9, col: 30 - tile };
  if (tile === 30 || tile === 31) return { row: 9, col: 0 };
  if (tile >= 32 && tile <= 39) return { row: 40 - tile, col: 0 };
  return { row: 0, col: 0 };
}

// 每格 (row,col) 对应哪些格子索引
export interface Cell { row: number; col: number; tiles: number[]; }
export const CELLS: Cell[] = (() => {
  const map = new Map<string, number[]>();
  for (let t = 0; t < TILE_COUNT; t++) {
    const p = tileToCell(t);
    const k = p.row + ',' + p.col;
    const arr = map.get(k) ?? [];
    arr.push(t);
    map.set(k, arr);
  }
  const out: Cell[] = [];
  for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
    out.push({ row: r, col: c, tiles: map.get(r + ',' + c) ?? [] });
  }
  return out;
})();

export function isCell(row: number, col: number): boolean {
  return row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1;
}

export function cellAt(row: number, col: number): Cell {
  return CELLS[row * GRID_SIZE + col];
}
