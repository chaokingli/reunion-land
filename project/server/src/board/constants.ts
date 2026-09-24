// 40 格环形棋盘：与 docs/rules.md 的表一一对应（索引 0..39，顺时针）
// coins：落格直接获得的月亮币；move：额外位移（兔子洞/月亮井为 +，秋风为 −）
export type TileKind =
  | 'start' | 'lantern' | 'riddle' | 'knowledge' | 'math'
  | 'moonview' | 'feast' | 'toss' | 'rabbit' | 'moonwell' | 'wind';

export interface TileDef {
  kind: TileKind;
  label: string; // 中文名（运行时由 i18n 映射显示）
  coins?: number;
  move?: number;
}

export const BOARD: readonly TileDef[] = [
  { kind: 'start', label: '团圆门' },                                           // 0
  { kind: 'lantern', label: '灯笼位 L1' },                                     // 1
  { kind: 'riddle', label: '灯谜站' },                                          // 2
  { kind: 'lantern', label: '灯笼位 L2' },                                     // 3
  { kind: 'math', label: '数学小关' },                                          // 4
  { kind: 'moonview', label: '赏月位', coins: 10 },                            // 5
  { kind: 'lantern', label: '灯笼位 L3' },                                     // 6
  { kind: 'knowledge', label: '知识问' },                                       // 7
  { kind: 'feast', label: '团圆宴', coins: 30 },                               // 8
  { kind: 'lantern', label: '灯笼位 L4' },                                     // 9
  { kind: 'toss', label: '投壶位' },                                            // 10
  { kind: 'rabbit', label: '兔子洞', move: 4 },                                // 11
  { kind: 'lantern', label: '灯笼位 L5' },                                     // 12
  { kind: 'math', label: '数学小关' },                                          // 13
  { kind: 'knowledge', label: '知识问' },                                       // 14
  { kind: 'moonview', label: '赏月位', coins: 10 },                            // 15
  { kind: 'riddle', label: '灯谜站' },                                          // 16
  { kind: 'lantern', label: '灯笼位 L6' },                                     // 17
  { kind: 'knowledge', label: '知识问' },                                       // 18
  { kind: 'feast', label: '团圆宴', coins: 30 },                               // 19
  { kind: 'moonwell', label: '月亮井', move: 6 },                              // 20
  { kind: 'math', label: '数学小关' },                                          // 21
  { kind: 'toss', label: '投壶位' },                                            // 22
  { kind: 'moonview', label: '赏月位', coins: 10 },                            // 23
  { kind: 'knowledge', label: '知识问' },                                       // 24
  { kind: 'riddle', label: '灯谜站' },                                          // 25
  { kind: 'math', label: '数学小关' },                                          // 26
  { kind: 'feast', label: '团圆宴', coins: 30 },                               // 27
  { kind: 'toss', label: '投壶位' },                                            // 28
  { kind: 'knowledge', label: '知识问' },                                       // 29
  { kind: 'rabbit', label: '兔子洞', move: 4 },                                // 30
  { kind: 'riddle', label: '灯谜站' },                                          // 31
  { kind: 'wind', label: '秋风', move: -4 },                                   // 32
  { kind: 'knowledge', label: '知识问' },                                       // 33
  { kind: 'moonview', label: '赏月位', coins: 10 },                            // 34
  { kind: 'riddle', label: '灯谜站' },                                          // 35
  { kind: 'math', label: '数学小关' },                                          // 36
  { kind: 'knowledge', label: '知识问' },                                       // 37
  { kind: 'moonview', label: '赏月位', coins: 10 },                            // 38
  { kind: 'riddle', label: '灯谜站' },                                          // 39
];

export const TILE_COUNT = BOARD.length;

export const RULES = {
  startCoins: 100,
  lanternCost: 50,
  rent: 10,
  passStartBonus: 50,
  riddleReward: 20,
  knowledgeReward: 10,
  mathReward: 10,
  tossWinReward: 15,
  tossWinDice: 4,
  hintsPerPlayer: 1,
  winLanterns: 3,
  maxTurns: 40,
} as const;