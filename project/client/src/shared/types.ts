// 共享类型（前端展示与服务器引擎一致）
export type Lang = 'zh_CN' | 'en' | 'de';
export type Difficulty = 'small' | 'medium' | 'big';
export type RoomMode = 'local' | 'online' | 'ai';
export type PlayerKind = 'human' | 'ai';

export interface Player {
  id: number;
  name: string;
  lang: Lang;
  avatar: string;
  kind: PlayerKind;
  coins: number;
  position: number;
  lanterns: number;
  hintUsed: boolean;
}

export interface PendingQuestion {
  qid: number;
  kind: 'riddle' | 'knowledge' | 'math';
  text: string;
  options: string[];
  answerIndex: number;
  tag?: string;
  reward?: number;
  penalty?: number;
}

export type Pending =
  | { kind: 'none' }
  | { kind: 'buy'; tile: number }
  | { kind: 'question'; question: PendingQuestion };

export interface GameState {
  seed: number;
  mode: RoomMode;
  difficulty: Difficulty;
  players: Player[];
  turn: number;
  lanternOwners: Record<number, number>;
  turnsElapsed: number;
  maxTurns: number;
  finished: boolean;
  winnerId?: number;
  pending: Pending;
  qidCounter: number;
}

export interface NewGameConfig {
  mode: RoomMode;
  difficulty: Difficulty;
  players: Array<{ name: string; lang: Lang; avatar: string; kind: PlayerKind }>;
  seed?: number;
}

export type GameEventType =
  | 'DICE_ROLLED' | 'MOVED' | 'PASS_START' | 'LANTERN_BOUGHT' | 'LANTERN_SKIPPED'
  | 'RENT' | 'BONUS_COINS' | 'QUESTION_REQUIRED' | 'QUESTION_ANSWERED' | 'HINT'
  | 'TURN_END' | 'WIN' | 'TIME_UP';

export interface GameEvent {
  type: GameEventType;
  player: number;
  messageKey: string;
  tile?: number;
  dice?: number;
  from?: number;
  to?: number;
  via?: 'rabbit' | 'moonwell' | 'wind';
  amount?: number;
  tag?: string;
  question?: PendingQuestion;
  choice?: number;
  correct?: boolean;
  option?: string;
  win?: boolean;
}
