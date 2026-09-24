import { describe, it, expect } from 'vitest';
import { createGame, processAction, findWinner } from '../src/engine/engine';
import type { GameStateAction, GameState, NewGameConfig } from '../src/engine/types';
import type { QuestionBank } from '../src/engine/types';
import { RULES, BOARD, TILE_COUNT } from '../src/board/constants';

const baseConfig: NewGameConfig = {
  mode: 'local',
  difficulty: 'small',
  players: [
    { name: '小明', lang: 'zh_CN', avatar: '🐇', kind: 'human' },
    { name: 'Amy', lang: 'en', avatar: '🏮', kind: 'human' },
    { name: 'Hui', lang: 'de', avatar: '🌕', kind: 'human' },
    { name: 'Rabbit AI', lang: 'zh_CN', avatar: '🐰', kind: 'ai' },
  ],
  seed: 12345,
};

const bank: QuestionBank = {
  n: 0,
  nextQuestion: () => ({
    qid: ++bank.n,
    kind: 'riddle',
    text: '测试灯谜',
    options: ['A', 'B', 'C'],
    answerIndex: 1,
    tag: 'test',
  }),
};

function run(state: GameState, action: GameStateAction) {
  return processAction(state, bank, action);
}

// 从 start 位置掷骰后落到 goal 位置；找一条确定存在的路线
function findRollTo(state: GameState, player: number, goal: number): GameState | null {
  for (let start = 0; start < 40; start++) {
    const s = JSON.parse(JSON.stringify(state)) as GameState;
    s.turn = player;
    s.players[player].position = start;
    s.pending = { kind: 'none' };
    const r = run(s, { type: 'ROLL', player });
    const rolled = r.events.find((e) => e.type === 'DICE_ROLLED');
    if (rolled && rolled.to === goal) return r.state;
  }
  return null;
}

// 辅助：把 pending（问题/购买）清掉并返回最终 state
function resolve(s: GameState): GameState {
  while (!s.finished && s.pending.kind !== 'none') {
    if (s.pending.kind === 'buy') {
      const canBuy = s.players[s.turn].coins >= RULES.lanternCost;
      s = run(s, { type: canBuy ? 'BUY' : 'SKIP_BUY', player: s.turn }).state;
    } else if (s.pending.kind === 'question') {
      const q = (s.pending as any).question;
      s = run(s, { type: 'ANSWER', player: s.turn, payload: { choice: q.answerIndex } }).state;
    }
  }
  return s;
}

describe('createGame', () => {
  it('初始状态：4人、每人100币、起点、未完成', () => {
    const s = createGame(baseConfig);
    expect(s.players.length).toBe(4);
    expect(s.players.every((p) => p.coins === 100 && p.position === 0)).toBe(true);
    expect(s.turn).toBe(0);
    expect(s.finished).toBe(false);
    expect(s.pending).toEqual({ kind: 'none' });
    expect(s.maxTurns).toBe(RULES.maxTurns);
  });

  it('同一种子 → 相同骰子（确定性）', () => {
    const s1 = createGame({ ...baseConfig, seed: 999 });
    const s2 = createGame({ ...baseConfig, seed: 999 });
    const e1 = run(s1, { type: 'ROLL', player: 0 }).events[0];
    const e2 = run(s2, { type: 'ROLL', player: 0 }).events[0];
    expect(e1.dice).toBe(e2.dice);
  });
});

describe('ROLL', () => {
  it('骰子 2–6，位置 = 原位置+骰 (mod 40)', () => {
    const s = createGame(baseConfig);
    const { events, state } = run(s, { type: 'ROLL', player: 0 });
    const dice = events[0].dice!;
    expect(dice).toBeGreaterThanOrEqual(2);
    expect(dice).toBeLessThanOrEqual(6);
    expect(state.players[0].position).toBe((0 + dice) % 40);
  });

  it('38格出发：无论掷几步都经过起点 +50；处理落地格子后回合推进', () => {
    const s = createGame(baseConfig);
    s.players[0].position = 38;
    s.players[0].coins = 100;
    const r = run(s, { type: 'ROLL', player: 0 });
    expect(r.events.filter((e) => e.type === 'PASS_START').length).toBe(1);
    const final = resolve(r.state);
    expect(final.players[0].coins).toBeGreaterThanOrEqual(150); // +50 起点奖励（答对还可能更多）
    expect(final.turn).toBe(1);
  });

  it('连续回合：4人轮流，turn 正确轮转', () => {
    let s = createGame(baseConfig);
    for (let i = 0; i < 4; i++) {
      expect(s.turn).toBe(i);
      s = run(s, { type: 'ROLL', player: s.turn }).state;
      s = resolve(s);
      expect(s.pending).toEqual({ kind: 'none' });
      if (s.finished) break;
      expect(s.turn).toBe((i + 1) % 4);
    }
    expect(s.turnsElapsed).toBeGreaterThanOrEqual(4);
  });
});

describe('QUESTION 流程（直接设 pending，模拟落到答题格）', () => {
  it('riddle 答对 +20', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1, kind: 'riddle', text: 'x', options: ['A', 'B', 'C'], answerIndex: 1 } };
    const { state } = run(s, { type: 'ANSWER', player: 0, payload: { choice: 1 } });
    expect(state.players[0].coins).toBe(120);
    expect(state.pending).toEqual({ kind: 'none' });
  });

  it('riddle 答错 +0，不惩罚', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1, kind: 'riddle', text: 'x', options: ['A', 'B', 'C'], answerIndex: 1 } };
    const { state } = run(s, { type: 'ANSWER', player: 0, payload: { choice: 0 } });
    expect(state.players[0].coins).toBe(100);
  });

  it('math 答对 +10', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1001, kind: 'math', text: '5+3=?', options: ['6', '8', '9'], answerIndex: 1 } as any };
    const { state } = run(s, { type: 'ANSWER', player: 0, payload: { choice: 1 } });
    expect(state.players[0].coins).toBe(110);
  });

  it('HINT：选项 3→2，排除了错误选项；第二次 HINT 抛异常', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1, kind: 'riddle', text: 'x', options: ['A', 'B', 'C'], answerIndex: 1 } };
    const { state: s2, events } = run(s, { type: 'HINT', player: 0 });
    expect(events[0].type).toBe('HINT');
    expect(s2.players[0].hintUsed).toBe(true);
    expect(s2.pending.question.options.length).toBe(2);
    const eliminated = events[0].option!;
    expect(s2.pending.question.options).not.toContain(eliminated);
    expect(() => run(s2, { type: 'HINT', player: 0 })).toThrow('hint used');
  });

  it('HINT 后按新 answerIndex 答题 → +20', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1, kind: 'riddle', text: 'x', options: ['A', 'B', 'C'], answerIndex: 1 } };
    const { state: s2 } = run(s, { type: 'HINT', player: 0 });
    const q = (s2.pending as any).question;
    const { state: s3 } = run(s2, { type: 'ANSWER', player: 0, payload: { choice: q.answerIndex } });
    expect(s3.players[0].coins).toBe(120);
  });

  it('HINT 后 ANSWER 错误选项 → +0', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'question', question: { qid: 1, kind: 'riddle', text: 'x', options: ['A', 'B', 'C'], answerIndex: 1 } };
    const { state: s2 } = run(s, { type: 'HINT', player: 0 });
    const q = (s2.pending as any).question;
    const wrong = q.answerIndex === 0 ? 1 : 0;
    const { state: s3 } = run(s2, { type: 'ANSWER', player: 0, payload: { choice: wrong } });
    expect(s3.players[0].coins).toBe(100);
  });
});

describe('BUY / SKIP_BUY', () => {
  it('BUY：-50币、lanterns+1、owner 记录、turn 推进', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'buy', tile: 1 };
    const { state } = run(s, { type: 'BUY', player: 0 });
    expect(state.players[0].coins).toBe(50);
    expect(state.players[0].lanterns).toBe(1);
    expect(state.lanternOwners[1]).toBe(0);
    expect(state.pending).toEqual({ kind: 'none' });
    expect(state.turn).toBe(1);
  });

  it('BUY 买不起 → 抛异常', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.players[0].coins = 40;
    s.pending = { kind: 'buy', tile: 1 };
    expect(() => run(s, { type: 'BUY', player: 0 })).toThrow('insufficient coins');
  });

  it('BUY 第3个灯笼 → 胜利', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.players[0].lanterns = 2;
    s.players[0].coins = 100;
    s.pending = { kind: 'buy', tile: 3 };
    const { state } = run(s, { type: 'BUY', player: 0 });
    expect(state.finished).toBe(true);
    expect(state.winnerId).toBe(0);
    expect(state.players[0].lanterns).toBe(3);
  });

  it('SKIP_BUY：不扣币、灯笼保留、turn 推进', () => {
    const s = createGame(baseConfig);
    s.turn = 0;
    s.pending = { kind: 'buy', tile: 1 };
    const state = run(s, { type: 'SKIP_BUY', player: 0 }).state;
    expect(state.players[0].coins).toBe(100);
    expect(state.players[0].lanterns).toBe(0);
    expect(state.lanternOwners[1]).toBeUndefined();
    expect(state.turn).toBe(1);
  });
});

describe('RENT（落地他人灯笼位）', () => {
  it('确定性地：p1 落到 p0 的灯笼位 → -10租金', () => {
    const s = createGame(baseConfig);
    s.lanternOwners[3] = 0;
    const rolled = findRollTo(s, 1, 3);
    expect(rolled).not.toBeNull();
    if (rolled) expect(rolled.players[1].coins).toBe(90);
  });

  it('欠租 → 免费通过（coins 不变）', () => {
    const s = createGame(baseConfig);
    s.lanternOwners[3] = 0;
    s.players[1].coins = 0;
    const rolled = findRollTo(s, 1, 3);
    expect(rolled?.players[1].coins).toBe(0);
  });
});

describe('TIME_UP（40回合超时）', () => {
  it('超时按灯笼数定胜负（p0 灯笼最多 → 胜）', () => {
    let s = createGame(baseConfig);
    s.maxTurns = 2;
    s.turnsElapsed = 1;
    s.turn = 0;
    s.players[0].lanterns = 3;
    s.players[0].coins = 50;
    s.players.forEach((p, i) => {
      if (i !== 0) { p.lanterns = 0; p.coins = 0; }
    });
    [1, 3, 6, 9, 12, 17].forEach((t) => (s.lanternOwners[t] = 0)); // 无人能买
    s.pending = { kind: 'none' };
    for (let i = 0; i < 3 && !s.finished; i++) {
      s = run(s, { type: 'ROLL', player: s.turn }).state;
      s = resolve(s);
    }
    expect(s.finished).toBe(true);
    expect(s.winnerId).toBe(0);
  });

  it('超时平局：findWinner 全同分 → null；唯一最高分 → 其 id', () => {
    const base = [{ id: 0, lanterns: 1, coins: 500 }, { id: 1, lanterns: 1, coins: 500 }, { id: 2, lanterns: 1, coins: 500 }, { id: 3, lanterns: 1, coins: 500 }];
    expect(findWinner(base as any)).toBeNull();
    const b2 = base.map((p, i) => ({ ...p, coins: i === 1 ? 510 : 500 }));
    expect(findWinner(b2 as any)).toBe(1);
    const b3 = [{ id: 0, lanterns: 1, coins: 500 }, { id: 1, lanterns: 1, coins: 500 }];
    expect(findWinner(b3 as any)).toBeNull();
  });

  it('超时平局路径：随机轮后 winnerId 与最终分数一致', () => {
    let s = createGame(baseConfig);
    s.maxTurns = 2;
    s.turnsElapsed = 1;
    s.turn = 0;
    s.players.forEach((p) => { p.lanterns = 1; p.coins = 0; });
    [1, 3, 6, 9, 12, 17].forEach((t) => (s.lanternOwners[t] = 0));
    s.pending = { kind: 'none' };
    for (let i = 0; i < 3 && !s.finished; i++) {
      s = run(s, { type: 'ROLL', player: s.turn }).state;
      s = resolve(s);
    }
    expect(s.finished).toBe(true);
    const best = Math.max(...s.players.map((p) => p.lanterns * 1000 + p.coins));
    const winners = s.players.filter((p) => p.lanterns * 1000 + p.coins === best);
    const expected = winners.length === 1 ? winners[0].id : -1;
    expect(s.winnerId).toBe(expected);
  });
});

