export type Lang = 'zh_CN' | 'en' | 'de';
export type Difficulty = 'small' | 'big';
export type RoomMode = 'local' | 'online' | 'ai';
export type QuestionKind = 'riddle' | 'knowledge' | 'math';
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
  askedQuestionIds: number[];
}

export interface PendingQuestion {
  qid: number;
  kind: 'riddle' | 'knowledge';
  text: string;
  options: string[];
  answerIndex: number;
  tag?: string;
}

// 数学题也走 question 流程；kind 标记为 'math'（text/ options 是数字字符串）
export interface MathQuestion {
  qid: number;
  kind: 'math';
  text: string;
  options: string[];
  answerIndex: number;
}

export type PendingQuestionOrMath = PendingQuestion | MathQuestion;

export interface PendingQuestionPayload {
  kind: 'question';
  question: PendingQuestionOrMath;
}

export type Pending =
  | { kind: 'none' }
  | { kind: 'buy'; tile: number }
  | PendingQuestionPayload;

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

export interface QuestionBank {
  nextQuestion(
    lang: Lang,
    kind: 'riddle' | 'knowledge',
    difficulty: Difficulty,
    usedIds: number[],
  ): PendingQuestion | null;
}

export type GameEventType =
  | 'DICE_ROLLED'
  | 'MOVED'
  | 'PASS_START'
  | 'LANTERN_BOUGHT'
  | 'LANTERN_SKIPPED'
  | 'RENT'
  | 'BONUS_COINS'
  | 'QUESTION_REQUIRED'
  | 'QUESTION_ANSWERED'
  | 'HINT'
  | 'TURN_END'
  | 'WIN'
  | 'TIME_UP';

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
  question?: PendingQuestionOrMath;
  choice?: number;
  correct?: boolean;
  option?: string;
  win?: boolean;
}

export interface GameStateAction {
  type: 'ROLL' | 'BUY' | 'SKIP_BUY' | 'ANSWER' | 'HINT';
  player: number;
  payload?: { tile?: number; choice?: 0 | 1 | 2 };
}