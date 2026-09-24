import { BOARD, RULES, TILE_COUNT } from '../board/constants.js';
import type {
  GameState, GameStateAction, GameEvent, GameEventType, NewGameConfig,
  MathQuestion, QuestionBank,
} from './types.js';

// ---------- RNG（LCG，服务端唯一随机来源，可复现） ----------
function lcgStep(seed: number): [number, number] {
  const s = (seed + 0x12345679) | 0;
  const a = (s ^ (s >>> 13)) | 0;
  const b = (a * 1103515245) | 0;
  const c = (b + 1234567) | 0;
  return [(c & 0x7fffffff) / 0x80000000, c >>> 0];
}

function ri(seed: number, min: number, max: number): [number, number] {
  const [r, ns] = lcgStep(seed);
  return [min + Math.floor(r * (max - min + 1)), ns];
}

function perm3(seed: number): [number[], number] {
  let s = seed;
  const [r1, s1] = lcgStep(s);
  s = s1;
  const [r2, s2] = lcgStep(s);
  s = s2;
  const i = Math.floor(r1 * 3);
  let j = Math.floor(r2 * 2);
  if (j >= i) j += 1;
  const perm = [0, 1, 2];
  const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
  if (i !== 0) {
    const u = perm[2]; perm[2] = perm[0]; perm[0] = u;
  }
  return [perm, s];
}

function ev(
  type: GameEventType,
  player: number,
  messageKey: string,
  extra: Partial<GameEvent> = {},
): GameEvent {
  return { type, player, messageKey, ...extra };
}

// ---------- 数学题（运行时生成，选项确定性乱序） ----------
function makeMathQuestion(state: GameState): MathQuestion {
  const max = state.difficulty === 'small' ? 15 : 40;
  const [ra, s1] = lcgStep(state.seed);
  const [rb, s2] = lcgStep(s1);
  const a = 1 + Math.floor(ra * max);
  const b = 1 + Math.floor(rb * max);
  const answer = a + b;
  const wrongs: number[] = [];
  for (const w of [a - b, b, answer - 2, answer + 2, answer - 1, answer - 3]) {
    if (Number.isInteger(w) && w >= 0 && w !== answer && !wrongs.includes(w)) {
      wrongs.push(w);
      if (wrongs.length === 2) break;
    }
  }
  while (wrongs.length < 2) {
    const w = answer + wrongs.length + 1;
    if (!wrongs.includes(w)) wrongs.push(w);
  }
  const pool = [answer, wrongs[0], wrongs[1]];
  const [perm, s3] = perm3(s2);
  const options = perm.map((idx) => String(pool[idx]));
  state.seed = s3;
  return {
    qid: state.qidCounter++,
    kind: 'math',
    text: `${a} + ${b} = ?`,
    options,
    answerIndex: options.indexOf(String(answer)),
  };
}

// ---------- 胜负与回合结束 ----------
function score(p: { lanterns: number; coins: number }): number {
  return p.lanterns * 1000 + p.coins;
}

export function findWinner(players: GameState['players']): number | null {
  const s = (p: GameState['players'][number]) => score(p);
  let best = players[0];
  for (const p of players) if (s(p) > s(best)) best = p;
  const count = players.filter((p) => s(p) === s(best)).length;
  return count === 1 ? best.id : null;
}

function endTurn(state: GameState, events: GameEvent[]): void {
  const player = state.turn;
  const nextTurns = state.turnsElapsed + 1;
  if (nextTurns >= state.maxTurns) {
    const w = findWinner(state.players);
    state.turnsElapsed = nextTurns;
    state.finished = true;
    state.winnerId = w === null ? -1 : w;
    events.push(ev('TIME_UP', w === null ? -1 : w, 'game.time_up', { win: w !== null }));
    return;
  }
  state.turnsElapsed = nextTurns;
  state.turn = (state.turn + 1) % state.players.length;
  events.push(ev('TURN_END', player, 'board.turn_end'));
}

function checkWin(state: GameState, player: number, events: GameEvent[]): void {
  if (state.players[player].lanterns >= RULES.winLanterns) {
    state.finished = true;
    state.winnerId = player;
    events.push(ev('WIN', player, 'game.win', { win: true }));
  }
}

// ---------- 解析所落格子（链式移动） ----------
// 返回 true = 回合自然结束；false = 等待玩家操作（买灯笼/答题）
function continueTile(state: GameState, bank: QuestionBank, events: GameEvent[]): boolean {
  const player = state.turn;
  const p = state.players[player];
  let tile = p.position;
  for (;;) {
    const t = BOARD[tile];
    switch (t.kind) {
      case 'start':
        break;
      case 'lantern': {
        if (state.lanternOwners[tile] === undefined) {
          state.pending = { kind: 'buy', tile };
          events.push(ev('QUESTION_REQUIRED', player, 'question.required', { tile }));
          return false;
        }
        if (state.lanternOwners[tile] !== player) {
          if (p.coins >= RULES.rent) {
            p.coins -= RULES.rent;
            events.push(ev('RENT', player, 'board.rent_paid', { amount: RULES.rent, tile }));
          }
        }
        break;
      }
      case 'riddle':
      case 'knowledge': {
        const q = bank.nextQuestion(p.lang, t.kind, state.difficulty, p.askedQuestionIds);
        if (q) {
          p.askedQuestionIds.push(q.qid);
          state.pending = { kind: 'question', question: q };
          events.push(ev('QUESTION_REQUIRED', player, 'question.required', { question: q, tile }));
          return false;
        }
        const reward = t.kind === 'riddle' ? RULES.riddleReward : RULES.knowledgeReward;
        p.coins += reward;
        events.push(ev('BONUS_COINS', player, 'board.bonus', { amount: reward, tag: t.kind, tile }));
        break;
      }
      case 'math': {
        const q = makeMathQuestion(state);
        p.askedQuestionIds.push(q.qid);
        state.pending = { kind: 'question', question: q };
        events.push(ev('QUESTION_REQUIRED', player, 'question.required', { question: q, tile }));
        return false;
      }
      case 'moonview':
      case 'feast': {
        const amount = t.coins ?? 0;
        p.coins += amount;
        events.push(ev('BONUS_COINS', player, 'board.bonus', { amount, tag: t.kind, tile }));
        break;
      }
      case 'toss': {
        const [r, seedNext] = lcgStep(state.seed);
        state.seed = seedNext;
        const tossDice = 1 + Math.floor(r * 6);
        const won = tossDice >= RULES.tossWinDice;
        if (won) {
          p.coins += RULES.tossWinReward;
          events.push(ev('BONUS_COINS', player, 'board.bonus', { amount: RULES.tossWinReward, tag: 'toss', tile, dice: tossDice, win: true }));
        }
        break;
      }
      case 'rabbit':
      case 'moonwell':
      case 'wind': {
        const before = p.position;
        const after = ((p.position + (t.move ?? 0)) % TILE_COUNT + TILE_COUNT) % TILE_COUNT;
        p.position = after;
        tile = after;
        events.push(ev('MOVED', player, 'board.moved', { via: t.kind, from: before, to: after, tile }));
        break;
      }
    }
    // 落到普通格（无等待项）：回合结束
    return true;
  }
}

// ---------- 主入口 ----------
export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function createGame(config: NewGameConfig): GameState {
  return {
    seed: config.seed === undefined ? (Math.random() * 0x7fffffff) | 0 : (config.seed >>> 0),
    mode: config.mode,
    difficulty: config.difficulty,
    players: config.players.map((info, i) => ({
      id: i,
      name: info.name,
      lang: info.lang,
      avatar: info.avatar,
      kind: info.kind,
      coins: RULES.startCoins,
      position: 0,
      lanterns: 0,
      hintUsed: false,
      askedQuestionIds: [],
    })),
    turn: 0,
    lanternOwners: {},
    turnsElapsed: 0,
    maxTurns: RULES.maxTurns,
    finished: false,
    winnerId: undefined,
    pending: { kind: 'none' },
    qidCounter: 1000,
  };
}

export function processAction(
  state: GameState,
  bank: QuestionBank,
  action: GameStateAction,
): StepResult {
  const events: GameEvent[] = [];
  if (state.finished) throw new Error('game finished');
  if (action.player !== state.turn) throw new Error('not your turn');
  const p = state.players[action.player];

  switch (action.type) {
    case 'ROLL': {
      if (state.pending.kind !== 'none') throw new Error('pending action');
      const from = p.position;
      const [dice, seedNext] = ri(state.seed, 2, 6);
      state.seed = seedNext;
      const land = from + dice;
      if (land >= TILE_COUNT) {
        p.coins += RULES.passStartBonus;
        events.push(ev('PASS_START', action.player, 'board.pass_start', { amount: RULES.passStartBonus }));
      }
      p.position = land % TILE_COUNT;
      events.push(ev('DICE_ROLLED', action.player, 'dice.rolled', { dice, from, to: p.position }));
      const continues = continueTile(state, bank, events);
      if (continues && !state.finished) endTurn(state, events);
      break;
    }
    case 'BUY': {
      if (state.pending.kind !== 'buy' || state.pending.tile === undefined) throw new Error('no buy pending');
      const tile = state.pending.tile;
      if (p.coins < RULES.lanternCost) throw new Error('insufficient coins');
      p.coins -= RULES.lanternCost;
      p.lanterns += 1;
      state.lanternOwners[tile] = action.player;
      state.pending = { kind: 'none' };
      events.push(ev('LANTERN_BOUGHT', action.player, 'board.lantern_bought', { tile, amount: RULES.lanternCost }));
      checkWin(state, action.player, events);
      if (!state.finished) endTurn(state, events);
      break;
    }
    case 'SKIP_BUY': {
      if (state.pending.kind !== 'buy') throw new Error('no buy pending');
      state.pending = { kind: 'none' };
      events.push(ev('LANTERN_SKIPPED', action.player, 'board.lantern_skipped'));
      endTurn(state, events);
      break;
    }
    case 'ANSWER': {
      if (state.pending.kind !== 'question') throw new Error('no question pending');
      const choice = action.payload?.choice;
      if (choice === undefined || choice < 0 || choice >= state.pending.question.options.length) {
        throw new Error('invalid choice');
      }
      const q = state.pending.question;
      const correct = choice === q.answerIndex;
      const reward = correct
        ? (q.kind === 'riddle' ? RULES.riddleReward : RULES.knowledgeReward)
        : 0;
      p.coins += reward;
      state.pending = { kind: 'none' };
      events.push(
        ev('QUESTION_ANSWERED', action.player, correct ? 'question.correct' : 'question.wrong', {
          choice,
          correct,
          amount: reward,
          option: q.options[choice],
          question: q,
        }),
      );
      endTurn(state, events);
      break;
    }
    case 'HINT': {
      if (state.pending.kind !== 'question') throw new Error('no question pending');
      if (p.hintUsed) throw new Error('hint used');
      const q = state.pending.question;
      const wrongIdx: number[] = [];
      for (let i = 0; i < q.options.length; i++) {
        if (i !== q.answerIndex) wrongIdx.push(i);
      }
      const [r, seedNext] = lcgStep(state.seed);
      state.seed = seedNext;
      const eliminatedIdx = wrongIdx[Math.floor(r * wrongIdx.length)];
      const newOptions: string[] = [];
      let answerIndex = q.answerIndex;
      for (let i = 0; i < q.options.length; i++) {
        if (i === eliminatedIdx) continue;
        if (i < eliminatedIdx) answerIndex -= 1;
        newOptions.push(q.options[i]);
      }
      p.hintUsed = true;
      state.pending = { kind: 'question', question: { ...q, options: newOptions, answerIndex } };
      events.push(ev('HINT', action.player, 'question.hint', { option: q.options[eliminatedIdx] }));
      break;
    }
  }

  return { state, events };
}